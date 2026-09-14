import { useEffect, useRef, useState } from 'react';
import FindDialog from './FindDialog';

/**
 * Page-level bridge for the shared Find dialog.
 *
 * Win95Layout is also loaded inside the composited desktop's iframe. In that
 * case the desktop owns Find, so this wrapper only listens at top level and
 * never creates a second dialog inside the iframe.
 */
export default function StandaloneFind() {
  const hostRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [embedded, setEmbedded] = useState(true);

  useEffect(() => {
    let isEmbedded = false;
    try { isEmbedded = window.top !== window; } catch { isEmbedded = true; }
    setEmbedded(isEmbedded);
    if (isEmbedded) return;

    const handleFind = () => setOpen(current => !current);
    window.addEventListener('pg-find', handleFind);
    return () => window.removeEventListener('pg-find', handleFind);
  }, []);

  useEffect(() => {
    if (embedded || !open) return;
    // Keep the page behind the modal out of the keyboard and accessibility
    // tree while the dialog is open. The React island itself contains Find.
    const host = hostRef.current;
    const island = host?.closest('astro-island')
      ?? (host?.parentElement === document.body ? host : host?.parentElement ?? host);
    if (!island) return;
    const changed: Array<{ element: HTMLElement; inert: boolean }> = [];
    Array.from(document.body.children).forEach(child => {
      if (child === island) return;
      const element = child as HTMLElement & { inert?: boolean };
      changed.push({ element, inert: Boolean(element.inert) });
      element.inert = true;
    });
    return () => changed.forEach(({ element, inert }) => { element.inert = inert; });
  }, [embedded, open]);

  return (
    <div ref={hostRef} className="standalone-find-host">
      {!embedded && <FindDialog open={open} onClose={() => setOpen(false)} />}
    </div>
  );
}
