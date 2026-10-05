import assert from 'node:assert/strict';
import {
  createSnakeGame,
  queueDirection,
  startGame,
  stepGame,
} from '../src/components/games/snakeEngine.ts';

const running = options => startGame(createSnakeGame(options));

// A single queued turn is consumed on the next tick; a second key cannot
// sneak in a two-turn reversal before the snake moves.
{
  const state = running({ width: 8, height: 6, snake: [{ x: 3, y: 3 }, { x: 2, y: 3 }], direction: 'right', food: { x: 7, y: 5 } });
  const turned = queueDirection(queueDirection(state, 'up'), 'left');
  assert.equal(turned.queuedDirection, 'up');
  const next = stepGame(turned);
  assert.deepEqual(next.snake[0], { x: 3, y: 2 });
  assert.equal(next.direction, 'up');
}

// Moving into the current tail is safe when the tail vacates on this tick.
{
  const state = running({ width: 5, height: 5, snake: [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 1, y: 3 }, { x: 1, y: 2 }], direction: 'left', food: { x: 4, y: 4 } });
  const next = stepGame(state);
  assert.equal(next.status, 'running');
  assert.deepEqual(next.snake[0], { x: 1, y: 2 });
}

// Eating grows the snake and chooses food only from currently free cells.
{
  const state = running({ width: 4, height: 3, snake: [{ x: 1, y: 1 }, { x: 0, y: 1 }], direction: 'right', food: { x: 2, y: 1 } });
  const next = stepGame(state, () => 0);
  assert.equal(next.score, 10);
  assert.equal(next.snake.length, 3);
  assert.deepEqual(next.food, { x: 0, y: 0 });
  assert.ok(!next.snake.some(cell => cell.x === next.food?.x && cell.y === next.food?.y));
}

// The final free cell wins instead of trying to spawn impossible food.
{
  const state = running({ width: 2, height: 2, snake: [{ x: 0, y: 1 }, { x: 0, y: 0 }, { x: 1, y: 0 }], direction: 'right', food: { x: 1, y: 1 } });
  const next = stepGame(state);
  assert.equal(next.status, 'won');
  assert.equal(next.food, null);
  assert.equal(next.snake.length, 4);
}

// Walls and bodies end a run; queued reversals are ignored.
{
  const wall = stepGame(running({ width: 3, height: 3, snake: [{ x: 2, y: 1 }], direction: 'right', food: { x: 0, y: 0 } }));
  assert.equal(wall.status, 'lost');
  const body = stepGame(running({ width: 5, height: 5, snake: [{ x: 2, y: 2 }, { x: 2, y: 3 }, { x: 1, y: 3 }, { x: 1, y: 2 }], direction: 'down', food: { x: 4, y: 4 } }));
  assert.equal(body.status, 'lost');
}

console.log('PASS snake engine: turns, tail-vacating, food, win, and collisions');
