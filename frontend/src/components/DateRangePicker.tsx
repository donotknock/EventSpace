import React, { useState, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
  RotateCcw,
  Check,
  Pencil,
} from 'lucide-react';
import { formatDate } from '../utils/date';
import { useSettings } from '../context/SettingsContext';

interface DateRangePickerProps {
  startDate?: string | null;
  endDate?: string | null;
  onChange: (startDate: string | null, endDate: string | null) => void;
  className?: string;
  isOptional?: boolean;
}

export const DateRangePicker: React.FC<DateRangePickerProps> = ({
  startDate,
  endDate,
  onChange,
  className = '',
  isOptional = true,
}) => {
  const { firstDayOfWeek } = useSettings();
  const [isExpanded, setIsExpanded] = useState(false);
  // Normalize string to YYYY-MM-DD
  const parseDateStr = (d?: string | null): string => {
    if (!d) return '';
    try {
      return new Date(d).toISOString().slice(0, 10);
    } catch {
      return '';
    }
  };

  const currentStart = parseDateStr(startDate);
  const currentEnd = parseDateStr(endDate);

  // Calendar view month & year
  const initialDate = currentStart ? new Date(currentStart) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth()); // 0-indexed

  // Range selection in progress state
  const [selectionStart, setSelectionStart] = useState<string | null>(currentStart || null);
  const [selectionEnd, setSelectionEnd] = useState<string | null>(currentEnd || null);
  const [hoverDate, setHoverDate] = useState<string | null>(null);

  // Sync with prop changes
  React.useEffect(() => {
    setSelectionStart(currentStart || null);
    setSelectionEnd(currentEnd || null);
    if (currentStart) {
      const d = new Date(currentStart);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [currentStart, currentEnd]);

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  // Days in month calculation
  const calendarDays = useMemo(() => {
    const rawFirstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sun, 1 is Mon, 6 is Sat
    // Calculate start offset:
    // If sunday: offset = rawFirstDay
    // If monday: offset = (rawFirstDay + 6) % 7
    // If saturday: offset = (rawFirstDay + 1) % 7
    let firstDayOffset = rawFirstDay;
    if (firstDayOfWeek === 'monday') {
      firstDayOffset = (rawFirstDay + 6) % 7;
    } else if (firstDayOfWeek === 'saturday') {
      firstDayOffset = (rawFirstDay + 1) % 7;
    }
    const totalDays = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days: { dateStr: string; dayNum: number; isCurrentMonth: boolean }[] = [];

    // Previous month padding
    const prevMonthTotal = new Date(viewYear, viewMonth, 0).getDate();
    for (let i = firstDayOffset - 1; i >= 0; i--) {
      const pYear = viewMonth === 0 ? viewYear - 1 : viewYear;
      const pMonth = viewMonth === 0 ? 12 : viewMonth;
      const dNum = prevMonthTotal - i;
      const dateStr = `${pYear}-${String(pMonth).padStart(2, '0')}-${String(dNum).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: dNum, isCurrentMonth: false });
    }

    // Current month days
    for (let d = 1; d <= totalDays; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: d, isCurrentMonth: true });
    }

    // Trailing days padding to complete grid
    const remaining = (7 - (days.length % 7)) % 7;
    for (let r = 1; r <= remaining; r++) {
      const nYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      const nMonth = viewMonth === 11 ? 1 : viewMonth + 2;
      const dateStr = `${nYear}-${String(nMonth).padStart(2, '0')}-${String(r).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: r, isCurrentMonth: false });
    }

    return days;
  }, [viewYear, viewMonth, firstDayOfWeek]);

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  const handleDayClick = (dateStr: string) => {
    if (!selectionStart || (selectionStart && selectionEnd)) {
      // First click: start new range
      setSelectionStart(dateStr);
      setSelectionEnd(null);
      setHoverDate(null);
    } else {
      // Second click: finish range
      if (dateStr < selectionStart) {
        setSelectionStart(dateStr);
        setSelectionEnd(selectionStart);
        onChange(dateStr, selectionStart);
      } else {
        setSelectionEnd(dateStr);
        onChange(selectionStart, dateStr);
      }
      setHoverDate(null);
    }
  };

  const handleSetSingleDay = (dateStr: string) => {
    setSelectionStart(dateStr);
    setSelectionEnd(dateStr);
    onChange(dateStr, dateStr);
  };

  const handleClear = () => {
    setSelectionStart(null);
    setSelectionEnd(null);
    setHoverDate(null);
    onChange(null, null);
  };

  // Determine day state for styling
  const getDayState = (dateStr: string) => {
    const isStart = dateStr === selectionStart;
    const isEnd = dateStr === selectionEnd;

    // In-between range checking
    let inRange = false;
    if (selectionStart && selectionEnd) {
      inRange = dateStr > selectionStart && dateStr < selectionEnd;
    } else if (selectionStart && hoverDate) {
      const min = selectionStart < hoverDate ? selectionStart : hoverDate;
      const max = selectionStart > hoverDate ? selectionStart : hoverDate;
      inRange = dateStr > min && dateStr < max;
    }

    return { isStart, isEnd, inRange };
  };

  // Format label text
  const labelText = useMemo(() => {
    if (!selectionStart) return 'No date selected';
    if (!selectionEnd || selectionStart === selectionEnd) {
      return `${formatDate(selectionStart)} (1 day)`;
    }
    const days = Math.round(
      (new Date(selectionEnd).getTime() - new Date(selectionStart).getTime()) / (1000 * 60 * 60 * 24)
    ) + 1;
    return `${formatDate(selectionStart)} → ${formatDate(selectionEnd)} (${days} days)`;
  }, [selectionStart, selectionEnd]);

  return (
    <div className={`rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/90 p-3 shadow-sm transition-all ${className}`}>
      {/* Compact Summary Row */}
      <div
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex items-center justify-between gap-2 cursor-pointer select-none group/summary"
      >
        <div className="flex items-center gap-2 min-w-0">
          <CalendarIcon className="w-4 h-4 text-blue-500 shrink-0" />
          <span className="text-xs font-bold text-slate-800 dark:text-slate-100 truncate group-hover/summary:text-blue-600 dark:group-hover/summary:text-blue-400 transition-colors">
            {labelText}
          </span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {selectionStart && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                handleClear();
              }}
              className="text-[11px] font-semibold text-rose-500 hover:text-rose-600 dark:hover:text-rose-400 px-2 py-0.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
            >
              Clear
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setIsExpanded((prev) => !prev);
            }}
            className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title={isExpanded ? 'Collapse calendar' : 'Edit dates'}
          >
            <Pencil className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Collapsible Monthly Calendar Grid */}
      {isExpanded && (
        <div className="pt-3 mt-2 border-t border-slate-100 dark:border-slate-800 space-y-2">
          {/* Month Navigation */}
          <div className="flex items-center justify-between px-1">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-200">
              {monthNames[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Previous month"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-7 h-7 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                title="Next month"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* 7-Column Day Headers */}
          <div className="grid grid-cols-7 gap-1 text-center pt-1">
            {(firstDayOfWeek === 'monday'
              ? ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
              : firstDayOfWeek === 'saturday'
              ? ['Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr']
              : ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
            ).map((d) => (
              <span key={d} className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase">
                {d}
              </span>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {calendarDays.map(({ dateStr, dayNum, isCurrentMonth }, idx) => {
              const { isStart, isEnd, inRange } = getDayState(dateStr);
              const isSelected = isStart || isEnd;

              return (
                <button
                  key={`${dateStr}-${idx}`}
                  type="button"
                  onClick={() => handleDayClick(dateStr)}
                  onMouseEnter={() => {
                    if (selectionStart && !selectionEnd) {
                      setHoverDate(dateStr);
                    }
                  }}
                  className={`h-8 text-xs font-medium rounded-xl transition-all relative flex items-center justify-center ${
                    !isCurrentMonth
                      ? 'text-slate-300 dark:text-slate-700 opacity-40'
                      : isSelected
                      ? 'bg-blue-600 text-white font-black shadow-md shadow-blue-500/30 ring-2 ring-blue-400 z-10'
                      : inRange
                      ? 'bg-blue-100/80 dark:bg-blue-950/60 text-blue-700 dark:text-blue-200 font-semibold rounded-none first:rounded-l-xl last:rounded-r-xl'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  <span>{dayNum}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
