import { DIRECTIONS, type Direction } from '../engine/types';

export type SoundMode = 'voice' | 'beep' | 'off';
export type VoiceLang = 'en' | 'es';

const SPOKEN: Record<VoiceLang, Record<Direction, string>> = {
  en: {
    up: 'up',
    'up-right': 'up right',
    right: 'right',
    'down-right': 'down right',
    down: 'down',
    'down-left': 'down left',
    left: 'left',
    'up-left': 'up left',
  },
  es: {
    up: 'arriba',
    'up-right': 'arriba derecha',
    right: 'derecha',
    'down-right': 'abajo derecha',
    down: 'abajo',
    'down-left': 'abajo izquierda',
    left: 'izquierda',
    'up-left': 'arriba izquierda',
  },
};

const NUMBERS: Record<VoiceLang, string[]> = {
  en: ['zero', 'one', 'two', 'three', 'four', 'five', 'six'],
  es: ['cero', 'uno', 'dos', 'tres', 'cuatro', 'cinco', 'seis'],
};

/**
 * Low-latency cue audio. Recorded direction clips are decoded once into
 * AudioBuffers (no per-cue <audio> element), beeps are synthesised, and
 * anything without a clip falls back to the browser's speech voice.
 */
class SoundEngine {
  private ctx: AudioContext | null = null;
  private clips = new Map<Direction, AudioBuffer>();
  private loading: Promise<void> | null = null;

  /** Must be called from a user gesture (the Start button) to unlock audio on iOS. */
  async unlock(): Promise<void> {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
    }
    if (this.ctx.state === 'suspended') await this.ctx.resume().catch(() => undefined);
    // Prime speech synthesis inside the gesture as well.
    if ('speechSynthesis' in window) {
      const u = new SpeechSynthesisUtterance(' ');
      u.volume = 0;
      speechSynthesis.speak(u);
    }
    this.loading ??= this.loadClips();
    await this.loading;
  }

  private async loadClips(): Promise<void> {
    const ctx = this.ctx;
    if (!ctx) return;
    await Promise.all(
      DIRECTIONS.map(async (dir) => {
        try {
          const res = await fetch(`${import.meta.env.BASE_URL}audio/${dir}.m4a`);
          const data = await res.arrayBuffer();
          this.clips.set(dir, await ctx.decodeAudioData(data));
        } catch {
          // Missing or undecodable clip: speech fallback covers it.
        }
      }),
    );
  }

  beep(freq = 880, ms = 90, type: OscillatorType = 'square', gain = 0.18): void {
    const ctx = this.ctx;
    if (!ctx) return;
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    const amp = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    amp.gain.setValueAtTime(0, t);
    amp.gain.linearRampToValueAtTime(gain, t + 0.005);
    amp.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
    osc.connect(amp).connect(ctx.destination);
    osc.start(t);
    osc.stop(t + ms / 1000 + 0.02);
  }

  speak(text: string, lang: VoiceLang, rate = 1.15): void {
    if (!('speechSynthesis' in window)) return;
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = lang === 'es' ? 'es-ES' : 'en-US';
    u.rate = rate;
    speechSynthesis.speak(u);
  }

  /** Recorded clip for English, speech for Spanish (or if the clip is missing). */
  direction(dir: Direction, lang: VoiceLang, rate: number): void {
    const clip = lang === 'en' ? this.clips.get(dir) : undefined;
    if (clip && this.ctx) {
      const src = this.ctx.createBufferSource();
      src.buffer = clip;
      src.playbackRate.value = rate;
      src.connect(this.ctx.destination);
      src.start();
      return;
    }
    this.speak(SPOKEN[lang][dir], lang, 1 + (rate - 1) * 0.8);
  }

  number(n: number, lang: VoiceLang): void {
    this.speak(NUMBERS[lang][n] ?? String(n), lang, 1.1);
  }

  word(key: 'go' | 'hold' | 'rest' | 'done', lang: VoiceLang): void {
    const words = {
      en: { go: 'go', hold: 'hold', rest: 'rest', done: 'nice work' },
      es: { go: 'ya', hold: 'quieto', rest: 'descanso', done: 'buen trabajo' },
    };
    this.speak(words[lang][key], lang, 1.1);
  }
}

export const sound = new SoundEngine();
