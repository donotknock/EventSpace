import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  CheckCircle2,
  Circle,
  Clock,
  RefreshCw,
  Settings,
  Sparkles,
  AlertCircle,
  ChevronDown,
  ArrowLeft,
  Sun,
  Moon,
  Contrast,
} from 'lucide-react';
import type {
  EventItem,
  NormalizedAgendaItem,
  Priority,
  ServerConfig,
} from '../types';
import { mobileApi } from '../services/api';
import { ServerSettingsModal } from './ServerSettingsModal';
import { useTheme } from '../context/ThemeContext';

interface AgendaViewProps {
  config: ServerConfig;
  onDisconnect?: () => void;
  onClose?: () => void;
  initialEventId?: string;
}

interface DateGroup {
  dateKey: string; // YYYY-MM-DD or 'unscheduled'
  dayName: string; // 'MON'
  dayNumber: string; // '28'
  monthName: string; // 'SEP'
  relativeLabel?: string; // 'Today', 'Tomorrow'
  items: NormalizedAgendaItem[];
}

export const AgendaView: React.FC<AgendaViewProps> = ({
  config,
  onDisconnect = () => {},
  onClose,
  initialEventId,
}) => {
  const [items, setItems] = useState<NormalizedAgendaItem[]>([]);
  const [events, setEvents] = useState<EventItem[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>(initialEventId || 'all');
  const [isLoading, setIsLoading] = useState(true);

  const { theme, cycleTheme } = useTheme();
  const iconSrc = theme === 'light' ? '/EventSpace-Icon-Lightmode.png' : '/EventSpace-Icon-Darkmode.png';
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [hideCompleted, setHideCompleted] = useState(false);
  const [showUnscheduled, setShowUnscheduled] = useState(true);

  // Fetch Agenda Feed
  const fetchAgenda = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    setError(null);
    try {
      const [agendaData, eventsData] = await Promise.all([
        mobileApi.getAgenda(config.serverUrl, true),
        mobileApi.getEvents(config.serverUrl),
      ]);
      const normalized = mobileApi.normalizeAgenda(agendaData);
      setItems(normalized);
      setEvents(eventsData);
      setIsOnline(true);
    } catch (err: any) {
      console.error('Failed to load agenda feed:', err);
      setError(err.message || 'Unable to sync with EventSpace server');
      setIsOnline(false);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [config.serverUrl]);

  useEffect(() => {
    fetchAgenda();
    // Background health check & revalidation every 30s
    const interval = setInterval(() => {
      fetchAgenda(true);
    }, 30000);
    return () => clearInterval(interval);
  }, [fetchAgenda]);

  // Handle Task Completion Toggle
  const handleToggle = async (item: NormalizedAgendaItem) => {
    const nextStatus = !item.isCompleted;

    // 1. Optimistic Update
    setItems((prev) =>
      prev.map((i) => (i.id === item.id ? { ...i, isCompleted: nextStatus } : i))
    );

    // 2. Network sync
    try {
      await mobileApi.toggleTask(config.serverUrl, item.originalId, {
        subtaskIndex: item.subtaskIndex,
        isCompleted: nextStatus,
      });
      setIsOnline(true);
    } catch (err) {
      console.error('Failed to update task status:', err);
      // Revert on failure
      setItems((prev) =>
        prev.map((i) => (i.id === item.id ? { ...i, isCompleted: !nextStatus } : i))
      );
      setError('Failed to sync update with server. Check local Wi-Fi.');
    }
  };

  // Filter items by event and completion preference
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (selectedEventId !== 'all' && item.event.id !== selectedEventId) {
        return false;
      }
      if (hideCompleted && item.isCompleted) {
        return false;
      }
      return true;
    });
  }, [items, selectedEventId, hideCompleted]);

  // Group items by calendar day for "Breathing Room" layout, separating scheduled days from unscheduled items
  const { scheduledGroups, unscheduledItems } = useMemo(() => {
    const groups: { [key: string]: DateGroup } = {};
    const unscheduled: NormalizedAgendaItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);

    filteredItems.forEach((item) => {
      if (item.dueDate) {
        const d = new Date(item.dueDate);
        if (!isNaN(d.getTime())) {
          const key = d.toISOString().split('T')[0];
          const dayName = d.toLocaleDateString('en-US', { weekday: 'short' }).toUpperCase();
          const dayNumber = d.getDate().toString();
          const monthName = d.toLocaleDateString('en-US', { month: 'short' }).toUpperCase();

          const targetDate = new Date(d);
          targetDate.setHours(0, 0, 0, 0);

          let relativeLabel: string | undefined = undefined;
          if (targetDate.getTime() === today.getTime()) {
            relativeLabel = 'Today';
          } else if (targetDate.getTime() === tomorrow.getTime()) {
            relativeLabel = 'Tomorrow';
          }

          if (!groups[key]) {
            groups[key] = {
              dateKey: key,
              dayName,
              dayNumber,
              monthName,
              relativeLabel,
              items: [],
            };
          }
          groups[key].items.push(item);
          return;
        }
      }

      // No due date or invalid date -> unscheduled
      unscheduled.push(item);
    });

    // Chronological order for scheduled days
    const sortedGroups = Object.values(groups).sort((a, b) => a.dateKey.localeCompare(b.dateKey));
    return { scheduledGroups: sortedGroups, unscheduledItems: unscheduled };
  }, [filteredItems]);

  const getItemColorClasses = (item: NormalizedAgendaItem) => {
    if (item.type === 'checklist') {
      return {
        badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
        border: 'border-l-emerald-500',
        dot: 'bg-emerald-500',
      };
    }
    switch (item.nodeType) {
      case 'audio':
        return {
          badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
          border: 'border-l-purple-500',
          dot: 'bg-purple-500',
        };
      case 'chaser':
        return {
          badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
          border: 'border-l-amber-500',
          dot: 'bg-amber-500',
        };
      case 'info':
        return {
          badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
          border: 'border-l-emerald-500',
          dot: 'bg-emerald-500',
        };
      case 'picture':
        return {
          badge: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
          border: 'border-l-rose-500',
          dot: 'bg-rose-500',
        };
      case 'task':
      default:
        return {
          badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
          border: 'border-l-blue-500',
          dot: 'bg-blue-500',
        };
    }
  };

  const getPriorityBadge = (p?: Priority | null) => {
    switch (p) {
      case 'high':
        return (
          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 border border-rose-500/30">
            High
          </span>
        );
      case 'med':
        return (
          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">
            Med
          </span>
        );
      case 'low':
        return (
          <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700">
            Low
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-950 text-white overflow-hidden select-none">
      {/* Top Mobile Bar */}
      <header className="safe-top bg-slate-900/90 backdrop-blur border-b border-slate-800/80 px-4 pt-3 pb-3 flex items-center justify-between z-20 flex-shrink-0">
        <div className="flex items-center gap-2.5">
          {onClose && (
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-xl bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center shrink-0 transition-colors mr-1"
              aria-label="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </button>
          )}
          <img
            src={iconSrc}
            alt="EventSpace"
            className="w-8 h-8 object-contain rounded-lg shadow-sm"
          />
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-sm tracking-tight text-white">EventSpace</span>
              <span
                className={`w-2 h-2 rounded-full ${
                  isOnline ? 'bg-emerald-500 shadow-sm shadow-emerald-500/50' : 'bg-rose-500'
                }`}
                title={isOnline ? 'Connected to local server' : 'Offline'}
              />
            </div>
            <div className="text-[10px] text-slate-400 font-medium">Mobile Agenda</div>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Quick theme cycle */}
          <button
            type="button"
            onClick={cycleTheme}
            className="w-9 h-9 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700/60 active:scale-95 transition-all"
            title={`Theme: ${theme}`}
            aria-label="Cycle theme"
          >
            {theme === 'light' ? (
              <Sun className="w-4 h-4 text-amber-500" />
            ) : theme === 'high-contrast' ? (
              <Contrast className="w-4 h-4 text-blue-400" />
            ) : (
              <Moon className="w-4 h-4 text-indigo-400" />
            )}
          </button>

          {/* Refresh Action */}
          <button
            type="button"
            onClick={() => {
              setIsRefreshing(true);
              fetchAgenda(false);
            }}
            disabled={isRefreshing}
            className="w-9 h-9 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700/60 active:scale-95 transition-all"
            title="Refresh agenda feed"
            aria-label="Refresh agenda feed"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-blue-400' : ''}`} />
          </button>

          {/* Server Settings / Re-pair Button */}
          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="w-9 h-9 rounded-xl bg-slate-800/80 text-slate-300 hover:text-white flex items-center justify-center border border-slate-700/60 active:scale-95 transition-all"
            title="Server Connection Settings"
            aria-label="Server Connection Settings"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Filter & Scope Bar */}
      <div className="bg-slate-900/60 border-b border-slate-800 px-4 py-2.5 flex items-center gap-2 overflow-x-auto no-scrollbar flex-shrink-0">
        {/* Event Scope Dropdown */}
        <div className="relative flex items-center">
          <select
            value={selectedEventId}
            onChange={(e) => setSelectedEventId(e.target.value)}
            className="text-xs bg-slate-800 border border-slate-700 text-slate-200 font-medium rounded-xl py-1.5 pl-3 pr-8 focus:outline-none focus:ring-1 focus:ring-blue-500 appearance-none"
          >
            <option value="all">All Events ({events.length})</option>
            {events.map((ev) => (
              <option key={ev.id} value={ev.id}>
                {ev.title}
              </option>
            ))}
          </select>
          <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 pointer-events-none" />
        </div>

        {/* Hide Completed Toggle */}
        <button
          type="button"
          onClick={() => setHideCompleted(!hideCompleted)}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
            hideCompleted
              ? 'bg-blue-600/30 border-blue-500/50 text-blue-300'
              : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
          }`}
        >
          {hideCompleted ? 'Hiding Done' : 'Show All'}
        </button>

        {/* Unscheduled / No Date Toggle */}
        {unscheduledItems.length > 0 && (
          <button
            type="button"
            onClick={() => setShowUnscheduled(!showUnscheduled)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all flex items-center gap-1.5 ${
              showUnscheduled
                ? 'bg-amber-600/30 border-amber-500/50 text-amber-300'
                : 'bg-slate-800/60 border-slate-700/60 text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>No Date ({unscheduledItems.length})</span>
          </button>
        )}

        {/* Task Counter */}
        <div className="ml-auto text-[11px] font-bold text-slate-400 flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
          <span>
            {filteredItems.filter((i) => !i.isCompleted).length} Pending
          </span>
        </div>
      </div>

      {/* Main Agenda Feed (Day-by-Day Breathing Room Layout) */}
      <main className="flex-1 overflow-y-auto px-4 py-4 space-y-6">
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-950/40 border border-rose-800/60 text-rose-300 text-xs flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => fetchAgenda(false)}
              className="text-[11px] font-bold underline hover:text-white"
            >
              Retry
            </button>
          </div>
        )}

        {isLoading ? (
          <div className="py-20 text-center space-y-3">
            <RefreshCw className="w-7 h-7 text-blue-500 animate-spin mx-auto" />
            <p className="text-xs text-slate-400 font-medium">Syncing with EventSpace...</p>
          </div>
        ) : scheduledGroups.length === 0 && (!showUnscheduled || unscheduledItems.length === 0) ? (
          <div className="py-20 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center mx-auto text-slate-500">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
            </div>
            <h3 className="text-sm font-bold text-white">All Caught Up!</h3>
            <p className="text-xs text-slate-400 max-w-xs mx-auto">
              No pending tasks or schedule blocks found for the selected scope.
            </p>
          </div>
        ) : (
          <>
            {/* Chronological Scheduled Days */}
            {scheduledGroups.map((group) => (
              <section key={group.dateKey} className="space-y-3">
                {/* Day Header with "Breathing Room" Google Calendar Style */}
                <div className="flex items-end gap-3 pb-1 border-b border-slate-800/60">
                  <div className="flex flex-col items-center justify-center min-w-[48px] px-2.5 py-1.5 rounded-2xl bg-slate-900 border border-slate-800 text-center shadow-inner">
                    <span className="text-[10px] font-black tracking-widest text-slate-400 uppercase">
                      {group.dayName}
                    </span>
                    <span className="text-xl font-black text-white leading-tight">
                      {group.dayNumber}
                    </span>
                  </div>

                  <div className="flex-1 flex items-baseline justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold uppercase tracking-wider text-slate-300">
                        {group.monthName}
                      </span>
                      {group.relativeLabel && (
                        <span className="text-[10px] font-black uppercase px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                          {group.relativeLabel}
                        </span>
                      )}
                    </div>
                    <span className="text-[11px] font-medium text-slate-500">
                      {group.items.length} {group.items.length === 1 ? 'item' : 'items'}
                    </span>
                  </div>
                </div>

                {/* Day Task Cards */}
                <div className="space-y-2 pl-1">
                  {group.items.map((item) => {
                    const colors = getItemColorClasses(item);
                    return (
                      <div
                        key={item.id}
                        className={`group relative p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 border-l-4 ${
                          colors.border
                        } shadow-sm transition-all flex items-start gap-3 ${
                          item.isCompleted ? 'opacity-50' : 'hover:border-slate-700'
                        }`}
                      >
                        {/* Touch-Friendly Checkbox (Minimum 44x44px target) */}
                        <button
                          type="button"
                          onClick={() => handleToggle(item)}
                          className="w-11 h-11 -m-2 flex items-center justify-center flex-shrink-0 cursor-pointer text-slate-400 hover:text-blue-400 active:scale-90 transition-all"
                          aria-label={`Mark task ${item.title} as ${item.isCompleted ? 'incomplete' : 'completed'}`}
                        >
                          {item.isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-950" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-500 hover:text-blue-400" />
                          )}
                        </button>

                        {/* Content Area */}
                        <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Event Title Badge */}
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[140px]">
                              {item.event.title}
                            </span>

                            {/* Block Category Badge */}
                            {item.category ? (
                              <span
                                className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${colors.badge}`}
                              >
                                {item.category}
                              </span>
                            ) : (
                              <span
                                className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${colors.badge}`}
                              >
                                {item.type}
                              </span>
                            )}

                            {/* Priority */}
                            {getPriorityBadge(item.priority)}
                          </div>

                          {/* Title text */}
                          <div
                            className={`text-sm font-semibold leading-snug break-words ${
                              item.isCompleted
                                ? 'line-through text-slate-500'
                                : 'text-slate-100'
                            }`}
                          >
                            {item.title}
                          </div>

                          {/* Due Time or Extra Info */}
                          {item.dueDate && (
                            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                              <Clock className="w-3 h-3 text-slate-500" />
                              <span>
                                Due: {new Date(item.dueDate).toLocaleTimeString('en-US', {
                                  hour: '2-digit',
                                  minute: '2-digit',
                                })}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            ))}

            {/* Dedicated "Unscheduled / No Date" Section at bottom of feed */}
            {unscheduledItems.length > 0 && showUnscheduled && (
              <section className="pt-6 border-t border-slate-800/80 space-y-3">
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black uppercase tracking-wider text-slate-200">
                        Unscheduled / No Date
                      </h3>
                      <p className="text-[10px] text-slate-400">
                        Tasks & subtasks awaiting scheduling
                      </p>
                    </div>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-800 text-amber-400 border border-slate-700">
                    {unscheduledItems.length} {unscheduledItems.length === 1 ? 'item' : 'items'}
                  </span>
                </div>

                <div className="space-y-2 pl-1">
                  {unscheduledItems.map((item) => {
                    const colors = getItemColorClasses(item);
                    return (
                      <div
                        key={item.id}
                        className={`group relative p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800/90 border-l-4 ${
                          colors.border
                        } shadow-sm transition-all flex items-start gap-3 ${
                          item.isCompleted ? 'opacity-50' : 'hover:border-slate-700'
                        }`}
                      >
                        {/* Touch-Friendly Checkbox */}
                        <button
                          type="button"
                          onClick={() => handleToggle(item)}
                          className="w-11 h-11 -m-2 flex items-center justify-center flex-shrink-0 cursor-pointer text-slate-400 hover:text-blue-400 active:scale-90 transition-all"
                          aria-label={`Mark task ${item.title} as ${item.isCompleted ? 'incomplete' : 'completed'}`}
                        >
                          {item.isCompleted ? (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 fill-emerald-950" />
                          ) : (
                            <Circle className="w-5 h-5 text-slate-500 hover:text-blue-400" />
                          )}
                        </button>

                        {/* Content Area */}
                        <div className="min-w-0 flex-1 space-y-1.5 pt-0.5">
                          <div className="flex items-center gap-2 flex-wrap">
                            {/* Event Title Badge */}
                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider truncate max-w-[140px]">
                              {item.event.title}
                            </span>

                            {/* Block Category Badge */}
                            {item.category ? (
                              <span
                                className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${colors.badge}`}
                              >
                                {item.category}
                              </span>
                            ) : (
                              <span
                                className={`text-[9px] font-black uppercase px-1.5 py-0.2 rounded border ${colors.badge}`}
                              >
                                {item.type}
                              </span>
                            )}

                            {/* Unscheduled badge indicator */}
                            <span className="text-[9px] font-bold px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/20">
                              No Due Date
                            </span>

                            {/* Priority */}
                            {getPriorityBadge(item.priority)}
                          </div>

                          {/* Title text */}
                          <div
                            className={`text-sm font-semibold leading-snug break-words ${
                              item.isCompleted
                                ? 'line-through text-slate-500'
                                : 'text-slate-100'
                            }`}
                          >
                            {item.title}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </main>

      {/* Server Settings Modal */}
      <ServerSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onDisconnect={onDisconnect}
      />
    </div>
  );
};
