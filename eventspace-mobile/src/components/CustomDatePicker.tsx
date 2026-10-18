import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  X,
} from 'lucide-react';
import {
  formatDate,
  getStoredDateFormat,
  getStoredFirstDayOfWeek,
  DayOfWeek,
} from '../utils/date';

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
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  const dateFormat = getStoredDateFormat();
  const firstDayOfWeek: DayOfWeek = getStoredFirstDayOfWeek();

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

  // Position calculation for popover
  const updatePosition = () => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const popoverWidth = 280;
    const popoverHeight = 310;

    let left = align === 'right' ? rect.right - popoverWidth : rect.left;
    if (left + popoverWidth > window.innerWidth - 12) {
      left = Math.max(12, window.innerWidth - popoverWidth - 12);
    }
    if (left < 12) left = 12;

    let top = rect.bottom + 6;
    if (top + popoverHeight > window.innerHeight - 12) {
      top = Math.max(12, rect.top - popoverHeight - 6);
    }

    setPopoverPos({ top, left });
  };

  useEffect(() => {
    if (isOpen) {
      updatePosition();
      const handleScrollOrResize = () => updatePosition();
      window.addEventListener('resize', handleScrollOrResize);
      window.addEventListener('scroll', handleScrollOrResize, true);
      return () => {
        window.removeEventListener('resize', handleScrollOrResize);
        window.removeEventListener('scroll', handleScrollOrResize, true);
      };
    }
  }, [isOpen, align]);

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

  const dayHeaders = useMemo(() => {
    if (firstDayOfWeek === 'monday') {
      return ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su'];
    } else if (firstDayOfWeek === 'saturday') {
      return ['Sa', 'Su', 'Mo', 'Tu', 'We', 'Th', 'Fr'];
    }
    return ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];
  }, [firstDayOfWeek]);

  return (
    <div className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        type="button"
        disabled={disabled}
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`flex items-center gap-1.5 transition-all select-none text-left ${
          buttonClassName
            ? buttonClassName
            : size === 'sm'
            ? 'h-7 px-2 text-xs rounded-lg bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-200'
            : 'w-full h-9 px-2.5 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer active:scale-95'}`}
      >
        <CalendarIcon className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="truncate flex-1">
          {formattedLabel || <span className="text-slate-400">{placeholder}</span>}
        </span>
        {isOptional && currentDateStr && !disabled && (
          <span
            onClick={handleClear}
            className="p-0.5 text-slate-400 hover:text-rose-500 rounded transition-colors"
            title="Clear date"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {/* Popover Portal */}
      {isOpen &&
        createPortal(
          <div
            className="fixed inset-0 z-[10000]"
            onClick={(e) => {
              e.stopPropagation();
              setIsOpen(false);
            }}
          >
            <div
              style={{
                position: 'fixed',
                top: `${popoverPos.top}px`,
                left: `${popoverPos.left}px`,
                width: '280px',
              }}
              className="p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl animate-fadeIn text-slate-900 dark:text-white"
              onClick={(e) => e.stopPropagation()}
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
                    className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Previous month"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={handleNextMonth}
                    className="p-1 rounded-lg text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
                    title="Next month"
                  >
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Day Headers */}
              <div className="grid grid-cols-7 gap-1 mt-2 text-center">
                {dayHeaders.map((dh) => (
                  <span
                    key={dh}
                    className="text-[10px] font-bold uppercase text-slate-400 dark:text-slate-500"
                  >
                    {dh}
                  </span>
                ))}
              </div>

              {/* Days Grid */}
              <div className="grid grid-cols-7 gap-1 mt-1">
                {calendarDays.map((day, idx) => {
                  const isSelected = day.dateStr === currentDateStr;
                  const isToday =
                    day.dateStr === new Date().toISOString().slice(0, 10);

                  return (
                    <button
                      type="button"
                      key={`${day.dateStr}-${idx}`}
                      onClick={() => handleSelectDate(day.dateStr)}
                      className={`h-7 rounded-lg text-xs font-medium flex items-center justify-center transition-all ${
                        isSelected
                          ? 'bg-blue-600 text-white font-bold shadow-sm'
                          : isToday
                          ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 font-bold border border-blue-200 dark:border-blue-900/40'
                          : day.isCurrentMonth
                          ? 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800'
                          : 'text-slate-300 dark:text-slate-600 hover:bg-slate-50 dark:hover:bg-slate-800/50'
                      }`}
                    >
                      {day.dayNum}
                    </button>
                  );
                })}
              </div>

              {/* Today and Clear Buttons */}
              <div className="flex items-center justify-between pt-2.5 mt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => handleSelectDate(new Date().toISOString().slice(0, 10))}
                  className="font-bold text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Today
                </button>
                {currentDateStr && (
                  <button
                    type="button"
                    onClick={handleClear}
                    className="font-semibold text-slate-400 hover:text-rose-500 hover:underline"
                  >
                    Clear
                  </button>
                )}
              </div>
            </div>
          </div>,
          document.body
        )}
    </div>
  );
};
