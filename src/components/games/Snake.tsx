import { useCallback, useEffect, useRef, useState } from 'react';
import {
  createSnakeGame,
  pauseGame,
  queueDirection,
  resetGame,
  resumeGame,
  startGame,
  stepGame,
  type Direction,
  type SnakeState,
} from './snakeEngine';
import './Snake.css';

type SnakeProps = {
  active: boolean;
  onSound?: (event: 'move' | 'win' | 'lose') => void;
};

const BEST_KEY = 'pg_snake_best_v1';
const MAX_BEST = 10_000_000;
const TICK_MS = 145;

function readBest(): number {
  try {
    const raw = window.localStorage.getItem(BEST_KEY);
    const value = raw === null ? NaN : Number(raw);
    return Number.isInteger(value) && value >= 0 && value <= MAX_BEST ? value : 0;
  } catch {
    return 0;
  }
}

function saveBest(value: number) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch { /* storage can be blocked */ }
}

const directionLabel: Record<Direction, string> = {
  up: 'Up', right: 'Right', down: 'Down', left: 'Left',
};

export default function Snake({ active, onSound }: SnakeProps) {
  const [game, setGame] = useState<SnakeState>(() => createSnakeGame());
  const [best, setBest] = useState(0);
  const boardRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef(active);
  const bestRef = useRef(0);
  const previousGameRef = useRef(game);
  activeRef.current = active;

  useEffect(() => {
    const stored = readBest();
    bestRef.current = stored;
    setBest(stored);
  }, []);

  useEffect(() => {
    const previous = previousGameRef.current;
    if (game === previous) return;
    if (game.score > previous.score) {
      if (game.status === 'won') onSound?.('win');
      else onSound?.('move');
    } else if (game.status === 'lost' && previous.status !== 'lost') {
      onSound?.('lose');
    }
    if (game.score > bestRef.current && game.score <= MAX_BEST) {
      bestRef.current = game.score;
      setBest(game.score);
      saveBest(game.score);
    }
    previousGameRef.current = game;
  }, [game, onSound]);

  const pause = useCallback(() => {
    setGame(current => pauseGame(current));
  }, []);

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

  useEffect(() => {
    if (!active || game.status !== 'running') return undefined;
    const timer = window.setInterval(() => {
      setGame(current => {
        const next = stepGame(current);
        return next;
      });
    }, TICK_MS);
    return () => window.clearInterval(timer);
  }, [active, game.status]);

  const changeDirection = useCallback((direction: Direction) => {
    if (!activeRef.current) return;
    setGame(current => queueDirection(current, direction));
    boardRef.current?.focus({ preventScroll: true });
  }, []);

  const beginOrPause = () => {
    if (!activeRef.current) return;
    if (game.status === 'ready') setGame(current => startGame(current));
    else if (game.status === 'paused') setGame(current => resumeGame(current));
    else if (game.status === 'running') pause();
    else setGame(current => startGame(resetGame(current)));
    boardRef.current?.focus({ preventScroll: true });
  };

  const onBoardKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
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

  const status = game.status === 'ready'
    ? 'Press Start when ready.'
    : game.status === 'paused'
      ? 'Paused.'
      : game.status === 'won'
        ? 'Board cleared.'
        : game.status === 'lost'
          ? 'Snake stopped.'
          : 'Running.';

  return (
    <div className="snake-game">
      <div className="snake-heading">
        <div>
          <p className="snake-help">Arrow keys or WASD. Space pauses.</p>
        </div>
        <div className="games-status snake-score" aria-label={`Score ${game.score}, best ${best}`}>
          <span>Score {game.score}</span><span>Best {best}</span>
        </div>
      </div>

      <div className="snake-layout">
        <div
          ref={boardRef}
          className={`snake-board snake-board-${game.status}`}
          role="img"
          tabIndex={0}
          aria-label="Snake game board"
          aria-describedby="snake-status snake-instructions"
          onKeyDown={onBoardKeyDown}
        >
          {game.snake.map((cell, index) => (
            <span
              key={`${cell.x}-${cell.y}-${index}`}
              className={`snake-segment${index === 0 ? ' snake-head' : ''}`}
              style={{ left: `${(cell.x / game.width) * 100}%`, top: `${(cell.y / game.height) * 100}%` }}
              aria-hidden="true"
            />
          ))}
          {game.food && (
            <span
              className="snake-food"
              style={{ left: `${(game.food.x / game.width) * 100}%`, top: `${(game.food.y / game.height) * 100}%` }}
              aria-hidden="true"
            />
          )}
          <span className="snake-sr" id="snake-instructions">Focus the board, then use arrow keys or WASD. Press Space to pause.</span>
        </div>

        <div className="snake-controls" aria-label="Snake controls">
          <button type="button" className="games-button snake-action" onClick={beginOrPause}>
            {game.status === 'ready' ? 'Start' : game.status === 'paused' ? 'Resume' : game.status === 'running' ? 'Pause' : 'Play again'}
          </button>
          <div className="snake-dpad" aria-label="Direction pad">
            <span />
            <button type="button" className="games-button snake-pad" aria-label="Up" onClick={() => changeDirection('up')}>▲</button>
            <span />
            <button type="button" className="games-button snake-pad" aria-label="Left" onClick={() => changeDirection('left')}>◀</button>
            <button type="button" className="games-button snake-pad" aria-label="Down" onClick={() => changeDirection('down')}>▼</button>
            <button type="button" className="games-button snake-pad" aria-label="Right" onClick={() => changeDirection('right')}>▶</button>
          </div>
          <p className="snake-status" id="snake-status" aria-live="polite">{status}</p>
          <p className="snake-direction" aria-live="polite">Heading {directionLabel[game.direction]}</p>
        </div>
      </div>
    </div>
  );
}
