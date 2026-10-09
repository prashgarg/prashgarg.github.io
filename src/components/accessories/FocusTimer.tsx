import { useEffect, useSyncExternalStore, useState } from 'react';
import {
  addFocusLap,
  clampFocusMinutes,
  formatFocusTime,
  formatLap,
  getFocusTimerSnapshot,
  initFocusTimer,
  pauseFocusTimer,
  resetFocusTimer,
  setFocusTimerMinutes,
  setFocusTimerMode,
  startFocusTimer,
  subscribeFocusTimer,
  type FocusTimerMode,
} from './focusTimerStore';
import './FocusTimer.css';

export interface FocusTimerProps { active: boolean; }

function useFocusTimer() {
  return useSyncExternalStore(subscribeFocusTimer, getFocusTimerSnapshot, getFocusTimerSnapshot);
}

export default function FocusTimer({ active }: FocusTimerProps) {
  const timer = useFocusTimer();
  const [customMinutes, setCustomMinutes] = useState(String(Math.round(timer.durationMs / 60_000)));

  useEffect(() => { initFocusTimer(); }, []);
  useEffect(() => {
    if (timer.mode === 'countdown') setCustomMinutes(String(Math.round(timer.durationMs / 60_000)));
  }, [timer.durationMs, timer.mode]);

  const running = timer.status === 'running';
  const canStart = timer.status !== 'finished';
  const modeLabel = timer.mode === 'countdown' ? 'Countdown' : 'Stopwatch';
  const statusLabel = timer.status === 'finished' ? 'Time is up' : timer.status === 'running' ? 'Running' : timer.status === 'paused' ? 'Paused' : 'Ready';
  const displayedMs = timer.mode === 'countdown' ? timer.remainingMs : timer.elapsedMs;
  const displayedTime = formatFocusTime(displayedMs, timer.mode === 'stopwatch' ? 'floor' : 'ceil');

  function chooseMode(mode: FocusTimerMode) { setFocusTimerMode(mode); }
  function applyCustomMinutes() {
    const value = Number(customMinutes);
    if (!Number.isFinite(value)) {
      setCustomMinutes(String(Math.round(timer.durationMs / 60_000)));
      return;
    }
    const normalized = clampFocusMinutes(value);
    // Blurring an unchanged field must preserve a paused timer's progress.
    if (normalized === Math.round(timer.durationMs / 60_000)) setCustomMinutes(String(normalized));
    else setFocusTimerMinutes(normalized);
  }

  return <div className="accessory-app focus-timer-app" data-focus-timer data-active={active ? 'true' : 'false'}>
    <div className="accessory-toolbar focus-timer-toolbar" role="toolbar" aria-label="Timer mode">
      <button type="button" className={`accessory-button ${timer.mode === 'countdown' ? 'is-selected' : ''}`} aria-pressed={timer.mode === 'countdown'} disabled={running} onClick={() => chooseMode('countdown')}>Countdown</button>
      <button type="button" className={`accessory-button ${timer.mode === 'stopwatch' ? 'is-selected' : ''}`} aria-pressed={timer.mode === 'stopwatch'} disabled={running} onClick={() => chooseMode('stopwatch')}>Stopwatch</button>
    </div>

    <div className="focus-timer-display" aria-live="off">
      <span className="focus-timer-time" aria-label={`${modeLabel}, ${displayedTime}`}>{displayedTime}</span>
      <span className={`accessory-status focus-timer-status status-${timer.status}`} aria-live="polite">{statusLabel}</span>
    </div>

    {timer.mode === 'countdown' && <div className="focus-timer-presets" aria-label="Countdown length">
      <span className="focus-timer-label">Minutes</span>
      {[5, 25, 50].map(minutes => <button key={minutes} type="button" className="accessory-button focus-timer-preset" disabled={running} onClick={() => setFocusTimerMinutes(minutes)}>{minutes}</button>)}
      <label className="focus-timer-custom"><span className="focus-timer-sr">Custom minutes, 1 to 180</span><input className="accessory-input" type="number" min="1" max="180" step="1" value={customMinutes} disabled={running} onChange={event => setCustomMinutes(event.target.value)} onBlur={applyCustomMinutes} onKeyDown={event => { if (event.key === 'Enter') applyCustomMinutes(); }} /><span aria-hidden="true">min</span></label>
    </div>}

    <div className="focus-timer-actions">
      {running ? <button type="button" className="accessory-button focus-timer-primary" onClick={pauseFocusTimer}>Pause</button> : <button type="button" className="accessory-button focus-timer-primary" disabled={!canStart} onClick={startFocusTimer}>{timer.status === 'paused' ? 'Resume' : 'Start'}</button>}
      {timer.mode === 'stopwatch' && running && <button type="button" className="accessory-button" onClick={addFocusLap}>Lap</button>}
      <button type="button" className="accessory-button" onClick={resetFocusTimer}>Reset</button>
    </div>

    {timer.mode === 'stopwatch' && timer.laps.length > 0 && <div className="focus-timer-laps" aria-label="Stopwatch laps">
      <div className="focus-timer-laps-title">Laps</div>
      <ol>{timer.laps.slice().reverse().map((lap, index) => {
        const originalIndex = timer.laps.length - index - 1;
        const previous = originalIndex > 0 ? timer.laps[originalIndex - 1] : 0;
        return <li key={`${lap}-${originalIndex}`}><span>Lap {originalIndex + 1}</span><strong>{formatLap(lap, previous)}</strong><small>{formatFocusTime(lap)}</small></li>;
      })}</ol>
    </div>}
  </div>;
}
