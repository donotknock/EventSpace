import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  horizontalListSortingStrategy,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { ChecklistItemData } from '../types';
import { api } from '../services/api';
import { triggerAgendaRefresh } from '../utils/agendaEvents';
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
  Megaphone,
  CheckCircle2,
  Circle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
  Check,
  X,
  Palette,
  GripHorizontal,
  GripVertical,
  Edit3,
} from 'lucide-react';

interface TopChecklistBarProps {
  eventId: string;
  checklists: ChecklistItemData[];
  onToggleItem: (id: string, isCompleted: boolean) => void;
  onAddItem: (category: string, content: string) => Promise<void>;
  onUpdateItem: (id: string, content: string) => Promise<void>;
  onDeleteItem: (id: string) => Promise<void>;
  onReorderItems?: (reordered: ChecklistItemData[]) => void;
  locatedCategory?: string | null;
  isReadOnly?: boolean;
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
  { id: 'megaphone', label: 'Communications', Component: Megaphone },
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
  COMMUNICATIONS: { icon: 'megaphone', color: 'purple' },
};

// Sortable Task Item Component for intra-column vertical drag and drop
interface SortableTaskRowProps {
  item: ChecklistItemData;
  editingId: string | null;
  editingText: string;
  setEditingText: (val: string) => void;
  setEditingId: (id: string | null) => void;
  handleSaveEdit: (id: string) => Promise<void>;
  onToggleItem: (id: string, isCompleted: boolean) => void;
  onDeleteItem: (id: string) => Promise<void>;
  isReadOnly?: boolean;
}

const SortableTaskRow: React.FC<SortableTaskRowProps> = ({
  item,
  editingId,
  editingText,
  setEditingText,
  setEditingId,
  handleSaveEdit,
  onToggleItem,
  onDeleteItem,
  isReadOnly = false,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `task-${item.id}`,
    data: { type: 'task', itemId: item.id, category: item.category },
    disabled: isReadOnly,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      className="min-h-[34px] py-1 px-1.5 rounded-lg flex items-center justify-between gap-1.5 hover:bg-slate-50 dark:hover:bg-slate-700/50 group transition-colors"
    >
      {editingId === item.id ? (
        <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
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
          {/* Drag Handle */}
          {!isReadOnly && (
            <div
              {...listeners}
              className="cursor-grab active:cursor-grabbing p-0.5 text-slate-300 dark:text-slate-600 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0"
              title="Drag to reorder task"
            >
              <GripVertical className="w-3.5 h-3.5" />
            </div>
          )}

          <button
            onClick={() => {
              if (!isReadOnly) {
                onToggleItem(item.id, !item.isCompleted);
                triggerAgendaRefresh();
              }
            }}
            disabled={isReadOnly}
            className={`flex items-center gap-2 flex-1 text-left min-w-0 ${
              isReadOnly ? 'cursor-default' : 'cursor-pointer'
            }`}
          >
            {item.isCompleted ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />
            ) : (
              <Circle className={`w-4 h-4 text-slate-300 dark:text-slate-600 ${isReadOnly ? '' : 'group-hover:text-blue-500'} flex-shrink-0`} />
            )}
            <span
              className={`text-xs font-normal leading-snug truncate ${
                item.isCompleted
                  ? 'line-through text-slate-400 dark:text-slate-500'
                  : 'text-slate-800 dark:text-slate-100'
              }`}
            >
              {item.content}
            </span>
          </button>

          {!isReadOnly && (
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
              <button
                onClick={() => {
                  setEditingId(item.id);
                  setEditingText(item.content);
                }}
                className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-blue-500 transition-colors"
                title="Edit task text"
              >
                <Edit3 className="w-3 h-3" />
              </button>
              <button
                onClick={() => onDeleteItem(item.id)}
                className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-red-500 transition-colors"
                title="Delete item"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export const TopChecklistBar: React.FC<TopChecklistBarProps> = ({
  eventId,
  checklists,
  onToggleItem,
  onAddItem,
  onUpdateItem,
  onDeleteItem,
  onReorderItems,
  locatedCategory,
  isReadOnly = false,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState('');

  // Expandable container height (resizable by dragging bottom border)
  const [containerHeight, setContainerHeight] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('eventspace_topbar_height');
      return saved ? Math.min(520, Math.max(120, parseInt(saved, 10))) : 210;
    } catch {
      return 210;
    }
  });

  // Customizable categories & styling configs (strictly scoped per event to avoid cross-event bleed)
  const [customCategories, setCustomCategories] = useState<string[]>(() => {
    try {
      if (!eventId) return [];
      const saved = localStorage.getItem(`eventspace_custom_categories_${eventId}`);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [categoryConfigs, setCategoryConfigs] = useState<Record<string, CategoryConfig>>(() => {
    try {
      const saved = localStorage.getItem('eventspace_category_configs');
      return saved ? JSON.parse(saved) : DEFAULT_CATEGORY_CONFIGS;
    } catch {
      return DEFAULT_CATEGORY_CONFIGS;
    }
  });

  // Re-sync custom categories when switching events
  useEffect(() => {
    try {
      if (eventId) {
        const saved = localStorage.getItem(`eventspace_custom_categories_${eventId}`);
        setCustomCategories(saved ? JSON.parse(saved) : []);
      } else {
        setCustomCategories([]);
      }
    } catch {
      setCustomCategories([]);
    }
  }, [eventId]);

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

  // Active category showing inline "+ Add item" input
  const [activeAddCategory, setActiveAddCategory] = useState<string | null>(null);
  const [newItemText, setNewItemText] = useState('');

  // Save configs and categories order to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('eventspace_category_configs', JSON.stringify(categoryConfigs));
    } catch (e) {
      console.warn('Failed to save category configs', e);
    }
  }, [categoryConfigs]);

  useEffect(() => {
    try {
      if (eventId) {
        localStorage.setItem(`eventspace_custom_categories_${eventId}`, JSON.stringify(customCategories));
      }
    } catch (e) {
      console.warn('Failed to save categories order', e);
    }
  }, [eventId, customCategories]);

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
    const fromItems = Array.from(new Set(checklists.map((c) => c.category.toUpperCase())));
    const ordered = [...customCategories];
    fromItems.forEach((cat) => {
      if (!ordered.map((c) => c.toUpperCase()).includes(cat)) {
        ordered.push(cat);
      }
    });
    return ordered;
  }, [customCategories, checklists]);

  const getCatConfig = (cat: string): CategoryConfig => {
    const upper = cat.toUpperCase();
    return (
      categoryConfigs[upper] ||
      DEFAULT_CATEGORY_CONFIGS[upper] || { icon: 'building', color: 'blue' }
    );
  };

  const getCategoryTitle = (cat: string): string => {
    const config = getCatConfig(cat);
    if (config.title) return config.title;
    switch (cat.toUpperCase()) {
      case 'FM':
        return 'Facilities';
      case 'AV':
        return 'Audio / Visual';
      case 'CT':
      case 'SODEXO':
      case 'CATERING':
        return 'Catering';
      case 'COMMUNICATIONS':
        return 'Communications';
      default:
        return cat;
    }
  };

  const renderCategoryIcon = (cat: string) => {
    const config = getCatConfig(cat);
    const opt = ICON_OPTIONS.find((o) => o.id === config.icon) || ICON_OPTIONS[0];
    const IconComp = opt.Component;
    const colorObj = COLOR_OPTIONS.find((c) => c.id === config.color) || COLOR_OPTIONS[1];
    return <IconComp className={`w-4 h-4 ${colorObj.textClass} flex-shrink-0`} />;
  };

  // Resize handler for dragging bottom border
  const handleStartResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startY = e.clientY;
    const startH = containerHeight;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientY - startY;
      const newH = Math.min(520, Math.max(120, startH + delta));
      setContainerHeight(newH);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      try {
        localStorage.setItem('eventspace_topbar_height', String(containerHeight));
      } catch {}
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  // DND Kit Sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Handle DND reordering
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const activeData = active.data.current;
    const overData = over.data.current;

    // 1. Column reordering (can drop on column or over task inside column)
    if (activeData?.type === 'column') {
      const activeCat = activeData.category;
      const overCat = overData?.category;
      if (activeCat && overCat && activeCat !== overCat) {
        const oldIndex = categories.indexOf(activeCat);
        const newIndex = categories.indexOf(overCat);
        if (oldIndex !== -1 && newIndex !== -1) {
          const reordered = arrayMove(categories, oldIndex, newIndex);
          setCustomCategories(reordered);
        }
      }
    }

    // 2. Task reordering within a column or across columns
    if (activeData?.type === 'task') {
      const activeCat = activeData.category;
      const overCat = overData?.category;
      const activeItemId = activeData.itemId;
      const overItemId = overData?.itemId;

      if (overItemId && activeCat === overCat) {
        const catItems = checklists
          .filter((c) => c.category.toUpperCase() === activeCat.toUpperCase())
          .sort((a, b) => a.order - b.order);

        const oldIndex = catItems.findIndex((c) => c.id === activeItemId);
        const newIndex = catItems.findIndex((c) => c.id === overItemId);

        if (oldIndex !== -1 && newIndex !== -1) {
          const reorderedCat = arrayMove(catItems, oldIndex, newIndex);
          const otherItems = checklists.filter(
            (c) => c.category.toUpperCase() !== activeCat.toUpperCase()
          );
          const newAllChecklists = [
            ...otherItems,
            ...reorderedCat.map((it, idx) => ({ ...it, order: idx })),
          ];
          onReorderItems?.(newAllChecklists);
          // Update order for reordered items
          for (let i = 0; i < reorderedCat.length; i++) {
            const it = reorderedCat[i];
            if (it.order !== i) {
              api.updateChecklistItem(eventId, it.id, { order: i }).catch((err) => {
                console.error('Failed to update task order:', err);
              });
            }
          }
        }
      } else if (overCat && activeCat !== overCat) {
        // Moved task to another category
        api.updateChecklistItem(eventId, activeItemId, { category: overCat }).catch((err) => {
          console.error('Failed to update task category:', err);
        });
      }
    }
  };

  const updateScrollCounts = () => {
    const el = scrollContainerRef.current;
    if (!el) return;

    const scrollLeft = el.scrollLeft;
    const scrollWidth = el.scrollWidth;
    const clientWidth = el.clientWidth;

    const cards = Array.from(el.querySelectorAll('.checklist-carousel-card')) as HTMLElement[];
    let leftHidden = 0;
    let rightHidden = 0;

    cards.forEach((card) => {
      const cardLeft = card.offsetLeft - el.offsetLeft;
      const cardRight = cardLeft + card.offsetWidth;

      if (cardRight <= scrollLeft + 10) {
        leftHidden++;
      } else if (cardLeft >= scrollLeft + clientWidth - 10) {
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
  }, [categories, checklists, isCollapsed, containerHeight]);

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
    const title = modalCategoryTitle.trim();
    if (!title) return;
    const name = isNewCategoryModal ? title : (modalCategoryName.trim() || title);

    if (isNewCategoryModal) {
      // Force it to strictly appear at the end of the list
      const newOrdered = [...categories.filter((c) => c.toUpperCase() !== name.toUpperCase()), name];
      setCustomCategories(newOrdered);
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

  // Calculate items max height based on container height
  const itemsMaxHeight = Math.max(50, containerHeight - 110);
  // Estimate max visible items (each item is ~36px)
  const maxVisibleTasks = Math.max(1, Math.floor(itemsMaxHeight / 36));

  return (
    <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/90 dark:bg-slate-900/80 backdrop-blur-sm z-10 transition-all select-none flex flex-col">
      {/* Top Header Row with Category Actions & Collapse Toggle */}
      <div className="px-4 py-2 flex items-center justify-between border-b border-slate-200/50 dark:border-slate-800/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Overarching Department Checklists
          </span>

          {!isReadOnly && (
            <button
              onClick={handleOpenAddCategoryModal}
              className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 min-h-[36px] px-2.5 rounded-lg hover:bg-blue-50 dark:hover:bg-blue-950/40 active:scale-95 transition-all"
              title="Add a custom department checklist card"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Category</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="min-h-[36px] px-3 flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200 rounded-lg hover:bg-slate-200/50 dark:hover:bg-slate-800 transition-all active:scale-95"
            aria-label={isCollapsed ? 'Expand checklist cards' : 'Collapse checklist cards'}
          >
            <span>{isCollapsed ? 'Show Checklists' : 'Minimize'}</span>
            {isCollapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* DND Context for Horizontal Columns & Vertical Tasks */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        {/* Overarching Department Cards (Horizontal Carousel) */}
        {!isCollapsed ? (
          <div
            style={{ height: `${containerHeight}px` }}
            className="relative group/carousel px-2 py-2 overflow-hidden transition-[height] duration-75 flex-1"
          >
            {/* Scroll navigation arrows */}
            {hiddenLeftCount > 0 && (
              <button
                onClick={() => {
                  scrollContainerRef.current?.scrollBy({ left: -320, behavior: 'smooth' });
                  setTimeout(updateScrollCounts, 300);
                }}
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 dark:bg-slate-100/90 text-white dark:text-slate-900 shadow-xl border border-white/20 dark:border-slate-800 backdrop-blur-md text-xs font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title={`${hiddenLeftCount} cards to left`}
              >
                <ChevronLeft className="w-4 h-4" />
                <span className="font-extrabold">{hiddenLeftCount}</span>
              </button>
            )}

            {hiddenRightCount > 0 && (
              <button
                onClick={() => {
                  scrollContainerRef.current?.scrollBy({ left: 320, behavior: 'smooth' });
                  setTimeout(updateScrollCounts, 300);
                }}
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/90 dark:bg-slate-100/90 text-white dark:text-slate-900 shadow-xl border border-white/20 dark:border-slate-800 backdrop-blur-md text-xs font-bold hover:scale-105 active:scale-95 transition-all cursor-pointer"
                title={`${hiddenRightCount} cards to right`}
              >
                <span className="font-extrabold">{hiddenRightCount}</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}

            <div
              ref={scrollContainerRef}
              onScroll={updateScrollCounts}
              className="flex flex-row overflow-x-auto no-scrollbar scroll-smooth gap-3.5 px-2 h-full pb-1 items-stretch"
            >
              <SortableContext items={categories.map((c) => `col-${c}`)} strategy={horizontalListSortingStrategy}>
                {categories.map((cat) => {
                  const items = checklists
                    .filter((c) => c.category.toUpperCase() === cat.toUpperCase())
                    .sort((a, b) => a.order - b.order);
                  const completedCount = items.filter((c) => c.isCompleted).length;
                  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;
                  const isAddingThisCat = activeAddCategory === cat;

                  const config = getCatConfig(cat);
                  const colorObj = COLOR_OPTIONS.find((c) => c.id === config.color) || COLOR_OPTIONS[1];
                  const isLocated = Boolean(
                    locatedCategory && locatedCategory.toUpperCase() === cat.toUpperCase()
                  );

                  // Calculate visible items vs hidden items
                  const visibleItems = items.slice(0, maxVisibleTasks);
                  const hiddenTasksCount = Math.max(0, items.length - visibleItems.length);

                  return (
                    <SortableColumnCard
                      key={cat}
                      cat={cat}
                      config={config}
                      colorObj={colorObj}
                      progress={progress}
                      isLocated={isLocated}
                      renderCategoryIcon={renderCategoryIcon}
                      getCategoryTitle={getCategoryTitle}
                      activeAddCategory={activeAddCategory}
                      setActiveAddCategory={setActiveAddCategory}
                      newItemText={newItemText}
                      setNewItemText={setNewItemText}
                      handleCreateItem={handleCreateItem}
                      handleStartCustomize={handleStartCustomize}
                      handleDeleteCategory={handleDeleteCategory}
                      visibleItems={visibleItems}
                      hiddenTasksCount={hiddenTasksCount}
                      itemsMaxHeight={itemsMaxHeight}
                      setContainerHeight={setContainerHeight}
                      editingId={editingId}
                      editingText={editingText}
                      setEditingText={setEditingText}
                      setEditingId={setEditingId}
                      handleSaveEdit={handleSaveEdit}
                      onToggleItem={onToggleItem}
                      onDeleteItem={onDeleteItem}
                      totalItemsCount={items.length}
                      isReadOnly={isReadOnly}
                    />
                  );
                })}
              </SortableContext>
            </div>
          </div>
        ) : (
          /* When collapsed: render sleek compact summary badges with "+n items" indicator */
          <div className="px-4 py-2 flex items-center gap-2 overflow-x-auto no-scrollbar">
            {categories.map((cat) => {
              const items = checklists.filter(
                (c) => c.category.toUpperCase() === cat.toUpperCase()
              );
              const completedCount = items.filter((c) => c.isCompleted).length;
              return (
                <button
                  key={cat}
                  onClick={() => setIsCollapsed(false)}
                  className="flex items-center gap-2 px-2.5 py-1 rounded-xl bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs hover:border-blue-400 transition-all shadow-xs"
                  title="Click to expand checklist"
                >
                  {renderCategoryIcon(cat)}
                  <span className="font-semibold text-slate-800 dark:text-slate-200 text-xs">
                    {getCategoryTitle(cat)}
                  </span>
                  <span className="text-[10px] font-bold text-slate-400">
                    {completedCount}/{items.length}
                  </span>
                  {items.length > 0 && (
                    <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-1.5 py-0.2 rounded">
                      +{items.length} items
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </DndContext>

      {/* DRAG-TO-RESIZE BOTTOM HANDLE (Requirement 1) */}
      {!isCollapsed && (
        <div
          onMouseDown={handleStartResize}
          className="group/resizer w-full h-2 cursor-row-resize flex items-center justify-center hover:bg-blue-500/20 active:bg-blue-500/30 transition-colors border-t border-slate-200/80 dark:border-slate-800"
          title="Drag up or down to resize checklist height"
        >
          <div className="w-10 h-1 rounded-full bg-slate-300 dark:bg-slate-700 group-hover/resizer:bg-blue-500 transition-colors" />
        </div>
      )}

      {/* Screen-centered React Portal modal for category add & customization */}
      {isModalOpen &&
        createPortal(
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
            <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-2xl p-6 w-full max-w-md space-y-4 animate-scaleUp">
              <div className="flex items-center justify-between border-b border-slate-100 dark:border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Palette className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    {isNewCategoryModal ? 'Add Checklist Category' : `Customize ${modalCategoryName}`}
                  </h3>
                </div>
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isNewCategoryModal ? (
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1.5 uppercase tracking-wider">
                    Category Title
                  </label>
                  <input
                    type="text"
                    autoFocus
                    required
                    placeholder="e.g. Public Relations, Security, Logistics..."
                    value={modalCategoryTitle}
                    onChange={(e) => setModalCategoryTitle(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveCategoryModal();
                    }}
                    className="w-full text-sm px-3.5 py-2.5 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:ring-2 focus:ring-blue-500 outline-none"
                  />
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
                <div className="grid grid-cols-3 gap-2 h-[216px] max-h-[216px] overflow-y-auto pr-1">
                  {ICON_OPTIONS.map((opt) => {
                    const IconComp = opt.Component;
                    const isSelected = selectedIcon === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedIcon(opt.id)}
                        className={`flex flex-col items-center justify-center p-2 rounded-xl border text-xs gap-1.5 transition-all ${
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
                  disabled={!modalCategoryTitle.trim()}
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

// Sortable Column Card Component for horizontal column drag and drop
interface SortableColumnCardProps {
  cat: string;
  config: CategoryConfig;
  colorObj: (typeof COLOR_OPTIONS)[0];
  progress: number;
  isLocated: boolean;
  renderCategoryIcon: (cat: string) => React.ReactNode;
  getCategoryTitle: (cat: string) => string;
  activeAddCategory: string | null;
  setActiveAddCategory: (cat: string | null) => void;
  newItemText: string;
  setNewItemText: (text: string) => void;
  handleCreateItem: (cat: string) => Promise<void>;
  handleStartCustomize: (cat: string) => void;
  handleDeleteCategory: (cat: string) => Promise<void>;
  visibleItems: ChecklistItemData[];
  hiddenTasksCount: number;
  itemsMaxHeight: number;
  setContainerHeight: React.Dispatch<React.SetStateAction<number>>;
  editingId: string | null;
  editingText: string;
  setEditingText: (val: string) => void;
  setEditingId: (id: string | null) => void;
  handleSaveEdit: (id: string) => Promise<void>;
  onToggleItem: (id: string, isCompleted: boolean) => void;
  onDeleteItem: (id: string) => Promise<void>;
  totalItemsCount: number;
  isReadOnly?: boolean;
}

const SortableColumnCard: React.FC<SortableColumnCardProps> = ({
  cat,
  colorObj,
  progress,
  isLocated,
  renderCategoryIcon,
  getCategoryTitle,
  activeAddCategory,
  setActiveAddCategory,
  newItemText,
  setNewItemText,
  handleCreateItem,
  handleStartCustomize,
  handleDeleteCategory,
  visibleItems,
  hiddenTasksCount,
  itemsMaxHeight,
  setContainerHeight,
  editingId,
  editingText,
  setEditingText,
  setEditingId,
  handleSaveEdit,
  onToggleItem,
  onDeleteItem,
  totalItemsCount,
  isReadOnly = false,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: `col-${cat}`,
    data: { type: 'column', category: cat },
    disabled: isReadOnly,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  const isAddingThisCat = activeAddCategory === cat;

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      data-category={cat.toUpperCase()}
      className={`checklist-carousel-card min-w-[285px] max-w-[320px] flex-shrink-0 bg-white dark:bg-slate-800/80 border ${
        isLocated
          ? 'animate-locate-highlight ring-4 ring-offset-2 ring-emerald-500 border-emerald-500 z-20'
          : `border-slate-200 dark:border-slate-700/60 ${colorObj.borderHover}`
      } rounded-2xl p-3 shadow-sm flex flex-col justify-between group/card transition-all h-full`}
    >
      <div className="flex flex-col h-full min-h-0">
        {/* Card Header */}
        <div className="flex items-center justify-between mb-1.5 flex-shrink-0">
          <div className="flex items-center gap-1.5 min-w-0 flex-1">
            {/* Grip handle to reorder column horizontally */}
            {!isReadOnly && (
              <div
                {...listeners}
                className="cursor-grab active:cursor-grabbing p-0.5 text-slate-300 dark:text-slate-600 hover:text-slate-500 opacity-0 group-hover/card:opacity-100 transition-opacity flex-shrink-0"
                title="Drag to reorder column"
              >
                <GripHorizontal className="w-3.5 h-3.5" />
              </div>
            )}

            {renderCategoryIcon(cat)}
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate">
              {getCategoryTitle(cat)}
            </span>
          </div>

          {!isReadOnly && (
            <div className="flex items-center gap-1">
              <button
                onClick={() => handleStartCustomize(cat)}
                className="w-6 h-6 flex items-center justify-center rounded text-slate-400 hover:text-blue-500 opacity-0 group-hover/card:opacity-100 transition-opacity"
                title="Customize header and color"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => handleDeleteCategory(cat)}
                className="w-6 h-6 flex items-center justify-center rounded text-slate-300 hover:text-red-500 opacity-0 group-hover/card:opacity-100 transition-opacity"
                title="Delete category"
              >
                <Trash2 className="w-3 h-3" />
              </button>

              <button
                onClick={() => {
                  setActiveAddCategory(activeAddCategory === cat ? null : cat);
                  setNewItemText('');
                }}
                className="text-[10px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-0.5 px-1 py-0.5 rounded hover:bg-blue-50 dark:hover:bg-blue-950/40 transition-colors ml-0.5"
                title={`Add item to ${cat}`}
              >
                <Plus className="w-3 h-3" />
                <span>Add</span>
              </button>
            </div>
          )}
        </div>

        {/* Progress bar */}
        <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2 flex-shrink-0">
          <div
            className={`h-full ${colorObj.bgClass} transition-all duration-300`}
            style={{ width: `${progress}%` }}
          />
        </div>

        {/* Inline Add Item Input */}
        {!isReadOnly && isAddingThisCat && (
          <div className="flex items-center gap-1.5 p-1 rounded-lg bg-blue-50/60 dark:bg-slate-900 border border-blue-400 dark:border-blue-500 animate-fadeIn mb-2 flex-shrink-0">
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
            >
              <Check className="w-3 h-3" />
            </button>
            <button
              onClick={() => setActiveAddCategory(null)}
              className="w-6 h-6 flex items-center justify-center rounded bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Tasks List - Sortable vertically with @dnd-kit */}
        <div
          style={{ maxHeight: `${itemsMaxHeight}px` }}
          className="space-y-0.5 overflow-y-auto pr-1 flex-1 min-h-0"
        >
          {totalItemsCount === 0 ? (
            <div className="text-[11px] text-slate-400 italic py-2 text-center">
              No tasks added yet
            </div>
          ) : (
            <SortableContext
              items={visibleItems.map((i) => `task-${i.id}`)}
              strategy={verticalListSortingStrategy}
            >
              {visibleItems.map((item) => (
                <SortableTaskRow
                  key={item.id}
                  item={item}
                  editingId={editingId}
                  editingText={editingText}
                  setEditingText={setEditingText}
                  setEditingId={setEditingId}
                  handleSaveEdit={handleSaveEdit}
                  onToggleItem={onToggleItem}
                  onDeleteItem={onDeleteItem}
                  isReadOnly={isReadOnly}
                />
              ))}
            </SortableContext>
          )}
        </div>

        {/* "+n more items" indicator when collapsed/height-constrained (Requirement 1) */}
        {hiddenTasksCount > 0 && (
          <button
            type="button"
            onClick={() => setContainerHeight((h) => Math.min(520, h + 80))}
            className="w-full text-center py-1 mt-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50/70 dark:bg-blue-950/40 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/60 transition-colors flex-shrink-0 cursor-pointer"
            title="Click to expand view and show more items"
          >
            +{hiddenTasksCount} more item{hiddenTasksCount > 1 ? 's' : ''}
          </button>
        )}
      </div>
    </div>
  );
};
