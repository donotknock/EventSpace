import React from 'react';
import { useTheme } from '../context/ThemeContext';
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
} from 'lucide-react';
import { formatEventDate } from '../utils/date';

interface HeaderProps {
  activeEvent: FullEventDetails | null;
  sidebarOpen: boolean;
  onToggleSidebar: () => void;
  onOpenMasterTasks: () => void;
  onOpenNewEvent: () => void;
  onOpenEditEvent: () => void;
  pendingTasksCount: number;
}

export const Header: React.FC<HeaderProps> = ({
  activeEvent,
  sidebarOpen,
  onToggleSidebar,
  onOpenMasterTasks,
  onOpenNewEvent,
  onOpenEditEvent,
  pendingTasksCount,
}) => {
  const { theme, cycleTheme, isDyslexic, toggleDyslexic } = useTheme();
  const iconSrc = theme === 'light' ? '/EventSpace-Icon-Lightmode.png' : '/EventSpace-Icon-Darkmode.png';

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/80 dark:bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between z-20 select-none transition-colors">
      {/* Left: Sidebar toggle + Event Title / Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleSidebar}
          aria-label={sidebarOpen ? 'Collapse sidebar' : 'Expand sidebar'}
          className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 active:scale-95 transition-all focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <Menu className="w-5 h-5" />
        </button>

        {/* Brand / Logo if sidebar collapsed */}
        {!sidebarOpen && (
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
                  {activeEvent.priority === 'high' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-red-500 ring-4 ring-red-500/20 animate-pulse" title="High Priority" />
                  )}
                  {activeEvent.priority === 'med' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-4 ring-amber-500/20" title="Medium Priority" />
                  )}
                  {activeEvent.priority === 'low' && (
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-4 ring-emerald-500/20" title="Low Priority" />
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

              {/* Event Settings/Edit button (min 44x44px touch area) */}
              <button
                onClick={onOpenEditEvent}
                className="min-w-[44px] min-h-[44px] w-11 h-11 flex items-center justify-center rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ml-1"
                title="Event Settings & Edit"
                aria-label="Event Settings & Edit"
              >
                <Settings className="w-4 h-4" />
              </button>
            </div>
          </div>
        ) : (
          <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
            Select an event to view workspace
          </div>
        )}
      </div>

      {/* Right Controls: Schedule/Agenda, Accessibility, Themes, New Event */}
      <div className="flex items-center gap-2">
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
