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
  if (app && ['home', 'research', 'talks', 'library', 'now', 'cv'].includes(app)) {
    if (app === 'home') return '/';
    const paper = params.get('paper');
    return app === 'research' && paper ? `/research/${encodeURIComponent(paper)}` : `/${app}`;
  }
  return location.pathname === '/os' || location.pathname === '/os/' ? '/' : cleanPath(location.pathname + location.search + location.hash);
}

export function writeLocation(path: string) {
  const host = navigationHost();
  const next = cleanPath(path);
  if (pathAtLocation(host.location) === next) return;
  host.history.pushState({ ...host.history.state, pgDesktop: true }, '', next);
}
