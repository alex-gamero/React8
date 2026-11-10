import { describe, expect, it } from 'vitest';
import { COUNTDOWN_MS, FIRST_CUE_MS, MEMORY_SHOW_MS, estimateSeconds, planSession } from './plan';
import { seeded } from './random';
import { DrillRunner } from './runner';
import type { DrillConfig, DrillEvent, Phase } from './types';

const base: DrillConfig = {
  mode: 'classic',
  minInterval: 1,
  maxInterval: 2,
  sets: 3,
  workSeconds: 20,
  restSeconds: 10,
  directionSet: 'all',
  noGoRatio: 0.3,
  chainLength: 4,
  backRowOnly: false,
};

const work = (phases: Phase[]) => phases.filter((p) => p.type === 'work');
const cues = (p: Phase) => p.events.filter((e): e is Extract<DrillEvent, { type: 'cue' }> => e.type === 'cue');

describe('planSession', () => {
  it('builds countdown, work and rest phases with no rest after the last set', () => {
    const plan = planSession(base, seeded(1));
    expect(plan.phases.map((p) => p.type)).toEqual(['countdown', 'work', 'rest', 'work', 'rest', 'work']);
    expect(plan.phases[0].duration).toBe(COUNTDOWN_MS);
    expect(plan.phases[0].events.map((e) => (e.type === 'count' ? e.value : null))).toEqual([3, 2, 1]);
  });

  it('keeps cue gaps inside the configured range and never repeats a cue back to back', () => {
    for (let seed = 0; seed < 25; seed++) {
      for (const set of work(planSession(base, seeded(seed)).phases)) {
        const list = cues(set);
        expect(list[0].at).toBe(FIRST_CUE_MS);
        for (let i = 1; i < list.length; i++) {
          const gap = list[i].at - list[i - 1].at;
          expect(gap).toBeGreaterThanOrEqual(1000);
          expect(gap).toBeLessThanOrEqual(2000);
          expect(list[i].cue).not.toEqual(list[i - 1].cue);
        }
        expect(list.at(-1)!.at).toBeLessThan(set.duration);
      }
    }
  });

  it('only uses the chosen direction set', () => {
    const plan = planSession({ ...base, directionSet: 'diagonal' }, seeded(3));
    const used = new Set(work(plan.phases).flatMap((p) => cues(p).map((c) => (c.cue.kind === 'direction' ? c.cue.direction : ''))));
    expect([...used].sort()).toEqual(['down-left', 'down-right', 'up-left', 'up-right']);
  });

  it('go/no-go: opens every set on a go, holds roughly at the ratio, max two in a row', () => {
    let holds = 0;
    let total = 0;
    for (let seed = 0; seed < 40; seed++) {
      const plan = planSession({ ...base, mode: 'gonogo', workSeconds: 60 }, seeded(seed));
      for (const set of work(plan.phases)) {
        const list = cues(set);
        expect(list[0].cue).toMatchObject({ go: true });
        let run = 0;
        for (const { cue } of list) {
          const hold = cue.kind === 'direction' && !cue.go;
          run = hold ? run + 1 : 0;
          expect(run).toBeLessThanOrEqual(2);
          if (hold) holds++;
          total++;
        }
      }
    }
    expect(holds / total).toBeGreaterThan(0.2);
    expect(holds / total).toBeLessThan(0.35);
  });

  it('volleyball: calls zones, back row only when asked', () => {
    const plan = planSession({ ...base, mode: 'volleyball', backRowOnly: true }, seeded(5));
    const zones = new Set(work(plan.phases).flatMap((p) => cues(p).map((c) => (c.cue.kind === 'zone' ? c.cue.zone : 0))));
    expect([...zones].sort()).toEqual([1, 5, 6]);
  });

  it('memory: shows full chains then a go window sized to the chain', () => {
    const plan = planSession({ ...base, mode: 'memory', workSeconds: 40, chainLength: 3 }, seeded(7));
    const set = work(plan.phases)[0];
    const types = set.events.map((e) => e.type);
    expect(types.slice(0, 4)).toEqual(['memory-show', 'memory-show', 'memory-show', 'memory-go']);
    const go = set.events.find((e) => e.type === 'memory-go')!;
    expect(go.at).toBe(FIRST_CUE_MS + 3 * MEMORY_SHOW_MS);
    expect(go.type === 'memory-go' && go.window).toBe(4500);
    // Chains never get cut in half: every go window ends inside the set.
    for (const e of set.events) {
      if (e.type === 'memory-go') expect(e.at + e.window).toBeLessThanOrEqual(set.duration);
    }
  });

  it('memory: a set shorter than one chain still runs one full chain', () => {
    const plan = planSession({ ...base, mode: 'memory', workSeconds: 5, chainLength: 5, sets: 1 }, seeded(2));
    const set = work(plan.phases)[0];
    expect(set.events.filter((e) => e.type === 'memory-show')).toHaveLength(5);
    expect(set.duration).toBeGreaterThan(5000);
  });

  it('clamps nonsense input', () => {
    const plan = planSession({ ...base, minInterval: 3, maxInterval: 1, sets: 0, workSeconds: 1 }, seeded(1));
    expect(plan.config.maxInterval).toBe(3);
    expect(plan.totalSets).toBe(1);
    expect(plan.config.workSeconds).toBe(5);
  });

  it('estimates session length', () => {
    expect(estimateSeconds(base)).toBe(3 + 3 * 20 + 2 * 10);
  });
});

describe('DrillRunner', () => {
  it('fires every event in order and summarises the session', () => {
    const plan = planSession(base, seeded(11));
    const fired: DrillEvent[] = [];
    const phases: string[] = [];
    let done = false;
    const runner = new DrillRunner(plan, {
      onEvent: (e) => fired.push(e),
      onPhase: (p) => phases.push(p.type),
      onDone: () => (done = true),
    }, () => 0);
    runner.start(0);
    for (let t = 0; t <= 100_000; t += 16) runner.tick(t);

    const expected = plan.phases.reduce((n, p) => n + p.events.length, 0);
    expect(fired).toHaveLength(expected);
    expect(phases).toEqual(plan.phases.map((p) => p.type));
    expect(done).toBe(true);

    const s = runner.stop(200_000);
    expect(s.setsCompleted).toBe(3);
    expect(s.endedEarly).toBe(false);
    expect(s.activeMs).toBe(60_000);
    expect(s.totalMs).toBe(estimateSeconds(base) * 1000);
    expect(s.cues).toBe(work(plan.phases).reduce((n, p) => n + cues(p).length, 0));
    expect(Object.values(s.byCue).reduce((a, b) => a + b, 0)).toBe(s.cues);
  });

  it('pausing freezes the clock', () => {
    const plan = planSession({ ...base, sets: 1 }, seeded(4));
    const runner = new DrillRunner(plan);
    runner.start(0);
    runner.tick(1000);
    runner.pause(1000);
    expect(runner.tick(50_000).elapsed).toBe(1000);
    runner.resume(50_000);
    expect(runner.tick(51_000).elapsed).toBe(2000);
  });

  it('skips stale events after a long stall instead of firing a burst', () => {
    const plan = planSession({ ...base, sets: 1 }, seeded(4));
    let fired = 0;
    const runner = new DrillRunner(plan, { onEvent: () => fired++ });
    runner.start(0);
    runner.tick(COUNTDOWN_MS + 15_000);
    expect(fired).toBeLessThanOrEqual(1);
  });

  it('stopping early counts partial work and flags the session', () => {
    const plan = planSession(base, seeded(9));
    const runner = new DrillRunner(plan);
    runner.start(0);
    runner.tick(COUNTDOWN_MS + 5000);
    const s = runner.stop(COUNTDOWN_MS + 5000);
    expect(s.endedEarly).toBe(true);
    expect(s.setsCompleted).toBe(0);
    expect(s.activeMs).toBe(5000);
  });
});
