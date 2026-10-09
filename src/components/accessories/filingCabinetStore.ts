const STORAGE_KEY = 'pg_filing_cabinet_v1';

export interface FilingCabinetStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
}

export interface SavedSlugsResult {
  slugs: string[];
  error: boolean;
}

export function decodeSavedSlugs(raw: string | null, allowedSlugs?: readonly string[]): string[] {
  if (!raw) return [];
  const parsed: unknown = JSON.parse(raw);
  const values = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === 'object' && Array.isArray((parsed as { slugs?: unknown }).slugs)
      ? (parsed as { slugs: unknown[] }).slugs
      : [];
  const allowed = allowedSlugs ? new Set(allowedSlugs) : null;
  return [...new Set(values.filter((value): value is string =>
    typeof value === 'string' && value.trim().length > 0 && (!allowed || allowed.has(value)),
  ))];
}

function browserStorage(): FilingCabinetStorage | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage; } catch { return null; }
}

export function readSavedSlugs(
  storage: FilingCabinetStorage | null = browserStorage(),
  allowedSlugs?: readonly string[],
): SavedSlugsResult {
  if (!storage) return { slugs: [], error: true };
  try {
    return { slugs: decodeSavedSlugs(storage.getItem(STORAGE_KEY), allowedSlugs), error: false };
  } catch {
    return { slugs: [], error: true };
  }
}

export function writeSavedSlugs(
  slugs: readonly string[],
  storage: FilingCabinetStorage | null = browserStorage(),
): boolean {
  if (!storage) return false;
  try {
    storage.setItem(STORAGE_KEY, JSON.stringify([...new Set(slugs)]));
    return true;
  } catch {
    return false;
  }
}

export function toggleSavedSlug(slugs: readonly string[], slug: string): string[] {
  return slugs.includes(slug) ? slugs.filter(item => item !== slug) : [...slugs, slug];
}

export { STORAGE_KEY as FILING_CABINET_STORAGE_KEY };
