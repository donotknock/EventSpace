export type DayOfWeek = 'monday' | 'saturday' | 'sunday';

const MONTHS_FULL = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const MONTHS_SHORT = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
];

export function getStoredDateFormat(): string {
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

export function getStoredFirstDayOfWeek(): DayOfWeek {
  try {
    const saved = localStorage.getItem('eventspace_first_day_of_week') as DayOfWeek;
    if (saved === 'monday' || saved === 'saturday' || saved === 'sunday') return saved;
  } catch {}
  return 'monday';
}

export function getStoredPriorityEnabled(): boolean {
  try {
    return localStorage.getItem('eventspace_enable_priority') !== 'false';
  } catch {}
  return true;
}

export function getStoredCheckboxStyles(): Array<'circle' | 'square'> {
  try {
    const saved = localStorage.getItem('eventspace_checkbox_styles');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const valid = parsed.filter((s: string) => s === 'square' || s === 'circle');
        if (valid.length > 0) return valid;
      }
    }
  } catch {}
  return ['circle', 'square'];
}

export function getStoredBulletStyles(): Array<'dot' | 'dash' | 'arrow' | 'starred'> {
  try {
    const saved = localStorage.getItem('eventspace_bullet_styles');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const mapped = parsed.map((s: string) => (s === 'bullet' ? 'dot' : s));
        const valid = mapped.filter((s: string) => s === 'dot' || s === 'dash' || s === 'arrow' || s === 'starred');
        if (valid.length > 0) return valid;
      }
    }
  } catch {}
  return ['dot', 'dash', 'arrow', 'starred'];
}

export function formatDate(date: Date | string | null | undefined, pattern?: string): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const yyyy = d.getFullYear().toString();
  const yy = yyyy.slice(-2);
  const monthIdx = d.getMonth();
  const mmmm = MONTHS_FULL[monthIdx];
  const mmm = MONTHS_SHORT[monthIdx];
  const mm = String(monthIdx + 1).padStart(2, '0');
  const m = String(monthIdx + 1);
  const day = d.getDate();
  const dd = String(day).padStart(2, '0');
  const dNum = String(day);

  const cleanPattern = pattern && pattern.trim() ? pattern : getStoredDateFormat();

  return cleanPattern
    .replace(/MMMM/g, mmmm)
    .replace(/MMM/g, mmm)
    .replace(/YYYY/g, yyyy)
    .replace(/YY/g, yy)
    .replace(/MM/g, mm)
    .replace(/\bM\b/g, m)
    .replace(/DD/g, dd)
    .replace(/\bD\b/g, dNum);
}
