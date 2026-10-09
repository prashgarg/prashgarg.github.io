import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createAmbientMixer, DEFAULT_AMBIENT_LEVELS, type AmbientChannel, type AmbientLevels } from './ambientMixerEngine';
import { readAccessoryVolume } from './accessoryAudio';
import './AmbientMixer.css';

const STORAGE_KEY = 'pg_ambient_mixer_v1';
const CHANNEL_LABELS: Record<AmbientChannel, string> = { rain: 'Rain', ventilation: 'Ventilation', office: 'Office hum' };
const CHANNELS: AmbientChannel[] = ['rain', 'ventilation', 'office'];

function loadLevels(): AmbientLevels {
  if (typeof window === 'undefined') return { ...DEFAULT_AMBIENT_LEVELS };
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || 'null');
    if (parsed && typeof parsed === 'object') {
      return CHANNELS.reduce((levels, channel) => {
        const value = Number(parsed[channel]);
        levels[channel] = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : DEFAULT_AMBIENT_LEVELS[channel];
        return levels;
      }, {} as AmbientLevels);
    }
  } catch { /* use defaults */ }
  return { ...DEFAULT_AMBIENT_LEVELS };
}

function saveLevels(levels: AmbientLevels): boolean {
  try { window.localStorage.setItem(STORAGE_KEY, JSON.stringify(levels)); return true; } catch { return false; }
}

function storageAvailable(): boolean {
  try { window.localStorage.getItem(STORAGE_KEY); return true; } catch { return false; }
}

export interface AmbientMixerProps { active: boolean }

export default function AmbientMixer({ active }: AmbientMixerProps) {
  const [levels, setLevels] = useState<AmbientLevels>(loadLevels);
  const [playing, setPlaying] = useState(false);
  const [starting, setStarting] = useState(false);
  const [volume, setVolume] = useState(readAccessoryVolume);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [storageError, setStorageError] = useState(() => typeof window !== 'undefined' && !storageAvailable());
  const engineRef = useRef<ReturnType<typeof createAmbientMixer> | null>(null);
  const levelsRef = useRef(levels);
  const mountedRef = useRef(false);
  const startRequestRef = useRef(0);
  levelsRef.current = levels;

  const engine = useMemo(() => createAmbientMixer(levels), []);

  useEffect(() => {
    // React StrictMode re-runs effects on the same mounted instance. Reset
    // this guard when the live effect is installed, not only on first render.
    mountedRef.current = true;
    engineRef.current = engine;
    const unsubscribe = engine.subscribeVolume(next => {
      if (mountedRef.current) {
        setVolume(next);
        setNotice(next <= 0.001 ? 'Sound is muted in the system tray.' : null);
      }
    });
    return () => {
      mountedRef.current = false;
      ++startRequestRef.current;
      unsubscribe();
      engine.dispose();
      engineRef.current = null;
    };
  }, [engine]);

  const setLevel = useCallback((channel: AmbientChannel, value: number) => {
    const next = { ...levelsRef.current, [channel]: Math.max(0, Math.min(1, value)) };
    levelsRef.current = next;
    setLevels(next);
    setStorageError(!saveLevels(next));
    engineRef.current?.setLevel(channel, next[channel]);
  }, []);

  const start = useCallback(() => {
    setError(null);
    if (!engine.supported) {
      setError('Web Audio is unavailable in this browser.');
      return;
    }
    const request = ++startRequestRef.current;
    setStarting(true);
    void engine.start().then(() => {
      if (mountedRef.current && request === startRequestRef.current) {
        setStarting(false);
        setPlaying(true);
      }
    }).catch(() => {
      if (mountedRef.current && request === startRequestRef.current) {
        setStarting(false);
        setPlaying(false);
        setError('The sound mixer could not start. Check your browser audio settings.');
      }
    });
  }, [engine]);

  const stop = useCallback(() => {
    ++startRequestRef.current;
    engine.stop();
    setStarting(false);
    setPlaying(false);
  }, [engine]);

  const reset = useCallback(() => {
    const next = { ...DEFAULT_AMBIENT_LEVELS };
    levelsRef.current = next;
    setLevels(next);
    setStorageError(!saveLevels(next));
    for (const channel of CHANNELS) engine.setLevel(channel, next[channel]);
  }, [engine]);

  return <section className="accessory-app ambient-mixer-app" aria-label="Ambient mixer">
    <div className="ambient-mixer-heading">
      <span className="ambient-mixer-volume" aria-label={`System volume ${Math.round(volume * 100)} percent`}>SYS {Math.round(volume * 100)}%</span>
    </div>
    <div className="ambient-mixer-controls" aria-label="Ambient sound levels">
      {CHANNELS.map(channel => <label className="ambient-channel" key={channel}>
        <span className="ambient-channel-label"><span>{CHANNEL_LABELS[channel]}</span><output>{Math.round(levels[channel] * 100)}%</output></span>
        <input type="range" min="0" max="1" step="0.01" value={levels[channel]} aria-label={`${CHANNEL_LABELS[channel]} level`} onChange={event => setLevel(channel, Number(event.currentTarget.value))} />
      </label>)}
    </div>
    <div className="ambient-mixer-actions">
      {!playing ? <button type="button" className="accessory-button" onClick={starting ? stop : start} disabled={!active && !starting}>{starting ? 'Cancel' : 'Play'}</button> : <button type="button" className="accessory-button" onClick={stop}>Stop</button>}
      <button type="button" className="accessory-button" onClick={reset}>Reset levels</button>
    </div>
    <p className="accessory-status ambient-mixer-status" role="status">{error || (storageError ? 'Levels could not be saved in this browser.' : notice || (playing ? 'Playing' : starting ? 'Starting' : 'Stopped'))}</p>
  </section>;
}
