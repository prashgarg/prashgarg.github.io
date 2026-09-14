import { useEffect, useId, useRef, useState } from 'react';
import { searchSite, type SearchRecord } from '../lib/search';
import '../styles/find.css';

export interface FindDialogProps {
  open: boolean;
  onClose?: () => void;
  onNavigate?: (href: string) => void;
}

const resultDomId = (id: string): string => `pg-find-result-${id.replace(/[^a-zA-Z0-9_-]+/g, '-')}`;

function restoreFocus(opener: HTMLElement | null) {
  const usable = (element: HTMLElement | null) => {
    if (!element || !element.isConnected || element.hasAttribute('disabled') || element.closest('[inert]')) return false;
    return element.getClientRects().length > 0;
  };
  const fallback = Array.from(document.querySelectorAll<HTMLElement>('[data-find-trigger], #cmdk-hint-btn')).find(usable) ?? null;
  (usable(opener) ? opener : fallback)?.focus();
}

/** A controlled, keyboard-friendly Win95 search dialog shared by desktop and pages. */
export default function FindDialog({ open, onClose, onNavigate }: FindDialogProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreRef = useRef<HTMLElement | null>(null);
  const hasOpenedRef = useRef(false);
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const titleId = useId();
  const statusId = useId();
  const results = searchSite(query);

  useEffect(() => {
    if (!open) return;
    hasOpenedRef.current = true;
    restoreRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setQuery('');
    setActive(0);
    const timer = window.setTimeout(() => inputRef.current?.focus(), 0);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    if (open || !hasOpenedRef.current || !restoreRef.current) return;
    const opener = restoreRef.current;
    const frame = window.requestAnimationFrame(() => {
      restoreFocus(opener);
      restoreRef.current = null;
    });
    return () => window.cancelAnimationFrame(frame);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose?.();
        return;
      }
      if (event.key === 'ArrowDown' && results.length) {
        event.preventDefault();
        setActive(index => (index + 1) % results.length);
      } else if (event.key === 'ArrowUp' && results.length) {
        event.preventDefault();
        setActive(index => (index - 1 + results.length) % results.length);
      } else if (event.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(dialogRef.current.querySelectorAll<HTMLElement>('button, input, [href], [tabindex]:not([tabindex="-1"])')).filter(node => !node.hasAttribute('disabled') && node.tabIndex >= 0);
        if (!focusable.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose, results.length]);

  useEffect(() => {
    if (active >= results.length) setActive(Math.max(0, results.length - 1));
  }, [active, results.length]);

  useEffect(() => {
    if (!open || !results[active]) return;
    document.getElementById(resultDomId(results[active].id))?.scrollIntoView({ block: 'nearest' });
  }, [active, open, results]);

  if (!open) return null;

  const navigate = (result: SearchRecord) => {
    onClose?.();
    if (result.external) {
      window.open(result.href, '_blank', 'noopener,noreferrer');
    } else if (onNavigate) {
      onNavigate(result.href);
    } else {
      window.location.assign(result.href);
    }
  };

  return (
    <div className="pg-find-backdrop" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) onClose?.(); }}>
      <div ref={dialogRef} className="pg-find-dialog" role="dialog" aria-modal="true" aria-labelledby={titleId} aria-describedby={statusId}>
        <div className="pg-find-titlebar">
          <span id={titleId} className="pg-find-title">Find</span>
          <button type="button" className="pg-find-close" aria-label="Close Find" onClick={() => onClose?.()}>×</button>
        </div>
        <div className="pg-find-content">
          <div className="pg-find-search-row">
            <label className="pg-find-label" htmlFor="pg-find-input">Find:</label>
            <input
              ref={inputRef}
              id="pg-find-input"
              className="pg-find-input"
              value={query}
              onChange={event => { setQuery(event.target.value); setActive(0); }}
              onKeyDown={event => { if (event.key === 'Enter' && results[active]) { event.preventDefault(); navigate(results[active]); } }}
              placeholder="papers, talks, data, pages…"
              autoComplete="off"
              role="combobox"
              aria-expanded={results.length > 0}
              aria-haspopup="listbox"
              aria-autocomplete="list"
              aria-controls="pg-find-results"
              aria-activedescendant={results[active] ? resultDomId(results[active].id) : undefined}
            />
            {query && <button type="button" className="pg-find-clear" aria-label="Clear search" onClick={() => { setQuery(''); setActive(0); inputRef.current?.focus(); }}>×</button>}
          </div>
          <div id={statusId} className="pg-find-status" aria-live="polite">
            {query ? `${results.length} result${results.length === 1 ? '' : 's'}` : 'Pages and papers'}
          </div>
          {results.length ? (
            <ul id="pg-find-results" className="pg-find-results" role="listbox" aria-label="Search results">
              {results.map((result, index) => (
                <li key={result.id} role="presentation">
                  <button
                    type="button"
                    id={resultDomId(result.id)}
                    role="option"
                    aria-selected={index === active}
                    tabIndex={-1}
                    className={`pg-find-result${index === active ? ' is-active' : ''}`}
                    onMouseEnter={() => setActive(index)}
                    onFocus={() => setActive(index)}
                    onClick={() => navigate(result)}
                  >
                    <span className="pg-find-result-title">{result.title}</span>
                    <span className="pg-find-result-subtitle">{result.subtitle}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : <div className="pg-find-results"><div className="pg-find-empty">No matches. Try a title, author, venue, or topic.</div></div>}
          <div className="pg-find-hint">↑ ↓ to move · Enter to open · Esc to close</div>
        </div>
      </div>
    </div>
  );
}
