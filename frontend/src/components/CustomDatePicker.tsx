import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import { formatDate } from '../utils/date';
import { useSettings } from '../context/SettingsContext';

interface CustomDatePickerProps {
  value?: string | null;
  onChange: (date: string | null) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  isOptional?: boolean;
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
  disabled?: boolean;
}

export const CustomDatePicker: React.FC<CustomDatePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select date...',
  className = '',
  buttonClassName = '',
  isOptional = true,
  size = 'md',
  align = 'left',
  disabled = false,
}) => {
  const { firstDayOfWeek, dateFormat } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Normalize string to YYYY-MM-DD
  const parseDateStr = (d?: string | null): string => {
    if (!d) return '';
    try {
      const dateObj = new Date(d);
      if (isNaN(dateObj.getTime())) return '';
      return dateObj.toISOString().slice(0, 10);
    } catch {
      return '';
    }
  };

  const currentDateStr = parseDateStr(value);
  const initialDate = currentDateStr ? new Date(currentDateStr) : new Date();
  const [viewYear, setViewYear] = useState(initialDate.getFullYear());
  const [viewMonth, setViewMonth] = useState(initialDate.getMonth()); // 0-indexed

  // Sync view when value changes
  useEffect(() => {
    if (currentDateStr) {
      const d = new Date(currentDateStr);
      if (!isNaN(d.getTime())) {
        setViewYear(d.getFullYear());
        setViewMonth(d.getMonth());
      }
    }
  }, [currentDateStr]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December',
  ];

  // Calendar days grid calculation
  const calendarDays = useMemo(() => {
    const rawFirstDay = new Date(viewYear, viewMonth, 1).getDay(); // 0 is Sun, 1 is Mon, 6 is Sat
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

    // Trailing days padding
    const remaining = (7 - (days.length % 7)) % 7;
    for (let r = 1; r <= remaining; r++) {
      const nYear = viewMonth === 11 ? viewYear + 1 : viewYear;
      const nMonth = viewMonth === 11 ? 1 : viewMonth + 2;
      const dateStr = `${nYear}-${String(nMonth).padStart(2, '0')}-${String(r).padStart(2, '0')}`;
      days.push({ dateStr, dayNum: r, isCurrentMonth: false });
    }

    return days;
  }, [viewYear, viewMonth, firstDayOfWeek]);

  const handleSelectDate = (dateStr: string) => {
    onChange(dateStr);
    setIsOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setIsOpen(false);
  };

  const formattedLabel = currentDateStr ? formatDate(currentDateStr, dateFormat) : '';

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 rounded-xl transition-all select-none text-left ${
          buttonClassName
            ? buttonClassName
            : size === 'sm'
            ? 'h-8 px-2.5 text-xs bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/80 text-slate-700 dark:text-slate-200 hover:border-blue-400'
            : 'w-full h-11 px-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white hover:border-blue-500'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <CalendarIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="truncate flex-1">
          {formattedLabel || <span className="text-slate-400">{placeholder}</span>}
        </span>
        {isOptional && currentDateStr && !disabled && (
          <span
            onClick={handleClear}
            className="p-1 text-slate-400 hover:text-rose-500 rounded-md transition-colors"
            title="Clear date"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && (
        <div
          className={`absolute top-full mt-1.5 z-[500] w-64 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {/* Month & Year Navigation */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {monthNames[viewMonth]} {viewYear}
            </span>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handlePrevMonth}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleNextMonth}
                className="w-6 h-6 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* 7-Column Day Headers */}
          <div className="grid grid-cols-7 gap-1 text-center py-1.5">
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
              const isSelected = dateStr === currentDateStr;
              return (
                <button
                  key={`${dateStr}-${idx}`}
                  type="button"
                  onClick={() => handleSelectDate(dateStr)}
                  className={`h-7 text-xs rounded-lg transition-all flex items-center justify-center ${
                    !isCurrentMonth
                      ? 'text-slate-300 dark:text-slate-700 opacity-40'
                      : isSelected
                      ? 'bg-blue-600 text-white font-bold shadow-sm ring-1 ring-blue-400'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                  }`}
                >
                  {dayNum}
                </button>
              );
            })}
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-between pt-2 mt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={() => handleSelectDate(new Date().toISOString().slice(0, 10))}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Today
            </button>
            {isOptional && currentDateStr && (
              <button
                type="button"
                onClick={handleClear}
                className="text-rose-500 hover:underline font-semibold"
              >
                Clear
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
