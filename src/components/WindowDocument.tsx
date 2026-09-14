import { useEffect, useRef, useState } from 'react';

export interface ReadingSnapshot {
  scroll: number;
  details: boolean[];
  focusHref?: string;
}

/** Restore reading state when a document is reopened by Back or a window tab. */
export default function WindowDocument({ path, title, snapshots }: {
  path: string; title: string; snapshots: Map<string, ReadingSnapshot>;
}) {
  const frame = useRef<HTMLIFrameElement>(null);
  const cleanup = useRef<(() => void) | undefined>(undefined);
  const [loading, setLoading] = useState(true);
  const url = new URL(path, window.location.origin);
  const snapshotKey = url.pathname + url.search;
  url.searchParams.set('embed', '1');
  useEffect(() => () => cleanup.current?.(), []);

  const loaded = async () => {
    const child = frame.current?.contentWindow;
    const doc = frame.current?.contentDocument;
    if (!child || !doc) { setLoading(false); return; }
    const previous = snapshots.get(snapshotKey);
    const details = [...doc.querySelectorAll('details')];
    let disposed = false;
    const save = () => {
      const focused = doc.activeElement;
      snapshots.set(snapshotKey, {
        scroll: child.scrollY,
        details: details.map(item => item.open),
        focusHref: focused?.tagName === 'A' ? focused.getAttribute('href') || undefined : undefined,
      });
    };
    // The previous state is restored before listening, so initial paint cannot
    // overwrite the saved position with zero.
    await doc.fonts.ready;
    if (!frame.current?.isConnected) return;
    if (previous) {
      details.forEach((item, i) => { item.open = previous.details[i] ?? item.open; });
      const link = [...doc.querySelectorAll<HTMLAnchorElement>('a[href]')].find(a => a.getAttribute('href') === previous.focusHref);
      link?.focus({ preventScroll: true });
    }
    child.requestAnimationFrame(() => {
      if (disposed) return;
      if (url.hash) {
        let targetId = url.hash.slice(1);
        try { targetId = decodeURIComponent(targetId); } catch { /* Treat a malformed escape as a literal ID. */ }
        const target = doc.getElementById(targetId);
        // A saved archive can be collapsed. An explicit search destination
        // takes precedence over that saved disclosure state.
        for (let parent = target?.parentElement; parent; parent = parent.parentElement) {
          if (parent.tagName === 'DETAILS') (parent as HTMLDetailsElement).open = true;
        }
        target?.scrollIntoView({ behavior: 'instant' });
      } else if (previous) child.scrollTo({ top: previous.scroll, behavior: 'instant' });
      child.addEventListener('scroll', save, { passive: true });
      doc.addEventListener('toggle', save, true);
      doc.addEventListener('focusin', save);
      save();
      setLoading(false);
    });
    cleanup.current = () => {
      disposed = true;
      child.removeEventListener('scroll', save);
      doc.removeEventListener('toggle', save, true);
      doc.removeEventListener('focusin', save);
    };
  };

  return <>
    <iframe ref={frame} src={url.pathname + url.search + url.hash} className="win95-iframe" title={title}
      onLoad={loaded} style={{ width: '100%', height: '100%', border: 0, display: 'block', background: '#EFEAD8' }} />
    {loading && <div aria-hidden="true" style={{ position: 'absolute', inset: 0, display: 'grid', placeItems: 'center',
      background: '#EFEAD8', color: '#6a675f', pointerEvents: 'none', fontSize: 13 }}>Loading…</div>}
  </>;
}
