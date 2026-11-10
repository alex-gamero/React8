import { cueKey } from './plan';
import type { DrillEvent, Phase, SessionPlan, SessionSummary } from './types';

/** Events this late (e.g. after the tab was hidden) are skipped instead of fired in a burst. */
export const STALE_MS = 400;

export interface RunnerHandlers {
  onPhase?: (phase: Phase, index: number) => void;
  /** `late` is how many ms after its planned time the event fired. */
  onEvent?: (event: DrillEvent, phase: Phase, late: number) => void;
  onDone?: (summary: SessionSummary) => void;
}

export interface RunnerSnapshot {
  phaseIndex: number;
  phase: Phase;
  /** ms elapsed in the current phase. */
  elapsed: number;
  paused: boolean;
  done: boolean;
}

/**
 * Drives a SessionPlan against a clock. Framework-agnostic: call `tick(now)`
 * from requestAnimationFrame (or a fake clock in tests).
 */
export class DrillRunner {
  private phaseIndex = 0;
  private phaseStart = 0;
  private nextEvent = 0;
  private pausedAt: number | null = null;
  private startedAt = 0;
  private pausedTotal = 0;
  private finished = false;
  private started = false;
  private lastNow = 0;
  private summary: SessionSummary;

  constructor(
    private readonly plan: SessionPlan,
    private readonly handlers: RunnerHandlers = {},
    private readonly wallClock: () => number = Date.now,
  ) {
    this.summary = {
      mode: plan.config.mode,
      startedAt: 0,
      activeMs: 0,
      totalMs: 0,
      setsCompleted: 0,
      setsPlanned: plan.totalSets,
      cues: 0,
      holds: 0,
      byCue: {},
      endedEarly: false,
    };
  }

  get phase(): Phase {
    return this.plan.phases[this.phaseIndex];
  }

  start(now: number): void {
    if (this.started) return;
    this.started = true;
    this.startedAt = now;
    this.lastNow = now;
    this.summary.startedAt = this.wallClock();
    this.enterPhase(0, now);
  }

  pause(now: number): void {
    if (!this.started || this.finished || this.pausedAt !== null) return;
    this.tick(now);
    this.pausedAt = now;
  }

  resume(now: number): void {
    if (this.pausedAt === null) return;
    const gap = now - this.pausedAt;
    this.phaseStart += gap;
    this.pausedTotal += gap;
    this.pausedAt = null;
    this.lastNow = now;
  }

  /** End the session now. Partial work in the current set counts toward active time. */
  stop(now: number): SessionSummary {
    if (this.finished) return this.summary;
    const at = this.pausedAt ?? now;
    if (this.started && this.phase.type === 'work') {
      this.summary.activeMs += Math.min(at - this.phaseStart, this.phase.duration);
    }
    this.summary.endedEarly = true;
    return this.finish(at);
  }

  tick(now: number): RunnerSnapshot {
    if (this.started && !this.finished && this.pausedAt === null) {
      this.lastNow = now;
      // Loop so a long frame can cross phase boundaries correctly.
      while (!this.finished) {
        const phase = this.phase;
        const elapsed = now - this.phaseStart;
        while (this.nextEvent < phase.events.length && phase.events[this.nextEvent].at <= elapsed) {
          const event = phase.events[this.nextEvent++];
          const late = elapsed - event.at;
          this.record(event, phase);
          if (late <= STALE_MS) this.handlers.onEvent?.(event, phase, late);
        }
        if (elapsed < phase.duration) break;
        const end = this.phaseStart + phase.duration;
        if (phase.type === 'work') {
          this.summary.activeMs += phase.duration;
          this.summary.setsCompleted = phase.set;
        }
        if (this.phaseIndex + 1 >= this.plan.phases.length) {
          this.finish(end);
        } else {
          this.enterPhase(this.phaseIndex + 1, end);
        }
      }
    }
    return this.snapshot();
  }

  snapshot(): RunnerSnapshot {
    const ref = this.pausedAt ?? this.lastNow;
    return {
      phaseIndex: this.phaseIndex,
      phase: this.phase,
      elapsed: Math.max(0, Math.min(ref - this.phaseStart, this.phase.duration)),
      paused: this.pausedAt !== null,
      done: this.finished,
    };
  }

  private enterPhase(index: number, at: number): void {
    this.phaseIndex = index;
    this.phaseStart = at;
    this.nextEvent = 0;
    this.handlers.onPhase?.(this.phase, index);
  }

  private record(event: DrillEvent, phase: Phase): void {
    if (phase.type !== 'work') return;
    if (event.type === 'cue') {
      if (event.cue.kind === 'direction' && !event.cue.go) {
        this.summary.holds++;
        return;
      }
      this.summary.cues++;
      const key = cueKey(event.cue);
      this.summary.byCue[key] = (this.summary.byCue[key] ?? 0) + 1;
    } else if (event.type === 'memory-show') {
      this.summary.cues++;
      const key = cueKey(event.cue);
      this.summary.byCue[key] = (this.summary.byCue[key] ?? 0) + 1;
    }
  }

  private finish(at: number): SessionSummary {
    this.finished = true;
    this.summary.totalMs = Math.max(0, at - this.startedAt - this.pausedTotal);
    this.handlers.onDone?.(this.summary);
    return this.summary;
  }
}
