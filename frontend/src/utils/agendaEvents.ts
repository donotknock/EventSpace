/**
 * Global dispatcher to notify components across the app to refetch/re-evaluate
 * agenda items and badge counts.
 */
export const triggerAgendaRefresh = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('agenda-updated'));
  }
};
