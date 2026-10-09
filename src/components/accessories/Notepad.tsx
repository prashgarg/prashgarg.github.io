import { useCallback, useEffect, useRef, useState, type ChangeEvent, type KeyboardEvent } from 'react';
import './Notepad.css';

const STORAGE_KEY = 'pg_notepad_v1';
const DEFAULT_TITLE = 'untitled.txt';
const SAVE_DELAY = 280;

type NoteDraft = {
  title: string;
  content: string;
  wrap: boolean;
};

type SaveState = 'saved' | 'dirty' | 'error';

function readDraft(): NoteDraft {
  if (typeof window === 'undefined') return { title: DEFAULT_TITLE, content: '', wrap: true };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { title: DEFAULT_TITLE, content: '', wrap: true };
    const parsed = JSON.parse(raw) as Partial<NoteDraft>;
    return {
      title: typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title : DEFAULT_TITLE,
      content: typeof parsed.content === 'string' ? parsed.content : '',
      wrap: parsed.wrap !== false,
    };
  } catch {
    return { title: DEFAULT_TITLE, content: '', wrap: true };
  }
}

function normaliseTitle(title: string): string {
  const clean = title.trim().replace(/[\\/]+/g, '-');
  if (!clean) return DEFAULT_TITLE;
  return /\.txt$/i.test(clean) ? clean : `${clean}.txt`;
}

function saveDraft(draft: NoteDraft): boolean {
  if (typeof window === 'undefined') return false;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    return true;
  } catch {
    return false;
  }
}

export interface NotepadProps {
  active: boolean;
}

export default function Notepad({ active }: NotepadProps) {
  const [draft, setDraft] = useState<NoteDraft>(readDraft);
  const [saveState, setSaveState] = useState<SaveState>('saved');
  const [confirmClear, setConfirmClear] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const latestDraft = useRef(draft);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const persist = useCallback((next: NoteDraft) => {
    latestDraft.current = next;
    if (saveDraft(next)) setSaveState('saved');
    else setSaveState('error');
  }, []);

  const scheduleSave = useCallback((next: NoteDraft) => {
    latestDraft.current = next;
    setSaveState('dirty');
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      saveTimer.current = null;
      persist(latestDraft.current);
    }, SAVE_DELAY);
  }, [persist]);

  const flushPendingSave = useCallback((announce: boolean) => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    const saved = saveDraft(latestDraft.current);
    if (announce) setSaveState(saved ? 'saved' : 'error');
  }, []);

  useEffect(() => {
    const onPageHide = () => flushPendingSave(true);
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') flushPendingSave(true);
    };
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibilityChange);
      flushPendingSave(false);
    };
  }, [flushPendingSave]);

  const updateDraft = (patch: Partial<NoteDraft>) => {
    const next = { ...latestDraft.current, ...patch };
    setDraft(next);
    scheduleSave(next);
  };

  const onContentChange = (event: ChangeEvent<HTMLTextAreaElement>) => {
    updateDraft({ content: event.target.value });
    setConfirmClear(false);
  };

  const onTitleChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateDraft({ title: event.target.value });
  };

  const download = useCallback(() => {
    const current = latestDraft.current;
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveTimer.current = null;
    }
    persist(current);
    const blob = new Blob([current.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = normaliseTitle(current.title);
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 0);
  }, [persist]);

  const onEditorKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if (active && (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
      event.preventDefault();
      download();
    }
  };

  const requestClear = () => {
    if (latestDraft.current.content) setConfirmClear(true);
    else clearDraft();
  };

  const clearDraft = () => {
    if (saveTimer.current) clearTimeout(saveTimer.current);
    const next = { title: DEFAULT_TITLE, content: '', wrap: latestDraft.current.wrap };
    latestDraft.current = next;
    setDraft(next);
    persist(next);
    setConfirmClear(false);
    textareaRef.current?.focus();
  };

  const onWrapChange = (event: ChangeEvent<HTMLInputElement>) => {
    updateDraft({ wrap: event.target.checked });
  };

  const statusText = saveState === 'dirty'
    ? 'Unsaved changes'
    : saveState === 'error'
      ? 'Could not save in this browser'
      : 'Saved locally';

  return <section
    className="accessory-app notepad-app"
    aria-label="Notepad"
    onKeyDownCapture={event => {
      if (confirmClear && event.key === 'Escape') {
        event.preventDefault();
        event.stopPropagation();
        setConfirmClear(false);
      }
    }}
  >
    <div className="accessory-toolbar notepad-toolbar">
      <button type="button" className="accessory-button" onClick={requestClear}>New</button>
      <button type="button" className="accessory-button" onClick={download}>Save as .txt</button>
      <label className="notepad-filename">
        <span className="accessory-sr">Filename</span>
        <input
          className="accessory-input"
          value={draft.title}
          onChange={onTitleChange}
          onBlur={() => updateDraft({ title: normaliseTitle(latestDraft.current.title) })}
          aria-label="Filename"
          spellCheck={false}
        />
      </label>
      <label className="notepad-wrap">
        <input type="checkbox" checked={draft.wrap} onChange={onWrapChange} />
        <span>Wrap</span>
      </label>
    </div>
    {confirmClear && <div className="notepad-confirm" role="alert">
      <span>Clear this note?</span>
      <button type="button" className="accessory-button" onClick={clearDraft}>Clear</button>
      <button type="button" className="accessory-button" onClick={() => setConfirmClear(false)}>Cancel</button>
    </div>}
    <textarea
      ref={textareaRef}
      className={`notepad-editor${draft.wrap ? '' : ' notepad-editor-nowrap'}`}
      value={draft.content}
      onChange={onContentChange}
      onKeyDown={onEditorKeyDown}
      onBlur={() => {
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = null;
        persist(latestDraft.current);
      }}
      placeholder="Start typing…"
      aria-label="Note text"
      spellCheck
    />
    <div className="notepad-footer">
      <span className="accessory-status" role="status" aria-live={saveState === 'dirty' ? 'off' : 'polite'}>{statusText}</span>
      <span className="notepad-help">Ctrl/Cmd + S saves a text file</span>
    </div>
  </section>;
}
