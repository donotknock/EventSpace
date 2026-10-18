export type GlobalDateFormat = string;

const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export const DATE_FORMAT_REGEX = /^(?=.*(YYYY|YY))(?=.*(MMMM|MMM|MM|M))(?=.*(DD|D))[YMDdHhmsaA\s\/\-.,:]+$/;

export function isValidDateFormat(pattern: string): boolean {
  if (!pattern || !pattern.trim()) return false;
  return DATE_FORMAT_REGEX.test(pattern.trim());
}

export function getGlobalDateFormat(): string {
  try {
    const saved = localStorage.getItem('eventspace_date_format');
    if (saved && saved.trim()) {
      if (saved === 'default') return 'DD MMM YYYY';
      if (saved === 'us') return 'MM/DD/YYYY';
      if (saved === 'iso') return 'YYYY-MM-DD';
      return saved;
    }
  } catch {}
  return 'DD MMM YYYY';
}

export function getGlobalTimeFormat(): '12h' | '24h' {
  try {
    const saved = localStorage.getItem('eventspace_time_format');
    if (saved === '24h' || saved === '12h') return saved;
  } catch {}
  return '12h';
}

export function formatCustomDate(date: Date, pattern = 'DD MMM YYYY'): string {
  if (!date || isNaN(date.getTime())) return '';
  const yyyy = date.getFullYear().toString();
  const yy = yyyy.slice(-2);
  const monthIdx = date.getMonth();
  const mmmm = MONTHS_FULL[monthIdx];
  const mmm = MONTHS_SHORT[monthIdx];
  const mm = String(monthIdx + 1).padStart(2, '0');
  const m = String(monthIdx + 1);
  const day = date.getDate();
  const dd = String(day).padStart(2, '0');
  const d = String(day);

  const cleanPattern = pattern && pattern.trim() ? pattern : 'DD MMM YYYY';

  // Replace longest tokens first to avoid substring collisions
  return cleanPattern
    .replace(/MMMM/g, mmmm)
    .replace(/MMM/g, mmm)
    .replace(/YYYY/g, yyyy)
    .replace(/YY/g, yy)
    .replace(/MM/g, mm)
    .replace(/\bM\b/g, m)
    .replace(/DD/g, dd)
    .replace(/\bD\b/g, d);
}

export function formatCustomTime(dateOrTime: Date | string, format: '12h' | '24h' = '12h'): string {
  if (!dateOrTime) return '';
  if (typeof dateOrTime === 'string') {
    if (/^\d{1,2}:\d{2}(:\d{2})?/.test(dateOrTime)) {
      return formatTime(dateOrTime, format);
    }
    const d = new Date(dateOrTime);
    if (!isNaN(d.getTime())) {
      return formatCustomTime(d, format);
    }
    return dateOrTime;
  }
  if (isNaN(dateOrTime.getTime())) return '';
  if (format === '24h') {
    const hours = String(dateOrTime.getHours()).padStart(2, '0');
    const minutes = String(dateOrTime.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
  } else {
    let hours = dateOrTime.getHours();
    const minutes = String(dateOrTime.getMinutes()).padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12 || 12;
    return `${hours}:${minutes} ${ampm}`;
  }
}

/**
 * Format a single date using the specified or globally configured format.
 */
export function formatDate(
  date?: string | Date | null,
  format?: string
): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  let activeFormat = format || getGlobalDateFormat();
  if (activeFormat === 'default') activeFormat = 'DD MMM YYYY';
  else if (activeFormat === 'us') activeFormat = 'MM/DD/YYYY';
  else if (activeFormat === 'iso') activeFormat = 'YYYY-MM-DD';

  return formatCustomDate(d, activeFormat);
}

/**
 * Format a month and day using strict MMM format (e.g. "Oct 12").
 */
export function formatMonthDay(date?: string | Date | null): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return d.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Format date & time using the specified or globally configured format.
 */
export function formatDateTime(
  date?: string | Date | null,
  format?: string
): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';

  const datePart = formatDate(d, format);
  const timePart = formatCustomTime(d, getGlobalTimeFormat());
  return `${datePart} • ${timePart}`;
}

/**
 * Format a time string (e.g. "14:30") respecting 24h or 12h format.
 */
export function formatTime(
  timeStr?: string | null,
  format?: '12h' | '24h'
): string {
  if (!timeStr) return '';
  const activeFormat = format || getGlobalTimeFormat();

  const [hStr, mStr] = timeStr.split(':');
  if (!hStr || !mStr) return timeStr;

  let h = parseInt(hStr, 10);
  const m = parseInt(mStr, 10);
  if (isNaN(h) || isNaN(m)) return timeStr;

  if (activeFormat === '24h') {
    return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
  }

  const ampm = h >= 12 ? 'PM' : 'AM';
  h = h % 12;
  h = h ? h : 12;
  return `${h}:${String(m).padStart(2, '0')} ${ampm}`;
}

/**
 * Formats an event date range or single date.
 */
export function formatEventDate(
  startDate?: string | null,
  endDate?: string | null,
  format?: string
): string | null {
  if (!startDate) return null;

  const startObj = new Date(startDate);
  if (isNaN(startObj.getTime())) return null;

  const startStr = formatDate(startObj, format);

  if (!endDate) return startStr;

  const endObj = new Date(endDate);
  if (isNaN(endObj.getTime())) return startStr;

  const endStr = formatDate(endObj, format);

  // If both dates represent the exact same calendar day
  if (
    startObj.getFullYear() === endObj.getFullYear() &&
    startObj.getMonth() === endObj.getMonth() &&
    startObj.getDate() === endObj.getDate()
  ) {
    return startStr;
  }

  return `${startStr} – ${endStr}`;
}
