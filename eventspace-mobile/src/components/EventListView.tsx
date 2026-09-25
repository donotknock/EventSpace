import React, { useState, useEffect, useMemo } from 'react';
import {
  Calendar,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  Settings,
  RefreshCw,
  FolderKanban,
  ChevronRight,
  Sun,
  Moon,
  Contrast,
  AlertCircle,
  Sparkles,
  Plus,
} from 'lucide-react';
import type { EventItem, ServerConfig } from '../types';
import { mobileApi } from '../services/api';
import { useTheme } from '../context/ThemeContext';
import { CreateEventModal } from './CreateEventModal';

interface EventListViewProps {
  config: ServerConfig;
  onSelectEvent: (event: EventItem) => void;
  onOpenSettings: () => void;
  onOpenAgenda: () => void;
}

export const EventListView: React.FC<EventListViewProps> = ({
  config,
  onSelectEvent,
  onOpenSettings,
  onOpenAgenda,
}) => {
  const [events, setEvents] = useState<EventItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedDept, setSelectedDept] = useState<string>('all');
  const [selectedStatus, setSelectedStatus] = useState<'all' | 'active' | 'completed'>('active');
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);

  const enablePriority = localStorage.getItem('eventspace_enable_priority') !== 'false';
  const { theme, cycleTheme } = useTheme();
  const iconSrc = theme === 'light' ? '/EventSpace-Icon-Lightmode.png' : '/EventSpace-Icon-Darkmode.png';

  const loadEvents = async (silent = false) => {
    if (!silent) setIsLoading(true);
    else setIsRefreshing(true);
    setError(null);

    try {
      const data = await mobileApi.getEvents(config.serverUrl);
      setEvents(data);
    } catch (err: any) {
      console.error('Failed to load events:', err);
      setError(err.message || 'Failed to load events from server');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    loadEvents();
  }, [config.serverUrl]);

  // Extract unique departments for filter chips
  const departments = useMemo(() => {
    const set = new Set<string>();
    events.forEach((ev) => {
      if (ev.department && ev.department.trim()) {
        set.add(ev.department.trim());
      }
    });
    return Array.from(set).sort();
  }, [events]);

  // Filter and sort events
  const filteredEvents = useMemo(() => {
    return events.filter((ev) => {
      // Status filter
      if (selectedStatus === 'active' && ev.isCompleted) return false;
      if (selectedStatus === 'completed' && !ev.isCompleted) return false;

      // Department filter
      if (selectedDept !== 'all' && ev.department !== selectedDept) return false;

      // Search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchTitle = ev.title.toLowerCase().includes(q);
        const matchDept = ev.department?.toLowerCase().includes(q);
        const matchTerm = ev.term?.toLowerCase().includes(q);
        if (!matchTitle && !matchDept && !matchTerm) return false;
      }

      return true;
    });
  }, [events, selectedStatus, selectedDept, searchQuery]);

  const formatDateRange = (start?: string | null, end?: string | null) => {
    if (!start) return null;
    try {
      const startDate = new Date(start);
      const startStr = startDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      if (!end) return startStr;
      const endDate = new Date(end);
      const endStr = endDate.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
      });
      return `${startStr} – ${endStr}`;
    } catch {
      return null;
    }
  };

  const getPriorityBadge = (priority?: string | null) => {
    if (!enablePriority) return null;
    switch (priority) {
      case 'high':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-rose-500/10 text-rose-500 border border-rose-500/30">
            High Priority
          </span>
        );
      case 'med':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-amber-500/10 text-amber-500 border border-amber-500/30">
            Med Priority
          </span>
        );
      case 'low':
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase rounded-md bg-blue-500/10 text-blue-500 border border-blue-500/30">
            Low Priority
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex flex-col h-full bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
      {/* Top Header */}
      <header className="safe-top bg-white dark:bg-slate-900/90 border-b border-slate-200 dark:border-slate-800/80 px-4 py-3 shrink-0 shadow-sm backdrop-blur-md">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img
              src={iconSrc}
              alt="EventSpace"
              className="w-8 h-8 object-contain rounded-lg shadow-sm"
            />
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-lg font-black tracking-tight text-slate-900 dark:text-white">
                  EventSpace
                </h1>
                <span className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 rounded-md border border-blue-500/20">
                  Companion
                </span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                {events.length} {events.length === 1 ? 'Event' : 'Events'} Active
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {/* Quick theme cycle */}
            <button
              onClick={cycleTheme}
              aria-label="Cycle theme"
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white flex items-center justify-center transition-colors"
            >
              {theme === 'light' ? (
                <Sun className="w-4 h-4 text-amber-500" />
              ) : theme === 'high-contrast' ? (
                <Contrast className="w-4 h-4 text-blue-400" />
              ) : (
                <Moon className="w-4 h-4 text-indigo-400" />
              )}
            </button>

            {/* Quick Agenda View button */}
            <button
              onClick={onOpenAgenda}
              aria-label="Open Agenda"
              className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-900/60 flex items-center justify-center transition-colors"
              title="Global Schedule / Agenda"
            >
              <Calendar className="w-4 h-4" />
            </button>

            {/* Prominent Header New Event button */}
            <button
              onClick={() => setIsCreateEventOpen(true)}
              aria-label="New Event"
              className="px-2.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 active:scale-95 text-white text-xs font-bold flex items-center gap-1 shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">New Event</span>
            </button>

            {/* Settings */}
            <button
              onClick={onOpenSettings}
              aria-label="Settings"
              className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:text-slate-950 dark:hover:text-white flex items-center justify-center transition-colors"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Search Input */}
        <div className="mt-3 relative">
          <Search className="w-4 h-4 text-slate-400 dark:text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search events by title, department, term..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40 text-slate-900 dark:text-white"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              Clear
            </button>
          )}
        </div>

        {/* Filter Chips */}
        <div className="mt-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-0.5 text-xs">
          <button
            onClick={() => setSelectedStatus('active')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedStatus === 'active'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Active
          </button>
          <button
            onClick={() => setSelectedStatus('all')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedStatus === 'all'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setSelectedStatus('completed')}
            className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedStatus === 'completed'
                ? 'bg-blue-600 text-white shadow-sm shadow-blue-500/20'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Completed
          </button>

          {departments.length > 0 && (
            <>
              <div className="w-px h-4 bg-slate-200 dark:bg-slate-800 mx-1 shrink-0" />
              <button
                onClick={() => setSelectedDept('all')}
                className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedDept === 'all'
                    ? 'bg-slate-200 dark:bg-slate-700 text-slate-900 dark:text-white font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                All Depts
              </button>
              {departments.map((dept) => (
                <button
                  key={dept}
                  onClick={() => setSelectedDept(selectedDept === dept ? 'all' : dept)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    selectedDept === dept
                      ? 'bg-indigo-600 text-white font-bold shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  {dept}
                </button>
              ))}
            </>
          )}
        </div>
      </header>

      {/* Main Feed */}
      <main className="flex-1 overflow-y-auto p-4 space-y-3 safe-bottom">
        {isLoading ? (
          <div className="h-64 flex flex-col items-center justify-center space-y-3">
            <RefreshCw className="w-7 h-7 text-blue-500 animate-spin" />
            <p className="text-xs text-slate-400 font-medium">Loading events...</p>
          </div>
        ) : error ? (
          <div className="p-5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900/60 text-center space-y-3">
            <AlertCircle className="w-7 h-7 text-rose-500 mx-auto" />
            <div>
              <h3 className="text-sm font-bold text-rose-700 dark:text-rose-300">Connection Issue</h3>
              <p className="text-xs text-rose-600/80 dark:text-rose-400/80 mt-1">{error}</p>
            </div>
            <button
              onClick={() => loadEvents()}
              className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-600 text-white hover:bg-rose-700 transition-colors shadow-sm"
            >
              Try Again
            </button>
          </div>
        ) : filteredEvents.length === 0 ? (
          <div className="py-16 text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center mx-auto text-slate-400">
              <FolderKanban className="w-7 h-7" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-800 dark:text-slate-200">No Events Found</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-xs mx-auto">
                {searchQuery
                  ? 'No events match your search query or active filters.'
                  : 'No events registered on the main web canvas.'}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400 dark:text-slate-500">
                {selectedStatus === 'active' ? 'Active Events' : selectedStatus === 'completed' ? 'Completed Events' : 'All Events'} ({filteredEvents.length})
              </span>
              <button
                onClick={() => loadEvents(true)}
                disabled={isRefreshing}
                className="text-xs text-blue-500 hover:text-blue-600 dark:hover:text-blue-400 flex items-center gap-1 font-semibold"
              >
                <RefreshCw className={`w-3 h-3 ${isRefreshing ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>

            {filteredEvents.map((ev) => {
              const dateRange = formatDateRange(ev.startDate, ev.endDate);
              return (
                <div
                  key={ev.id}
                  onClick={() => onSelectEvent(ev)}
                  className={`group relative p-4 rounded-2xl border transition-all active:scale-[0.99] cursor-pointer shadow-sm hover:shadow-md ${
                    ev.isCompleted
                      ? 'bg-slate-100/60 dark:bg-slate-900/40 border-slate-200 dark:border-slate-800/60 opacity-80'
                      : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 hover:border-blue-500/50 dark:hover:border-blue-500/40'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {getPriorityBadge(ev.priority)}
                        {ev.department && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border border-indigo-500/20">
                            {ev.department}
                          </span>
                        )}
                        {(ev.term || ev.year) && (
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                            {[ev.term, ev.year].filter(Boolean).join(' ')}
                          </span>
                        )}
                        {ev.isCompleted && (
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                            Completed
                          </span>
                        )}
                      </div>

                      <h3 className="text-base font-bold text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors truncate">
                        {ev.title}
                      </h3>

                      {dateRange && (
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{dateRange}</span>
                        </div>
                      )}
                    </div>

                    <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 group-hover:text-blue-500 group-hover:bg-blue-50 dark:group-hover:bg-blue-900/30 flex items-center justify-center transition-all shrink-0 self-center">
                      <ChevronRight className="w-4 h-4" />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* Floating Action Button (FAB) */}
      <button
        onClick={() => setIsCreateEventOpen(true)}
        aria-label="Create new event"
        className="fixed bottom-6 right-6 z-40 bg-blue-600 hover:bg-blue-700 active:scale-95 text-white rounded-full shadow-lg shadow-blue-600/30 flex items-center justify-center gap-2 px-4 py-3 font-bold text-xs transition-all border border-blue-400/30"
      >
        <Plus className="w-4 h-4 stroke-[2.5]" />
        <span>New Event</span>
      </button>

      {/* Create Event Modal */}
      <CreateEventModal
        isOpen={isCreateEventOpen}
        onClose={() => setIsCreateEventOpen(false)}
        onCreated={(newEvent) => {
          setEvents((prev) => [newEvent, ...prev]);
          onSelectEvent(newEvent);
        }}
        serverUrl={config.serverUrl}
        existingEvents={events}
      />
    </div>
  );
};
