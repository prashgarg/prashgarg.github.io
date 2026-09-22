import { useEffect, useId, useRef, useState } from 'react';
import '../styles/office-info.css';

export interface OfficeInfoProps {
  /** Optional hook for positioning the control in a different host surface. */
  className?: string;
}

const CREDITS = [
  {
    label: 'Henry Heffernan',
    href: 'https://henryheffernan.com',
    text: 'boot, room, and computer structure',
  },
  {
    label: 'Severance',
    href: 'https://www.apple.com/tv-pr/originals/severance/',
    text: 'office, CRT, and institutional mood',
  },
  {
    label: 'PostHog',
    href: 'https://posthog.com',
    text: 'playful web and interface sensibility',
  },
  {
    label: 'ambientCG',
    href: 'https://ambientcg.com',
    text: 'CC0 PBR textures',
  },
] as const;

function joinClasses(...names: Array<string | undefined>) {
  return names.filter(Boolean).join(' ');
}

/** A small, discoverable credit for the room's visual reference. */
export default function OfficeInfo({ className }: OfficeInfoProps) {
  const [open, setOpen] = useState(false);
  const [creditsOpen, setCreditsOpen] = useState(false);
  const [hintActive, setHintActive] = useState(false);
  const [hintDismissed, setHintDismissed] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const headingId = useId();
  const panelId = useId();
  const tooltipId = useId();
  const showHint = hintActive && !hintDismissed && !open;

  const close = (restoreFocus = true) => {
    setOpen(false);
    setCreditsOpen(false);
    setHintDismissed(true);
    if (restoreFocus) window.requestAnimationFrame(() => triggerRef.current?.focus());
  };

  useEffect(() => {
    if (!open && !showHint) return;
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target;
      if (open && target instanceof Node && !panelRef.current?.contains(target)) close(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      event.preventDefault();
      event.stopPropagation();
      if (open) close();
      else setHintDismissed(true);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown, true);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown, true);
    };
  }, [open, showHint]);

  useEffect(() => {
    if (!open) return;
    const frame = window.requestAnimationFrame(() => panelRef.current?.querySelector<HTMLElement>('[data-office-info-close]')?.focus());
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  return (
    <div className={joinClasses('office-info', open ? 'is-open' : undefined, className)} ref={panelRef}>
      <button
        ref={triggerRef}
        type="button"
        className="office-info-trigger"
        aria-label="About this room"
        aria-describedby={tooltipId}
        aria-controls={panelId}
        aria-expanded={open}
        aria-haspopup="dialog"
        onPointerEnter={() => { setHintActive(true); setHintDismissed(false); }}
        onPointerLeave={() => setHintActive(document.activeElement === triggerRef.current)}
        onFocus={() => setHintActive(true)}
        onBlur={() => { setHintActive(false); setHintDismissed(false); }}
        onClick={() => setOpen(value => !value)}
      >
        <span aria-hidden="true">i</span>
      </button>
      <span id={tooltipId} role="tooltip" className="office-info-tooltip" hidden={!showHint}>Inspired by Severance</span>
      {open && (
        <section id={panelId} className="office-info-panel" role="dialog" aria-modal="false" aria-labelledby={headingId}>
          <div className="office-info-panel-head">
            <h2 id={headingId}>About this room</h2>
            <button
              type="button"
              className="office-info-close"
              aria-label="Close room information"
              data-office-info-close
              onClick={() => close()}
            >
              ×
            </button>
          </div>
          <p>The office takes its cues from <em>Severance</em>. The desktop nods to early personal computing.</p>
          <button
            type="button"
            className="office-info-credits"
            aria-expanded={creditsOpen}
            onClick={() => setCreditsOpen(value => !value)}
          >
            <span>{creditsOpen ? 'Hide design credits' : 'Design credits'}</span>
            <span aria-hidden="true">{creditsOpen ? '−' : '+'}</span>
          </button>
          {creditsOpen && (
            <div className="office-info-credit-list">
              {CREDITS.map(credit => (
                <p key={credit.label}>
                  <a href={credit.href} target="_blank" rel="noreferrer">{credit.label}</a>
                  <span>{credit.text}</span>
                </p>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
