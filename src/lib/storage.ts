import type { DrillConfig, ModeId, SessionSummary } from '../engine/types';
import type { SoundMode, VoiceLang } from '../audio/sound';

export interface Preferences {
  sound: SoundMode;
  voiceLang: VoiceLang;
  flash: boolean;
}

export interface SessionRecord extends SessionSummary {
  id: string;
}

const KEYS = {
  prefs: 'react8.prefs',
  configs: 'react8.configs',
  history: 'react8.history',
};

const MAX_HISTORY = 500;

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? { ...fallback, ...JSON.parse(raw) } : fallback;
  } catch {
    return fallback;
  }
}

function readArray<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key);
    const value = raw ? JSON.parse(raw) : [];
    return Array.isArray(value) ? value : [];
  } catch {
    return [];
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked: the app keeps working, it just won't remember.
  }
}

export const defaultPrefs: Preferences = { sound: 'voice', voiceLang: 'en', flash: true };

export const loadPrefs = () => read<Preferences>(KEYS.prefs, defaultPrefs);
export const savePrefs = (p: Preferences) => write(KEYS.prefs, p);

export const loadConfigs = () => read<Partial<Record<ModeId, DrillConfig>>>(KEYS.configs, {});
export function saveConfig(config: DrillConfig): void {
  write(KEYS.configs, { ...loadConfigs(), [config.mode]: config });
}

export const loadHistory = () => readArray<SessionRecord>(KEYS.history);
export function addSession(summary: SessionSummary): SessionRecord {
  const record: SessionRecord = { ...summary, id: `${summary.startedAt}-${Math.random().toString(36).slice(2, 7)}` };
  write(KEYS.history, [record, ...loadHistory()].slice(0, MAX_HISTORY));
  return record;
}
export const clearHistory = () => write(KEYS.history, []);
