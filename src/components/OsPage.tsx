import { useEffect, useState } from 'react';
import InnerDesktop from './InnerDesktop';

/**
 * Standalone desktop document — the Windows-95 OS rendered as its OWN
 * page (its own coordinate space). This is what gets loaded in an
 * <iframe> and composited onto the 3D monitor (Henry Heffernan pattern):
 * because all pointer math (window drags, scrolls, clicks) happens inside
 * this document, it stays correct no matter how the outer iframe is
 * transformed in 3D. Shutdown bubbles to the parent room via postMessage.
 */
export default function OsPage() {
  const [active, setActive] = useState(() => window.parent === window);
  useEffect(() => {
    if (window.parent === window) return;
    const receive = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || event.source !== window.parent) return;
      if (event.data?.type === 'pg-office-focus') setActive(event.data.active === true);
    };
    window.addEventListener('message', receive);
    // The child and its styles have committed before the room reveals it.
    const frame = requestAnimationFrame(() => {
      window.parent.postMessage({ type: 'pg-desktop-ready' }, window.location.origin);
    });
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('message', receive);
    };
  }, []);
  const onClose = () => {
    try { window.parent?.postMessage({ type: 'pg-shutdown' }, window.location.origin); } catch { /* */ }
  };
  return <InnerDesktop embedded={false} active={active} onClose={onClose} />;
}
