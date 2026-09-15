export type ViewPreference = 'office' | 'desktop';
export const VIEW_PREFERENCE_KEY = 'pg_view';
export const VIEW_PREFERENCE_EVENT = 'pg-view-preference';

/** An explicit visitor choice. Device-based defaults are handled separately. */
export function readViewPreference(): ViewPreference {
  try { return localStorage.getItem(VIEW_PREFERENCE_KEY) === 'desktop' ? 'desktop' : 'office'; }
  catch { return 'office'; }
}

export function setViewPreference(view: ViewPreference): boolean {
  try {
    localStorage.setItem(VIEW_PREFERENCE_KEY, view);
    window.dispatchEvent(new CustomEvent(VIEW_PREFERENCE_EVENT, { detail: view }));
    return true;
  } catch { return false; }
}
