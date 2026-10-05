export type Direction = 'up' | 'right' | 'down' | 'left';
export type GameStatus = 'ready' | 'running' | 'paused' | 'won' | 'lost';
export type SnakeDifficulty = 'easy' | 'classic' | 'fast';
export type SnakeMode = 'walls' | 'wrap';

export type Cell = { x: number; y: number };

export const DIFFICULTY_CONFIG: Record<SnakeDifficulty, { label: string; tickMs: number }> = {
  easy: { label: 'Easy', tickMs: 205 },
  classic: { label: 'Classic', tickMs: 145 },
  fast: { label: 'Fast', tickMs: 90 },
};

export const MODE_CONFIG: Record<SnakeMode, { label: string }> = {
  walls: { label: 'Walls' },
  wrap: { label: 'Wrap' },
};

export type SnakeState = {
  width: number;
  height: number;
  snake: Cell[];
  direction: Direction;
  queuedDirection: Direction | null;
  food: Cell | null;
  score: number;
  status: GameStatus;
  difficulty: SnakeDifficulty;
  mode: SnakeMode;
};

export const DIRECTIONS: Record<Direction, Cell> = {
  up: { x: 0, y: -1 },
  right: { x: 1, y: 0 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
};

const opposite = (a: Direction, b: Direction) =>
  DIRECTIONS[a].x + DIRECTIONS[b].x === 0 && DIRECTIONS[a].y + DIRECTIONS[b].y === 0;

const sameCell = (a: Cell | null, b: Cell | null) => Boolean(a && b && a.x === b.x && a.y === b.y);

export function randomFreeCell(
  width: number,
  height: number,
  occupied: readonly Cell[],
  random: () => number = Math.random,
): Cell | null {
  const free: Cell[] = [];
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      if (!occupied.some(cell => cell.x === x && cell.y === y)) free.push({ x, y });
    }
  }
  if (!free.length) return null;
  const index = Math.min(free.length - 1, Math.max(0, Math.floor(random() * free.length)));
  return free[index];
}

export function createSnakeGame(options: {
  width?: number;
  height?: number;
  snake?: Cell[];
  direction?: Direction;
  food?: Cell | null;
  random?: () => number;
  status?: GameStatus;
  score?: number;
  difficulty?: SnakeDifficulty;
  mode?: SnakeMode;
} = {}): SnakeState {
  const width = options.width ?? 24;
  const height = options.height ?? 16;
  const direction = options.direction ?? 'right';
  const snake = options.snake?.map(cell => ({ ...cell })) ?? [
    { x: Math.floor(width / 2), y: Math.floor(height / 2) },
    { x: Math.floor(width / 2) - 1, y: Math.floor(height / 2) },
    { x: Math.floor(width / 2) - 2, y: Math.floor(height / 2) },
  ];
  const food = options.food === undefined
    ? randomFreeCell(width, height, snake, options.random)
    : options.food;
  return {
    width,
    height,
    snake,
    direction,
    queuedDirection: null,
    food: food ? { ...food } : null,
    score: options.score ?? 0,
    status: options.status ?? 'ready',
    difficulty: options.difficulty ?? 'classic',
    mode: options.mode ?? 'walls',
  };
}

export function startGame(state: SnakeState): SnakeState {
  if (state.status === 'running') return state;
  if (state.status === 'won' || state.status === 'lost') return state;
  return { ...state, status: 'running' };
}

export function pauseGame(state: SnakeState): SnakeState {
  return state.status === 'running' ? { ...state, status: 'paused' } : state;
}

export function resumeGame(state: SnakeState): SnakeState {
  return state.status === 'paused' ? { ...state, status: 'running' } : state;
}

export function queueDirection(state: SnakeState, direction: Direction): SnakeState {
  if (state.status !== 'running' && state.status !== 'ready' && state.status !== 'paused') return state;
  // Keep one turn in reserve per tick so a fast key sequence cannot turn twice.
  if (state.queuedDirection) return state;
  const reference = state.direction;
  if (direction === reference || opposite(direction, reference)) return state;
  return { ...state, queuedDirection: direction };
}

export function resetGame(
  state: SnakeState,
  random: () => number = Math.random,
  overrides: { difficulty?: SnakeDifficulty; mode?: SnakeMode } = {},
): SnakeState {
  return createSnakeGame({
    width: state.width,
    height: state.height,
    difficulty: overrides.difficulty ?? state.difficulty,
    mode: overrides.mode ?? state.mode,
    random,
  });
}

function wrapCell(cell: Cell, width: number, height: number): Cell {
  return { x: (cell.x + width) % width, y: (cell.y + height) % height };
}

export function stepGame(state: SnakeState, random: () => number = Math.random): SnakeState {
  if (state.status !== 'running') return state;
  const direction = state.queuedDirection ?? state.direction;
  const delta = DIRECTIONS[direction];
  const head = state.snake[0];
  const rawHead = { x: head.x + delta.x, y: head.y + delta.y };
  const hitWall = rawHead.x < 0 || rawHead.x >= state.width || rawHead.y < 0 || rawHead.y >= state.height;
  if (state.mode === 'walls' && hitWall) {
    return { ...state, direction, queuedDirection: null, status: 'lost' };
  }
  const nextHead = state.mode === 'wrap' ? wrapCell(rawHead, state.width, state.height) : rawHead;
  const willEat = sameCell(nextHead, state.food);
  const bodyToCheck = willEat ? state.snake : state.snake.slice(0, -1);
  const hitBody = bodyToCheck.some(cell => sameCell(cell, nextHead));
  if (hitBody) return { ...state, direction, queuedDirection: null, status: 'lost' };

  const snake = [nextHead, ...state.snake];
  if (!willEat) snake.pop();
  const score = state.score + (willEat ? 10 : 0);
  const isWin = snake.length === state.width * state.height;
  return {
    ...state,
    snake,
    direction,
    queuedDirection: null,
    food: willEat && !isWin ? randomFreeCell(state.width, state.height, snake, random) : (isWin ? null : state.food),
    score,
    status: isWin ? 'won' : 'running',
  };
}
