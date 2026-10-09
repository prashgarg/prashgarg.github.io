import { useCallback, useEffect, useMemo, useState, type MouseEvent } from 'react';
import { papers, site, statusMeta, type Paper } from '../../data/site';
import { bibtexForPaper } from '../../lib/citations';
import { readSavedSlugs, toggleSavedSlug, writeSavedSlugs } from './filingCabinetStore';
import './FilingCabinet.css';

type CabinetTab = 'all' | 'saved';

const paperSlugs = papers.map(paper => paper.slug);

function paperPage(paper: Paper): string {
  return `${site.origin}/research/${paper.slug}`;
}

function firstSource(paper: Paper) {
  return paper.links[0];
}

function statusLabel(paper: Paper): string {
  return statusMeta[paper.status]?.label ?? paper.status;
}

function searchText(paper: Paper): string {
  return [paper.title, paper.venue, ...paper.coauthors, paper.blurb].filter(Boolean).join(' ').toLowerCase();
}

async function copyText(value: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return true;
    }
  } catch { /* fall through to the old browser prompt */ }
  try {
    return window.prompt('Copy BibTeX:', value) !== null;
  } catch { return false; }
}

export interface FilingCabinetProps {
  active: boolean;
  onNavigate?: (href: string) => void;
}

export default function FilingCabinet({ active: _active, onNavigate }: FilingCabinetProps) {
  const initial = useMemo(() => readSavedSlugs(undefined, paperSlugs), []);
  const [saved, setSaved] = useState<string[]>(initial.slugs);
  const [storageError, setStorageError] = useState(initial.error);
  const [tab, setTab] = useState<CabinetTab>('all');
  const [query, setQuery] = useState('');
  const [feedback, setFeedback] = useState('');

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== 'pg_filing_cabinet_v1') return;
      const next = readSavedSlugs(undefined, paperSlugs);
      if (!next.error) setSaved(next.slugs);
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const navigateToPaper = useCallback((event: MouseEvent<HTMLAnchorElement>, href: string) => {
    if (!onNavigate) return;
    event.preventDefault();
    onNavigate(href);
  }, [onNavigate]);

  const saveList = useCallback((next: string[]) => {
    setSaved(next);
    const didSave = writeSavedSlugs(next);
    setStorageError(!didSave);
    if (!didSave) setFeedback('Could not save this list in this browser');
  }, []);

  const toggle = useCallback((slug: string) => {
    saveList(toggleSavedSlug(saved, slug));
  }, [saveList, saved]);

  const visiblePapers = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return papers.filter(paper => {
      if (tab === 'saved' && !saved.includes(paper.slug)) return false;
      return !needle || searchText(paper).includes(needle);
    });
  }, [query, saved, tab]);

  const exportBib = useCallback(() => {
    const selected = papers.filter(paper => saved.includes(paper.slug));
    if (!selected.length) {
      setFeedback('Save a paper first');
      return;
    }
    const bib = selected.map(paper => bibtexForPaper(paper, paperPage(paper))).join('\n\n') + '\n';
    const url = URL.createObjectURL(new Blob([bib], { type: 'application/x-bibtex;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = 'prashant-garg-reading-list.bib';
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
    setFeedback(`${selected.length} citation${selected.length === 1 ? '' : 's'} exported`);
  }, [saved]);

  const copyCitation = useCallback(async (paper: Paper) => {
    const copied = await copyText(bibtexForPaper(paper, paperPage(paper)));
    setFeedback(copied ? 'BibTeX copied' : 'Could not copy BibTeX');
  }, []);

  return <section className="accessory-app filing-cabinet-app" aria-label="Filing cabinet">
    <div className="filing-toolbar">
      <div className="filing-tabs" role="tablist" aria-label="Paper list">
        <button type="button" className="accessory-button filing-tab" role="tab" aria-selected={tab === 'all'} onClick={() => setTab('all')}>All papers</button>
        <button type="button" className="accessory-button filing-tab" role="tab" aria-selected={tab === 'saved'} onClick={() => setTab('saved')}>Saved ({saved.length})</button>
      </div>
      <label className="filing-search">
        <span className="accessory-sr">Search papers</span>
        <input className="accessory-input" type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Search" aria-label="Search papers" />
      </label>
      <button type="button" className="accessory-button filing-export" onClick={exportBib} disabled={!saved.length}>Export .bib</button>
    </div>
    {storageError && <p className="filing-alert" role="status">This browser is not allowing a saved reading list.</p>}
    <div className="filing-list" aria-live="polite">
      {!visiblePapers.length && <p className="filing-empty">{tab === 'saved' && !query ? 'No saved papers yet.' : 'No papers match this search.'}</p>}
      {visiblePapers.map(paper => {
        const source = firstSource(paper);
        const isSaved = saved.includes(paper.slug);
        return <article className="filing-record" key={paper.slug}>
          <div className="filing-record-main">
            <h2><a href={`/research/${paper.slug}`} onClick={event => navigateToPaper(event, `/research/${paper.slug}`)}>{paper.title}</a></h2>
            <p className="filing-meta">{statusLabel(paper)}{paper.venue ? ` · ${paper.venue}` : ''}{paper.year ? ` · ${paper.year}` : ''}</p>
            {paper.coauthors.length > 0 && <p className="filing-authors">with {paper.coauthors.join(', ')}</p>}
            <div className="filing-links">
              {source && <a href={source.url} target="_blank" rel="noreferrer">{source.label}</a>}
              <button type="button" className="filing-inline-button" onClick={() => copyCitation(paper)}>BibTeX</button>
            </div>
          </div>
          <button type="button" className="accessory-button filing-save" aria-pressed={isSaved} onClick={() => toggle(paper.slug)}>{isSaved ? 'Saved' : 'Save'}</button>
        </article>;
      })}
    </div>
    <p className="accessory-status filing-status" role="status" aria-live="polite">{visiblePapers.length} shown · {saved.length} saved{feedback ? ` · ${feedback}` : ''}</p>
  </section>;
}
