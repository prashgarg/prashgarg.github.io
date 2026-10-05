import assert from 'node:assert/strict';
import {
  chordCell,
  createMinesweeperGame,
  flagCell,
  neighbours,
  pauseGame,
  revealCell,
  resumeGame,
  tick,
} from '../src/components/games/minesweeperEngine.ts';

function started(seed = 1) {
  return revealCell(createMinesweeperGame({ difficulty: 'beginner', seed }), 40);
}

// The first click and all eight surrounding squares are protected, and the
// same seed produces the same board.
{
  const first = started(42);
  const repeat = started(42);
  assert.deepEqual(first.cells, repeat.cells);
  assert.equal(first.status, 'playing');
  assert.equal(first.cells[40].mine, false);
  for (const index of neighbours(first, 40)) assert.equal(first.cells[index].mine, false);
}

// Flood reveal opens connected zero regions without opening a mine, and
// flags are respected by both reveal and chord operations.
{
  const state = started(91);
  const mine = state.cells.findIndex((cell) => cell.mine);
  assert.ok(mine >= 0);
  const flagged = flagCell(state, mine);
  assert.equal(flagged.flags, 1);
  assert.equal(flagged.cells[mine].state, 'flagged');
  assert.equal(revealCell(flagged, mine), flagged);

  const numbered = flagged.cells.findIndex((cell, index) => cell.state === 'revealed' && cell.adjacent > 0 && neighbours(flagged, index).some((n) => flagged.cells[n].state === 'hidden'));
  assert.ok(numbered >= 0);
}

// Chording with the correct number of flags reveals its hidden neighbours.
{
  let state;
  let source = -1;
  for (let seed = 1; seed < 100; seed += 1) {
    const candidate = started(seed);
    const found = candidate.cells.findIndex((cell, index) => cell.state === 'revealed' && cell.adjacent > 0 && neighbours(candidate, index).some((n) => candidate.cells[n].state === 'hidden' && candidate.cells[n].mine));
    if (found >= 0) { state = candidate; source = found; break; }
  }
  assert.ok(state && source >= 0);
  const mineNeighbour = neighbours(state, source).find((n) => state.cells[n].state === 'hidden' && state.cells[n].mine);
  assert.ok(mineNeighbour !== undefined);
  const flagged = flagCell(state, mineNeighbour);
  const beforeHidden = flagged.cells.filter((cell) => cell.state === 'hidden').length;
  const after = chordCell(flagged, source);
  assert.equal(after.status, 'playing');
  assert.ok(after.cells.filter((cell) => cell.state === 'hidden').length < beforeHidden);
}

// A wrong flag does not protect a mine: chording the number reveals the mine.
{
  let state;
  let source = -1;
  let falseFlag = -1;
  let actualMine = -1;
  for (let seed = 1; seed < 300 && source < 0; seed += 1) {
    const candidate = started(seed);
    for (let index = 0; index < candidate.cells.length; index += 1) {
      const cell = candidate.cells[index];
      const around = neighbours(candidate, index);
      const mine = around.find((n) => candidate.cells[n].state === 'hidden' && candidate.cells[n].mine);
      const safe = around.find((n) => candidate.cells[n].state === 'hidden' && !candidate.cells[n].mine);
      if (cell.state === 'revealed' && cell.adjacent === 1 && mine !== undefined && safe !== undefined) {
        state = candidate; source = index; falseFlag = safe; actualMine = mine; break;
      }
    }
  }
  assert.ok(state && source >= 0 && falseFlag >= 0 && actualMine >= 0);
  const after = chordCell(flagCell(state, falseFlag), source);
  assert.equal(after.status, 'lost');
  assert.equal(after.explodedIndex, actualMine);
}

// Revealing every non-mine cell wins; the timer pauses and resumes cleanly.
{
  let state = started(1234);
  for (let index = 0; index < state.cells.length && state.status === 'playing'; index += 1) {
    if (!state.cells[index].mine) state = revealCell(state, index);
  }
  assert.equal(state.status, 'won');
  assert.equal(state.flags, state.mines);
  const ticking = tick(started(12), 7);
  assert.equal(ticking.elapsed, 7);
  const paused = pauseGame(ticking);
  assert.equal(paused.status, 'paused');
  assert.equal(tick(paused, 10), paused);
  assert.equal(resumeGame(paused).status, 'playing');
}

// Intermediate is the canonical 16-by-16 board with forty mines.
{
  const state = createMinesweeperGame({ difficulty: 'intermediate', seed: 7 });
  assert.equal(state.rows, 16);
  assert.equal(state.cols, 16);
  assert.equal(state.mines, 40);
  assert.equal(state.cells.length, 256);
}

console.log('PASS Minesweeper engine: safe first reveal, flood, flags, chord, win/loss, timer, and difficulty');
