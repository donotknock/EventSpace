/**
 * Formats an event date range or single date.
 * If there is no endDate, or if endDate is on the same calendar day as startDate,
 * returns a single date string (e.g. "Oct 12") instead of a range.
 */
export function formatEventDate(
  startDate?: string | null,
  endDate?: string | null
): string | null {
  if (!startDate) return null;

  const startObj = new Date(startDate);
  if (isNaN(startObj.getTime())) return null;

  const startStr = startObj.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

  if (!endDate) return startStr;

  const endObj = new Date(endDate);
  if (isNaN(endObj.getTime())) return startStr;

  const endStr = endObj.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
  });

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
