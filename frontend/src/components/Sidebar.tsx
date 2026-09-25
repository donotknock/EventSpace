import React, { useState, useMemo, useEffect } from 'react';
import { EventItem, Priority, GlobalSearchResponse } from '../types';
import { formatEventDate } from '../utils/date';
import { api } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
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
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  events: EventItem[];
  activeEventId: string | null;
  onSelectEvent: (id: string) => void;
  onToggleMute: (id: string, e: React.MouseEvent) => void;
  onToggleCompleteEvent?: (id: string, isCompleted: boolean) => void;
  onLocateNode?: (nodeId: string, eventId: string) => void;
  onLocateChecklist?: (category: string, eventId: string, checklistId?: string) => void;
  onOpenSettings?: () => void;
  onOpenTrash?: () => void;
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

export const Sidebar: React.FC<SidebarProps> = ({
  isOpen,
  onClose,
  events,
  activeEventId,
  onSelectEvent,
  onToggleMute,
  onToggleCompleteEvent,
  onLocateNode,
  onLocateChecklist,
  onOpenSettings,
  onOpenTrash,
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
  const { enablePriority } = useSettings();
  const iconSrc = theme === 'light' ? '/EventSpace-Icon-Lightmode.png' : '/EventSpace-Icon-Darkmode.png';

  const [isSearchExpanded, setIsSearchExpanded] = useState(Boolean(searchQuery));
  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [isArchivedExpanded, setIsArchivedExpanded] = useState(false);
  const [globalResults, setGlobalResults] = useState<GlobalSearchResponse | null>(null);
  const [isSearchingGlobal, setIsSearchingGlobal] = useState(false);

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

  // Extract distinct metadata for filters
  const years = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.year) set.add(e.year);
    });
    return Array.from(set).sort();
  }, [events]);

  const departments = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
      if (e.department) set.add(e.department);
    });
    return Array.from(set).sort();
  }, [events]);

  const MONTH_NAMES = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

  const eventMonths = useMemo(() => {
    const set = new Set<string>();
    events.forEach((e) => {
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
  }, [events]);

  const activeEvents = useMemo(() => events.filter((e) => !e.isCompleted), [events]);
  const archivedEvents = useMemo(() => events.filter((e) => Boolean(e.isCompleted)), [events]);

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
      {/* Mobile Backdrop for tablet drawer */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-30 lg:hidden transition-opacity"
        />
      )}

      <aside
        className={`fixed lg:static top-0 bottom-0 left-0 z-40 flex-shrink-0 flex flex-col bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 transition-all duration-300 ease-in-out select-none ${
          isOpen
            ? 'w-80 translate-x-0 opacity-100'
            : 'w-0 -translate-x-full lg:translate-x-0 lg:w-0 overflow-hidden border-none opacity-0 pointer-events-none'
        }`}
      >
        {/* Sidebar Header & Brand */}
        <div className="h-16 px-4 flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <img
              src={iconSrc}
              alt="EventSpace"
              className="w-8 h-8 object-contain rounded-lg shadow-sm"
            />
            <div>
              <div className="font-extrabold text-base tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent">
                EventSpace
              </div>
              <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                Spatial Coordination
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            aria-label="Close sidebar"
            className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 lg:hidden"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Filter Controls (Collapsed into icon-only buttons by default) */}
        <div className="p-3 border-b border-slate-100 dark:border-slate-800/80 space-y-2">
          {/* Top Control Bar: Icon Buttons */}
          <div className="flex items-center gap-2">
            {!isSearchExpanded ? (
              <button
                onClick={() => setIsSearchExpanded(true)}
                className={`min-w-[44px] min-h-[44px] px-3 flex-1 flex items-center justify-center gap-2 rounded-xl text-xs font-semibold transition-all ${
                  searchQuery
                    ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-200 dark:border-blue-800'
                    : 'bg-slate-100 dark:bg-slate-800/70 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                }`}
                title="Search across all events, tasks, notes, checklists"
                aria-label="Open search bar"
              >
                <Search className="w-4 h-4 text-blue-500 flex-shrink-0" />
                <span className="truncate">
                  {searchQuery ? `"${searchQuery}"` : 'Search...'}
                </span>
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

            {/* Filter Icon Button */}
            <button
              onClick={() => setIsFilterExpanded(!isFilterExpanded)}
              className={`min-w-[44px] min-h-[44px] px-3 flex items-center justify-center gap-1.5 rounded-xl text-xs font-semibold transition-all relative ${
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
                <span>Event Directory ({activeEvents.length})</span>
                <Layers className="w-3.5 h-3.5" />
              </div>

              {activeEvents.length === 0 ? (
                <div className="text-center py-8 px-4 text-slate-400 text-xs">
                  No active events found.
                </div>
              ) : (
                activeEvents.map((event) => {
                  const isActive = event.id === activeEventId;

                  // Calculate Dynamic Task Indicators
                  const pendingTaskNodes = event.nodes
                    ? event.nodes.filter(
                        (n) => (n.type === 'task' || n.type === 'chaser') && !n.isCompleted
                      )
                    : [];
                  const pendingChecklists = event.checklists
                    ? event.checklists.filter((c) => !c.isCompleted)
                    : [];
                  const totalOutstanding = pendingTaskNodes.length + pendingChecklists.length;

                  const now = Date.now();
                  const hasUrgentOrOverdue = pendingTaskNodes.some((n) => {
                    if (!n.dueDate) return false;
                    const dueTime = new Date(n.dueDate).getTime();
                    return dueTime - now <= 48 * 60 * 60 * 1000;
                  });

                  return (
                    <div
                      key={event.id}
                      onClick={() => onSelectEvent(event.id)}
                      className={`group relative min-h-[56px] p-3 rounded-2xl cursor-pointer transition-all border flex items-center justify-between gap-3 ${
                        isActive
                          ? 'bg-blue-50/90 dark:bg-blue-950/40 border-blue-500/50 dark:border-blue-500/60 shadow-sm shadow-blue-500/10 ring-1 ring-blue-500/30'
                          : 'bg-white/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-100/80 dark:hover:bg-slate-800/80'
                      } ${event.isMuted ? 'opacity-65' : ''}`}
                    >
                      {/* Left: Dynamic Task Notification Dot + Event Title & Metadata */}
                      <div className="flex items-start gap-2.5 min-w-0 flex-1">
                        <div className="pt-0.5 flex-shrink-0">
                          {totalOutstanding === 0 ? (
                            <div
                              className="w-5 h-5 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center flex-shrink-0"
                              title="All tasks completed"
                            >
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            </div>
                          ) : hasUrgentOrOverdue ? (
                            <div
                              className="min-w-[20px] h-5 px-1.5 rounded-full bg-red-500 text-white font-black text-[10px] flex items-center justify-center shadow-sm shadow-red-500/40 ring-2 ring-red-500/20 flex-shrink-0 animate-pulse"
                              title={`${totalOutstanding} outstanding task(s) - Near-upcoming or overdue!`}
                            >
                              {totalOutstanding}
                            </div>
                          ) : (
                            <div
                              className="min-w-[20px] h-5 px-1.5 rounded-full bg-amber-500 text-white font-black text-[10px] flex items-center justify-center shadow-sm shadow-amber-500/40 ring-2 ring-amber-500/20 flex-shrink-0"
                              title={`${totalOutstanding} pending task(s)`}
                            >
                              {totalOutstanding}
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`text-xs font-bold truncate block ${
                                isActive
                                  ? 'text-blue-950 dark:text-blue-100 font-extrabold'
                                  : 'text-slate-800 dark:text-slate-200'
                              }`}
                            >
                              {event.title}
                            </span>
                          </div>

                          <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-500 dark:text-slate-400 truncate">
                            {event.department && <span>{event.department}</span>}
                            {formatEventDate(event.startDate, event.endDate) ? (
                              <>
                                {event.department && <span>•</span>}
                                <span>
                                  {formatEventDate(event.startDate, event.endDate)}
                                </span>
                              </>
                            ) : (
                              event.term &&
                              event.year && (
                                <>
                                  {event.department && <span>•</span>}
                                  <span>
                                    {event.term} {event.year}
                                  </span>
                                </>
                              )
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Complete Event Button & Touch-Friendly Mute Toggle */}
                      <div className="flex items-center gap-1 flex-shrink-0">
                        {/* Complete Event Checkbox Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onToggleCompleteEvent?.(event.id, true);
                          }}
                          aria-label="Mark event as complete (archive)"
                          title="Mark event complete & archive"
                          className="min-w-[36px] min-h-[36px] w-9 h-9 flex items-center justify-center rounded-xl text-slate-300 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all active:scale-90"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={(e) => onToggleMute(event.id, e)}
                          aria-label={event.isMuted ? 'Unmute event notifications' : 'Mute event notifications'}
                          title={event.isMuted ? 'Event Muted (Click to Unmute)' : 'Mute Notifications'}
                          className={`min-w-[36px] min-h-[36px] w-9 h-9 flex items-center justify-center rounded-xl transition-all active:scale-90 ${
                            event.isMuted
                              ? 'text-slate-400 dark:text-slate-500 bg-slate-200/60 dark:bg-slate-800/80 hover:bg-slate-300'
                              : 'text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-100/50 dark:hover:bg-slate-700/60'
                          }`}
                        >
                          {event.isMuted ? (
                            <BellOff className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                          ) : (
                            <Bell className="w-4 h-4 text-slate-400 group-hover:text-blue-500 dark:text-slate-400" />
                          )}
                        </button>
                      </div>
                    </div>
                  );
                })
              )}

              {/* Collapsible Archived Events Section */}
              {archivedEvents.length > 0 && (
                <div className="pt-3 mt-3 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2">
                  <button
                    onClick={() => setIsArchivedExpanded(!isArchivedExpanded)}
                    className="w-full flex items-center justify-between px-2 py-1.5 rounded-xl text-[11px] font-extrabold uppercase tracking-wider text-slate-400 dark:text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800/60 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <Archive className="w-3.5 h-3.5 text-slate-400" />
                      <span>Archived ({archivedEvents.length})</span>
                    </div>
                    {isArchivedExpanded ? (
                      <ChevronUp className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  {isArchivedExpanded && (
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

        {/* Bottom Sidebar Footer with Trash & Settings */}
        <div className="p-3 border-t border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/80 backdrop-blur flex-shrink-0 flex items-center gap-1.5">
          <button
            onClick={onOpenTrash}
            className="flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Open Trash Bin"
          >
            <Trash2 className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Trash</span>
          </button>
          <button
            onClick={onOpenSettings}
            className="flex-1 flex items-center justify-center gap-2 px-2 py-2 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="Open Settings"
          >
            <Settings className="w-4 h-4 text-slate-500 dark:text-slate-400" />
            <span>Settings</span>
          </button>
        </div>
      </aside>
    </>
  );
};
