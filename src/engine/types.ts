export const DIRECTIONS = [
  'up',
  'up-right',
  'right',
  'down-right',
  'down',
  'down-left',
  'left',
  'up-left',
] as const;

export type Direction = (typeof DIRECTIONS)[number];

export type ModeId = 'classic' | 'gonogo' | 'memory' | 'volleyball';

export type DirectionSet = 'all' | 'cross' | 'diagonal';

export type Zone = 1 | 2 | 3 | 4 | 5 | 6;

export interface DrillConfig {
  mode: ModeId;
  /** Shortest gap between cues, in seconds. */
  minInterval: number;
  /** Longest gap between cues, in seconds. */
  maxInterval: number;
  sets: number;
  workSeconds: number;
  restSeconds: number;
  directionSet: DirectionSet;
  /** Share of go/no-go cues that mean "hold" (0–0.5). */
  noGoRatio: number;
  /** Moves per memory chain. */
  chainLength: number;
  /** Volleyball: only call zones 1, 5 and 6. */
  backRowOnly: boolean;
}

export type Cue =
  | { kind: 'direction'; direction: Direction; go: boolean }
  | { kind: 'zone'; zone: Zone };

export type DrillEvent =
  | { at: number; type: 'count'; value: number }
  | { at: number; type: 'cue'; cue: Cue }
  | { at: number; type: 'memory-show'; cue: Cue; index: number; length: number }
  | { at: number; type: 'memory-go'; length: number; window: number };

export type Phase =
  | { type: 'countdown'; duration: number; events: DrillEvent[] }
  | { type: 'work'; set: number; duration: number; events: DrillEvent[] }
  | { type: 'rest'; afterSet: number; duration: number; events: DrillEvent[] };

export interface SessionPlan {
  config: DrillConfig;
  phases: Phase[];
  totalSets: number;
}

export interface SessionSummary {
  mode: ModeId;
  startedAt: number;
  /** Time spent in work phases, in ms. */
  activeMs: number;
  /** Wall time from start to finish excluding pauses, in ms. */
  totalMs: number;
  setsCompleted: number;
  setsPlanned: number;
  cues: number;
  holds: number;
  /** Count per cue key (direction name, or "zone-N"). */
  byCue: Record<string, number>;
  endedEarly: boolean;
}
