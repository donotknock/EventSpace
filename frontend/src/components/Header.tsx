import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { FullEventDetails } from '../types';
import {
  Menu,
  Sun,
  Moon,
  Eye,
  Plus,
  Building2,
  Calendar,
  RotateCw,
  Pencil,
  X,
  Smartphone,
  Clock,
} from 'lucide-react';
import { formatEventDate, formatCustomTime } from '../utils/date';
import { api } from '../services/api';

interface HeaderProps {
  activeEvent: FullEventDetails | null;
  sidebarOpen: boolean;
  isCollapsedMode?: boolean;
  onToggleSidebar: () => void;
  onOpenMasterTasks: () => void;
  onOpenNewEvent: () => void;
  onOpenEditEvent: () => void;
  onLeaveEvent?: (eventId: string) => Promise<void>;
  onRefreshWorkspace?: () => void;
  pendingTasksCount: number;
  isReadOnly?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeEvent,
  sidebarOpen,
  isCollapsedMode = false,
  onToggleSidebar,
  onOpenMasterTasks,
  onOpenNewEvent,
  onOpenEditEvent,
  onLeaveEvent,
  onRefreshWorkspace,
  pendingTasksCount,
  isReadOnly = false,
}) => {
  const { theme, cycleTheme } = useTheme();
  const { enablePriority, timeFormat } = useSettings();
  const [showSummaryPopup, setShowSummaryPopup] = useState(false);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });
  const titleContainerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const iconSrc = theme === 'light' ? '/EventSpace-Icon-Lightmode.png' : '/EventSpace-Icon-Darkmode.png';

  const updatePopoverPos = useCallback(() => {
    if (titleContainerRef.current) {
      const rect = titleContainerRef.current.getBoundingClientRect();
      const popoverWidth = 320;
      let left = rect.left;
      if (left + popoverWidth > window.innerWidth - 16) {
        left = Math.max(16, window.innerWidth - popoverWidth - 16);
      }
      setPopoverPos({
        top: rect.bottom + 8,
        left,
      });
    }
  }, []);

  useEffect(() => {
    if (!showSummaryPopup) return;
    updatePopoverPos();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        titleContainerRef.current &&
        !titleContainerRef.current.contains(target)
      ) {
        setShowSummaryPopup(false);
      }
    };

    const handleScrollOrResize = () => {
      updatePopoverPos();
    };

    document.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
    };
  }, [showSummaryPopup, updatePopoverPos]);

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between z-40 select-none transition-colors">
      {/* Left: Event Title / Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Brand / Logo fallback only if sidebar is completely closed */}
        {!sidebarOpen && (
          <div className="flex items-center gap-2 mr-2 shrink-0">
            <button
              onClick={onToggleSidebar}
              aria-label="Open sidebar"
              className="min-w-[40px] min-h-[40px] w-10 h-10 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <Menu className="w-5 h-5" />
            </button>
            <img
              src={iconSrc}
              alt="EventSpace"
              className="w-8 h-8 object-contain rounded-lg shadow-sm"
            />
            <span className="font-bold text-lg tracking-tight bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-300 bg-clip-text text-transparent hidden sm:inline">
              EventSpace
            </span>
          </div>
        )}

        {/* Active Event Information */}
        {activeEvent ? (
          <div className="relative">
            {/* Clickable Title Container */}
            <div
              ref={titleContainerRef}
              onClick={() => setShowSummaryPopup(!showSummaryPopup)}
              className="cursor-pointer group py-1 select-none flex flex-col justify-center"
              title="Click to view event summary"
            >
              <div className="flex items-center gap-2">
                <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                  {activeEvent.title}
                </h1>
                {enablePriority && activeEvent.priority && activeEvent.priority.trim() !== '' && (
                  <>
                    {activeEvent.priority === 'high' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-red-500/20" title="High Priority" />
                    )}
                    {activeEvent.priority === 'med' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/20" title="Medium Priority" />
                    )}
                    {activeEvent.priority === 'low' && (
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" title="Low Priority" />
                    )}
                  </>
                )}
              </div>

              {/* Subtitle row: hidden on small screens, flex on md+ */}
              <div className="hidden md:flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
                {activeEvent.department && (
                  <span className="flex items-center gap-1">
                    <Building2 className="w-3 h-3 text-slate-400" />
                    {activeEvent.department}
                  </span>
                )}
                {formatEventDate(activeEvent.startDate, activeEvent.endDate) ? (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {formatEventDate(activeEvent.startDate, activeEvent.endDate)}
                  </span>
                ) : activeEvent.term && activeEvent.year ? (
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3 h-3 text-slate-400" />
                    {activeEvent.term} {activeEvent.year}
                  </span>
                ) : null}
                {(activeEvent.startTime || activeEvent.endTime) && (
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-400" />
                    {activeEvent.startTime ? formatCustomTime(activeEvent.startTime, timeFormat) : '--'} – {activeEvent.endTime ? formatCustomTime(activeEvent.endTime, timeFormat) : '--'}
                  </span>
                )}
                {activeEvent.contacts && activeEvent.contacts.length > 0 && (
                  <span className="inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                    <span>👤</span>
                    <span className="truncate max-w-[150px]">
                      {activeEvent.contacts.map((c) => c.name).join(', ')}
                    </span>
                  </span>
                )}
              </div>
            </div>

            {/* Floating Popover Summary Card */}
            {showSummaryPopup && createPortal(
              <div
                ref={popoverRef}
                style={{ position: 'fixed', top: popoverPos.top, left: popoverPos.left }}
                className="z-[9999] w-80 rounded-xl bg-slate-900 border border-slate-700 p-4 shadow-2xl text-slate-100 animate-fadeIn select-text"
              >
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-bold text-base leading-tight text-white">
                      {activeEvent.title}
                    </h3>
                    {activeEvent.department && (
                      <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-blue-400 bg-blue-950/60 px-2 py-0.5 rounded-full border border-blue-800">
                        {activeEvent.department}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    {!isReadOnly && onOpenEditEvent && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowSummaryPopup(false);
                          onOpenEditEvent();
                        }}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm"
                        title="Edit Event"
                      >
                        <Pencil className="w-3 h-3" />
                        <span>Edit Event</span>
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => setShowSummaryPopup(false)}
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-2.5 text-xs border-t border-slate-800 pt-2.5">
                  <div>
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Department / Host
                    </span>
                    <span className="font-medium text-slate-200">
                      {activeEvent.department || 'None'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/60">
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                        Event Date(s)
                      </span>
                      <span className="font-medium text-slate-200">
                        {formatEventDate(activeEvent.startDate, activeEvent.endDate) || 'Unscheduled'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                        Event Time(s)
                      </span>
                      <span className="font-medium text-slate-200">
                        {activeEvent.startTime || activeEvent.endTime
                          ? `${activeEvent.startTime ? formatCustomTime(activeEvent.startTime, timeFormat) : '--'} – ${activeEvent.endTime ? formatCustomTime(activeEvent.endTime, timeFormat) : '--'}`
                          : 'All Day'}
                      </span>
                    </div>
                  </div>

                  <div className="pt-1 border-t border-slate-800/60">
                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                      Person in Charge (PIC)
                    </span>
                    <span className="font-medium text-slate-200 truncate block">
                      {activeEvent.contacts && activeEvent.contacts.length > 0
                        ? activeEvent.contacts.map((c) => c.name).join(', ')
                        : 'Unassigned'}
                    </span>
                  </div>

                  {enablePriority && activeEvent.priority && (
                    <div className="pt-1 border-t border-slate-800/60 flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                        Priority
                      </span>
                      <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-950 text-amber-400 border border-amber-800">
                        {activeEvent.priority}
                      </span>
                    </div>
                  )}
                </div>
              </div>,
              document.body
            )}
          </div>
        ) : (
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Select an event to view workspace
          </div>
        )}
      </div>

      {/* Right Controls: Companion App, Schedule/Agenda, Accessibility, Themes, New Event */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Companion App Link Button with Auto-Pairing */}
        <button
          onClick={async () => {
            try {
              const pair = await api.generatePairingCode('Web Session');
              const companionUrl = `/companion?code=${encodeURIComponent(pair.code)}&server=${encodeURIComponent(window.location.origin)}`;
              window.open(companionUrl, '_blank');
            } catch {
              window.open('/companion', '_blank');
            }
          }}
          className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
          title="Open Companion App (Auto-paired)"
          aria-label="Open Companion App"
        >
          <Smartphone className="w-5 h-5 text-emerald-500 dark:text-emerald-400 flex-shrink-0" />
        </button>

        {/* Schedule/Agenda Trigger - Icon only with badge at top-right */}
        <button
          onClick={onOpenMasterTasks}
          aria-label="Open Schedule/Agenda"
          title="Open Schedule/Agenda (Google Calendar style)"
          className="relative min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
        >
          <Calendar className="w-5 h-5 text-blue-500 dark:text-blue-400 flex-shrink-0" />
          {pendingTasksCount > 0 && (
            <span className="absolute -top-1 -right-1 px-1.5 py-0.2 text-[10px] font-bold rounded-full bg-blue-600 text-white min-w-[18px] h-[18px] flex items-center justify-center shadow-sm">
              {pendingTasksCount}
            </span>
          )}
        </button>

        {/* Workspace Refresh Button */}
        {onRefreshWorkspace && (
          <button
            onClick={onRefreshWorkspace}
            aria-label="Refresh workspace"
            title="Reload workspace from backend"
            className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
          >
            <RotateCw className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        )}

        {/* Theme Switcher Button (Dark / Light / High Contrast) */}
        <button
          onClick={cycleTheme}
          aria-label={`Current theme: ${theme}. Click to change theme.`}
          className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500 flex-shrink-0"
          title={`Theme: ${theme.toUpperCase()} (Click to toggle)`}
        >
          {theme === 'dark' && <Moon className="w-5 h-5 text-indigo-400" />}
          {theme === 'light' && <Sun className="w-5 h-5 text-amber-500" />}
          {theme === 'high-contrast' && <Eye className="w-5 h-5 text-yellow-400" />}
        </button>

        {/* New Event Button */}
        <button
          onClick={onOpenNewEvent}
          className="min-h-[44px] h-11 px-3 sm:px-3.5 flex items-center gap-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-500/25 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400 flex-shrink-0"
          title="Create New Event"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span className="hidden sm:inline">New Event</span>
        </button>
      </div>
    </header>
  );
};
