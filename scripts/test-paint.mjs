import assert from 'node:assert/strict';
import {
  PAINT_COLORS,
  PAINT_HEIGHT,
  PAINT_SIZES,
  PAINT_WIDTH,
  pointFromClient,
  rectFromPoints,
} from '../src/components/accessories/paintEngine.ts';

const rect = { left: 100, top: 50, width: 400, height: 250 };
assert.deepEqual(pointFromClient(100, 50, rect), { x: 0, y: 0 });
assert.deepEqual(pointFromClient(300, 175, rect), { x: 400, y: 250 });
assert.deepEqual(pointFromClient(-20, 999, rect), { x: 0, y: PAINT_HEIGHT });
assert.deepEqual(pointFromClient(999, -20, rect), { x: PAINT_WIDTH, y: 0 });
assert.deepEqual(pointFromClient(10, 10, { left: 0, top: 0, width: 0, height: 0 }), { x: 0, y: 0 });
assert.deepEqual(rectFromPoints({ x: 80, y: 200 }, { x: 20, y: 40 }), { x: 20, y: 40, width: 60, height: 160 });
assert.equal(PAINT_COLORS.length >= 6, true);
assert.deepEqual(PAINT_SIZES, [2, 5, 10, 18]);
console.log('paint engine tests passed');
