import { readAccessoryVolume, reportAccessoryAudio, subscribeAccessoryVolume } from './accessoryAudio';

export type AmbientChannel = 'rain' | 'ventilation' | 'office';
export type AmbientLevels = Record<AmbientChannel, number>;

const CHANNELS: AmbientChannel[] = ['rain', 'ventilation', 'office'];
const clamp = (value: number) => Math.max(0, Math.min(1, Number.isFinite(value) ? value : 0));

export const DEFAULT_AMBIENT_LEVELS: AmbientLevels = { rain: 0.32, ventilation: 0.2, office: 0.15 };

function makeNoiseBuffer(context: AudioContext, seconds = 2): AudioBuffer {
  const buffer = context.createBuffer(1, Math.max(1, Math.floor(context.sampleRate * seconds)), context.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    // A little correlation makes the noise less harsh than white noise.
    last = last * 0.985 + (Math.random() * 2 - 1) * 0.19;
    data[i] = last;
  }
  return buffer;
}

interface MixerNodes {
  source: AudioScheduledSourceNode;
  gain: GainNode;
  extra?: AudioNode;
}

export interface AmbientMixerEngine {
  readonly supported: boolean;
  readonly levels: AmbientLevels;
  start(): Promise<void>;
  stop(): void;
  setLevel(channel: AmbientChannel, value: number): void;
  dispose(): void;
  subscribeVolume(callback: (volume: number) => void): () => void;
}

export function createAmbientMixer(initial: AmbientLevels = DEFAULT_AMBIENT_LEVELS): AmbientMixerEngine {
  let context: AudioContext | null = null;
  let master: GainNode | null = null;
  let nodes: Partial<Record<AmbientChannel, MixerNodes>> = {};
  let disposed = false;
  let running = false;
  let startSerial = 0;
  const levels: AmbientLevels = {
    rain: clamp(initial.rain), ventilation: clamp(initial.ventilation), office: clamp(initial.office),
  };

  const supported = typeof window !== 'undefined' && !!((window as any).AudioContext || (window as any).webkitAudioContext);

  const makeContext = (): AudioContext | null => {
    if (context) return context;
    if (!supported) return null;
    try {
      const Constructor = (window as any).AudioContext || (window as any).webkitAudioContext;
      context = new Constructor() as AudioContext;
      master = context.createGain();
      master.gain.value = readAccessoryVolume() * 0.24;
      master.connect(context.destination);
      return context;
    } catch {
      context = null;
      master = null;
      return null;
    }
  };

  const levelGain = (channel: AmbientChannel) => Math.min(0.95, levels[channel] * (channel === 'office' ? 0.35 : 0.8));

  const setLevel = (channel: AmbientChannel, value: number) => {
    levels[channel] = clamp(value);
    const gain = nodes[channel]?.gain;
    if (gain && context) gain.gain.setTargetAtTime(levelGain(channel), context.currentTime, 0.025);
  };

  const start = async () => {
    if (disposed || running) return;
    const currentSerial = ++startSerial;
    const audioContext = makeContext();
    if (!audioContext || !master) throw new Error('Web Audio is unavailable in this browser.');
    let next: Partial<Record<AmbientChannel, MixerNodes>> = {};
    try {
      await audioContext.resume();
      if (disposed || currentSerial !== startSerial) return;
      if (audioContext.state !== 'running') throw new Error('The browser did not resume audio.');
      const noise = makeNoiseBuffer(audioContext);

      const rainSource = audioContext.createBufferSource();
      rainSource.buffer = noise; rainSource.loop = true;
      const rainFilter = audioContext.createBiquadFilter(); rainFilter.type = 'lowpass'; rainFilter.frequency.value = 4200; rainFilter.Q.value = 0.25;
      const rainGain = audioContext.createGain(); rainGain.gain.value = levelGain('rain');
      rainSource.connect(rainFilter); rainFilter.connect(rainGain); rainGain.connect(master);
      next.rain = { source: rainSource, gain: rainGain, extra: rainFilter };

      const ventSource = audioContext.createBufferSource();
      ventSource.buffer = noise; ventSource.loop = true;
      const ventFilter = audioContext.createBiquadFilter(); ventFilter.type = 'bandpass'; ventFilter.frequency.value = 145; ventFilter.Q.value = 0.65;
      const ventGain = audioContext.createGain(); ventGain.gain.value = levelGain('ventilation');
      ventSource.connect(ventFilter); ventFilter.connect(ventGain); ventGain.connect(master);
      next.ventilation = { source: ventSource, gain: ventGain, extra: ventFilter };

      const officeOsc = audioContext.createOscillator(); officeOsc.type = 'sine'; officeOsc.frequency.value = 58;
      const officeGain = audioContext.createGain(); officeGain.gain.value = levelGain('office');
      officeOsc.connect(officeGain); officeGain.connect(master);
      next.office = { source: officeOsc, gain: officeGain };

      nodes = next;
      for (const channel of CHANNELS) nodes[channel]?.source.start();
      running = true;
      reportAccessoryAudio('ambient', true);
    } catch (error) {
      for (const item of Object.values(next)) {
        try { item?.source.stop(); } catch { /* not started */ }
        try { item?.source.disconnect(); item?.extra?.disconnect(); item?.gain.disconnect(); } catch { /* cleanup */ }
      }
      nodes = {};
      throw error;
    }
  };

  const stop = () => {
    ++startSerial;
    if (!running && !nodes.rain && !nodes.ventilation && !nodes.office) return;
    running = false;
    for (const item of Object.values(nodes)) {
      try { item?.source.stop(); } catch { /* already stopped */ }
      try { item?.source.disconnect(); item?.extra?.disconnect(); item?.gain.disconnect(); } catch { /* cleanup */ }
    }
    nodes = {};
    reportAccessoryAudio('ambient', false);
  };

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    stop();
    try { master?.disconnect(); } catch { /* */ }
    void context?.close().catch(() => {});
    context = null; master = null;
  };

  const subscribeVolume = (callback: (volume: number) => void) => subscribeAccessoryVolume(volume => {
    callback(volume);
    if (master && context) master.gain.setTargetAtTime(volume * 0.24, context.currentTime, 0.025);
  });

  return { supported, levels, start, stop, setLevel, dispose, subscribeVolume };
}
