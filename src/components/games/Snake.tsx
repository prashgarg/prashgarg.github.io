import { useCallback, useEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react';
import {
  createSnakeGame,
  DIFFICULTY_CONFIG,
  MODE_CONFIG,
  pauseGame,
  queueDirection,
  resetGame,
  resumeGame,
  startGame,
  stepGame,
  type Direction,
  type SnakeDifficulty,
  type SnakeMode,
  type SnakeState,
} from './snakeEngine';
import './Snake.css';

type SnakeProps = {
  active: boolean;
  onSound?: (event: 'move' | 'win' | 'lose') => void;
};

type BestKey = `${SnakeDifficulty}:${SnakeMode}`;
type BestScores = Record<BestKey, number>;

const BEST_KEY = 'pg_snake_best_v2';
const OLD_BEST_KEY = 'pg_snake_best_v1';
const MAX_BEST = 10_000_000;
const BOARD_WIDTH = 24;
const BOARD_HEIGHT = 16;
const COUNTDOWN_TICK_MS = 650;
const emptyScores = (): BestScores => ({
  'easy:walls': 0, 'easy:wrap': 0,
  'classic:walls': 0, 'classic:wrap': 0,
  'fast:walls': 0, 'fast:wrap': 0,
});

const isScore = (value: unknown): value is number =>
  typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= MAX_BEST;

function readBestScores(): { scores: BestScores; available: boolean } {
  const scores = emptyScores();
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as { version?: unknown; scores?: Partial<BestScores> };
      if (parsed && parsed.version === 2 && parsed.scores && typeof parsed.scores === 'object') {
        (Object.keys(scores) as BestKey[]).forEach(key => {
          if (isScore(parsed.scores?.[key])) scores[key] = parsed.scores[key] as number;
        });
        return { scores, available: true };
      }
    }
    // The v1 score had no mode or difficulty. Preserve it conservatively as
    // the closest historical setting, Classic with walls.
    const oldRaw = window.localStorage.getItem(OLD_BEST_KEY);
    const old = oldRaw === null ? NaN : Number(oldRaw);
    if (isScore(old)) {
      scores['classic:walls'] = old;
      window.localStorage.setItem(BEST_KEY, JSON.stringify({ version: 2, scores }));
    }
    return { scores, available: true };
  } catch {
    return { scores, available: false };
  }
}

function saveBestScores(scores: BestScores): boolean {
  try {
    window.localStorage.setItem(BEST_KEY, JSON.stringify({ version: 2, scores }));
    return true;
  } catch {
    return false;
  }
}

const directionLabel: Record<Direction, string> = {
  up: 'Up', right: 'Right', down: 'Down', left: 'Left',
};

export default function Snake({ active, onSound }: SnakeProps) {
  const [difficulty, setDifficulty] = useState<SnakeDifficulty>('classic');
  const [mode, setMode] = useState<SnakeMode>('walls');
  const [game, setGame] = useState<SnakeState>(() => createSnakeGame({
    width: BOARD_WIDTH, height: BOARD_HEIGHT, difficulty: 'classic', mode: 'walls',
  }));
  const [bestScores, setBestScores] = useState<BestScores>(() => emptyScores());
  const [storageAvailable, setStorageAvailable] = useState(true);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [newBest, setNewBest] = useState(false);
  const [runHasRecord, setRunHasRecord] = useState(false);
  const [foodPulse, setFoodPulse] = useState(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  const bestRef = useRef<BestScores>(emptyScores());
  const previousGameRef = useRef(game);
  const countdownTimerRef = useRef<number | null>(null);
  const countdownActionRef = useRef<'start' | 'resume' | null>(null);
  const feedbackTimerRef = useRef<number | null>(null);
  const touchStartRef = useRef<{ x: number; y: number } | null>(null);
  const touchSwipedRef = useRef(false);
  activeRef.current = active;

  const currentBestKey = `${difficulty}:${mode}` as BestKey;
  const currentBest = bestScores[currentBestKey] ?? 0;
  const optionsLocked = game.status === 'running' || game.status === 'paused' || countdown !== null;

  useEffect(() => {
    const result = readBestScores();
    bestRef.current = result.scores;
    setBestScores(result.scores);
    setStorageAvailable(result.available);
  }, []);

  const cancelCountdown = useCallback(() => {
    if (countdownTimerRef.current !== null) window.clearInterval(countdownTimerRef.current);
    countdownTimerRef.current = null;
    countdownActionRef.current = null;
    setCountdown(null);
  }, []);

  const pause = useCallback(() => {
    cancelCountdown();
    setGame(current => pauseGame(current));
  }, [cancelCountdown]);

  useEffect(() => {
    if (!active) pause();
  }, [active, pause]);

  useEffect(() => {
    const onBlur = () => pause();
    const onVisibility = () => { if (document.visibilityState !== 'visible') pause(); };
    window.addEventListener('blur', onBlur);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('blur', onBlur);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [pause]);

  useEffect(() => () => {
    if (countdownTimerRef.current !== null) window.clearInterval(countdownTimerRef.current);
    if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
  }, []);

  useEffect(() => {
    const previous = previousGameRef.current;
    if (game === previous) return;
    if (game.score > previous.score) {
      if (game.status === 'won') onSound?.('win');
      else onSound?.('move');
      setFoodPulse(pulse => pulse + 1);
      const key = `${game.difficulty}:${game.mode}` as BestKey;
      if (game.score > (bestRef.current[key] ?? 0)) {
        const nextScores = { ...bestRef.current, [key]: game.score };
        bestRef.current = nextScores;
        setBestScores(nextScores);
        setNewBest(true);
        setRunHasRecord(true);
        if (!saveBestScores(nextScores)) setStorageAvailable(false);
        if (feedbackTimerRef.current !== null) window.clearTimeout(feedbackTimerRef.current);
        feedbackTimerRef.current = window.setTimeout(() => setNewBest(false), 1500);
      }
    } else if (game.status === 'lost' && previous.status !== 'lost') {
      onSound?.('lose');
    }
    previousGameRef.current = game;
  }, [game, onSound]);

  useEffect(() => {
    if (!active || game.status !== 'running' || countdown !== null) return undefined;
    const timer = window.setInterval(() => setGame(current => stepGame(current)), DIFFICULTY_CONFIG[game.difficulty].tickMs);
    return () => window.clearInterval(timer);
  }, [active, countdown, game.difficulty, game.status]);

  const changeDirection = useCallback((direction: Direction) => {
    if (!activeRef.current || countdown !== null) return;
    setGame(current => queueDirection(current, direction));
    boardRef.current?.focus({ preventScroll: true });
  }, [countdown]);

  const startCountdown = useCallback((action: 'start' | 'resume', fresh = false) => {
    if (!activeRef.current || document.visibilityState !== 'visible' || !document.hasFocus()) return;
    cancelCountdown();
    if (fresh) {
      setFoodPulse(0);
      setNewBest(false);
      setRunHasRecord(false);
      setGame(current => resetGame(current, Math.random, { difficulty, mode }));
    }
    let remaining = action === 'start' ? 3 : 2;
    countdownActionRef.current = action;
    setCountdown(remaining);
    countdownTimerRef.current = window.setInterval(() => {
      if (!activeRef.current || document.visibilityState !== 'visible' || !document.hasFocus()) {
        cancelCountdown();
        return;
      }
      remaining -= 1;
      if (remaining <= 0) {
        const nextAction = countdownActionRef.current;
        cancelCountdown();
        setGame(current => nextAction === 'resume' ? resumeGame(current) : startGame(current));
      } else {
        setCountdown(remaining);
      }
    }, COUNTDOWN_TICK_MS);
  }, [cancelCountdown, difficulty, mode]);

  const newGame = useCallback(() => {
    if (!activeRef.current) return;
    cancelCountdown();
    setFoodPulse(0);
    setNewBest(false);
    setRunHasRecord(false);
    setGame(current => createSnakeGame({ width: current.width, height: current.height, difficulty, mode }));
    boardRef.current?.focus({ preventScroll: true });
  }, [cancelCountdown, difficulty, mode]);

  const beginOrPause = () => {
    if (!activeRef.current) return;
    if (countdown !== null) return;
    if (game.status === 'ready') startCountdown('start');
    else if (game.status === 'paused') startCountdown('resume');
    else if (game.status === 'running') pause();
    else startCountdown('start', true);
    boardRef.current?.focus({ preventScroll: true });
  };

  const changeSettings = (nextDifficulty: SnakeDifficulty, nextMode: SnakeMode) => {
    if (optionsLocked || !activeRef.current) return;
    setDifficulty(nextDifficulty);
    setMode(nextMode);
    setFoodPulse(0);
    setNewBest(false);
    setRunHasRecord(false);
    setGame(current => createSnakeGame({
      width: current.width, height: current.height, difficulty: nextDifficulty, mode: nextMode,
    }));
  };

  const onBoardKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    const keys: Record<string, Direction | undefined> = {
      ArrowUp: 'up', ArrowRight: 'right', ArrowDown: 'down', ArrowLeft: 'left',
      w: 'up', d: 'right', s: 'down', a: 'left',
    };
    if (event.key === ' ') {
      event.preventDefault();
      beginOrPause();
      return;
    }
    const direction = keys[event.key];
    if (!direction) return;
    event.preventDefault();
    changeDirection(direction);
  };

  const onBoardPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if ((event.target as HTMLElement).closest('button, input, select, [role="button"]')) return;
    boardRef.current?.focus({ preventScroll: true });
    if (event.pointerType === 'touch') {
      touchStartRef.current = { x: event.clientX, y: event.clientY };
      touchSwipedRef.current = false;
      try { event.currentTarget.setPointerCapture(event.pointerId); } catch { /* unsupported in some embedded browsers */ }
    }
  };

  const onBoardPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    if (!start || touchSwipedRef.current || event.pointerType !== 'touch') return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    event.preventDefault();
    touchSwipedRef.current = true;
    changeDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };

  const onBoardPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const start = touchStartRef.current;
    const swiped = touchSwipedRef.current;
    touchStartRef.current = null;
    touchSwipedRef.current = false;
    if (!start || event.pointerType !== 'touch') return;
    const dx = event.clientX - start.x;
    const dy = event.clientY - start.y;
    if (swiped || Math.max(Math.abs(dx), Math.abs(dy)) < 18) return;
    event.preventDefault();
    changeDirection(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'));
  };

  const status = countdown !== null
    ? 'Get ready.'
    : game.status === 'ready'
      ? 'Press Start when ready.'
      : game.status === 'paused'
        ? 'Paused.'
        : game.status === 'won'
          ? 'Board cleared.'
          : game.status === 'lost'
            ? 'Snake stopped.'
            : 'Running.';

  const overlay = countdown !== null ? (
    <div className="snake-overlay snake-countdown" aria-live="polite"><strong>{countdown}</strong><span>Get ready</span></div>
  ) : game.status === 'ready' ? (
    <div className="snake-overlay"><strong>Ready?</strong><span>{DIFFICULTY_CONFIG[difficulty].label} · {MODE_CONFIG[mode].label}</span><button type="button" className="games-button snake-overlay-action" onClick={beginOrPause}>Start</button></div>
  ) : game.status === 'paused' ? (
    <div className="snake-overlay"><strong>Paused</strong><span>Resume when you are ready.</span><button type="button" className="games-button snake-overlay-action" onClick={beginOrPause}>Resume</button><button type="button" className="games-button snake-overlay-secondary" onClick={newGame}>New game</button></div>
  ) : game.status === 'lost' || game.status === 'won' ? (
    <div className="snake-overlay"><strong>{game.status === 'won' ? 'Board cleared' : 'Game over'}</strong><span>Score {game.score}{runHasRecord ? ' · New best' : ''}</span><button type="button" className="games-button snake-overlay-action" onClick={beginOrPause}>New game</button></div>
  ) : null;

  return (
    <div className="snake-game">
      <div className="snake-heading">
        <p className="snake-help">Arrow keys, WASD, or swipe. Space pauses.</p>
        <div className="games-status snake-score" aria-label={`Score ${game.score}, best ${currentBest}`}>
          <span>Score {game.score}</span><span>Best {currentBest}</span>
        </div>
      </div>

      <div className="snake-options" aria-label="Snake options">
        <label>Speed <select aria-label="Speed" value={difficulty} disabled={optionsLocked} onChange={event => changeSettings(event.target.value as SnakeDifficulty, mode)}>
          {(Object.keys(DIFFICULTY_CONFIG) as SnakeDifficulty[]).map(value => <option key={value} value={value}>{DIFFICULTY_CONFIG[value].label}</option>)}
        </select></label>
        <label>Board <select aria-label="Board" value={mode} disabled={optionsLocked} onChange={event => changeSettings(difficulty, event.target.value as SnakeMode)}>
          {(Object.keys(MODE_CONFIG) as SnakeMode[]).map(value => <option key={value} value={value}>{MODE_CONFIG[value].label}</option>)}
        </select></label>
      </div>

      <div className="snake-layout">
        <div
          ref={boardRef}
          className={`snake-board snake-board-${game.status} snake-dir-${game.direction}`}
          role="group"
          tabIndex={0}
          aria-label="Snake game board"
          aria-describedby="snake-status snake-instructions"
          onKeyDown={onBoardKeyDown}
          onPointerDown={onBoardPointerDown}
          onPointerMove={onBoardPointerMove}
          onPointerUp={onBoardPointerUp}
          onPointerCancel={() => { touchStartRef.current = null; touchSwipedRef.current = false; }}
        >
          {game.snake.map((cell, index) => (
            <span key={`${cell.x}-${cell.y}-${index}`} className={`snake-segment${index === 0 ? ' snake-head' : ''}`} style={{ left: `${(cell.x / game.width) * 100}%`, top: `${(cell.y / game.height) * 100}%` }} aria-hidden="true" />
          ))}
          {game.food && <span key={`food-${foodPulse}`} className="snake-food" style={{ left: `${(game.food.x / game.width) * 100}%`, top: `${(game.food.y / game.height) * 100}%` }} aria-hidden="true" />}
          <span className="snake-sr" id="snake-instructions">Focus the board, then use arrow keys, WASD, or swipe. Press Space to pause.</span>
          {overlay}
          {newBest && game.status === 'running' && <span className="snake-new-best" aria-live="polite">New best</span>}
          {foodPulse > 0 && game.status === 'running' && <span className="snake-food-feedback" key={foodPulse}>+10</span>}
        </div>

        <div className="snake-controls" aria-label="Snake controls">
          <button type="button" className="games-button snake-action" onClick={beginOrPause} disabled={countdown !== null}>
            {game.status === 'ready' ? 'Start' : game.status === 'paused' ? 'Resume' : game.status === 'running' ? 'Pause' : 'New game'}
          </button>
          <div className="snake-dpad" aria-label="Direction pad">
            <span />
            <button type="button" className="games-button snake-pad" aria-label="Up" onClick={() => changeDirection('up')}>▲</button><span />
            <button type="button" className="games-button snake-pad" aria-label="Left" onClick={() => changeDirection('left')}>◀</button>
            <button type="button" className="games-button snake-pad" aria-label="Down" onClick={() => changeDirection('down')}>▼</button>
            <button type="button" className="games-button snake-pad" aria-label="Right" onClick={() => changeDirection('right')}>▶</button>
          </div>
          <p className="snake-status" id="snake-status" aria-live="polite">{status}</p>
          <p className="snake-direction" aria-live="polite">Heading {directionLabel[game.direction]}</p>
          {!storageAvailable && <p className="snake-storage-note">Best scores are unavailable in this browser.</p>}
        </div>
      </div>
    </div>
  );
}
