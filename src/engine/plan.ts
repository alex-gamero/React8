import { between, defaultRng, pick, type Rng } from './random';
import {
  DIRECTIONS,
  type Cue,
  type Direction,
  type DirectionSet,
  type DrillConfig,
  type DrillEvent,
  type Phase,
  type SessionPlan,
  type Zone,
} from './types';

export const COUNTDOWN_MS = 3000;
/** Delay between "go" and the first cue of a set. */
export const FIRST_CUE_MS = 600;
/** Memory chains are shown at a fixed, readable pace. */
export const MEMORY_SHOW_MS = 900;
/** Breather after a memory chain's execution window. */
export const MEMORY_GAP_MS = 1200;

const CROSS: Direction[] = ['up', 'right', 'down', 'left'];
const DIAGONAL: Direction[] = ['up-right', 'down-right', 'down-left', 'up-left'];

export function directionsFor(set: DirectionSet): readonly Direction[] {
  if (set === 'cross') return CROSS;
  if (set === 'diagonal') return DIAGONAL;
  return DIRECTIONS;
}

export function zonesFor(backRowOnly: boolean): readonly Zone[] {
  return backRowOnly ? [1, 6, 5] : [1, 2, 3, 4, 5, 6];
}

export function cueKey(cue: Cue): string {
  return cue.kind === 'zone' ? `zone-${cue.zone}` : cue.direction;
}

function sameCue(a: Cue | undefined, b: Cue): boolean {
  return a !== undefined && cueKey(a) === cueKey(b);
}

/** Clamp a config into the ranges the engine supports. */
export function normalize(config: DrillConfig): DrillConfig {
  const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
  const minInterval = clamp(config.minInterval, 0.5, 10);
  const maxInterval = clamp(Math.max(config.maxInterval, minInterval), minInterval, 10);
  return {
    ...config,
    minInterval,
    maxInterval,
    sets: Math.round(clamp(config.sets, 1, 20)),
    workSeconds: Math.round(clamp(config.workSeconds, 5, 600)),
    restSeconds: Math.round(clamp(config.restSeconds, 0, 300)),
    noGoRatio: clamp(config.noGoRatio, 0, 0.5),
    chainLength: Math.round(clamp(config.chainLength, 2, 8)),
  };
}

function nextGap(config: DrillConfig, rng: Rng): number {
  return Math.round(between(rng, config.minInterval, config.maxInterval) * 1000);
}

function planCues(config: DrillConfig, workMs: number, rng: Rng): DrillEvent[] {
  const events: DrillEvent[] = [];
  const dirs = directionsFor(config.directionSet);
  const zones = zonesFor(config.backRowOnly);
  let last: Cue | undefined;
  let holdsInRow = 0;

  for (let at = FIRST_CUE_MS; at < workMs; at += nextGap(config, rng)) {
    let cue: Cue;
    if (config.mode === 'volleyball') {
      const zone = pick(rng, zones, last?.kind === 'zone' ? last.zone : undefined);
      cue = { kind: 'zone', zone };
    } else {
      const direction = pick(rng, dirs, last?.kind === 'direction' ? last.direction : undefined);
      // Never open a set on a hold, and never more than two holds in a row.
      const canHold = config.mode === 'gonogo' && events.length > 0 && holdsInRow < 2;
      const go = !(canHold && rng() < config.noGoRatio);
      holdsInRow = go ? 0 : holdsInRow + 1;
      cue = { kind: 'direction', direction, go };
    }
    if (sameCue(last, cue) && config.mode !== 'gonogo') continue;
    events.push({ at, type: 'cue', cue });
    last = cue;
  }
  return events;
}

function planMemory(config: DrillConfig, workMs: number, rng: Rng): { events: DrillEvent[]; duration: number } {
  const events: DrillEvent[] = [];
  const dirs = directionsFor(config.directionSet);
  const length = config.chainLength;
  const perMove = ((config.minInterval + config.maxInterval) / 2) * 1000;
  const window = Math.round(perMove * length);
  const chainMs = length * MEMORY_SHOW_MS + window + MEMORY_GAP_MS;

  let at = FIRST_CUE_MS;
  // Always run at least one chain, then as many more as fit in the set.
  do {
    let last: Direction | undefined;
    for (let index = 0; index < length; index++) {
      const direction = pick(rng, dirs, last);
      last = direction;
      events.push({ at, type: 'memory-show', cue: { kind: 'direction', direction, go: true }, index, length });
      at += MEMORY_SHOW_MS;
    }
    events.push({ at, type: 'memory-go', length, window });
    at += window + MEMORY_GAP_MS;
  } while (at + chainMs - MEMORY_GAP_MS <= workMs);

  return { events, duration: Math.max(workMs, at - MEMORY_GAP_MS) };
}

function countEvents(duration: number, from: number): DrillEvent[] {
  const events: DrillEvent[] = [];
  for (let value = from; value >= 1; value--) {
    const at = duration - value * 1000;
    if (at >= 0) events.push({ at, type: 'count', value });
  }
  return events;
}

export function planSession(input: DrillConfig, rng: Rng = defaultRng): SessionPlan {
  const config = normalize(input);
  const phases: Phase[] = [{ type: 'countdown', duration: COUNTDOWN_MS, events: countEvents(COUNTDOWN_MS, 3) }];

  for (let set = 1; set <= config.sets; set++) {
    const workMs = config.workSeconds * 1000;
    if (config.mode === 'memory') {
      const { events, duration } = planMemory(config, workMs, rng);
      phases.push({ type: 'work', set, duration, events });
    } else {
      phases.push({ type: 'work', set, duration: workMs, events: planCues(config, workMs, rng) });
    }
    if (set < config.sets && config.restSeconds > 0) {
      const duration = config.restSeconds * 1000;
      phases.push({ type: 'rest', afterSet: set, duration, events: countEvents(duration, 3) });
    }
  }

  return { config, phases, totalSets: config.sets };
}

/** Rough session length in seconds, for the setup screen. */
export function estimateSeconds(config: DrillConfig): number {
  const c = normalize(config);
  return COUNTDOWN_MS / 1000 + c.sets * c.workSeconds + (c.sets - 1) * c.restSeconds;
}
