import assert from 'node:assert/strict';

const timer = await import('../src/components/accessories/focusTimerStore.ts');

assert.equal(timer.clampFocusMinutes(0), 1);
assert.equal(timer.clampFocusMinutes(25.4), 25);
assert.equal(timer.clampFocusMinutes(999), 180);
assert.equal(timer.formatFocusTime(0), '00:00');
assert.equal(timer.formatFocusTime(61_001), '01:02');
assert.equal(timer.formatLap(90_000, 30_000), '01:00');

const countdown = {
  mode: 'countdown', status: 'running', durationMs: 300_000, elapsedMs: 0,
  startedAt: null, deadline: 1_300_000, laps: [],
};
assert.equal(timer.calculateFocusDisplay(countdown, 1_000_000).remainingMs, 300_000);
assert.equal(timer.calculateFocusDisplay(countdown, 1_125_000).remainingMs, 175_000);
assert.equal(timer.calculateFocusDisplay(countdown, 1_400_000).remainingMs, 0);
assert.equal(timer.calculateFocusDisplay(countdown, 1_400_000).elapsedMs, 300_000);

const stopwatch = {
  mode: 'stopwatch', status: 'running', durationMs: 1_500_000, elapsedMs: 12_000,
  startedAt: 2_000_000, deadline: null, laps: [12_000],
};
assert.equal(timer.calculateFocusDisplay(stopwatch, 2_500_000).elapsedMs, 512_000);
assert.deepEqual(timer.calculateFocusDisplay({ ...stopwatch, status: 'paused', startedAt: null }, 9_000_000).laps, [12_000]);

console.log('focus timer pure checks passed');
