import { useCallback, useEffect, useRef, useState, type KeyboardEvent } from 'react';
import {
  clampBpm,
  clearPattern,
  createSequencerState,
  loadSequencerState,
  MAX_BPM,
  MIN_BPM,
  nextStep,
  presetPattern,
  saveSequencerState,
  stepAtTime,
  stepDurationMs,
  toggleStep,
  TRACK_IDS,
  TRACK_LABELS,
  type SequencerState,
  type TrackId,
} from './sequencerEngine';
import { readAccessoryVolume, reportAccessoryAudio, subscribeAccessoryVolume } from './accessoryAudio';
import './Sequencer.css';

export interface SequencerProps { active: boolean; }

type AudioContextConstructor = typeof AudioContext;
type AudioContextLike = AudioContext & { close?: () => Promise<void>; sequencerMaster?: GainNode };

function getStorage(): Storage | null {
  if (typeof window === 'undefined') return null;
  try { return window.localStorage; } catch { return null; }
}

function getAudioContext(): AudioContextLike | null {
  if (typeof window === 'undefined') return null;
  const Constructor = (window.AudioContext || (window as Window & { webkitAudioContext?: AudioContextConstructor }).webkitAudioContext) as AudioContextConstructor | undefined;
  if (!Constructor) return null;
  try { return new Constructor() as AudioContextLike; } catch { return null; }
}

function outputGain(context: AudioContextLike, when: number): GainNode {
  const gain = context.createGain();
  gain.gain.setValueAtTime(0.18, when);
  gain.connect(context.sequencerMaster ?? context.destination);
  return gain;
}

function noiseBuffer(context: BaseAudioContext): AudioBuffer {
  const buffer = context.createBuffer(1, context.sampleRate * 0.12, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let index = 0; index < data.length; index += 1) data[index] = Math.random() * 2 - 1;
  return buffer;
}

function scheduleKick(context: AudioContextLike, when: number) {
  const gain = outputGain(context, when);
  const oscillator = context.createOscillator();
  oscillator.type = 'sine';
  oscillator.frequency.setValueAtTime(145, when);
  oscillator.frequency.exponentialRampToValueAtTime(48, when + 0.12);
  gain.gain.exponentialRampToValueAtTime(0.18, when + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.18);
  oscillator.connect(gain); oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); }; oscillator.start(when); oscillator.stop(when + 0.2);
}

function scheduleNoise(context: AudioContextLike, when: number, hat: boolean) {
  const source = context.createBufferSource();
  source.buffer = noiseBuffer(context);
  const filter = context.createBiquadFilter();
  filter.type = hat ? 'highpass' : 'bandpass';
  filter.frequency.setValueAtTime(hat ? 6000 : 1700, when);
  const gain = outputGain(context, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + (hat ? 0.055 : 0.16));
  source.connect(filter); filter.connect(gain); source.onended = () => { source.disconnect(); filter.disconnect(); gain.disconnect(); }; source.start(when); source.stop(when + (hat ? 0.06 : 0.17));
}

function scheduleTone(context: AudioContextLike, when: number, step: number) {
  const oscillator = context.createOscillator();
  oscillator.type = 'triangle';
  oscillator.frequency.setValueAtTime([220, 262, 330, 392][step % 4], when);
  const gain = outputGain(context, when);
  gain.gain.setValueAtTime(0.13, when);
  gain.gain.exponentialRampToValueAtTime(0.001, when + 0.18);
  oscillator.connect(gain); oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); }; oscillator.start(when); oscillator.stop(when + 0.2);
}

function scheduleStep(context: AudioContextLike, state: SequencerState, step: number, when: number) {
  if (state.muted.kick === false && state.pattern.kick[step]) scheduleKick(context, when);
  if (state.muted.snare === false && state.pattern.snare[step]) scheduleNoise(context, when, false);
  if (state.muted.hat === false && state.pattern.hat[step]) scheduleNoise(context, when, true);
  if (state.muted.tone === false && state.pattern.tone[step]) scheduleTone(context, when, step);
}

export default function Sequencer({ active }: SequencerProps) {
  const [state, setState] = useState<SequencerState>(() => loadSequencerState(getStorage()));
  const [playing, setPlaying] = useState(false);
  const [starting, setStarting] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [clearPending, setClearPending] = useState(false);
  const [audioMessage, setAudioMessage] = useState('Ready');
  const [bpmDraft, setBpmDraft] = useState(() => String(state.bpm));
  const [saveError, setSaveError] = useState(false);
  const [volume, setVolume] = useState(() => readAccessoryVolume());
  const rootRef = useRef<HTMLElement>(null);
  const stateRef = useRef(state);
  const contextRef = useRef<AudioContextLike | null>(null);
  const timerRef = useRef<number | null>(null);
  const visualRef = useRef<number | null>(null);
  const nextNoteRef = useRef(0);
  const nextStepRef = useRef(0);
  const audioStartTimeRef = useRef(0);
  const mountedRef = useRef(true);
  const startingRef = useRef(false);
  const startRequestRef = useRef(0);
  const volumeRef = useRef(volume);
  stateRef.current = state;
  volumeRef.current = volume;

  useEffect(() => subscribeAccessoryVolume(next => {
    volumeRef.current = next;
    setVolume(next);
    const context = contextRef.current;
    if (context?.sequencerMaster && context.state !== 'closed') {
      context.sequencerMaster.gain.setTargetAtTime(next, context.currentTime, 0.01);
    }
  }), []);

  const persist = useCallback((next: SequencerState): boolean => {
    return saveSequencerState(getStorage(), next);
  }, []);

  useEffect(() => { setSaveError(!persist(state)); }, [persist, state]);

  const stop = useCallback(() => {
    startRequestRef.current += 1;
    startingRef.current = false;
    setStarting(false);
    if (timerRef.current !== null) window.clearInterval(timerRef.current);
    if (visualRef.current !== null) window.clearInterval(visualRef.current);
    timerRef.current = null; visualRef.current = null;
    setPlaying(false); setCurrentStep(-1); setAudioMessage('Stopped');
    reportAccessoryAudio('sequencer', false);
    const context = contextRef.current;
    contextRef.current = null;
    context?.sequencerMaster?.disconnect();
    if (context && context.state !== 'closed') void context.close?.();
  }, []);

  const start = useCallback(async () => {
    if (playing || startingRef.current || !mountedRef.current) return;
    startingRef.current = true;
    setStarting(true); setAudioMessage('Starting…');
    const request = ++startRequestRef.current;
    const context = getAudioContext();
    if (!context) { startingRef.current = false; setStarting(false); setAudioMessage('Sound is unavailable'); return; }
    try {
      if (context.state === 'suspended') await context.resume();
      if (context.state !== 'running') {
        await context.close?.();
        if (mountedRef.current && request === startRequestRef.current) { startingRef.current = false; setStarting(false); setAudioMessage('Sound is unavailable'); }
        return;
      }
    } catch {
      await context.close?.();
      if (mountedRef.current && request === startRequestRef.current) { startingRef.current = false; setStarting(false); setAudioMessage('Click again to enable sound'); }
      return;
    }
    if (!mountedRef.current || request !== startRequestRef.current) { await context.close?.(); return; }
    startingRef.current = false; setStarting(false);
    const master = context.createGain();
    master.gain.setValueAtTime(volumeRef.current, context.currentTime);
    master.connect(context.destination); context.sequencerMaster = master;
    contextRef.current = context;
    const now = context.currentTime + 0.05;
    nextNoteRef.current = now; nextStepRef.current = 0;
    audioStartTimeRef.current = now;
    setPlaying(true); setCurrentStep(0); setAudioMessage('Playing'); reportAccessoryAudio('sequencer', true);
    const schedule = () => {
      const current = contextRef.current;
      if (!current || current.state === 'closed') return;
      const lookAhead = 0.12;
      const stepSeconds = stepDurationMs(stateRef.current.bpm) / 1000;
      // A backgrounded tab can leave the scheduler far behind the audio
      // clock. Jump to the next grid boundary instead of replaying every
      // missed step and allocating an unbounded number of audio nodes.
      if (nextNoteRef.current < current.currentTime) {
        const absoluteStep = Math.max(0, Math.floor((current.currentTime - audioStartTimeRef.current) / stepSeconds) + 1);
        nextStepRef.current = absoluteStep % 16;
        nextNoteRef.current = audioStartTimeRef.current + absoluteStep * stepSeconds;
      }
      while (nextNoteRef.current < current.currentTime + lookAhead) {
        scheduleStep(current, stateRef.current, nextStepRef.current, nextNoteRef.current);
        nextNoteRef.current += stepSeconds;
        nextStepRef.current = nextStep(nextStepRef.current);
      }
    };
    schedule();
    timerRef.current = window.setInterval(schedule, 25);
    visualRef.current = window.setInterval(() => {
      const current = contextRef.current;
      if (current && current.state !== 'closed') setCurrentStep(stepAtTime(audioStartTimeRef.current * 1000, current.currentTime * 1000, stateRef.current.bpm));
    }, 40);
  }, [playing, stop]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      // The desktop can remove a minimised window immediately after Close is
      // clicked; flush the latest pattern before the component disappears.
      mountedRef.current = false;
      persist(stateRef.current);
      stop();
    };
  }, [persist, stop]);

  const changeState = (updater: (current: SequencerState) => SequencerState) => {
    setState(current => updater(current));
  };

  const toggle = (track: TrackId, step: number) => changeState(current => ({ ...current, pattern: toggleStep(current.pattern, track, step) }));
  const setBpm = (value: number) => changeState(current => ({ ...current, bpm: clampBpm(value) }));
  const commitBpm = () => {
    const next = clampBpm(Number(bpmDraft));
    setBpm(next);
    setBpmDraft(String(next));
  };
  const clear = () => { changeState(current => ({ ...current, pattern: clearPattern() })); setClearPending(false); };
  const loadPreset = () => changeState(current => ({ ...current, pattern: presetPattern() }));

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.key === 'Escape' && clearPending) {
      event.preventDefault(); event.stopPropagation(); setClearPending(false);
    }
  };

  return <section ref={rootRef} className="accessory-app sequencer-app" aria-label="Music sequencer" tabIndex={active ? 0 : -1} onKeyDown={onKeyDown}>
    <div className="sequencer-toolbar">
      <button type="button" className="accessory-button sequencer-play" onClick={() => { void (playing ? stop() : start()); }} aria-label={playing ? 'Stop sequencer' : 'Play sequencer'}>{starting ? '… Starting' : playing ? '■ Stop' : '▶ Play'}</button>
      <label className="sequencer-bpm">BPM <input className="accessory-input" type="number" min={MIN_BPM} max={MAX_BPM} value={bpmDraft} onChange={event => setBpmDraft(event.target.value)} onBlur={commitBpm} onKeyDown={event => { if (event.key === 'Enter') event.currentTarget.blur(); }} disabled={playing} aria-label="Beats per minute" /></label>
      <button type="button" className="accessory-button" onClick={loadPreset}>Pattern</button>
      {clearPending ? <span className="sequencer-confirm"><span>Clear all?</span><button type="button" className="accessory-button" onClick={clear}>Clear</button><button type="button" className="accessory-button" onClick={() => setClearPending(false)}>Cancel</button></span> : <button type="button" className="accessory-button" onClick={() => setClearPending(true)}>Clear</button>}
    </div>
    <div className="sequencer-grid-wrap">
      <div className="sequencer-grid" role="group" aria-label="Sixteen step pattern">
        <div className="sequencer-corner" aria-hidden="true">track</div>
        {Array.from({ length: 16 }, (_, step) => <div key={step} className={`sequencer-step-number${currentStep === step ? ' is-current' : ''}`}>{step + 1}</div>)}
        {TRACK_IDS.map(track => <div className="sequencer-row" key={track}>
          <div className="sequencer-track-label"><span>{TRACK_LABELS[track]}</span><button type="button" className={`sequencer-mute${state.muted[track] ? ' is-muted' : ''}`} onClick={() => changeState(current => ({ ...current, muted: { ...current.muted, [track]: !current.muted[track] } }))} aria-pressed={state.muted[track]} aria-label={`${state.muted[track] ? 'Unmute' : 'Mute'} ${TRACK_LABELS[track]}`}>{state.muted[track] ? 'off' : 'on'}</button></div>
          {Array.from({ length: 16 }, (_, step) => <button type="button" key={step} className={`sequencer-cell${state.pattern[track][step] ? ' is-on' : ''}${currentStep === step ? ' is-current' : ''}`} onClick={() => toggle(track, step)} aria-pressed={state.pattern[track][step]} aria-label={`${TRACK_LABELS[track]}, step ${step + 1}${state.pattern[track][step] ? ', on' : ', off'}`} />)}
        </div>)}
      </div>
    </div>
    <div className="accessory-status" aria-live="polite">{audioMessage}{playing ? ` · ${state.bpm} BPM` : ''}{saveError ? ' · Pattern not saved in this browser' : ''}</div>
  </section>;
}
