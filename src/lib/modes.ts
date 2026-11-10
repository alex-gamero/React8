import type { DrillConfig, ModeId } from '../engine/types';

export interface Preset {
  id: 'quick' | 'workout';
  label: string;
  values: Partial<DrillConfig>;
}

export interface ModeInfo {
  id: ModeId;
  name: string;
  tagline: string;
  howTo: string;
  defaults: DrillConfig;
  presets: Preset[];
}

const common: Omit<DrillConfig, 'mode'> = {
  minInterval: 1.5,
  maxInterval: 2.5,
  sets: 1,
  workSeconds: 60,
  restSeconds: 30,
  directionSet: 'all',
  noGoRatio: 0.3,
  chainLength: 4,
  backRowOnly: false,
};

export const MODES: ModeInfo[] = [
  {
    id: 'classic',
    name: 'Classic',
    tagline: 'Eight directions, random timing. First-step speed, pure.',
    howTo: 'Move the way the arrow points the moment it appears, then recover to the middle.',
    defaults: { ...common, mode: 'classic' },
    presets: [
      { id: 'quick', label: 'Quick 1 min', values: { sets: 1, workSeconds: 60, minInterval: 1.5, maxInterval: 2.5 } },
      { id: 'workout', label: 'Workout', values: { sets: 6, workSeconds: 20, restSeconds: 40, minInterval: 1.2, maxInterval: 2.2 } },
    ],
  },
  {
    id: 'gonogo',
    name: 'Go / No-Go',
    tagline: 'Yellow means go. Pink means hold your ground.',
    howTo: 'Move on yellow arrows. On a pink arrow, stay put: the win is not twitching.',
    defaults: { ...common, mode: 'gonogo', minInterval: 1.8, maxInterval: 2.8 },
    presets: [
      { id: 'quick', label: 'Quick 1 min', values: { sets: 1, workSeconds: 60, minInterval: 1.8, maxInterval: 2.8 } },
      { id: 'workout', label: 'Workout', values: { sets: 5, workSeconds: 30, restSeconds: 30, minInterval: 1.5, maxInterval: 2.5 } },
    ],
  },
  {
    id: 'memory',
    name: 'Memory chain',
    tagline: 'Watch a short sequence, then run it back from memory.',
    howTo: 'Stand still while the chain plays. On "Go", run every move in order.',
    defaults: { ...common, mode: 'memory', workSeconds: 90, minInterval: 1.2, maxInterval: 1.8, chainLength: 3 },
    presets: [
      { id: 'quick', label: 'Quick 90 s', values: { sets: 1, workSeconds: 90, chainLength: 3 } },
      { id: 'workout', label: 'Workout', values: { sets: 4, workSeconds: 60, restSeconds: 45, chainLength: 4 } },
    ],
  },
  {
    id: 'volleyball',
    name: 'Volleyball zones',
    tagline: 'Court zones 1 to 6 called at random. Back-row-only for liberos.',
    howTo: 'Start at the middle of your half. Move to the zone that lights up, play the ball, recover.',
    defaults: { ...common, mode: 'volleyball', minInterval: 2.2, maxInterval: 3.2 },
    presets: [
      { id: 'quick', label: 'Quick 1 min', values: { sets: 1, workSeconds: 60, minInterval: 2.2, maxInterval: 3.2 } },
      { id: 'workout', label: 'Workout', values: { sets: 6, workSeconds: 25, restSeconds: 35, minInterval: 2, maxInterval: 3 } },
    ],
  },
];

export const modeById = (id: ModeId) => MODES.find((m) => m.id === id)!;

export function matchPreset(mode: ModeInfo, config: DrillConfig): Preset['id'] | 'custom' {
  for (const preset of mode.presets) {
    const full = { ...config, ...preset.values };
    if ((Object.keys(full) as (keyof DrillConfig)[]).every((k) => full[k] === config[k])) return preset.id;
  }
  return 'custom';
}

export function formatDuration(seconds: number): string {
  const s = Math.round(seconds);
  if (s < 60) return `${s} s`;
  const m = Math.floor(s / 60);
  const rest = s % 60;
  return rest ? `${m} min ${rest} s` : `${m} min`;
}
