/** Keep the visible address bar authoritative for the composited desktop. */
export function navigationHost(): Window {
  try {
    if (window.parent !== window && window.parent.location.origin === window.location.origin
      && window.parent.document.getElementById('office')) return window.parent;
  } catch { /* Standalone or externally embedded desktop. */ }
  return window;
}

export function cleanPath(path: string): string {
  const url = new URL(path, window.location.origin);
  url.searchParams.delete('embed');
  const pathname = url.pathname.replace(/\/$/, '') || '/';
  return pathname + url.search + url.hash;
}

export function pathAtLocation(location: Location): string {
  const params = new URLSearchParams(location.search);
  const app = params.get('app');
  if (app && ['home', 'research', 'talks', 'library', 'now', 'cv', 'games', 'accessories', 'notepad', 'paint', 'calculator', 'focus', 'cabinet', 'ambient', 'sequencer'].includes(app)) {
    if (app === 'home') return '/';
    const paper = params.get('paper');
    const game = params.get('game');
    if (app === 'games' && game && ['snake', 'solitaire', 'minesweeper'].includes(game)) return `/games?game=${game}`;
    return app === 'research' && paper ? `/research/${encodeURIComponent(paper)}`
      : ['accessories', 'notepad', 'paint', 'calculator', 'focus', 'cabinet', 'ambient', 'sequencer'].includes(app)
        ? (app === 'accessories' ? '/accessories' : `/accessories/${app}`)
        : `/${app}`;
  }
  return location.pathname === '/os' || location.pathname === '/os/' ? '/' : cleanPath(location.pathname + location.search + location.hash);
}

export function writeLocation(path: string) {
  const host = navigationHost();
  const next = cleanPath(path);
  if (pathAtLocation(host.location) === next) return;
  const accessory = next === '/accessories' ? 'accessories' : next.startsWith('/accessories/') ? next.slice('/accessories/'.length) : null;
  const target = accessory ? `${host.location.pathname.replace(/\/$/, '') === '/os' ? '/os/' : '/'}?app=${encodeURIComponent(accessory)}` : next;
  host.history.pushState({ ...host.history.state, pgDesktop: true }, '', target);
}
