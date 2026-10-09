export type CalculatorOperator = '+' | '−' | '×' | '÷';

export type CalculatorHistoryEntry = {
  id: number;
  expression: string;
  result: string;
  value: number;
};

export type CalculatorState = {
  display: string;
  accumulator: number | null;
  operator: CalculatorOperator | null;
  waitingForOperand: boolean;
  lastOperator: CalculatorOperator | null;
  lastOperand: number | null;
  memory: number;
  expression: string;
  error: boolean;
  justEvaluated: boolean;
  history: CalculatorHistoryEntry[];
  nextHistoryId: number;
};

const MAX_DIGITS = 16;
const MAX_HISTORY = 24;

const operatorText: Record<CalculatorOperator, string> = {
  '+': '+',
  '−': '−',
  '×': '×',
  '÷': '÷',
};

function finite(value: number): number {
  return Number.isFinite(value) ? value : 0;
}

/** Keep calculator output readable while avoiding long floating point tails. */
export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return 'Error';
  if (Object.is(value, -0) || value === 0) return '0';
  const absolute = Math.abs(value);
  let output: string;
  if (absolute >= 1e12 || absolute < 1e-9) output = value.toExponential(10).replace(/\.?(\d*?)0+e/, '$1e');
  else output = Number(value.toPrecision(12)).toString();
  return output.replace('e+', 'e');
}

function parseDisplay(state: CalculatorState): number {
  const parsed = Number(state.display);
  return Number.isFinite(parsed) ? parsed : 0;
}

function appendHistory(state: CalculatorState, left: number, operator: CalculatorOperator, right: number, result: number): CalculatorState {
  const entry: CalculatorHistoryEntry = {
    id: state.nextHistoryId,
    expression: `${formatNumber(left)} ${operatorText[operator]} ${formatNumber(right)}`,
    result: formatNumber(result),
    value: result,
  };
  return {
    ...state,
    history: [entry, ...state.history].slice(0, MAX_HISTORY),
    nextHistoryId: state.nextHistoryId + 1,
  };
}

export function createCalculator(): CalculatorState {
  return {
    display: '0',
    accumulator: null,
    operator: null,
    waitingForOperand: false,
    lastOperator: null,
    lastOperand: null,
    memory: 0,
    expression: '',
    error: false,
    justEvaluated: false,
    history: [],
    nextHistoryId: 1,
  };
}

function recover(state: CalculatorState): CalculatorState {
  return state.error ? { ...createCalculator(), memory: state.memory, history: state.history, nextHistoryId: state.nextHistoryId } : state;
}

export function inputDigit(state: CalculatorState, digit: string): CalculatorState {
  if (!/^[0-9]$/.test(digit)) return state;
  let next = recover(state);
  if (next.justEvaluated || (next.waitingForOperand && next.operator)) {
    next = { ...next, display: '0', waitingForOperand: false, justEvaluated: false, lastOperator: null, lastOperand: null };
  }
  if (next.display.replace('-', '').replace('.', '').length >= MAX_DIGITS) return next;
  const negative = next.display.startsWith('-');
  const body = negative ? next.display.slice(1) : next.display;
  const value = body === '0' ? digit : body + digit;
  return { ...next, display: negative ? `-${value}` : value, expression: next.expression };
}

export function inputDecimal(state: CalculatorState): CalculatorState {
  let next = recover(state);
  if (next.justEvaluated || (next.waitingForOperand && next.operator)) {
    next = { ...next, display: '0', waitingForOperand: false, justEvaluated: false, lastOperator: null, lastOperand: null };
  }
  if (next.display.includes('.')) return next;
  return { ...next, display: `${next.display}.` };
}

export function backspace(state: CalculatorState): CalculatorState {
  if (state.error) return clearEntry(state);
  if (state.waitingForOperand || state.justEvaluated) return { ...state, display: '0', waitingForOperand: false, justEvaluated: false };
  const trimmed = state.display.length <= 1 || (state.display.length === 2 && state.display.startsWith('-'))
    ? '0'
    : state.display.slice(0, -1);
  return { ...state, display: trimmed === '-' || trimmed === '' ? '0' : trimmed };
}

export function clearEntry(state: CalculatorState): CalculatorState {
  return { ...state, display: '0', waitingForOperand: false, justEvaluated: false, error: false };
}

/** C clears the calculation while leaving the independent memory register intact. */
export function clearAll(state: CalculatorState): CalculatorState {
  const fresh = createCalculator();
  return { ...fresh, memory: state.memory, history: state.history, nextHistoryId: state.nextHistoryId };
}

export const clear = clearAll;

export function toggleSign(state: CalculatorState): CalculatorState {
  if (state.error) return clearEntry(state);
  if (state.display === '0') return state;
  return { ...state, display: state.display.startsWith('-') ? state.display.slice(1) : `-${state.display}` };
}

/** Percent follows the familiar desktop-calculator convention: 200 + 10% = 220. */
export function percent(state: CalculatorState): CalculatorState {
  if (state.error) return state;
  const current = parseDisplay(state);
  const value = state.accumulator !== null && state.operator
    ? state.operator === '+' || state.operator === '−'
      ? state.accumulator * current / 100
      : current / 100
    : current / 100;
  return { ...state, display: formatNumber(value), waitingForOperand: false, justEvaluated: false };
}

function calculate(left: number, operator: CalculatorOperator, right: number): number | null {
  const result = operator === '+' ? left + right
    : operator === '−' ? left - right
      : operator === '×' ? left * right
        : right === 0 ? null : left / right;
  return result !== null && Number.isFinite(result) ? result : null;
}

function calculationError(state: CalculatorState): CalculatorState {
  return { ...state, display: 'Error', accumulator: null, operator: null, waitingForOperand: false, error: true, justEvaluated: true, expression: '' };
}

export function setOperator(state: CalculatorState, operator: CalculatorOperator): CalculatorState {
  if (state.error) return state;
  let next = state;
  const current = parseDisplay(next);
  if (next.operator && next.accumulator !== null && !next.waitingForOperand) {
    const result = calculate(next.accumulator, next.operator, current);
    if (result === null) return calculationError(next);
    next = appendHistory(next, next.accumulator, next.operator, current, result);
    next = { ...next, display: formatNumber(result), accumulator: result, lastOperator: null, lastOperand: null };
  } else if (next.justEvaluated) {
    next = { ...next, accumulator: current, justEvaluated: false, lastOperator: null, lastOperand: null };
  } else if (next.accumulator === null) {
    next = { ...next, accumulator: current };
  }
  return { ...next, operator, waitingForOperand: true, expression: `${formatNumber(next.accumulator ?? current)} ${operatorText[operator]}` };
}

export function equals(state: CalculatorState): CalculatorState {
  if (state.error) return state;
  let next = state;
  let operator = next.operator;
  let left = next.accumulator;
  let right: number;
  if (operator && left !== null) {
    right = next.waitingForOperand ? (next.lastOperand ?? parseDisplay(next)) : parseDisplay(next);
  } else if (next.justEvaluated && next.lastOperator && next.lastOperand !== null) {
    operator = next.lastOperator;
    left = parseDisplay(next);
    right = next.lastOperand;
  } else {
    return next;
  }
  const result = calculate(left, operator, right);
  if (result === null) return calculationError(next);
  next = appendHistory(next, left, operator, right, result);
  return {
    ...next,
    display: formatNumber(result),
    accumulator: result,
    operator: null,
    waitingForOperand: true,
    lastOperator: operator,
    lastOperand: right,
    expression: `${formatNumber(left)} ${operatorText[operator]} ${formatNumber(right)} =`,
    justEvaluated: true,
    error: false,
  };
}

export function memoryClear(state: CalculatorState): CalculatorState { return { ...state, memory: 0 }; }

export function memoryRecall(state: CalculatorState): CalculatorState {
  if (state.error) return { ...clearEntry(state), display: formatNumber(state.memory), waitingForOperand: true };
  return { ...state, display: formatNumber(state.memory), waitingForOperand: true, justEvaluated: false };
}

export function memoryAdd(state: CalculatorState): CalculatorState {
  if (state.error) return state;
  const memory = finite(state.memory + parseDisplay(state));
  return { ...state, memory };
}

export function memorySubtract(state: CalculatorState): CalculatorState {
  if (state.error) return state;
  const memory = finite(state.memory - parseDisplay(state));
  return { ...state, memory };
}

export function recallHistory(state: CalculatorState, entry: CalculatorHistoryEntry): CalculatorState {
  if (!Number.isFinite(entry.value)) return state;
  return { ...state, display: formatNumber(entry.value), accumulator: null, operator: null, waitingForOperand: true, justEvaluated: true, error: false, expression: entry.expression };
}

export function hasMemory(state: CalculatorState): boolean { return state.memory !== 0; }
