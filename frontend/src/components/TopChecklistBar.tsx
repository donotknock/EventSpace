import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { ChecklistItemData } from '../types';
import {
  Building2,
  Tv,
  UtensilsCrossed,
  Music,
  Shield,
  Sparkles,
  Wrench,
  Truck,
  Users,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Palette,
} from 'lucide-react';

interface TopChecklistBarProps {
  eventId: string;
  checklists: ChecklistItemData[];
  onToggleItem: (id: string, isCompleted: boolean) => void;
  onAddItem: (category: string, content: string) => Promise<void>;
  onUpdateItem: (id: string, content: string) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  locatedCategory?: string | null;
}

interface CategoryConfig {
  icon: string;
  color: string;
  title?: string;
}

const ICON_OPTIONS = [
  { id: 'building', label: 'Facilities', Component: Building2 },
  { id: 'tv', label: 'AV / Media', Component: Tv },
  { id: 'utensils', label: 'Catering', Component: UtensilsCrossed },
  { id: 'music', label: 'Sound / Stage', Component: Music },
  { id: 'shield', label: 'Security', Component: Shield },
  { id: 'sparkles', label: 'Decor / VIP', Component: Sparkles },
  { id: 'wrench', label: 'Maintenance', Component: Wrench },
  { id: 'truck', label: 'Logistics', Component: Truck },
  { id: 'users', label: 'Staffing', Component: Users },
];

const COLOR_OPTIONS = [
  { id: 'emerald', label: 'Emerald', bgClass: 'bg-emerald-500', textClass: 'text-emerald-500', borderHover: 'hover:border-emerald-400' },
  { id: 'blue', label: 'Blue', bgClass: 'bg-blue-500', textClass: 'text-blue-500', borderHover: 'hover:border-blue-400' },
  { id: 'amber', label: 'Amber', bgClass: 'bg-amber-500', textClass: 'text-amber-500', borderHover: 'hover:border-amber-400' },
  { id: 'purple', label: 'Purple', bgClass: 'bg-purple-500', textClass: 'text-purple-500', borderHover: 'hover:border-purple-400' },
  { id: 'rose', label: 'Rose', bgClass: 'bg-rose-500', textClass: 'text-rose-500', borderHover: 'hover:border-rose-400' },
  { id: 'indigo', label: 'Indigo', bgClass: 'bg-indigo-500', textClass: 'text-indigo-500', borderHover: 'hover:border-indigo-400' },
  { id: 'cyan', label: 'Cyan', bgClass: 'bg-cyan-500', textClass: 'text-cyan-500', borderHover: 'hover:border-cyan-400' },
  { id: 'orange', label: 'Orange', bgClass: 'bg-orange-500', textClass: 'text-orange-500', borderHover: 'hover:border-orange-400' },
];

const DEFAULT_CATEGORY_CONFIGS: Record<string, CategoryConfig> = {
  FM: { icon: 'building', color: 'emerald' },
  AV: { icon: 'tv', color: 'blue' },
  CT: { icon: 'utensils', color: 'amber' },
  SODEXO: { icon: 'utensils', color: 'amber' },
  CATERING: { icon: 'utensils', color: 'amber' },
};

export const TopChecklistBar: React.FC<TopChecklistBarProps> = ({
  eventId,
  checklists,
  onToggleItem,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  locatedCategory,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Customizable categories & styling configs
  const [customCategories, setCustomCategories] = useState<string[]>(['FM', 'AV', 'CT']);
  const [categoryConfigs, setCategoryConfigs] = useState<Record<string, CategoryConfig>>(() => {
    try {
      const saved = localStorage.getItem('eventspace_category_configs');
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORY_CONFIGS;
    } catch {
      return DEFAULT_CATEGORY_CONFIGS;
    }
  });

  // Screen-centered React Portal modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isNewCategoryModal, setIsNewCategoryModal] = useState(false);
  const [modalCategoryName, setModalCategoryName] = useState('');
  const [modalCategoryTitle, setModalCategoryTitle] = useState('');
  const [selectedIcon, setSelectedIcon] = useState<string>('building');
  const [selectedColor, setSelectedColor] = useState<string>('emerald');

  // Carousel horizontal scroll state
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hiddenLeftCount, setHiddenLeftCount] = useState(0);
  const [hiddenRightCount, setHiddenRightCount] = useState(0);

  // Clean UI: Active category showing the inline "+ Add item" input (hidden by default)
  const [activeAddCategory, setActiveAddCategory] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');

  useEffect(() => {
    try {
      localStorage.setItem('eventspace_category_configs', JSON.stringify(categoryConfigs));
    } catch (e) {
      console.warn('Failed to save category configs to localStorage', e);
    }
  }, [categoryConfigs]);

  // Scroll to and highlight located category
  useEffect(() => {
    if (!locatedCategory) return;
    setIsCollapsed(false);
    setTimeout(() => {
      const container = scrollContainerRef.current;
      if (!container) return;
      const targetCard = container.querySelector(
        `[data-category="${locatedCategory.toUpperCase()}"]`
      ) as HTMLElement | null;
      if (targetCard) {
        targetCard.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    }, 100);
  }, [locatedCategory]);

  // Merge custom categories with any existing checklist categories
  const categories = useMemo(() => {
    const set = new Set(customCategories);
    checklists.forEach((c) => {
      if (c.category) set.add(c.category);
    });
    return Array.from(set);
  }, [customCategories, checklists]);

  const getCatConfig = (cat: string): CategoryConfig => {
    const upper = cat.toUpperCase();
    if (categoryConfigs[upper]) return categoryConfigs[upper];
    if (DEFAULT_CATEGORY_CONFIGS[upper]) return DEFAULT_CATEGORY_CONFIGS[upper];
    return { icon: 'building', color: 'blue' };
  };

  const renderCategoryIcon = (cat: string) => {
    const config = getCatConfig(cat);
    const iconObj = ICON_OPTIONS.find((i) => i.id === config.icon) || ICON_OPTIONS[0];
    const colorObj = COLOR_OPTIONS.find((c) => c.id === config.color) || COLOR_OPTIONS[1];
    const IconComp = iconObj.Component;
    return <IconComp className={`w-4 h-4 ${colorObj.textClass} flex-shrink-0`} />;
  };

  const getCategoryTitle = (cat: string) => {
    const upper = cat.toUpperCase();
    if (categoryConfigs[upper]?.title?.trim()) {
      return categoryConfigs[upper].title!.trim();
    }
    switch (upper) {
      case 'FM':
        return 'Facilities (FM)';
      case 'AV':
        return 'Audio/Visual (AV)';
      case 'CT':
      case 'SODEXO':
      case 'CATERING':
        return 'Catering (CT)';
      default:
        return cat;
    }
  };

  // Measure how many cards are out of view
  const updateScrollCounts = () => {
    const container = scrollContainerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    const cardElements = container.querySelectorAll('.checklist-carousel-card');
    let leftHidden = 0;
    let rightHidden = 0;

    cardElements.forEach((card) => {
      const cardRect = card.getBoundingClientRect();
      if (cardRect.right < containerRect.left + 16) {
        leftHidden++;
      } else if (cardRect.left > containerRect.right - 16) {
        rightHidden++;
      }
    });

    setHiddenLeftCount(leftHidden);
    setHiddenRightCount(rightHidden);
  };

  useEffect(() => {
    updateScrollCounts();
    const handleResize = () => updateScrollCounts();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [categories, checklists, isCollapsed]);

  const handleOpenAddCategoryModal = () => {
    setIsNewCategoryModal(true);
    setModalCategoryName('');
    setModalCategoryTitle('');
    setSelectedIcon('building');
    setSelectedColor('blue');
    setIsModalOpen(true);
  };

  const handleStartCustomize = (cat: string) => {
    const config = getCatConfig(cat);
    setIsNewCategoryModal(false);
    setModalCategoryName(cat);
    setModalCategoryTitle(config.title || getCategoryTitle(cat));
    setSelectedIcon(config.icon);
    setSelectedColor(config.color);
    setIsModalOpen(true);
  };

  const handleSaveCategoryModal = () => {
    const name = modalCategoryName.trim();
    if (!name) return;
    const title = modalCategoryTitle.trim() || name;

    if (isNewCategoryModal) {
      if (!categories.some((c) => c.toUpperCase() === name.toUpperCase())) {
        setCustomCategories((prev) => [...prev, name]);
      }
    }

    setCategoryConfigs((prev) => ({
      ...prev,
      [name.toUpperCase()]: {
        icon: selectedIcon,
        color: selectedColor,
        title,
      },
    }));

    setIsModalOpen(false);
    setTimeout(updateScrollCounts, 150);
  };

  const handleStartEdit = (item: ChecklistItemData) => {
    setEditingId(item.id);
    setEditingText(item.content);
  };

  const handleSaveEdit = async (id: string) => {
    if (!editingText.trim()) return;
    await onUpdateItem(id, editingText.trim());
    setEditingId(null);
  };

  const handleCreateItem = async (category: string) => {
    const text = newItemText.trim();
    if (!text) return;
    await onAddItem(category, text);
    setNewItemText('');
    setActiveAddCategory(null);
  };

  const handleDeleteCategory = async (categoryToDelete: string) => {
    // Delete all items belonging to this category
    const itemsToDelete = checklists.filter(
      (c) => c.category.toUpperCase() === categoryToDelete.toUpperCase()
    );
    for (const item of itemsToDelete) {
      await onDeleteItem(item.id);
    }
    setCustomCategories((prev) =>
      prev.filter((cat) => cat.toUpperCase() !== categoryToDelete.toUpperCase())
    );
    setTimeout(updateScrollCounts, 150);
  };

  return (
    <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80 backdrop-blur-sm z-10 transition-all select-none">
      {/* Top Header Row with Custom Category Action & Collapse Toggle */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Overarching Department Checklists
          </span>

          {/* Add Category Button: Immediately opens screen-centered customization window */}
          <button
            onClick={handleOpenAddCategoryModal}
            className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 min-h-[36px] px-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 active:scale-95 transition-all"
            title="Add a custom department checklist card"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Category</span>
          </button>
        </div>

        <button
          onClick={() => setIsCollapsed(!isCollapsed)}
          className="min-h-[44px] px-3 flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all active:scale-95"
          aria-label={isCollapsed ? 'Expand checklist cards' : 'Collapse checklist cards'}
        >
          <span>{isCollapsed ? 'Show Checklists' : 'Minimize'}</span>
          {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
        </button>
      </div>

      {/* Overarching Department Cards (Horizontal Carousel) */}
      {!isCollapsed && (
        <div className="relative group/carousel px-2 py-2.5">
          {/* Dynamic numeric badge pinned to left edge */}
          {hiddenLeftCount > 0 && (
            <button
              onClick={() => {
                scrollContainerRef.current?.scrollBy({ left: -320, behavior: 'smooth' });
                setTimeout(updateScrollCounts, 300);
              }}
              className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 dark:bg-slate-100/90 text-white dark:text-slate-900 shadow-xl border border-white/20 dark:border-slate-800 backdrop-blur-md text-xs font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title={`${hiddenLeftCount} card${hiddenLeftCount > 1 ? 's' : ''} scrolled out of view to the left. Click to scroll left`}
            >
              <ChevronLeft className="w-4 h-4" />
              <span className="font-extrabold">{hiddenLeftCount}</span>
            </button>
          )}

          {/* Dynamic numeric badge pinned to right edge */}
          {hiddenRightCount > 0 && (
            <button
              onClick={() => {
                scrollContainerRef.current?.scrollBy({ left: 320, behavior: 'smooth' });
                setTimeout(updateScrollCounts, 300);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 dark:bg-slate-100/90 text-white dark:text-slate-900 shadow-xl border border-white/20 dark:border-slate-800 backdrop-blur-md text-xs font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer"
              title={`${hiddenRightCount} card${hiddenRightCount > 1 ? 's' : ''} scrolled out of view to the right. Click to scroll right`}
            >
              <span className="font-extrabold">{hiddenRightCount}</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}

          <div
            ref={scrollContainerRef}
            onScroll={updateScrollCounts}
            className="flex flex-row overflow-x-auto no-scrollbar scroll-smooth gap-3.5 px-2 pb-1"
          >
            {categories.map((cat) => {
              const items = checklists.filter(
                (c) => c.category.toUpperCase() === cat.toUpperCase()
              );
              const completedCount = items.filter((c) => c.isCompleted).length;
              const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;
              const isAddingThisCat = activeAddCategory === cat;

              const config = getCatConfig(cat);
              const colorObj = COLOR_OPTIONS.find((c) => c.id === config.color) || COLOR_OPTIONS[1];
              const isLocated = Boolean(locatedCategory && locatedCategory.toUpperCase() === cat.toUpperCase());

              return (
                <div
                  key={cat}
                  data-category={cat.toUpperCase()}
                  className={`checklist-carousel-card min-w-[285px] max-w-[320px] flex-shrink-0 bg-white dark:bg-slate-800/80 border ${
                    isLocated
                      ? 'animate-locate-highlight ring-4 ring-offset-2 ring-emerald-500 border-emerald-500 z-20'
                      : `border-slate-200 dark:border-slate-700/60 ${colorObj.borderHover}`
                  } rounded-2xl p-3 shadow-sm flex flex-col justify-between group/card transition-all`}
                >
                  {/* Card Title & Progress */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        {renderCategoryIcon(cat)}
                        <span className="text-lg font-semibold text-slate-800 dark:text-slate-100 truncate">
                          {getCategoryTitle(cat)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1.5">
                        {/* Discrete "+ Add" button matching canvas Sub-tasks */}
                        <button
                          onClick={() => {
                            setActiveAddCategory(activeAddCategory === cat ? null : cat);
                            setNewItemText('');
                          }}
                          className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors"
                          title={`Add item to ${cat}`}
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add</span>
                        </button>

                        {/* Customize Icon & Color Button */}
                        <button
                          onClick={() => handleStartCustomize(cat)}
                          className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-blue-500 opacity-0 group-hover/card:opacity-100 transition-opacity"
                          title={`Customize ${cat} header, icon and highlight color`}
                          aria-label={`Customize ${cat} header, icon and highlight color`}
                        >
                          <Palette className="w-3.5 h-3.5" />
                        </button>
                        {/* Delete Category Button */}
                        <button
                          onClick={() => handleDeleteCategory(cat)}
                          className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity"
                          title={`Delete ${cat} category`}
                          aria-label={`Delete ${cat} category`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>

                    {/* Progress bar */}
                    <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                      <div
                        className={`h-full ${colorObj.bgClass} transition-all duration-300`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>

                    {/* Inline Add Item Input triggered by discrete "+ Add" button in header */}
                    {isAddingThisCat && (
                      <div className="flex items-center gap-1.5 p-1 rounded-lg bg-blue-50/60 dark:bg-slate-900 border border-blue-400 dark:border-blue-500 animate-fadeIn mb-2">
                        <input
                          type="text"
                          autoFocus
                          placeholder={`Add ${cat} item...`}
                          value={newItemText}
                          onChange={(e) => setNewItemText(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleCreateItem(cat);
                            if (e.key === 'Escape') setActiveAddCategory(null);
                          }}
                          className="flex-1 text-xs px-2 py-1 rounded bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                        />
                        <button
                          onClick={() => handleCreateItem(cat)}
                          disabled={!newItemText.trim()}
                          className="w-6 h-6 flex items-center justify-center rounded bg-blue-600 hover:bg-blue-500 text-white font-bold transition-all disabled:opacity-40"
                          title="Save item"
                        >
                          <Check className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => setActiveAddCategory(null)}
                          className="w-6 h-6 flex items-center justify-center rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
                          title="Cancel"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    )}

                    {/* Checklist items with edit & delete */}
                    <div className="space-y-1 overflow-y-auto max-h-32 pr-1">
                      {items.length === 0 ? (
                        <div className="text-[11px] text-slate-400 italic py-1.5">
                          No tasks added yet
                        </div>
                      ) : (
                        items.map((item) => (
                          <div
                            key={item.id}
                            className="min-h-[38px] py-1 px-1.5 rounded-lg flex items-center justify-between gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 group transition-colors"
                          >
                            {editingId === item.id ? (
                              <div className="flex items-center gap-1 w-full">
                                <input
                                  type="text"
                                  autoFocus
                                  value={editingText}
                                  onChange={(e) => setEditingText(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSaveEdit(item.id);
                                    if (e.key === 'Escape') setEditingId(null);
                                  }}
                                  className="flex-1 text-xs px-2 py-1 rounded bg-white dark:bg-slate-900 border border-blue-500 text-slate-900 dark:text-white"
                                />
                                <button
                                  onClick={() => handleSaveEdit(item.id)}
                                  className="w-6 h-6 flex items-center justify-center rounded bg-emerald-600 text-white"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="w-6 h-6 flex items-center justify-center rounded bg-slate-200 dark:bg-slate-700 text-slate-600"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => onToggleItem(item.id, !item.isCompleted)}
                                  className="flex items-center gap-2 flex-1 text-left min-w-0"
                                >
                                  {item.isCompleted ? (
                                    <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
                                  ) : (
                                    <Circle className="w-4 h-4 text-slate-300 dark:text-slate-600 group-hover:text-blue-500 flex-shrink-0" />
                                  )}
                                  <span
                                    className={`text-sm font-normal leading-snug truncate ${
                                      item.isCompleted
                                        ? 'line-through text-slate-400 dark:text-slate-500'
                                        : 'text-slate-800 dark:text-slate-100'
                                    }`}
                                  >
                                    {item.content}
                                  </span>
                                </button>

                                <div className="flex items-center opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button
                                    onClick={() => handleStartEdit(item)}
                                    className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-blue-500"
                                    title="Edit item"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  <button
                                    onClick={() => onDeleteItem(item.id)}
                                    className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-red-500"
                                    title="Delete item"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              </>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Screen-Centered Category Customization Modal (Rendered via React Portal) */}
      {isModalOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
            onClick={() => setIsModalOpen(false)}
          >
            <div
              className="w-full max-w-md bg-white dark:bg-slate-900 rounded-3xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 animate-scaleUp"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                    <Palette className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900 dark:text-white">
                      {isNewCategoryModal
                        ? 'Add Department Category'
                        : `Customize Category: ${getCategoryTitle(modalCategoryName)}`}
                    </h4>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {isNewCategoryModal
                        ? 'Create and configure a new checklist category card'
                        : 'Rename checklist header, update icon, and highlight color'}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Category Key & Header Title Input */}
              {isNewCategoryModal ? (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                      Category Code / Key
                    </label>
                    <input
                      type="text"
                      autoFocus
                      placeholder="e.g. STAGE, VIP, SECURITY..."
                      value={modalCategoryName}
                      onChange={(e) => {
                        const val = e.target.value;
                        setModalCategoryName(val);
                        if (!modalCategoryTitle || modalCategoryTitle === modalCategoryName) {
                          setModalCategoryTitle(val);
                        }
                      }}
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                      Checklist Header Title
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. Stage Logistics & Setup"
                      value={modalCategoryTitle}
                      onChange={(e) => setModalCategoryTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') handleSaveCategoryModal();
                      }}
                      className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Checklist Header Title
                  </label>
                  <input
                    type="text"
                    autoFocus
                    placeholder="Enter custom header title..."
                    value={modalCategoryTitle}
                    onChange={(e) => setModalCategoryTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveCategoryModal();
                    }}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
                  <p className="mt-1.5 text-[11px] text-slate-400">
                    Rename how this department card appears in the overarching checklists bar.
                  </p>
                </div>
              )}

              {/* Icon Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                  Select Icon
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ICON_OPTIONS.map((opt) => {
                    const IconComp = opt.Component;
                    const isSelected = selectedIcon === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedIcon(opt.id)}
                        className={`flex flex-col items-center justify-center p-2.5 rounded-xl border text-xs gap-1.5 transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/80 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 font-bold ring-2 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <IconComp className="w-4 h-4" />
                        <span className="text-[10px] truncate max-w-full">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Highlight Color Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                  Highlight Color
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {COLOR_OPTIONS.map((c) => {
                    const isSelected = selectedColor === c.id;
                    return (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => setSelectedColor(c.id)}
                        className={`flex items-center gap-2 p-2 rounded-xl border text-xs transition-all ${
                          isSelected
                            ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 font-bold ring-2 ring-blue-500/20'
                            : 'border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span className={`w-3.5 h-3.5 rounded-full ${c.bgClass}`} />
                        <span className="text-[11px] text-slate-700 dark:text-slate-300 truncate">
                          {c.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCategoryModal}
                  disabled={isNewCategoryModal && !modalCategoryName.trim()}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white shadow-md shadow-blue-500/20 disabled:opacity-50"
                >
                  {isNewCategoryModal ? 'Create Category' : 'Apply Customization'}
                </button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
