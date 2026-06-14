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
  const onClose = () => {
    try { window.parent?.postMessage({ type: 'pg-shutdown' }, '*'); } catch { /* */ }
  };
  return <InnerDesktop embedded={false} onClose={onClose} />;
}
