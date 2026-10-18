import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { Clock, X } from 'lucide-react';
import { formatTime } from '../utils/date';
import { useSettings } from '../context/SettingsContext';

export function parseTimeString(str: string): string | null {
  if (!str || !str.trim()) return null;
  const s = str.trim();

  // 12h with AM/PM (e.g. "1:23 PM", "01:23pm", "1:23p", "1 PM", "12:00 AM")
  const match12 = s.match(/^(\d{1,2})(?::(\d{1,2}))?\s*([ap]m?)$/i);
  if (match12) {
    let h = parseInt(match12[1], 10);
    const m = match12[2] ? parseInt(match12[2], 10) : 0;
    const modifier = match12[3].toLowerCase();
    if (h < 1 || h > 12 || m < 0 || m > 59) return null;
    const isPm = modifier.startsWith('p');
    if (isPm) {
      h = h === 12 ? 12 : h + 12;
    } else {
      h = h === 12 ? 0 : h;
    }
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  // 24h (e.g. "13:47", "9:05", "09:05", "13")
  const match24 = s.match(/^(\d{1,2})(?::(\d{1,2}))?$/);
  if (match24) {
    const h = parseInt(match24[1], 10);
    const m = match24[2] ? parseInt(match24[2], 10) : 0;
    if (h < 0 || h > 23 || m < 0 || m > 59) return null;
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  return null;
}

interface CustomTimePickerProps {
  value?: string | null; // Stored as "HH:mm" (24h standard)
  onChange: (time: string | null) => void;
  placeholder?: string;
  className?: string;
  buttonClassName?: string;
  isOptional?: boolean;
  size?: 'sm' | 'md';
  align?: 'left' | 'right';
  disabled?: boolean;
  minTime?: string | null;
}

export const CustomTimePicker: React.FC<CustomTimePickerProps> = ({
  value,
  onChange,
  placeholder = 'Select time...',
  className = '',
  buttonClassName = '',
  isOptional = true,
  size = 'md',
  align = 'left',
  disabled = false,
  minTime = null,
}) => {
  const { timeFormat } = useSettings();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const textInputRef = useRef<HTMLInputElement>(null);
  const [typedInput, setTypedInput] = useState('');
  const [validationWarning, setValidationWarning] = useState<string | null>(null);
  const [popoverPos, setPopoverPos] = useState({ top: 0, left: 0 });

  const updatePosition = () => {
    if (!triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    const popoverWidth = 256;
    const popoverHeight = 310;

    let left = rect.left;
    if (rect.left + popoverWidth > window.innerWidth - 16 || align === 'right' || rect.left > window.innerWidth / 2) {
      left = Math.max(16, rect.right - popoverWidth);
    }

    let top = rect.bottom + 6;
    if (rect.bottom + popoverHeight > window.innerHeight - 16) {
      top = Math.max(16, rect.top - popoverHeight - 6);
    }

    setPopoverPos({ top, left });
  };

  useEffect(() => {
    if (!isOpen) return;
    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition, true);
    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition, true);
    };
  }, [isOpen, align]);

  // Formatted button label
  const formattedLabel = useMemo(() => {
    if (!value) return '';
    return formatTime(value, timeFormat);
  }, [value, timeFormat]);

  // When popover opens or value changes, keep typed input in sync
  useEffect(() => {
    if (isOpen) {
      setTypedInput(value ? formatTime(value, timeFormat) : '');
      setValidationWarning(null);
      setTimeout(() => textInputRef.current?.select(), 50);
    }
  }, [isOpen, value, timeFormat]);

  // Parse hours and minutes from "HH:mm"
  const parsedTime = useMemo(() => {
    if (!value) return null;
    const parts = value.split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (isNaN(h) || isNaN(m)) return null;
    return { h, m };
  }, [value]);

  // Click outside listener
  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        popoverRef.current &&
        !popoverRef.current.contains(target) &&
        triggerRef.current &&
        !triggerRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  // Selected state for hours/minutes
  const currentHour24 = parsedTime ? parsedTime.h : 9;
  const currentMinute = parsedTime ? parsedTime.m : 0;

  // 12h calculations
  const isPM = currentHour24 >= 12;
  const currentHour12 = currentHour24 % 12 === 0 ? 12 : currentHour24 % 12;

  const handleSelectTime = (h24: number, min: number) => {
    let formatted = `${String(h24).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
    if (minTime && formatted < minTime) {
      formatted = minTime;
      setValidationWarning(`End time cannot be earlier than start time (${formatTime(minTime, timeFormat)})`);
    } else {
      setValidationWarning(null);
    }
    onChange(formatted);
    setTypedInput(formatTime(formatted, timeFormat));
  };

  const commitTypedTime = (str: string) => {
    if (!str.trim()) {
      if (isOptional) {
        onChange(null);
        setValidationWarning(null);
      }
      return;
    }
    const parsed = parseTimeString(str);
    if (!parsed) {
      setValidationWarning('Invalid time format (e.g. 1:23 PM, 13:47)');
      return;
    }
    if (minTime && parsed < minTime) {
      onChange(minTime);
      setTypedInput(formatTime(minTime, timeFormat));
      setValidationWarning(`End time adjusted to start time (${formatTime(minTime, timeFormat)})`);
      return;
    }
    setValidationWarning(null);
    onChange(parsed);
    setTypedInput(formatTime(parsed, timeFormat));
  };

  const handleHourClick = (selectedH: number) => {
    let targetH24 = selectedH;
    if (timeFormat === '12h') {
      if (isPM) {
        targetH24 = selectedH === 12 ? 12 : selectedH + 12;
      } else {
        targetH24 = selectedH === 12 ? 0 : selectedH;
      }
    }
    handleSelectTime(targetH24, currentMinute);
  };

  const handleMinuteClick = (selectedMin: number) => {
    handleSelectTime(currentHour24, selectedMin);
  };

  const handleToggleAmPm = (targetAmPm: 'AM' | 'PM') => {
    if (targetAmPm === 'AM' && isPM) {
      handleSelectTime(currentHour24 - 12, currentMinute);
    } else if (targetAmPm === 'PM' && !isPM) {
      handleSelectTime(currentHour24 + 12, currentMinute);
    }
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
    setIsOpen(false);
  };

  const handleSelectNow = () => {
    const now = new Date();
    handleSelectTime(now.getHours(), now.getMinutes());
    setIsOpen(false);
  };

  const minuteOptions = [0, 5, 10, 15, 20, 25, 30, 35, 40, 45, 50, 55];

  return (
    <div ref={containerRef} className={`relative inline-block ${className}`}>
      {/* Trigger Button */}
      <button
        ref={triggerRef}
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
        <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="truncate flex-1">
          {formattedLabel || <span className="text-slate-400">{placeholder}</span>}
        </span>
        {isOptional && value && !disabled && (
          <span
            onClick={handleClear}
            className="p-1 text-slate-400 hover:text-rose-500 rounded-md transition-colors"
            title="Clear time"
          >
            <X className="w-3 h-3" />
          </span>
        )}
      </button>

      {/* Popover */}
      {isOpen && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: `${popoverPos.top}px`,
            left: `${popoverPos.left}px`,
            zIndex: 10000,
          }}
          className="w-64 p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl animate-fade-in"
        >
          {/* Header & AM/PM Pills if 12h */}
          <div className="flex items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
            <span className="text-xs font-bold text-slate-800 dark:text-slate-100">
              {formattedLabel || 'Select Time'}
            </span>

            {timeFormat === '12h' && (
              <div className="flex items-center rounded-lg bg-slate-100 dark:bg-slate-800 p-0.5 text-xs font-bold">
                <button
                  type="button"
                  onClick={() => handleToggleAmPm('AM')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    !isPM
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  AM
                </button>
                <button
                  type="button"
                  onClick={() => handleToggleAmPm('PM')}
                  className={`px-2 py-0.5 rounded-md transition-all ${
                    isPM
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                  }`}
                >
                  PM
                </button>
              </div>
            )}
          </div>

          {/* Manual Text Input Field */}
          <div className="pt-2 pb-1">
            <input
              ref={textInputRef}
              type="text"
              placeholder={timeFormat === '12h' ? 'e.g. 1:23 PM' : 'e.g. 13:47'}
              value={typedInput}
              onChange={(e) => {
                setTypedInput(e.target.value);
                if (validationWarning) setValidationWarning(null);
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  commitTypedTime(typedInput);
                }
              }}
              onBlur={() => commitTypedTime(typedInput)}
              className="w-full px-2.5 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
            />
            {validationWarning && (
              <span className="text-[10px] text-amber-500 dark:text-amber-400 font-medium mt-1 block">
                {validationWarning}
              </span>
            )}
          </div>

          <div className="py-2 space-y-3">
            {/* Hours Grid */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Hour
              </div>
              <div
                className={`grid gap-1 ${
                  timeFormat === '12h' ? 'grid-cols-6' : 'grid-cols-6 max-h-24 overflow-y-auto pr-0.5'
                }`}
              >
                {timeFormat === '12h'
                  ? [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((h) => {
                      const isSelected = parsedTime && currentHour12 === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => handleHourClick(h)}
                          className={`h-7 text-xs font-semibold rounded-lg transition-all flex items-center justify-center ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {h}
                        </button>
                      );
                    })
                  : Array.from({ length: 24 }, (_, i) => i).map((h) => {
                      const isSelected = parsedTime && currentHour24 === h;
                      return (
                        <button
                          key={h}
                          type="button"
                          onClick={() => handleHourClick(h)}
                          className={`h-7 text-xs font-semibold rounded-lg transition-all flex items-center justify-center ${
                            isSelected
                              ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                              : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {String(h).padStart(2, '0')}
                        </button>
                      );
                    })}
              </div>
            </div>

            {/* Minutes Grid */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                Minute
              </div>
              <div className="grid grid-cols-6 gap-1">
                {minuteOptions.map((min) => {
                  const isSelected = parsedTime && currentMinute === min;
                  return (
                    <button
                      key={min}
                      type="button"
                      onClick={() => handleMinuteClick(min)}
                      className={`h-7 text-xs font-semibold rounded-lg transition-all flex items-center justify-center ${
                        isSelected
                          ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400'
                          : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                      }`}
                    >
                      :{String(min).padStart(2, '0')}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
            <button
              type="button"
              onClick={handleSelectNow}
              className="text-blue-600 dark:text-blue-400 hover:underline font-semibold"
            >
              Now
            </button>
            {isOptional && value && (
              <button
                type="button"
                onClick={handleClear}
                className="text-rose-500 hover:underline font-semibold"
              >
                Clear
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
