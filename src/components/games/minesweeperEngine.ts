export const DIFFICULTIES = {
  beginner: { rows: 9, cols: 9, mines: 10, label: 'Beginner' },
  intermediate: { rows: 16, cols: 16, mines: 40, label: 'Intermediate' },
} as const;

export type Difficulty = keyof typeof DIFFICULTIES;
export type GameStatus = 'ready' | 'playing' | 'paused' | 'won' | 'lost';
export type CellState = 'hidden' | 'revealed' | 'flagged';

export type MineCell = {
  row: number;
  col: number;
  mine: boolean;
  adjacent: number;
  state: CellState;
};

export type MinesweeperState = {
  difficulty: Difficulty;
  rows: number;
  cols: number;
  mines: number;
  cells: MineCell[];
  status: GameStatus;
  elapsed: number;
  flags: number;
  revealedSafe: number;
  explodedIndex: number | null;
  seed: number;
  generated: boolean;
};

export type CreateOptions = {
  difficulty?: Difficulty;
  seed?: number;
  random?: () => number;
};

const UINT32 = 0x1_0000_0000;

function normaliseSeed(value: number): number {
  const seed = Number.isFinite(value) ? (Math.floor(value) >>> 0) : 1;
  return seed === 0 ? 1 : seed;
}

function nextRandom(seed: number): { seed: number; value: number } {
  let next = seed >>> 0;
  next ^= next << 13;
  next ^= next >>> 17;
  next ^= next << 5;
  next >>>= 0;
  return { seed: next || 1, value: next / UINT32 };
}

function freshCells(rows: number, cols: number): MineCell[] {
  return Array.from({ length: rows * cols }, (_, index) => ({
    row: Math.floor(index / cols),
    col: index % cols,
    mine: false,
    adjacent: 0,
    state: 'hidden' as CellState,
  }));
}

export function createMinesweeperGame(options: CreateOptions = {}): MinesweeperState {
  const difficulty = options.difficulty ?? 'beginner';
  const config = DIFFICULTIES[difficulty];
  const seed = options.seed === undefined
    ? Math.floor((options.random ?? Math.random)() * UINT32)
    : options.seed;
  return {
    difficulty,
    rows: config.rows,
    cols: config.cols,
    mines: config.mines,
    cells: freshCells(config.rows, config.cols),
    status: 'ready',
    elapsed: 0,
    flags: 0,
    revealedSafe: 0,
    explodedIndex: null,
    seed: normaliseSeed(seed),
    generated: false,
  };
}

export const createGame = createMinesweeperGame;

export function cloneMinesweeperGame(state: MinesweeperState): MinesweeperState {
  return { ...state, cells: state.cells.map((cell) => ({ ...cell })) };
}

export function indexOf(state: MinesweeperState, row: number, col: number): number {
  return row >= 0 && row < state.rows && col >= 0 && col < state.cols
    ? row * state.cols + col
    : -1;
}

export function neighbours(state: MinesweeperState, index: number): number[] {
  const cell = state.cells[index];
  if (!cell) return [];
  const result: number[] = [];
  for (let row = cell.row - 1; row <= cell.row + 1; row += 1) {
    for (let col = cell.col - 1; col <= cell.col + 1; col += 1) {
      if (row === cell.row && col === cell.col) continue;
      const neighbour = indexOf(state, row, col);
      if (neighbour >= 0) result.push(neighbour);
    }
  }
  return result;
}

function placeMines(state: MinesweeperState, firstIndex: number): void {
  const protectedCells = new Set([firstIndex, ...neighbours(state, firstIndex)]);
  const candidates = state.cells
    .map((_, index) => index)
    .filter((index) => !protectedCells.has(index));
  let seed = state.seed;
  for (let index = candidates.length - 1; index > 0; index -= 1) {
    const random = nextRandom(seed);
    seed = random.seed;
    const other = Math.floor(random.value * (index + 1));
    [candidates[index], candidates[other]] = [candidates[other], candidates[index]];
  }
  for (let index = 0; index < state.mines; index += 1) state.cells[candidates[index]].mine = true;
  for (let index = 0; index < state.cells.length; index += 1) {
    state.cells[index].adjacent = neighbours(state, index)
      .filter((neighbour) => state.cells[neighbour].mine).length;
  }
  state.seed = seed;
  state.generated = true;
}

function revealMinefield(state: MinesweeperState, explodedIndex: number): void {
  state.status = 'lost';
  state.explodedIndex = explodedIndex;
  state.cells.forEach((cell) => {
    if (cell.mine) cell.state = 'revealed';
  });
}

function revealSafeRegion(state: MinesweeperState, firstIndex: number): boolean {
  const first = state.cells[firstIndex];
  if (!first || first.state === 'flagged' || first.state === 'revealed') return true;
  if (first.mine) {
    revealMinefield(state, firstIndex);
    return false;
  }

  const queue = [firstIndex];
  const visited = new Set<number>();
  while (queue.length) {
    const index = queue.shift()!;
    if (visited.has(index)) continue;
    visited.add(index);
    const cell = state.cells[index];
    if (!cell || cell.state === 'flagged' || cell.state === 'revealed') continue;
    if (cell.mine) {
      revealMinefield(state, index);
      return false;
    }
    cell.state = 'revealed';
    state.revealedSafe += 1;
    if (cell.adjacent === 0) {
      neighbours(state, index).forEach((neighbour) => {
        const next = state.cells[neighbour];
        if (next.state === 'hidden' && !next.mine) queue.push(neighbour);
      });
    }
  }
  return true;
}

function finishIfWon(state: MinesweeperState): void {
  if (state.revealedSafe >= state.rows * state.cols - state.mines) {
    state.status = 'won';
    state.cells.forEach((cell) => {
      if (cell.mine && cell.state === 'hidden') cell.state = 'flagged';
    });
    state.flags = state.mines;
  }
}

export function revealCell(state: MinesweeperState, index: number): MinesweeperState {
  if (index < 0 || index >= state.cells.length || state.status === 'lost' || state.status === 'won' || state.status === 'paused') return state;
  const next = cloneMinesweeperGame(state);
  const cell = next.cells[index];
  if (cell.state === 'flagged') return state;
  if (!next.generated) {
    placeMines(next, index);
    next.status = 'playing';
  }
  revealSafeRegion(next, index);
  finishIfWon(next);
  return next;
}

export function flagCell(state: MinesweeperState, index: number): MinesweeperState {
  if (index < 0 || index >= state.cells.length || state.status === 'lost' || state.status === 'won' || state.status === 'paused') return state;
  const next = cloneMinesweeperGame(state);
  const cell = next.cells[index];
  if (cell.state === 'revealed') return state;
  if (cell.state === 'flagged') {
    cell.state = 'hidden';
    next.flags -= 1;
  } else if (next.flags < next.mines) {
    cell.state = 'flagged';
    next.flags += 1;
  }
  return next;
}

export function chordCell(state: MinesweeperState, index: number): MinesweeperState {
  if (index < 0 || index >= state.cells.length || state.status !== 'playing') return state;
  const source = state.cells[index];
  if (source.state !== 'revealed' || source.adjacent === 0) return state;
  const around = neighbours(state, index);
  if (around.filter((neighbour) => state.cells[neighbour].state === 'flagged').length !== source.adjacent) return state;
  const next = cloneMinesweeperGame(state);
  for (const neighbour of around) {
    if (next.cells[neighbour].state === 'hidden' && !revealSafeRegion(next, neighbour)) break;
  }
  finishIfWon(next);
  return next;
}

export function tick(state: MinesweeperState, seconds = 1): MinesweeperState {
  if (state.status !== 'playing' || !Number.isFinite(seconds) || seconds <= 0) return state;
  const next = cloneMinesweeperGame(state);
  next.elapsed = Math.min(999, next.elapsed + Math.floor(seconds));
  return next;
}

export function pauseGame(state: MinesweeperState): MinesweeperState {
  if (state.status !== 'playing') return state;
  return { ...state, status: 'paused', cells: state.cells.map((cell) => ({ ...cell })) };
}

export function resumeGame(state: MinesweeperState): MinesweeperState {
  if (state.status !== 'paused') return state;
  return { ...state, status: 'playing', cells: state.cells.map((cell) => ({ ...cell })) };
}

export function newGame(difficulty: Difficulty = 'beginner', seed?: number): MinesweeperState {
  return createMinesweeperGame({ difficulty, seed: seed ?? Math.floor(Math.random() * UINT32) });
}

export function isCompleted(state: MinesweeperState): boolean {
  return state.status === 'won';
}
