import assert from 'node:assert/strict';
import {
  backspace,
  clearAll,
  clearEntry,
  createCalculator,
  equals,
  formatNumber,
  inputDecimal,
  inputDigit,
  memoryAdd,
  memoryClear,
  memoryRecall,
  memorySubtract,
  percent,
  recallHistory,
  setOperator,
  toggleSign,
} from '../src/components/accessories/calculatorEngine.ts';

const press = (state, keys) => [...keys].reduce((current, key) => {
  if (/^\d$/.test(key)) return inputDigit(current, key);
  if (key === '.') return inputDecimal(current);
  if (key === '=') return equals(current);
  if (key === '%') return percent(current);
  if (key === '±') return toggleSign(current);
  return setOperator(current, key);
}, state);

let state = createCalculator();
state = press(state, '200+10%=');
assert.equal(state.display, '220', 'business percent: 200 + 10% = 220');

state = createCalculator();
state = press(state, '12+3=');
assert.equal(state.display, '15');
state = equals(state);
assert.equal(state.display, '18', 'repeated equals repeats the last operation');
state = equals(state);
assert.equal(state.display, '21');

state = createCalculator();
state = press(state, '7×8=');
assert.equal(state.display, '56');
assert.equal(state.history[0].expression, '7 × 8');

state = createCalculator();
state = press(state, '5÷0=');
assert.equal(state.display, 'Error');
state = inputDigit(state, '4');
assert.equal(state.display, '4', 'a digit recovers a divide-by-zero error');

state = createCalculator();
state = press(state, '123');
state = backspace(state);
assert.equal(state.display, '12');
state = clearEntry(state);
assert.equal(state.display, '0');
state = press(state, '12');
state = memoryAdd(state);
state = clearAll(state);
assert.equal(state.display, '0');
state = memoryRecall(state);
assert.equal(state.display, '12');
state = memorySubtract(state);
state = memoryClear(state);
assert.equal(state.memory, 0);

state = createCalculator();
state = press(state, '1.25');
state = toggleSign(state);
assert.equal(state.display, '-1.25');
state = toggleSign(state);
assert.equal(state.display, '1.25');
state = press(state, '2');
assert.equal(state.display, '1.252', 'input remains bounded and decimal is not duplicated');

assert.equal(formatNumber(-0), '0');
assert.equal(formatNumber(0.1 + 0.2), '0.3');

const entry = state.history[0];
if (entry) {
  const recalled = recallHistory(state, entry);
  assert.equal(recalled.display, entry.result);
  assert.equal(recalled.expression, entry.expression);
}

console.log('calculator engine checks passed');
