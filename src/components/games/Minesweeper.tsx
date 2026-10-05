import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  DIFFICULTIES,
  chordCell,
  createMinesweeperGame,
  flagCell,
  newGame,
  pauseGame,
  revealCell,
  resumeGame,
  tick,
  type Difficulty,
  type MineCell,
  type MinesweeperState,
} from './minesweeperEngine';
import './Minesweeper.css';

type MinesweeperProps = {
  active: boolean;
  onSound?: (event: 'move' | 'win' | 'lose') => void;
};

type PlayMode = 'reveal' | 'flag';
type BestTimes = Partial<Record<Difficulty, number>>;

const BEST_KEY = 'pg_minesweeper_best_v1';
const MAX_TIME = 999;

function readBestTimes(): BestTimes {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(BEST_KEY) ?? '{}') as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(Object.entries(parsed as Record<string, unknown>).filter(([key, value]) =>
      key in DIFFICULTIES && Number.isInteger(value) && Number(value) >= 0 && Number(value) <= MAX_TIME,
    )) as BestTimes;
  } catch { return {}; }
}

function saveBestTimes(times: BestTimes) {
  try { window.localStorage.setItem(BEST_KEY, JSON.stringify(times)); } catch { /* storage can be blocked */ }
}

function makeSeed(): number {
  return Math.floor(Math.random() * 0x1_0000_0000);
}

function formatCounter(value: number): string {
  return String(Math.max(0, Math.min(999, value))).padStart(3, '0');
}

function cellText(cell: MineCell): string {
  if (cell.state === 'flagged') return '⚑';
  if (cell.state === 'hidden') return '';
  if (cell.mine) return '✹';
  return cell.adjacent > 0 ? String(cell.adjacent) : '';
}

function MinesweeperFace({ status }: { status: MinesweeperState['status'] }) {
  const won = status === 'won';
  const lost = status === 'lost';
  return (
    <svg className="minesweeper-face" viewBox="0 0 32 32" aria-hidden="true">
      <circle cx="16" cy="16" r="12" className="minesweeper-face-disc" />
      {won ? (
        <>
          <path d="M8.5 12.5h5.2v3.6H8.5zM18.3 12.5h5.2v3.6h-5.2z" className="minesweeper-face-shades" />
          <path d="M13 22c1.7 1.1 4.3 1.1 6 0" className="minesweeper-face-mouth" />
        </>
      ) : (
        <>
          <circle cx="12" cy="13" r="1.4" className="minesweeper-face-eye" />
          <circle cx="20" cy="13" r="1.4" className="minesweeper-face-eye" />
          <path d={lost ? 'M11 22c2-2 8-2 10 0' : 'M11 20c2.5 2.5 7.5 2.5 10 0'} className="minesweeper-face-mouth" />
        </>
      )}
    </svg>
  );
}

function statusLabel(state: MinesweeperState, inactive: boolean): string {
  if (inactive && state.status === 'playing') return 'Paused.';
  if (state.status === 'ready') return 'First square is safe.';
  if (state.status === 'paused') return 'Paused.';
  if (state.status === 'won') return 'Board cleared.';
  if (state.status === 'lost') return 'Mine hit. Try another board.';
  return '';
}

export default function Minesweeper({ active, onSound }: MinesweeperProps) {
  const [state, setState] = useState<MinesweeperState>(() => createMinesweeperGame({ seed: makeSeed() }));
  const [mode, setMode] = useState<PlayMode>('reveal');
  const [best, setBest] = useState<BestTimes>({});
  const [focused, setFocused] = useState(() => typeof document === 'undefined' || (document.hasFocus() && document.visibilityState === 'visible'));
  const [pendingDifficulty, setPendingDifficulty] = useState<Difficulty | null>(null);
  const [focusIndex, setFocusIndex] = useState(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const stateRef = useRef(state);
  const autoPausedRef = useRef(false);
  const pendingPausedRef = useRef(false);
  stateRef.current = state;

  const inactive = !active || !focused;

  useEffect(() => { setBest(readBestTimes()); }, []);

  const updateState = useCallback((next: MinesweeperState, sound?: 'move' | 'win' | 'lose') => {
    if (next === stateRef.current) return;
    const previous = stateRef.current;
    stateRef.current = next;
    setState(next);
    if (sound) onSound?.(sound);
    if (next.status === 'won' && previous.status !== 'won') {
      const prior = readBestTimes();
      if (prior[next.difficulty] === undefined || next.elapsed < prior[next.difficulty]!) {
        const updated = { ...prior, [next.difficulty]: next.elapsed };
        saveBestTimes(updated);
        setBest(updated);
      }
    }
  }, [onSound]);

  const pauseForInactivity = useCallback(() => {
    if (stateRef.current.status === 'playing') {
      autoPausedRef.current = true;
      updateState(pauseGame(stateRef.current));
    }
  }, [updateState]);

  useEffect(() => {
    const onWindowBlur = () => { setFocused(false); pauseForInactivity(); };
    const onWindowFocus = () => { setFocused(document.visibilityState === 'visible' && document.hasFocus()); };
    const onVisibility = () => {
      const visibleAndFocused = document.visibilityState === 'visible' && document.hasFocus();
      setFocused(visibleAndFocused);
      if (!visibleAndFocused) pauseForInactivity();
    };
    setFocused(document.visibilityState === 'visible' && document.hasFocus());
    window.addEventListener('blur', onWindowBlur);
    window.addEventListener('focus', onWindowFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', onWindowBlur);
      window.removeEventListener('focus', onWindowFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pauseForInactivity]);

  useEffect(() => {
    if (!active) pauseForInactivity();
    else if (focused && autoPausedRef.current && stateRef.current.status === 'paused') {
      autoPausedRef.current = false;
      updateState(resumeGame(stateRef.current));
    }
  }, [active, focused, pauseForInactivity, updateState]);

  useEffect(() => {
    if (!active || !focused || document.visibilityState !== 'visible' || state.status !== 'playing' || pendingDifficulty) return undefined;
    const timer = window.setInterval(() => updateState(tick(stateRef.current)), 1000);
    return () => window.clearInterval(timer);
  }, [active, focused, pendingDifficulty, state.status, updateState]);

  const performReveal = useCallback((index: number) => {
    const current = stateRef.current;
    const next = current.cells[index]?.state === 'revealed'
      ? chordCell(current, index)
      : revealCell(current, index);
    const sound = next.status === 'won' ? 'win' : next.status === 'lost' ? 'lose' : next !== current ? 'move' : undefined;
    updateState(next, sound);
  }, [updateState]);

  const performFlag = useCallback((index: number) => {
    const next = flagCell(stateRef.current, index);
    updateState(next, next !== stateRef.current ? 'move' : undefined);
  }, [updateState]);

  const activateCell = useCallback((index: number, forcedMode?: PlayMode) => {
    if (!active || inactive || pendingDifficulty) return;
    if ((forcedMode ?? mode) === 'flag') performFlag(index);
    else performReveal(index);
  }, [active, inactive, mode, pendingDifficulty, performFlag, performReveal]);

  const moveFocus = (index: number, rowDelta: number, colDelta: number) => {
    const cell = state.cells[index];
    if (!cell) return;
    const row = Math.max(0, Math.min(state.rows - 1, cell.row + rowDelta));
    const col = Math.max(0, Math.min(state.cols - 1, cell.col + colDelta));
    const nextIndex = row * state.cols + col;
    setFocusIndex(nextIndex);
    boardRef.current?.querySelector<HTMLButtonElement>(`[data-cell-index="${nextIndex}"]`)?.focus();
  };

  const onCellKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return;
    if (pendingDifficulty) { event.preventDefault(); return; }
    if (event.key === 'ArrowUp' || event.key === 'ArrowDown' || event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
      event.preventDefault();
      moveFocus(index, event.key === 'ArrowUp' ? -1 : event.key === 'ArrowDown' ? 1 : 0, event.key === 'ArrowLeft' ? -1 : event.key === 'ArrowRight' ? 1 : 0);
      return;
    }
    if (event.key.toLowerCase() === 'f') { event.preventDefault(); activateCell(index, 'flag'); return; }
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); activateCell(index); }
  };

  const restart = (difficulty = state.difficulty) => {
    setPendingDifficulty(null);
    pendingPausedRef.current = false;
    autoPausedRef.current = false;
    updateState(newGame(difficulty, makeSeed()));
    setFocusIndex(0);
    setTimeout(() => boardRef.current?.querySelector<HTMLButtonElement>('[data-cell-index="0"]')?.focus(), 0);
  };

  const chooseDifficulty = (difficulty: Difficulty) => {
    if (difficulty === state.difficulty) return;
    if (state.status === 'playing' || state.status === 'paused') {
      pendingPausedRef.current = state.status === 'playing';
      if (state.status === 'playing') updateState(pauseGame(stateRef.current));
      setPendingDifficulty(difficulty);
    }
    else restart(difficulty);
  };

  const cancelDifficulty = () => {
    setPendingDifficulty(null);
    if (pendingPausedRef.current && stateRef.current.status === 'paused') updateState(resumeGame(stateRef.current));
    pendingPausedRef.current = false;
  };

  const onConfirmKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      cancelDifficulty();
    }
  };

  const onGameKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (pendingDifficulty && event.key === 'Escape') {
      event.preventDefault();
      event.stopPropagation();
      cancelDifficulty();
    }
  };

  return (
    <div className={`minesweeper-game minesweeper-${state.status} minesweeper-${state.difficulty}${pendingDifficulty ? ' minesweeper-pending' : ''}`} onKeyDown={onGameKeyDown}>
      <div className="minesweeper-topbar">
        <div className="minesweeper-counter" aria-label={`${state.mines - state.flags} mines remaining`}>{formatCounter(state.mines - state.flags)}</div>
        <button type="button" className="minesweeper-restart" onClick={() => restart()} aria-label="New Minesweeper game" title="New game">
          <MinesweeperFace status={state.status} />
        </button>
        <div className="minesweeper-counter" aria-label={`Time ${state.elapsed} seconds`}>{formatCounter(state.elapsed)}</div>
      </div>

      <div className="minesweeper-difficulty" aria-label="Difficulty">
        {(Object.keys(DIFFICULTIES) as Difficulty[]).map((difficulty) => (
          <button key={difficulty} type="button" className={`games-button difficulty-button${state.difficulty === difficulty ? ' selected' : ''}`} aria-pressed={state.difficulty === difficulty} onClick={() => chooseDifficulty(difficulty)}>
            {DIFFICULTIES[difficulty].label}
          </button>
        ))}
      </div>

      {pendingDifficulty && (
        <div className="minesweeper-confirm" role="alert" onKeyDown={onConfirmKeyDown} tabIndex={-1}>
          <span>Start a new {DIFFICULTIES[pendingDifficulty].label} board?</span>
          <button type="button" className="games-button" onClick={() => restart(pendingDifficulty)}>New board</button>
          <button type="button" className="games-button" onClick={cancelDifficulty}>Keep game</button>
        </div>
      )}

      <div className="minesweeper-modebar" role="group" aria-label="Game action">
        <span>Action:</span>
        <button type="button" className={`games-button mode-button${mode === 'reveal' ? ' selected' : ''}`} aria-pressed={mode === 'reveal'} onClick={() => setMode('reveal')}>Reveal</button>
        <button type="button" className={`games-button mode-button${mode === 'flag' ? ' selected' : ''}`} aria-pressed={mode === 'flag'} onClick={() => setMode('flag')}>Flag</button>
      </div>

      <div className="minesweeper-board-scroll">
        <div ref={boardRef} className="minesweeper-board" role="grid" aria-label={`${DIFFICULTIES[state.difficulty].label} Minesweeper board`} aria-rowcount={state.rows} aria-colcount={state.cols}>
          {Array.from({ length: state.rows }, (_, row) => (
            <div key={row} className="minesweeper-row" role="row" aria-rowindex={row + 1}>
              {state.cells.slice(row * state.cols, (row + 1) * state.cols).map((cell, column) => {
                const index = row * state.cols + column;
                return (
                  <button
                    key={index}
                    type="button"
                    role="gridcell"
                    tabIndex={focusIndex === index ? 0 : -1}
                    className={`mine-cell mine-cell-${cell.state}${cell.adjacent > 0 ? ` mine-cell-number-${cell.adjacent}` : ''}${cell.mine && cell.state === 'revealed' ? ' mine-cell-mine' : ''}${state.explodedIndex === index ? ' mine-cell-exploded' : ''}`}
                    data-cell-index={index}
                    aria-label={`${cell.state === 'hidden' ? 'Hidden' : cell.state === 'flagged' ? 'Flagged' : cell.mine ? 'Mine' : cell.adjacent ? `${cell.adjacent} adjacent mines` : 'Empty'} square, row ${cell.row + 1}, column ${cell.col + 1}`}
                    aria-colindex={column + 1}
                    aria-disabled={pendingDifficulty || undefined}
                    onFocus={() => setFocusIndex(index)}
                    onClick={() => activateCell(index)}
                    onContextMenu={(event) => { event.preventDefault(); activateCell(index, 'flag'); }}
                    onKeyDown={(event) => onCellKeyDown(event, index)}
                  >
                    {cellText(cell)}
                  </button>
                );
              })}
            </div>
          ))}
        </div>
        {(inactive || state.status === 'paused') && <div className="minesweeper-pauseveil">Paused</div>}
      </div>

      <div className="minesweeper-footer">
        <p className="minesweeper-status" aria-live="polite">{statusLabel(state, inactive)}</p>
        <p className="minesweeper-help">Click or Enter to reveal · right-click or F to flag · click a number to chord</p>
        {best[state.difficulty] !== undefined && <p className="minesweeper-best">Best: {best[state.difficulty]}s</p>}
      </div>

    </div>
  );
}
