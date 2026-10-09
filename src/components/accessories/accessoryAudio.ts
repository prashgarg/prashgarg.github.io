/** Shared audio plumbing for small desktop accessories.
 *
 * The room and the desktop each own their own AudioContext, so this module
 * only coordinates the global volume setting and tells the top document when
 * an accessory is actively making sound.  The latter is deliberately kept in
 * a DOM data attribute: it is ephemeral UI state, not a user preference.
 */

import { readEffectiveDesktopVolume, subscribeDesktopAudio } from '../../lib/desktopAudio';

const AUDIO_DATASET_KEY = 'pgAccessoryAudio';
export type AccessoryAudioSource = 'ambient' | 'sequencer';
const ownedSources = new Set<AccessoryAudioSource>();

export function readAccessoryVolume(): number {
  return readEffectiveDesktopVolume();
}

/** Subscribe to the shared volume slider, including changes from an iframe. */
export function subscribeAccessoryVolume(callback: (volume: number) => void): () => void {
  return subscribeDesktopAudio(state => callback(state.effectiveVolume));
}

function topDocument(): { window: Window; document: Document } | null {
  if (typeof window === 'undefined' || typeof document === 'undefined') return null;
  try {
    const topWindow = window.top;
    if (!topWindow || topWindow.location.origin !== window.location.origin) return null;
    return { window: topWindow, document: topWindow.document };
  } catch {
    return null;
  }
}

/**
 * Record an accessory's transient audio state in the same-origin top page.
 * Multiple sound sources can coexist; each source owns one token in the
 * array, so stopping one source does not silence the others.
 */
export function reportAccessoryAudio(source: AccessoryAudioSource, playing: boolean): void {
  if (playing) ownedSources.add(source);
  else ownedSources.delete(source);
  const root = topDocument();
  if (!root) return;
  const element = root.document.documentElement;
  let sources: string[] = [];
  try {
    const decoded = JSON.parse(element.dataset[AUDIO_DATASET_KEY] || '[]');
    if (Array.isArray(decoded)) sources = decoded.filter((item): item is string => typeof item === 'string');
  } catch { /* malformed ephemeral state is harmless */ }
  sources = sources.filter(item => item !== source);
  if (playing) sources.push(source);
  if (sources.length) element.dataset[AUDIO_DATASET_KEY] = JSON.stringify([...new Set(sources)]);
  else delete element.dataset[AUDIO_DATASET_KEY];
  try {
    root.window.dispatchEvent(new CustomEvent('pg-accessory-audio', { detail: { source, playing } }));
  } catch { /* older browsers may not expose CustomEvent */ }
}

// An embedded desktop can be reloaded while an accessory is playing. Clear
// only the tokens this document owns so the room does not remain ducked and
// another accessory's token is left intact.
if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    for (const source of [...ownedSources]) reportAccessoryAudio(source, false);
  });
}
