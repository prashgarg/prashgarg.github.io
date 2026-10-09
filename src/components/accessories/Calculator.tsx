import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  backspace,
  clearAll,
  clearEntry,
  createCalculator,
  equals,
  hasMemory,
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
  type CalculatorHistoryEntry,
  type CalculatorOperator,
  type CalculatorState,
} from './calculatorEngine';
import './Calculator.css';

export interface CalculatorProps {
  active: boolean;
}

type Action = (state: CalculatorState) => CalculatorState;

function CalcKey({
  label,
  onClick,
  className = '',
  ariaLabel,
}: {
  label: string;
  onClick: () => void;
  className?: string;
  ariaLabel?: string;
}) {
  return <button type="button" className={`calculator-key ${className}`} onClick={onClick} aria-label={ariaLabel ?? label}>{label}</button>;
}

export default function Calculator({ active }: CalculatorProps) {
  const [state, setState] = useState<CalculatorState>(() => createCalculator());
  const rootRef = useRef<HTMLElement>(null);
  const wasActive = useRef(false);

  useEffect(() => {
    if (active && !wasActive.current) rootRef.current?.focus({ preventScroll: true });
    wasActive.current = active;
  }, [active]);

  const apply = (action: Action) => setState(current => action(current));
  const digit = (value: string) => apply(current => inputDigit(current, value));
  const op = (value: CalculatorOperator) => apply(current => setOperator(current, value));

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    // Number keys should keep working after a mouse click leaves focus on a
    // key. Let the browser handle Enter/Space on the focused button itself so
    // its native click does not run a second calculator action.
    if (!active || event.ctrlKey || event.metaKey || event.altKey) return;
    if (event.target instanceof HTMLButtonElement && event.key === ' ') return;
    const key = event.key;
    let action: Action | null = null;
    if (/^[0-9]$/.test(key)) action = current => inputDigit(current, key);
    else if (key === '.' || key === ',') action = inputDecimal;
    else if (key === '+') action = current => setOperator(current, '+');
    else if (key === '-') action = current => setOperator(current, '−');
    else if (key === '*' || key.toLowerCase() === 'x') action = current => setOperator(current, '×');
    else if (key === '/') action = current => setOperator(current, '÷');
    else if (key === 'Enter' || key === '=') action = equals;
    else if (key === 'Backspace') action = backspace;
    else if (key === 'Escape') action = clearAll;
    else if (key === '%') action = percent;
    if (!action) return;
    event.preventDefault();
    apply(action);
  };

  const reuse = (entry: CalculatorHistoryEntry) => apply(current => recallHistory(current, entry));

  return <section
    ref={rootRef}
    className="accessory-app calculator-app"
    aria-label="Calculator"
    tabIndex={active ? 0 : -1}
    onKeyDown={onKeyDown}
  >
    <div className="calculator-display-wrap">
      <div className="calculator-expression" aria-hidden="true">{state.expression || '\u00a0'}</div>
      <output className={`calculator-display${state.error ? ' calculator-display-error' : ''}`} aria-live="polite" aria-label="Calculator display">{state.display}</output>
      {hasMemory(state) && <span className="calculator-memory-indicator" aria-label="Memory contains a value">M</span>}
    </div>
    <div className="calculator-memory-row" aria-label="Memory controls">
      <CalcKey label="MC" onClick={() => apply(memoryClear)} ariaLabel="Memory clear" />
      <CalcKey label="MR" onClick={() => apply(memoryRecall)} ariaLabel="Memory recall" />
      <CalcKey label="M+" onClick={() => apply(memoryAdd)} ariaLabel="Memory add" />
      <CalcKey label="M−" onClick={() => apply(memorySubtract)} ariaLabel="Memory subtract" />
    </div>
    <div className="calculator-body">
      <div className="calculator-keypad" aria-label="Calculator keys">
        <CalcKey label="⌫" className="calculator-function" onClick={() => apply(backspace)} ariaLabel="Backspace" />
        <CalcKey label="CE" className="calculator-function" onClick={() => apply(clearEntry)} ariaLabel="Clear entry" />
        <CalcKey label="C" className="calculator-function" onClick={() => apply(clearAll)} ariaLabel="Clear calculator" />
        <CalcKey label="%" className="calculator-function" onClick={() => apply(percent)} ariaLabel="Percent" />
        {(['7', '8', '9'] as const).map(value => <CalcKey key={value} label={value} onClick={() => digit(value)} />)}
        <CalcKey label="÷" className="calculator-operator" onClick={() => op('÷')} ariaLabel="Divide" />
        {(['4', '5', '6'] as const).map(value => <CalcKey key={value} label={value} onClick={() => digit(value)} />)}
        <CalcKey label="×" className="calculator-operator" onClick={() => op('×')} ariaLabel="Multiply" />
        {(['1', '2', '3'] as const).map(value => <CalcKey key={value} label={value} onClick={() => digit(value)} />)}
        <CalcKey label="−" className="calculator-operator" onClick={() => op('−')} ariaLabel="Subtract" />
        <CalcKey label="±" className="calculator-function" onClick={() => apply(toggleSign)} ariaLabel="Toggle sign" />
        <CalcKey label="0" onClick={() => digit('0')} />
        <CalcKey label="." className="calculator-function" onClick={() => apply(inputDecimal)} ariaLabel="Decimal point" />
        <CalcKey label="+" className="calculator-operator" onClick={() => op('+')} ariaLabel="Add" />
        <CalcKey label="=" className="calculator-equals" onClick={() => apply(equals)} ariaLabel="Equals" />
      </div>
      <aside className="calculator-history" aria-label="Calculation history">
        <div className="calculator-history-heading">History</div>
        {state.history.length === 0 ? <p className="calculator-history-empty" aria-hidden="true">—</p> : (
          <div className="calculator-history-list">
            {state.history.map(entry => <button type="button" className="calculator-history-item" key={entry.id} onClick={() => reuse(entry)} title="Use this result">
              <span>{entry.expression}</span><strong>= {entry.result}</strong>
            </button>)}
          </div>
        )}
      </aside>
    </div>
  </section>;
}
