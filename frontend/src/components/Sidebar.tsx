import React, { useState, useMemo, useEffect } from 'react';
import { EventItem, Priority, GlobalSearchResponse } from '../types';
import { formatEventDate } from '../utils/date';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useSettings, normalizeTrackedBlockType } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import {
  Sparkles,
  Search,
  Bell,
  BellOff,
  Filter,
  Layers,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Volume2,
  VolumeX,
  CheckSquare,
  CheckCircle2,
  Circle,
  Mic,
  Image as ImageIcon,
  FileText,
  ListChecks,
  Loader2,
  Clock,
  Archive,
  RotateCcw,
  Calendar,
  Settings,
  Trash2,
  Users,
  LayoutTemplate,
  Building2,
  LogOut,
  Menu,
  GripVertical,
} from 'lucide-react';
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
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sidebarWidth?: number;
  onSidebarWidthChange?: (w: number) => void;
  events: EventItem[];
  activeEventId: string | null;
  onSelectEvent: (id: string) => void;
  onToggleMute: (id: string, e: React.MouseEvent) => void;
  onToggleCompleteEvent?: (id: string, isCompleted: boolean) => void;
  onReorderEvents?: (orderedIds: string[]) => Promise<void>;
  onLocateNode?: (nodeId: string, eventId: string) => void;
  onLocateChecklist?: (category: string, eventId: string, checklistId?: string) => void;
  onOpenSettings?: () => void;
  onOpenTrash?: () => void;
  onOpenContacts?: () => void;
  onOpenTemplates?: () => void;
  onOpenVenues?: () => void;
  onLogout?: () => void;
  searchQuery: string;
  onSearchChange: (q: string) => void;
  selectedYear: string;
  onYearChange: (y: string) => void;
  selectedDept: string;
  onDeptChange: (d: string) => void;
  selectedTerm: string;
  onTermChange: (t: string) => void;
  selectedPriority: string;
  onPriorityChange: (p: string) => void;
}

interface SortableActiveEventItemProps {
  event: EventItem;
  isActive: boolean;
  isCollapsedMode: boolean;
  hasCustomColor: boolean;
  agendaCount: number;
  isViewer?: boolean;
  onSelectEvent: (id: string) => void;
  onToggleCompleteEvent?: (id: string, isCompleted: boolean) => void;
  onToggleMute: (id: string, e: React.MouseEvent) => void;
}

function getLuminance(hex: string): number {
  const cleanHex = hex.replace('#', '');
  if (cleanHex.length !== 6 && cleanHex.length !== 3) return 0;
  const fullHex = cleanHex.length === 3 
    ? cleanHex.split('').map(c => c + c).join('') 
    : cleanHex;
  const r = parseInt(fullHex.substring(0, 2), 16) / 255;
  const g = parseInt(fullHex.substring(2, 4), 16) / 255;
  const b = parseInt(fullHex.substring(4, 6), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function getEventAcronym(title: string): string {
  if (!title) return 'EV';
  const words = title.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) {
    const letters = words.map(w => w.replace(/[^a-zA-Z0-9]/g, '').charAt(0)).filter(Boolean);
    if (letters.length >= 2) {
      return letters.slice(0, 2).join('').toUpperCase();
    }
  }
  const clean = title.replace(/[^a-zA-Z0-9]/g, '');
  return (clean.slice(0, 2) || 'EV').toUpperCase();
}

const SortableActiveEventItem: React.FC<SortableActiveEventItemProps> = ({
  event,
  isActive,
  isCollapsedMode,
  hasCustomColor,
  agendaCount,
  isViewer = false,
  onSelectEvent,
  onToggleCompleteEvent,
  onToggleMute,
}) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: event.id,
    disabled: isCollapsedMode,
  });

  const isViewerRole = isViewer || (event as any).role === 'VIEWER' || (event as any).role === 'viewer' || (event as any).userRole === 'viewer';
  const isLightCustomBg = hasCustomColor && event.color ? getLuminance(event.color) > 0.6 : false;
  const textCustomClass = isLightCustomBg ? 'text-slate-900' : 'text-white';

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : event.isMuted ? 0.65 : 1,
    zIndex: isDragging ? 50 : undefined,
    backgroundColor: hasCustomColor ? event.color! : undefined,
  };

  if (isCollapsedMode) {
    const acronym = getEventAcronym(event.title);
    return (
      <div
        key={event.id}
        onClick={() => onSelectEvent(event.id)}
        title={`${event.title} (${agendaCount || 0} scheduled item(s))`}
        style={hasCustomColor ? { backgroundColor: event.color! } : undefined}
        className={`w-11 h-11 mx-auto rounded-2xl cursor-pointer transition-all border flex items-center justify-center relative ${
          hasCustomColor
            ? `border-transparent ${textCustomClass} ${
                isActive ? 'ring-2 ring-white shadow-md' : 'hover:opacity-95'
              }`
            : isActive
            ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-500 shadow-sm ring-2 ring-blue-500/30'
            : 'bg-white/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
        }`}
      >
        <span className={`flex items-center justify-center font-bold text-xs ${hasCustomColor ? textCustomClass : 'text-slate-700 dark:text-slate-200'}`}>
          {acronym}
        </span>
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={() => onSelectEvent(event.id)}
      className={`group relative min-h-[56px] p-2.5 rounded-2xl cursor-pointer transition-all border flex items-center justify-between gap-2 ${
        event.isCompleted
          ? 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 opacity-80'
          : hasCustomColor
          ? `border-transparent ${textCustomClass} shadow-sm hover:shadow-md ${
              isActive ? 'ring-2 ring-white/90 shadow-md scale-[1.01]' : 'hover:scale-[1.005]'
            }`
          : isActive
          ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-500/50 dark:border-blue-500/60 shadow-sm shadow-blue-500/10 ring-1 ring-blue-500/30'
          : 'bg-white/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
      }`}
    >
      {/* Left: Drag Handle + Details */}
      <div className="flex items-center gap-1.5 min-w-0 flex-1">
        <div
          {...attributes}
          {...listeners}
          onClick={(e) => e.stopPropagation()}
          className="cursor-grab active:cursor-grabbing p-1 text-slate-300 dark:text-slate-600 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 -ml-1 nodrag nopan"
          title="Drag to reorder event"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5 flex-wrap">
            <span
              className={`text-xs font-bold truncate ${
                hasCustomColor
                  ? textCustomClass
                  : isActive
                  ? 'text-blue-950 dark:text-blue-100 font-extrabold'
                  : 'text-slate-800 dark:text-slate-200'
              }`}
            >
              {event.title}
            </span>

            {/* Agenda Counter strictly matching agenda */}
            {agendaCount > 0 && (
              <span
                className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black shrink-0 ${
                  hasCustomColor
                    ? isLightCustomBg
                      ? 'bg-black/10 text-slate-900 border border-black/20'
                      : 'bg-black/30 text-white border border-white/20'
                    : 'bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20'
                }`}
                title={`${agendaCount} scheduled task(s)`}
              >
                <Calendar className="w-2.5 h-2.5" />
                <span>{agendaCount}</span>
              </span>
            )}
          </div>

          <div className={`flex items-center gap-2 text-[10px] mt-0.5 truncate font-medium opacity-90 ${hasCustomColor ? textCustomClass : 'text-slate-400'}`}>
            {event.department && <span className="truncate">{event.department}</span>}
            {formatEventDate(event.startDate, event.endDate) ? (
              <>
                {event.department && <span>•</span>}
                <span className="truncate">{formatEventDate(event.startDate, event.endDate)}</span>
              </>
            ) : (
              event.term && event.year && (
                <>
                  {event.department && <span>•</span>}
                  <span className="truncate">{event.term} {event.year}</span>
                </>
              )
            )}
          </div>
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
        {!isViewerRole && onToggleCompleteEvent && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleCompleteEvent(event.id, true);
            }}
            aria-label="Mark event as complete (archive)"
            title="Mark event complete & archive"
            className={`min-w-[32px] min-h-[32px] w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90 ${
              hasCustomColor
                ? isLightCustomBg
                  ? 'text-slate-900/75 hover:text-slate-900 hover:bg-black/10'
                  : 'text-white/75 hover:text-white hover:bg-white/20'
                : 'text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
          </button>
        )}

        <button
          onClick={(e) => onToggleMute(event.id, e)}
          aria-label={event.isMuted ? 'Unmute event notifications' : 'Mute event notifications'}
          title={event.isMuted ? 'Event Muted (Click to Unmute)' : 'Mute Notifications'}
          className={`min-w-[32px] min-h-[32px] w-8 h-8 flex items-center justify-center rounded-xl transition-all active:scale-90 ${
            hasCustomColor
              ? isLightCustomBg
                ? event.isMuted
                  ? 'text-slate-900/50 bg-black/10 hover:bg-black/20'
                  : 'text-slate-900/75 hover:text-slate-900 hover:bg-black/10'
                : event.isMuted
                ? 'text-white/50 bg-black/20 hover:bg-black/30'
                : 'text-white/75 hover:text-white hover:bg-white/20'
              : event.isMuted
              ? 'text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-800/80 hover:bg-slate-300'
              : 'text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100/50 dark:hover:bg-slate-700/60'
          }`}
        >
          {event.isMuted ? <BellOff className="w-4 h-4" /> : <Bell className="w-4 h-4" />}
        </button>
      </div>
    </div>
  );
};

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  sidebarWidth: controlledWidth,
  onSidebarWidthChange,
  events,
  activeEventId,
  onSelectEvent,
  onToggleMute,
  onToggleCompleteEvent,
  onReorderEvents,
  onLocateNode,
  onLocateChecklist,
  onOpenSettings,
  onOpenTrash,
  onOpenContacts,
  onOpenTemplates,
  onOpenVenues,
  onLogout,
  searchQuery,
  onSearchChange,
  selectedYear,
  onYearChange,
  selectedDept,
  onDeptChange,
  selectedTerm,
  onTermChange,
  selectedPriority,
  onPriorityChange,
}) => {
  const { theme } = useTheme();
  const { enablePriority, trackSubtasksInAgenda, trackBlocksInAgenda, trackedBlockTypes } = useSettings();
  const { user } = useAuth();
  const isViewer = user?.role === 'viewer';
  const iconSrc = theme === 'light' ? '/EventSpace-Icon-Lightmode.png' : '/EventSpace-Icon-Darkmode.png';

  const [isSearchExpanded, setIsSearchExpanded] = useState(Boolean(searchQuery));
  const [isLibraryExpanded, setIsLibraryExpanded] = useState(false);
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);
  const [globalResults, setGlobalResults] = useState<GlobalSearchResponse | null>(null);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Resizable sidebar state (stored in localStorage)
  const [internalSidebarWidth, setInternalSidebarWidth] = useState<number>(() => {
    try {
      const saved = localStorage.getItem('eventspace_sidebar_width');
      return saved ? Math.min(500, Math.max(72, parseInt(saved, 10))) : 288;
    } catch {
      return 288;
    }
  });

  const sidebarWidth = controlledWidth !== undefined ? controlledWidth : internalSidebarWidth;
  const isCollapsedMode = sidebarWidth < 160;

  const setSidebarWidth = (w: number) => {
    if (onSidebarWidthChange) {
      onSidebarWidthChange(w);
    } else {
      setInternalSidebarWidth(w);
    }
  };

  const handleToggleCollapse = () => {
    if (isCollapsedMode) {
      const prev = parseInt(localStorage.getItem('eventspace_prev_sidebar_width') || '288', 10);
      const newW = prev >= 160 ? prev : 288;
      setSidebarWidth(newW);
    } else {
      localStorage.setItem('eventspace_prev_sidebar_width', String(sidebarWidth));
      setSidebarWidth(72);
    }
  };

  const handleStartResize = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startW = sidebarWidth;

    const onMouseMove = (moveEvent: MouseEvent) => {
      const delta = moveEvent.clientX - startX;
      let newW = startW + delta;
      if (newW < 140) {
        newW = 72; // Snap to compact icon-only column
      } else {
        newW = Math.min(520, Math.max(160, newW));
      }
      setSidebarWidth(newW);
    };

    const onMouseUp = () => {
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
      try {
        localStorage.setItem('eventspace_sidebar_width', String(sidebarWidth));
      } catch {}
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  };

  useEffect(() => {
    if (!searchQuery.trim()) {
      setGlobalResults(null);
      return;
    }
    setIsSearchingGlobal(true);
    const timer = setTimeout(() => {
      api
        .globalSearch(searchQuery.trim())
        .then((res) => setGlobalResults(res))
        .catch((err) => console.error('Global search error:', err))
        .finally(() => setIsSearchingGlobal(false));
    }, 200);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const activeEvents = useMemo(
    () => events.filter((e) => !e.isCompleted && e.status !== 'archived'),
    [events]
  );
  const archivedEvents = useMemo(
    () => events.filter((e) => Boolean(e.isCompleted) || e.status === 'archived'),
    [events]
  );

  // Extract distinct metadata for filters strictly from active, non-archived events
  const years = useMemo(() => {
    const set = new Set<string>();
    activeEvents.forEach((e) => {
      if (e.year) set.add(e.year);
    });
    return Array.from(set).sort();
  }, [activeEvents]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    activeEvents.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [activeEvents]);

  const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  const eventMonths = useMemo(() => {
    const set = new Set<string>();
    activeEvents.forEach((e) => {
      if (e.startDate) {
        const d = new Date(e.startDate);
        if (!isNaN(d.getTime())) {
          const m = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();
          set.add(m);
        }
      } else if (e.term) {
        set.add(e.term.toUpperCase());
      }
    });
    return Array.from(set).sort((a, b) => {
      const ia = MONTH_NAMES.indexOf(a);
      const ib = MONTH_NAMES.indexOf(b);
      if (ia !== -1 && ib !== -1) return ia - ib;
      return a.localeCompare(b);
    });
  }, [activeEvents]);

  const getNodeTintClasses = (type: string) => {
    switch (type.toLowerCase()) {
      case 'audio':
        return 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800/80 hover:border-purple-500 text-purple-950 dark:text-purple-100 shadow-sm shadow-purple-500/5';
      case 'task':
        return 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800/80 hover:border-blue-500 text-blue-950 dark:text-blue-100 shadow-sm shadow-blue-500/5';
      case 'chaser':
        return 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 hover:border-amber-500 text-amber-950 dark:text-amber-100 shadow-sm shadow-amber-500/5';
      case 'info':
        return 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80 hover:border-emerald-500 text-emerald-950 dark:text-emerald-100 shadow-sm shadow-emerald-500/5';
      case 'picture':
        return 'bg-rose-50/80 dark:bg-rose-950/40 border-rose-300 dark:border-rose-800/80 hover:border-rose-500 text-rose-950 dark:text-rose-100 shadow-sm shadow-rose-500/5';
      case 'note':
      default:
        return 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-300 dark:border-indigo-800/80 hover:border-indigo-500 text-indigo-950 dark:text-indigo-100 shadow-sm shadow-indigo-500/5';
    }
  };

  const getChecklistTintClasses = (category: string) => {
    switch (category.toUpperCase()) {
      case 'FM':
        return 'bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-800/80 hover:border-emerald-500 text-emerald-950 dark:text-emerald-100 shadow-sm';
      case 'AV':
        return 'bg-blue-50/80 dark:bg-blue-950/40 border-blue-300 dark:border-blue-800/80 hover:border-blue-500 text-blue-950 dark:text-blue-100 shadow-sm';
      case 'CT':
      case 'SODEXO':
      case 'CATERING':
        return 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800/80 hover:border-amber-500 text-amber-950 dark:text-amber-100 shadow-sm';
      default:
        return 'bg-purple-50/80 dark:bg-purple-950/40 border-purple-300 dark:border-purple-800/80 hover:border-purple-500 text-purple-950 dark:text-purple-100 shadow-sm';
    }
  };

  const hasActiveFilters = Boolean(
    selectedYear || selectedDept || selectedTerm || (enablePriority && selectedPriority)
  );

  const resetFilters = () => {
    onYearChange('');
    onDeptChange('');
    onTermChange('');
    onPriorityChange('');
  };

  return (
    <>
      <aside
        style={isOpen ? { width: `${isCollapsedMode ? 72 : sidebarWidth}px` } : undefined}
        className={`flex-shrink-0 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-[width] duration-150 select-none relative z-20 ${
          isOpen
            ? 'translate-x-0 opacity-100'
            : 'w-0 overflow-hidden border-none opacity-0 pointer-events-none'
        }`}
      >
        {/* Resize Handle on Right Border */}
        {isOpen && (
          <div
            onMouseDown={handleStartResize}
            className="hidden lg:block absolute right-0 top-0 bottom-0 w-2 cursor-col-resize hover:bg-blue-500/40 transition-colors z-30 group"
            title="Drag to resize sidebar"
          >
            <div className="w-0.5 h-8 bg-slate-300 dark:bg-slate-700 group-hover:bg-blue-500 rounded-full mx-auto relative top-1/2 -translate-y-1/2" />
          </div>
        )}

        {/* Sidebar Header & Brand */}
        <div className={`h-16 px-3 flex items-center border-b border-slate-200 dark:border-slate-800 ${
          isCollapsedMode ? 'justify-center' : 'justify-between'
        }`}>
          {!isCollapsedMode ? (
            <>
              <div className="flex items-center gap-2.5 min-w-0">
                <img
                  src={iconSrc}
                  alt="EventSpace"
                  className="w-8 h-8 object-contain rounded-lg shadow-sm shrink-0"
                />
                <div className="min-w-0">
                  <div className="font-extrabold text-base tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent truncate">
                    EventSpace
                  </div>
                  <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500 truncate">
                    Spatial Coordination
                  </div>
                </div>
              </div>

              {/* Collapse hamburger icon on the RIGHT side of the left sidebar */}
              <button
                onClick={handleToggleCollapse}
                aria-label="Collapse sidebar"
                className="min-w-[40px] min-h-[40px] w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                title="Collapse sidebar"
              >
                <Menu className="w-5 h-5" />
              </button>
            </>
          ) : (
            /* When collapsed: App name and logos HIDDEN, leaving only the hamburger visible */
            <button
              onClick={handleToggleCollapse}
              aria-label="Expand sidebar"
              className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors mx-auto"
              title="Expand sidebar"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Search & Filter Controls (Collapsed into icon-only buttons by default) */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 space-y-2">
          {/* Top Control Bar: Icon Buttons (Vertical stacking when minimized) */}
          <div className={`flex ${isCollapsedMode ? 'flex-col gap-2 items-center' : 'items-center gap-2'}`}>
            {!isSearchExpanded || isCollapsedMode ? (
              <button
                onClick={() => {
                  if (isCollapsedMode) {
                    setSidebarWidth(288);
                    setIsSearchExpanded(true);
                  } else {
                    setIsSearchExpanded(true);
                  }
                }}
                className={`min-w-[44px] min-h-[44px] ${isCollapsedMode ? 'w-11 h-11 p-0' : 'px-3 flex-1'} flex items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-all ${
                  searchQuery
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
                title="Search across all events, tasks, notes, checklists"
                aria-label="Open search bar"
              >
                <Search className="w-4 h-4 text-blue-500 flex-shrink-0" />
                {!isCollapsedMode && (
                  <span className="truncate">
                    {searchQuery ? `"${searchQuery}"` : 'Search...'}
                  </span>
                )}
              </button>
            ) : (
              <div className="relative flex-1">
                <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  autoFocus
                  value={searchQuery}
                  onChange={(e) => onSearchChange(e.target.value)}
                  placeholder="Search tasks, notes, checklists..."
                  className="w-full h-11 pl-10 pr-9 rounded-xl bg-slate-100 dark:bg-slate-800/70 border border-blue-400 dark:border-blue-500 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
                />
                <button
                  onClick={() => {
                    onSearchChange('');
                    setIsSearchExpanded(false);
                  }}
                  className="min-w-[32px] min-h-[32px] w-8 h-8 absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
                  title="Close search"
                  aria-label="Close search"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Library / Resources Drawer Button (positioned directly between Search and Filter) */}
            <button
              onClick={() => {
                if (isCollapsedMode) {
                  setSidebarWidth(288);
                  setIsLibraryExpanded(true);
                } else {
                  setIsLibraryExpanded(!isLibraryExpanded);
                }
              }}
              className={`min-w-[44px] min-h-[44px] w-11 h-11 p-0 flex items-center justify-center rounded-xl text-xs font-semibold transition-all shrink-0 relative ${
                isLibraryExpanded
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
              title="Library & Resources (Templates, Contacts, Venues)"
              aria-label="Toggle Library drawer"
            >
              <Layers className="w-4 h-4 flex-shrink-0" />
            </button>

            {/* Filter Icon Button */}
            <button
              onClick={() => {
                if (isCollapsedMode) {
                  setSidebarWidth(288);
                  setIsFilterExpanded(true);
                } else {
                  setIsFilterExpanded(!isFilterExpanded);
                }
              }}
              className={`min-w-[44px] min-h-[44px] ${isCollapsedMode ? 'w-11 h-11 p-0' : 'px-3'} flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-all relative ${
                hasActiveFilters || isFilterExpanded
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
              }`}
              title="Filter dimensions"
              aria-label="Toggle filter dimensions"
            >
              <Filter className="w-4 h-4" />
              {hasActiveFilters && !isFilterExpanded && (
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>
          </div>

          {/* Library Drawer (Expanded on Click) */}
          {isLibraryExpanded && (
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-1 animate-fadeIn">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-200/60 dark:border-slate-700/60 mb-1">
                <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                  Workspace Library
                </span>
                <button
                  onClick={() => setIsLibraryExpanded(false)}
                  className="text-[10px] text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-0.5"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>

              <button
                onClick={onOpenTemplates}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-white dark:hover:bg-slate-800 shadow-sm transition-colors text-left"
              >
                <LayoutTemplate className="w-4 h-4 text-indigo-500 flex-shrink-0" />
                <span className="truncate">Templates</span>
              </button>

              <button
                onClick={onOpenContacts}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-800 shadow-sm transition-colors text-left"
              >
                <Users className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="truncate">Contacts</span>
              </button>

              <button
                onClick={onOpenVenues}
                className="w-full flex items-center gap-2.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-purple-600 dark:hover:text-purple-400 hover:bg-white dark:hover:bg-slate-800 shadow-sm transition-colors text-left"
              >
                <Building2 className="w-4 h-4 text-purple-500 flex-shrink-0" />
                <span className="truncate">Venues</span>
              </button>
            </div>
          )}

          {/* Filter Pills Drawer (Expanded on Click) */}
          {isFilterExpanded && (
            <div className="p-2.5 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3 animate-fadeIn">
              {/* By Year */}
              <div>
                <label className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                  By Year
                </label>
                <div className="flex flex-wrap gap-1.5 mt-1">
                  <button
                    onClick={() => onYearChange('')}
                    className={`min-h-[36px] px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                      !selectedYear
                        ? 'bg-blue-600 text-white shadow-sm'
                        : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                    }`}
                  >
                    All
                  </button>
                  {years.map((y) => (
                    <button
                      key={y}
                      onClick={() => onYearChange(selectedYear === y ? '' : y)}
                      className={`min-h-[36px] px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                        selectedYear === y
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      {y}
                    </button>
                  ))}
                </div>
              </div>

              {/* By Department */}
              {departments.length > 0 && (
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                    By Department
                  </label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <button
                      onClick={() => onDeptChange('')}
                      className={`min-h-[36px] px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                        !selectedDept
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      All
                    </button>
                    {departments.map((d) => (
                      <button
                        key={d}
                        onClick={() => onDeptChange(selectedDept === d ? '' : d)}
                        className={`min-h-[36px] px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                          selectedDept === d
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {d}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* By Month */}
              {eventMonths.length > 0 && (
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                    By Month
                  </label>
                  <div className="flex flex-wrap gap-1.5 mt-1">
                    <button
                      onClick={() => onTermChange('')}
                      className={`min-h-[36px] px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                        !selectedTerm
                          ? 'bg-blue-600 text-white shadow-sm'
                          : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                      }`}
                    >
                      All
                    </button>
                    {eventMonths.map((m) => (
                      <button
                        key={m}
                        onClick={() => onTermChange(selectedTerm === m ? '' : m)}
                        className={`min-h-[36px] px-2.5 py-1 text-xs rounded-lg font-medium transition-all ${
                          selectedTerm === m
                            ? 'bg-blue-600 text-white shadow-sm'
                            : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                        }`}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Priority Filter */}
              {enablePriority && (
                <div>
                  <label className="text-[10px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                    Priority
                  </label>
                  <div className="flex gap-1.5 mt-1">
                    {(['all', 'high', 'med', 'low'] as const).map((p) => {
                      const isSelected = p === 'all' ? !selectedPriority : selectedPriority === p;
                      return (
                        <button
                          key={p}
                          onClick={() => onPriorityChange(p === 'all' ? '' : p)}
                          className={`min-h-[36px] px-2.5 py-1 text-xs rounded-lg font-medium capitalize transition-all ${
                            isSelected
                              ? 'bg-blue-600 text-white'
                              : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
                          }`}
                        >
                          {p}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {hasActiveFilters && (
                <button
                  onClick={resetFilters}
                  className="w-full text-center text-xs text-blue-600 dark:text-blue-400 hover:underline pt-1"
                >
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Dynamic Event Directory List OR Swapped Search Results Panel */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2 focus:outline-none">
          {searchQuery.trim() ? (
            /* SWAPPED SEARCH RESULTS PANEL */
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1 py-1 text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase border-b border-slate-100 dark:border-slate-800 pb-1.5">
                <span className="flex items-center gap-1.5">
                  <Search className="w-3.5 h-3.5 text-blue-500" />
                  <span>Search Results</span>
                </span>
                <button
                  onClick={() => onSearchChange('')}
                  className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline capitalize"
                >
                  Clear search
                </button>
              </div>

              {isSearchingGlobal ? (
                <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
                  <span>Searching events, checklists & tasks...</span>
                </div>
              ) : !globalResults ||
                (globalResults.events.length === 0 &&
                  globalResults.checklists.length === 0 &&
                  globalResults.nodes.length === 0) ? (
                <div className="text-center py-8 px-3 text-slate-400 text-xs">
                  No matching items found for "{searchQuery}".
                </div>
              ) : (
                <div className="space-y-3.5">
                  {/* Matching Events */}
                  {globalResults.events.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1">
                        Events ({globalResults.events.length})
                      </div>
                      {globalResults.events.map((ev) => (
                        <div
                          key={ev.id}
                          onClick={() => {
                            onSelectEvent(ev.id);
                            onClose();
                          }}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all text-xs ${
                            ev.id === activeEventId
                              ? 'bg-blue-50 dark:bg-blue-950/50 border-blue-400 font-bold'
                              : 'bg-white/70 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 hover:border-blue-300'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold text-slate-800 dark:text-slate-100 truncate">
                              {ev.title}
                            </span>
                            {enablePriority && ev.priority && (
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-400 flex-shrink-0">
                                {ev.priority}
                              </span>
                            )}
                          </div>
                          {ev.department && (
                            <span className="text-[10px] text-slate-400 block mt-0.5">
                              {ev.department}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Matching Overarching Checklists */}
                  {globalResults.checklists.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1">
                        <ListChecks className="w-3.5 h-3.5 text-emerald-500" />
                        <span>Checklists ({globalResults.checklists.length})</span>
                      </div>
                      {globalResults.checklists.map((chk) => (
                        <div
                          key={chk.id}
                          onClick={() => {
                            onSelectEvent(chk.event.id);
                            onLocateChecklist?.(chk.category, chk.event.id, chk.id);
                            onClose();
                          }}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all space-y-1 text-xs ${getChecklistTintClasses(
                            chk.category
                          )}`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-white/70 dark:bg-slate-900/60 font-bold flex-shrink-0">
                              {chk.category}
                            </span>
                            <span className="truncate flex-1 font-medium">
                              {chk.content}
                            </span>
                          </div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block font-normal">
                            In: <strong className="font-semibold text-slate-600 dark:text-slate-300">{chk.event.title}</strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Matching Tasks & Building Blocks */}
                  {globalResults.nodes.length > 0 && (
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-1 flex items-center gap-1">
                        <CheckSquare className="w-3.5 h-3.5 text-blue-500" />
                        <span>Tasks & Blocks ({globalResults.nodes.length})</span>
                      </div>
                      {globalResults.nodes.map((node) => (
                        <div
                          key={node.id}
                          onClick={() => {
                            onSelectEvent(node.event.id);
                            onLocateNode?.(node.id, node.event.id);
                            onClose();
                          }}
                          className={`p-2.5 rounded-xl border cursor-pointer transition-all space-y-1 text-xs ${getNodeTintClasses(
                            node.type
                          )}`}
                        >
                          <div className="flex items-center justify-between gap-1">
                            <span className="font-bold truncate">
                              {node.title}
                            </span>
                            <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">
                              {node.dueDate && (
                                <span className="text-[10px] font-bold text-amber-700 dark:text-amber-400 bg-amber-50/80 dark:bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-200/80 dark:border-amber-800/60 flex items-center gap-1">
                                  <Calendar className="w-2.5 h-2.5" />
                                  <span>
                                    {new Date(node.dueDate).toLocaleDateString(undefined, {
                                      month: 'short',
                                      day: 'numeric',
                                    })}
                                  </span>
                                </span>
                              )}
                              <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-white/70 dark:bg-slate-900/60">
                                {node.type}
                              </span>
                            </div>
                          </div>
                          {node.content && (
                            <p className="text-[11px] opacity-80 line-clamp-2">
                              {node.content}
                            </p>
                          )}
                          <span className="text-[10px] opacity-70 block font-normal">
                            In: <strong className="font-semibold">{node.event.title}</strong>
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            /* STANDARD EVENT DIRECTORY LIST */
            <>
              <div className="flex items-center justify-between px-1 py-1 text-[11px] font-bold tracking-wider text-slate-400 dark:text-slate-500 uppercase">
                {sidebarWidth >= 200 && <span>Event Directory ({activeEvents.length})</span>}
              </div>

              {activeEvents.length === 0 ? (
                <div className="text-center py-8 px-4 text-slate-400 text-xs">
                  No active events found.
                </div>
              ) : (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCenter}
                  onDragEnd={async (event) => {
                    const { active, over } = event;
                    if (!over || active.id === over.id) return;
                    const oldIndex = activeEvents.findIndex((e) => e.id === active.id);
                    const newIndex = activeEvents.findIndex((e) => e.id === over.id);
                    if (oldIndex !== -1 && newIndex !== -1) {
                      const reordered = arrayMove(activeEvents, oldIndex, newIndex);
                      const orderedIds = reordered.map((e) => e.id);
                      if (onReorderEvents) {
                        await onReorderEvents(orderedIds);
                      }
                    }
                  }}
                >
                  <SortableContext
                    items={activeEvents.map((e) => e.id)}
                    strategy={verticalListSortingStrategy}
                  >
                    <div className="space-y-1.5">
                      {activeEvents.map((event) => {
                        const isActive = event.id === activeEventId;

                        // Calculate complete dated items count (block nodes + subtasks) strictly matching agenda
                        let count = 0;
                        (event.nodes || []).forEach((n: any) => {
                          const blockType = normalizeTrackedBlockType(n.type);
                          if (!trackedBlockTypes.includes(blockType)) return;
                          if (trackBlocksInAgenda && n.dueDate && !n.isCompleted) {
                            count++;
                          }
                          if (trackSubtasksInAgenda && !n.isCompleted && n.metadata) {
                            let subtasks: any[] = [];
                            if (Array.isArray(n.metadata.subtasks)) {
                              subtasks = n.metadata.subtasks;
                            } else if (typeof n.metadata === 'string') {
                              try {
                                const parsed = JSON.parse(n.metadata);
                                if (Array.isArray(parsed.subtasks)) subtasks = parsed.subtasks;
                              } catch {}
                            }
                            subtasks.forEach((st: any) => {
                              if (st.dueDate && !st.done && st.style !== 'bullet') {
                                count++;
                              }
                            });
                          }
                        });
                        const agendaCount = count;
                        const hasCustomColor = Boolean(event.color && event.color.trim() && !event.isCompleted);

                        return (
                          <SortableActiveEventItem
                            key={event.id}
                            event={event}
                            isActive={isActive}
                            isCollapsedMode={isCollapsedMode}
                            hasCustomColor={hasCustomColor}
                            agendaCount={agendaCount}
                            isViewer={isViewer}
                            onSelectEvent={onSelectEvent}
                            onToggleCompleteEvent={onToggleCompleteEvent}
                            onToggleMute={onToggleMute}
                          />
                        );
                      })}
                    </div>
                  </SortableContext>
                </DndContext>
              )}

              {/* Collapsible Archived Events Section */}
              {archivedEvents.length > 0 && (
                <div className="pt-3 mt-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2">
                  {isCollapsedMode ? (
                    <button
                      onClick={() => {
                        setSidebarWidth(288);
                        setIsArchivedExpanded(true);
                      }}
                      className="w-11 h-11 mx-auto flex items-center justify-center rounded-xl text-slate-400 hover:text-blue-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                      title="Archived Events"
                    >
                      <Archive className="w-4 h-4 text-slate-400" />
                    </button>
                  ) : (
                    <button
                      onClick={() => setIsArchivedExpanded(!isArchivedExpanded)}
                      className="w-full flex items-center justify-between px-2 py-1.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer min-w-0"
                    >
                      <div className="flex items-center gap-1.5 min-w-0 truncate">
                        <Archive className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="truncate">Archived</span>
                      </div>
                      {isArchivedExpanded ? (
                        <ChevronUp className="w-3.5 h-3.5 shrink-0 ml-1" />
                      ) : (
                        <ChevronDown className="w-3.5 h-3.5 shrink-0 ml-1" />
                      )}
                    </button>
                  )}

                  {isArchivedExpanded && !isCollapsedMode && (
                    <div className="space-y-2 pl-0.5 animate-fadeIn">
                      {archivedEvents.map((event) => {
                        const isActive = event.id === activeEventId;
                        return (
                          <div
                            key={event.id}
                            onClick={() => onSelectEvent(event.id)}
                            className={`group relative min-h-[52px] p-2.5 rounded-2xl cursor-pointer transition-all border flex items-center justify-between gap-2.5 opacity-80 hover:opacity-100 ${
                              isActive
                                ? 'bg-blue-50/80 dark:bg-blue-950/30 border-blue-400 dark:border-blue-700'
                                : 'bg-slate-50/60 dark:bg-slate-800/30 border-slate-200 dark:border-slate-800/70 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300 truncate">
                                  {event.title}
                                </span>
                                <span className="text-[9px] font-bold uppercase px-1.5 py-0.2 rounded bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 flex-shrink-0">
                                  Complete
                                </span>
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5 truncate">
                                {event.department && <span>{event.department}</span>}
                              </div>
                            </div>

                            {/* Restore / Unarchive Button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onToggleCompleteEvent?.(event.id, false);
                              }}
                              title="Restore event to active directory"
                              aria-label="Restore event to active directory"
                              className="min-w-[36px] min-h-[36px] w-9 h-9 flex items-center justify-center rounded-xl text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-slate-700/60 transition-all active:scale-90"
                            >
                              <RotateCcw className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {/* Bottom Sidebar Footer */}
        {isCollapsedMode ? (
          <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur flex-shrink-0 flex flex-col items-center gap-2">
            <button
              onClick={onOpenTrash}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-rose-600 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Trash"
            >
              <Trash2 className="w-4 h-4" />
            </button>
            <button
              onClick={onOpenSettings}
              className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              title="Settings"
            >
              <Settings className="w-4 h-4" />
            </button>
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-10 h-10 flex items-center justify-center rounded-xl text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            )}
          </div>
        ) : (
          <div className="p-2.5 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur flex-shrink-0 space-y-1.5">
            {/* Side-by-Side: Trash and Settings taking up 50% width each */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={onOpenTrash}
                className="w-1/2 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Open Trash Bin"
              >
                <Trash2 className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                <span className="truncate">Trash</span>
              </button>

              <button
                onClick={onOpenSettings}
                className="w-1/2 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Open Settings"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400 flex-shrink-0" />
                <span className="truncate">Settings</span>
              </button>
            </div>

            {/* Clear Logout Button */}
            {onLogout && (
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-xl text-[11px] font-semibold text-slate-400 hover:text-red-500 hover:bg-red-50/50 dark:hover:bg-red-950/30 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Sign Out</span>
              </button>
            )}
          </div>
        )}
      </aside>
    </>
  );
};
