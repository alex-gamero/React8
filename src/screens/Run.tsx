import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Arrow } from '../components/Arrow';
import { CourtZones } from '../components/CourtZones';
import { sound } from '../audio/sound';
import { planSession } from '../engine/plan';
import { DrillRunner, type RunnerSnapshot } from '../engine/runner';
import type { Cue, DrillConfig, DrillEvent, Phase, SessionSummary } from '../engine/types';
import type { Preferences } from '../lib/storage';
import { useWakeLock } from '../lib/wakeLock';

interface Props {
  config: DrillConfig;
  prefs: Preferences;
  onFinish: (summary: SessionSummary) => void;
}

type Stage =
  | { kind: 'idle' }
  | { kind: 'cue'; cue: Cue; id: number }
  | { kind: 'memory-show'; cue: Cue; index: number; length: number; id: number }
  | { kind: 'memory-go'; length: number; window: number; startedAt: number; id: number };

/** How long a cue stays on screen before the stage goes back to the centre mark. */
const CUE_VISIBLE_MS = 950;
const MEMORY_VISIBLE_MS = 700;

const clock = () => performance.now();

function mmss(ms: number): string {
  const s = Math.max(0, Math.ceil(ms / 1000));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

function cueLabel(cue: Cue): string {
  if (cue.kind === 'zone') return `Zone ${cue.zone}`;
  const name = cue.direction.replace('-', ' ');
  return cue.go ? name : `Hold (${name})`;
}

export function Run({ config, prefs, onFinish }: Props) {
  const plan = useMemo(() => planSession(config), [config]);
  const [snap, setSnap] = useState<RunnerSnapshot | null>(null);
  const [stage, setStage] = useState<Stage>({ kind: 'idle' });
  const [now, setNow] = useState(clock());
  const runnerRef = useRef<DrillRunner | null>(null);
  const hideTimer = useRef<number>(0);
  const idRef = useRef(0);
  const prefsRef = useRef(prefs);
  prefsRef.current = prefs;
  const finishRef = useRef(onFinish);
  finishRef.current = onFinish;

  useWakeLock(!snap?.done);

  const voiceRate = Math.min(1.5, Math.max(1, 1.4 / config.minInterval));

  const play = useCallback(
    (event: DrillEvent) => {
      const { sound: mode, voiceLang } = prefsRef.current;
      if (mode === 'off') return;
      const voice = mode === 'voice';
      switch (event.type) {
        case 'count':
          sound.beep(660, 90, 'square', 0.14);
          break;
        case 'cue': {
          const { cue } = event;
          if (cue.kind === 'zone') {
            if (voice) sound.number(cue.zone, voiceLang);
            else sound.beep(1046, 130);
          } else if (!cue.go) {
            sound.beep(180, 260, 'sawtooth', 0.2);
          } else if (voice) {
            sound.direction(cue.direction, voiceLang, voiceRate);
          } else {
            sound.beep(1046, 130);
          }
          break;
        }
        case 'memory-show':
          if (voice && event.cue.kind === 'direction') sound.direction(event.cue.direction, voiceLang, 1.2);
          else sound.beep(784, 90);
          break;
        case 'memory-go':
          sound.beep(1318, 140);
          window.setTimeout(() => sound.beep(1318, 220), 170);
          break;
      }
    },
    [voiceRate],
  );

  const showFor = (next: Stage, ms: number) => {
    window.clearTimeout(hideTimer.current);
    setStage(next);
    if (ms > 0) hideTimer.current = window.setTimeout(() => setStage({ kind: 'idle' }), ms);
  };

  // Build the runner once and drive it from requestAnimationFrame.
  useEffect(() => {
    const runner = new DrillRunner(plan, {
      onEvent: (event) => {
        play(event);
        const id = ++idRef.current;
        if (event.type === 'cue') showFor({ kind: 'cue', cue: event.cue, id }, CUE_VISIBLE_MS);
        else if (event.type === 'memory-show')
          showFor({ kind: 'memory-show', cue: event.cue, index: event.index, length: event.length, id }, MEMORY_VISIBLE_MS);
        else if (event.type === 'memory-go')
          showFor({ kind: 'memory-go', length: event.length, window: event.window, startedAt: clock(), id }, event.window);
      },
      onPhase: (phase: Phase) => {
        window.clearTimeout(hideTimer.current);
        setStage({ kind: 'idle' });
        const { sound: mode, voiceLang } = prefsRef.current;
        if (mode === 'off') return;
        if (phase.type === 'work') sound.beep(1318, 260, 'square', 0.18);
        else if (phase.type === 'rest') {
          if (mode === 'voice') sound.word('rest', voiceLang);
          else sound.beep(440, 320, 'triangle', 0.25);
        }
      },
      onDone: (summary) => {
        const { sound: mode, voiceLang } = prefsRef.current;
        if (mode === 'voice' && !summary.endedEarly) sound.word('done', voiceLang);
        else if (mode !== 'off') {
          sound.beep(1046, 120);
          window.setTimeout(() => sound.beep(1318, 260), 150);
        }
        window.setTimeout(() => finishRef.current(summary), summary.endedEarly ? 0 : 700);
      },
    });
    runnerRef.current = runner;
    runner.start(clock());

    let raf = 0;
    let lastPaint = 0;
    const loop = (t: number) => {
      const s = runner.tick(t);
      // Repaint timers at ~20 fps; cues fire from tick() regardless.
      if (t - lastPaint > 50 || s.done) {
        lastPaint = t;
        setSnap(s);
        setNow(t);
      }
      if (!s.done) raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(hideTimer.current);
      if ('speechSynthesis' in window) speechSynthesis.cancel();
    };
  }, [plan, play]);

  const togglePause = useCallback(() => {
    const r = runnerRef.current;
    if (!r) return;
    const s = r.snapshot();
    if (s.done) return;
    if (s.paused) r.resume(clock());
    else {
      r.pause(clock());
      window.clearTimeout(hideTimer.current);
      setStage({ kind: 'idle' });
      if ('speechSynthesis' in window) speechSynthesis.cancel();
    }
    setSnap(r.snapshot());
  }, []);

  const end = useCallback(() => runnerRef.current?.stop(clock()), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        togglePause();
      } else if (e.key === 'Escape') end();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [togglePause, end]);

  // Pause automatically if the athlete switches away from the app.
  useEffect(() => {
    const onHide = () => {
      const r = runnerRef.current;
      if (document.visibilityState === 'hidden' && r && !r.snapshot().paused) togglePause();
    };
    document.addEventListener('visibilitychange', onHide);
    return () => document.removeEventListener('visibilitychange', onHide);
  }, [togglePause]);

  const phase = snap?.phase ?? plan.phases[0];
  const elapsed = snap?.elapsed ?? 0;
  const remaining = phase.duration - elapsed;
  const paused = snap?.paused ?? false;

  // Whole-session progress for the painted line at the bottom.
  const totalMs = plan.phases.reduce((n, p) => n + p.duration, 0);
  const doneMs = plan.phases.slice(0, snap?.phaseIndex ?? 0).reduce((n, p) => n + p.duration, 0) + elapsed;
  const progress = Math.min(1, doneMs / totalMs);

  const setLabel =
    phase.type === 'work'
      ? `Set ${phase.set} of ${plan.totalSets}`
      : phase.type === 'rest'
        ? `Rest after set ${phase.afterSet}`
        : 'Get set';

  const flashKey = stage.kind === 'cue' || stage.kind === 'memory-show' || stage.kind === 'memory-go' ? stage.id : 0;
  const flashTone = stage.kind === 'cue' && stage.cue.kind === 'direction' && !stage.cue.go ? 'hold' : 'tape';

  return (
    <div className={`run mode-${config.mode} phase-${phase.type}${paused ? ' is-paused' : ''}`}>
      {prefs.flash && flashKey > 0 && <div key={flashKey} className={`flash flash-${flashTone}`} aria-hidden="true" />}
      <div className="run-court" aria-hidden="true" />

      <header className="run-top">
        <span className="run-set">{setLabel}</span>
        <span className="run-clock" aria-label="Time left in this part">{mmss(remaining)}</span>
      </header>

      <main className="run-stage" aria-live="assertive">
        {phase.type === 'countdown' && (
          <div className="countdown">
            <span key={Math.ceil(remaining / 1000)} className="countdown-num">
              {Math.max(1, Math.ceil(remaining / 1000))}
            </span>
            <span className="countdown-label">Find your ready stance</span>
          </div>
        )}

        {phase.type === 'rest' && (
          <div className="rest">
            <span className="rest-word">Rest</span>
            <span className="rest-num">{Math.ceil(remaining / 1000)}</span>
            <span className="rest-next">
              Next up: set {phase.afterSet + 1} of {plan.totalSets}
            </span>
          </div>
        )}

        {phase.type === 'work' && stage.kind === 'idle' && <span className="ready-mark" aria-hidden="true" />}

        {phase.type === 'work' && stage.kind === 'cue' && stage.cue.kind === 'direction' && (
          <div key={stage.id} className={stage.cue.go ? 'cue' : 'cue is-hold'}>
            <Arrow direction={stage.cue.direction} tone={stage.cue.go ? 'tape' : 'hold'} className="cue-arrow" title={cueLabel(stage.cue)} />
            {!stage.cue.go && <span className="cue-hold">Hold</span>}
          </div>
        )}

        {phase.type === 'work' && stage.kind === 'cue' && stage.cue.kind === 'zone' && (
          <div key={stage.id} className="cue cue-zone">
            <CourtZones active={stage.cue.zone} dimFront={config.backRowOnly} className="cue-court" />
          </div>
        )}

        {phase.type === 'work' && stage.kind === 'memory-show' && stage.cue.kind === 'direction' && (
          <div key={stage.id} className="cue">
            <Arrow direction={stage.cue.direction} tone="line" className="cue-arrow" title={cueLabel(stage.cue)} />
            <span className="chain-dots" aria-label={`Move ${stage.index + 1} of ${stage.length}`}>
              {Array.from({ length: stage.length }, (_, i) => (
                <span key={i} className={i <= stage.index ? 'dot is-on' : 'dot'} />
              ))}
            </span>
          </div>
        )}

        {phase.type === 'work' && stage.kind === 'memory-go' && (
          <div className="memory-go">
            <span className="memory-go-word">Go</span>
            <span className="memory-go-count">Run all {stage.length} moves</span>
            <span className="memory-go-bar">
              <span style={{ transform: `scaleX(${Math.max(0, 1 - (now - stage.startedAt) / stage.window)})` }} />
            </span>
          </div>
        )}

        {paused && (
          <div className="paused">
            <span className="paused-word">Paused</span>
            <button type="button" className="start-btn" onClick={togglePause}>
              Resume
            </button>
          </div>
        )}
      </main>

      <footer className="run-bottom">
        <div className="run-progress" aria-hidden="true">
          <span style={{ transform: `scaleX(${progress})` }} />
        </div>
        <div className="run-controls">
          <button type="button" className="ghost-btn" onClick={togglePause} disabled={snap?.done}>
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button type="button" className="ghost-btn" onClick={end} disabled={snap?.done}>
            End session
          </button>
        </div>
      </footer>
    </div>
  );
}
