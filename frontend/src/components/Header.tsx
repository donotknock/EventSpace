import React, { useState } from 'react';
import { useTheme } from '../context/ThemeContext';
import { useSettings } from '../context/SettingsContext';
import { FullEventDetails } from '../types';
import {
  Menu,
  Sun,
  Moon,
  Eye,
  Type,
  ListTodo,
  Plus,
  Sparkles,
  Building2,
  Calendar,
  Settings,
  RotateCw,
  FileText,
  Pencil,
  X,
  Smartphone,
} from 'lucide-react';
import { formatEventDate } from '../utils/date';

interface HeaderProps {
  activeEvent: FullEventDetails | null;
  sidebarOpen: boolean;
  isCollapsedMode?: boolean;
  onToggleSidebar: () => void;
  onOpenMasterTasks: () => void;
  onOpenNewEvent: () => void;
  onOpenEditEvent: () => void;
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
  onRefreshWorkspace,
  pendingTasksCount,
  isReadOnly = false,
}) => {
  const { theme, cycleTheme, isDyslexic, toggleDyslexic } = useTheme();
  const { enablePriority } = useSettings();
  const [showSummaryPopup, setShowSummaryPopup] = useState(false);
  const iconSrc = theme === 'light' ? '/EventSpace-Icon-Lightmode.png' : '/EventSpace-Icon-Darkmode.png';

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between z-20 select-none transition-colors">
      {/* Left: Sidebar toggle + Event Title / Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label={isCollapsedMode ? 'Expand sidebar' : 'Collapse sidebar'}
          className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand / Logo only if sidebar is completely closed (not present when minimized or expanded) */}
        {!sidebarOpen && !isCollapsedMode && (
          <div className="flex items-center gap-2 mr-2">
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
          <div className="flex items-center gap-2">
            <span className="text-slate-300 dark:text-slate-700 hidden sm:inline">/</span>
            <div className="flex items-center gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white truncate max-w-[200px] sm:max-w-xs md:max-w-md">
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
                <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
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
                  {activeEvent.contacts && activeEvent.contacts.length > 0 && (
                    <span className="hidden sm:inline-flex items-center gap-1 font-medium text-blue-600 dark:text-blue-400">
                      <span>👤</span>
                      <span className="truncate max-w-[150px]">
                        {activeEvent.contacts.map((c) => c.name).join(', ')}
                      </span>
                    </span>
                  )}
                </div>
              </div>

              {/* Event Summary Trigger Chip replacing Event Settings button */}
              <div className="relative">
                <button
                  onClick={() => setShowSummaryPopup(!showSummaryPopup)}
                  className="min-h-[44px] h-11 px-3 flex items-center gap-1.5 rounded-xl text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 border border-slate-200 dark:border-slate-800 text-xs font-semibold transition-all ml-1"
                  title="View Event Summary"
                  aria-label="View Event Summary"
                >
                  <FileText className="w-4 h-4 text-blue-500" />
                  <span className="hidden sm:inline">Summary</span>
                </button>

                {/* Read-Only Summary Pop-up Card */}
                {showSummaryPopup && (
                  <>
                    <div
                      className="fixed inset-0 z-30"
                      onClick={() => setShowSummaryPopup(false)}
                    />
                    <div className="absolute left-0 mt-2 z-40 w-80 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-slate-800 shadow-2xl p-4 space-y-3 text-slate-800 dark:text-slate-100 animate-fadeIn select-text">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <h3 className="font-extrabold text-base leading-tight text-slate-900 dark:text-white">
                            {activeEvent.title}
                          </h3>
                          {activeEvent.department && (
                            <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/60 px-2 py-0.5 rounded-full">
                              {activeEvent.department}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-1 flex-shrink-0">
                          {!isReadOnly && onOpenEditEvent && (
                            <button
                              type="button"
                              onClick={() => {
                                setShowSummaryPopup(false);
                                onOpenEditEvent();
                              }}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 transition-colors shadow-sm"
                              title="Edit event details"
                            >
                              <Pencil className="w-3 h-3" />
                              <span>Edit</span>
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => setShowSummaryPopup(false)}
                            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-100 dark:border-slate-800">
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                            Date Range
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                            {formatEventDate(activeEvent.startDate, activeEvent.endDate) || 'Unscheduled'}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                            Start / End
                          </span>
                          <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs">
                            {activeEvent.startTime || activeEvent.endTime
                              ? `${activeEvent.startTime || '--'} – ${activeEvent.endTime || '--'}`
                              : 'All Day'}
                          </span>
                        </div>
                      </div>

                      <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block mb-0.5">
                          Person in Charge / Contacts
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-300 text-xs truncate block">
                          {activeEvent.contacts && activeEvent.contacts.length > 0
                            ? activeEvent.contacts.map((c) => c.name).join(', ')
                            : 'Unassigned'}
                        </span>
                      </div>

                      {enablePriority && activeEvent.priority && (
                        <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                          <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                            Priority
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-400">
                            {activeEvent.priority}
                          </span>
                        </div>
                      )}
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Select an event to view workspace
          </div>
        )}
      </div>

      {/* Right Controls: Companion App, Schedule/Agenda, Accessibility, Themes, New Event */}
      <div className="flex items-center gap-2">
        {/* Companion App Link Button */}
        <a
          href={`http://${typeof window !== 'undefined' ? window.location.hostname : 'localhost'}:5174`}
          target="_blank"
          rel="noopener noreferrer"
          className="min-h-[44px] h-11 px-3 flex items-center gap-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Open Mobile Companion App"
          aria-label="Open Mobile Companion App"
        >
          <Smartphone className="w-4 h-4 text-emerald-500 dark:text-emerald-400" />
          <span className="hidden lg:inline">Companion App</span>
        </a>

        {/* Schedule/Agenda Trigger */}
        <button
          onClick={onOpenMasterTasks}
          aria-label="Open Schedule/Agenda"
          title="Open Schedule/Agenda (Google Calendar style)"
          className="min-h-[44px] h-11 px-3.5 flex items-center gap-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Calendar className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          <span className="hidden md:inline">Schedule/Agenda</span>
          {pendingTasksCount > 0 && (
            <span className="px-1.5 py-0.5 text-[11px] font-bold rounded-full bg-blue-600 text-white min-w-[20px] text-center">
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
            className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <RotateCw className="w-4 h-4 text-slate-500 dark:text-slate-400" />
          </button>
        )}

        {/* Dyslexia Font Toggle Button - Minimum 44x44px touch area */}
        <button
          onClick={toggleDyslexic}
          aria-label={isDyslexic ? 'Disable OpenDyslexic font' : 'Enable OpenDyslexic font'}
          className={`min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
            isDyslexic
              ? 'bg-indigo-600 text-white shadow-md shadow-indigo-500/25 ring-2 ring-indigo-400'
              : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
          title="Toggle OpenDyslexic Font"
        >
          <Type className="w-5 h-5" />
        </button>

        {/* Theme Switcher Button (Dark / Light / High Contrast) - Minimum 44x44px touch area */}
        <button
          onClick={cycleTheme}
          aria-label={`Current theme: ${theme}. Click to change theme.`}
          className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
          title={`Theme: ${theme.toUpperCase()} (Click to toggle)`}
        >
          {theme === 'dark' && <Moon className="w-5 h-5 text-indigo-400" />}
          {theme === 'light' && <Sun className="w-5 h-5 text-amber-500" />}
          {theme === 'high-contrast' && <Eye className="w-5 h-5 text-yellow-400" />}
        </button>

        {/* New Event Button - Minimum 44px touch height */}
        <button
          onClick={onOpenNewEvent}
          className="min-h-[44px] h-11 px-4 flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-semibold text-xs shadow-md shadow-blue-500/25 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-blue-400"
        >
          <Plus className="w-4 h-4 stroke-[3]" />
          <span className="hidden sm:inline">New Event</span>
        </button>
      </div>
    </header>
  );
};
