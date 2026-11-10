import { useMemo, useState } from 'react';
import type { SessionRecord } from '../lib/storage';
import { formatDuration, modeById } from '../lib/modes';

interface Props {
  history: SessionRecord[];
  onClear: () => void;
  onBack: () => void;
}

const DAY = 86_400_000;

function startOfDay(t: number): number {
  const d = new Date(t);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

function streak(history: SessionRecord[]): number {
  const days = new Set(history.map((s) => startOfDay(s.startedAt)));
  let day = startOfDay(Date.now());
  if (!days.has(day)) day -= DAY; // today not trained yet keeps yesterday's streak alive
  let n = 0;
  while (days.has(day)) {
    n++;
    day -= DAY;
  }
  return n;
}

const dateFmt = new Intl.DateTimeFormat(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
const timeFmt = new Intl.DateTimeFormat(undefined, { hour: 'numeric', minute: '2-digit' });
const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: 'narrow' });
const dayLongFmt = new Intl.DateTimeFormat(undefined, { weekday: 'long' });

export function History({ history, onClear, onBack }: Props) {
  const [confirm, setConfirm] = useState(false);
  const [hover, setHover] = useState<number | null>(null);

  const week = useMemo(() => {
    const today = startOfDay(Date.now());
    return Array.from({ length: 7 }, (_, i) => {
      const day = today - (6 - i) * DAY;
      const minutes = history.filter((s) => startOfDay(s.startedAt) === day).reduce((n, s) => n + s.activeMs, 0) / 60_000;
      return { day, minutes };
    });
  }, [history]);

  const totals = useMemo(
    () => ({
      sessions: history.length,
      minutes: history.reduce((n, s) => n + s.activeMs, 0) / 60_000,
      cues: history.reduce((n, s) => n + s.cues, 0),
      streak: streak(history),
    }),
    [history],
  );

  const weekMax = Math.max(5, ...week.map((d) => d.minutes));
  const H = 120;
  const BAR = 26;
  const GAP = 18;
  const W = 7 * BAR + 6 * GAP;

  return (
    <div className="screen history">
      <header className="topbar">
        <button type="button" className="back-btn" onClick={onBack}>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M13 4 L7 10 L13 16" />
          </svg>
          Drills
        </button>
      </header>

      <h1 className="setup-title">History</h1>

      {history.length === 0 ? (
        <div className="empty">
          <p>No sessions yet. Finish a drill and it shows up here, with your weekly minutes and streak.</p>
          <button type="button" className="start-btn" onClick={onBack}>
            Pick a drill
          </button>
        </div>
      ) : (
        <>
          <dl className="stat-row">
            <div className="stat">
              <dt>Day streak</dt>
              <dd>{totals.streak}</dd>
            </div>
            <div className="stat">
              <dt>Sessions</dt>
              <dd>{totals.sessions}</dd>
            </div>
            <div className="stat">
              <dt>Minutes</dt>
              <dd>{Math.round(totals.minutes)}</dd>
            </div>
            <div className="stat">
              <dt>Cues</dt>
              <dd>{totals.cues}</dd>
            </div>
          </dl>

          <section className="week" aria-labelledby="week-heading">
            <h2 id="week-heading" className="group-title">Work minutes, last 7 days</h2>
            <div className="week-chart">
              <svg viewBox={`0 0 ${W} ${H + 26}`} role="img" aria-labelledby="week-heading">
                <path d={`M0 ${H} H${W}`} stroke="var(--line)" strokeWidth="2" />
                {week.map((d, i) => {
                  const h = d.minutes > 0 ? Math.max(4, (d.minutes / weekMax) * (H - 8)) : 0;
                  const x = i * (BAR + GAP);
                  const today = i === 6;
                  return (
                    <g key={d.day}>
                      {/* Oversized hit target for hover and focus */}
                      <rect
                        x={x - GAP / 2}
                        y={0}
                        width={BAR + GAP}
                        height={H + 26}
                        fill="transparent"
                        tabIndex={0}
                        aria-label={`${dayLongFmt.format(d.day)}: ${d.minutes.toFixed(1)} minutes`}
                        onMouseEnter={() => setHover(i)}
                        onMouseLeave={() => setHover(null)}
                        onFocus={() => setHover(i)}
                        onBlur={() => setHover(null)}
                      />
                      {h > 0 && (
                        <path
                          d={`M${x} ${H} V${H - h + 4} q0 -4 4 -4 H${x + BAR - 4} q4 0 4 4 V${H} Z`}
                          fill="var(--tape)"
                          opacity={hover === null || hover === i ? 1 : 0.45}
                          pointerEvents="none"
                        />
                      )}
                      <text x={x + BAR / 2} y={H + 19} textAnchor="middle" className={today ? 'week-day is-today' : 'week-day'}>
                        {dayFmt.format(d.day)}
                      </text>
                    </g>
                  );
                })}
              </svg>
              {hover !== null && (
                <div className="week-tip" style={{ left: `${Math.min(84, Math.max(16, ((hover * (BAR + GAP) + BAR / 2) / W) * 100))}%` }}>
                  <strong>{week[hover].minutes.toFixed(1)} min</strong>
                  <span>{dayLongFmt.format(week[hover].day)}</span>
                </div>
              )}
            </div>
          </section>

          <section aria-labelledby="list-heading">
            <h2 id="list-heading" className="group-title">Sessions</h2>
            <ul className="session-list">
              {history.slice(0, 60).map((s) => (
                <li key={s.id} className="session">
                  <div className="session-main">
                    <span className="session-mode">{modeById(s.mode).name}</span>
                    <span className="session-when">
                      {dateFmt.format(s.startedAt)}, {timeFmt.format(s.startedAt)}
                    </span>
                  </div>
                  <div className="session-stats">
                    <span>{formatDuration(s.activeMs / 1000)}</span>
                    <span>{s.cues} cues</span>
                    <span>
                      {s.setsCompleted}/{s.setsPlanned} sets
                    </span>
                  </div>
                </li>
              ))}
            </ul>
          </section>

          <button
            type="button"
            className={confirm ? 'danger-btn is-armed' : 'danger-btn'}
            onClick={() => {
              if (confirm) {
                onClear();
                setConfirm(false);
              } else setConfirm(true);
            }}
            onBlur={() => setConfirm(false)}
          >
            {confirm ? 'Tap again to delete all sessions' : 'Clear history'}
          </button>
        </>
      )}
    </div>
  );
}
