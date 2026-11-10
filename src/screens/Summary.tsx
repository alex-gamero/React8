import { Rosette } from '../components/Rosette';
import type { Direction, SessionSummary } from '../engine/types';
import { formatDuration, modeById } from '../lib/modes';

interface Props {
  summary: SessionSummary;
  saved: boolean;
  onAgain: () => void;
  onSettings: () => void;
  onHome: () => void;
}

export function Summary({ summary, saved, onAgain, onSettings, onHome }: Props) {
  const mode = modeById(summary.mode);
  const isZones = summary.mode === 'volleyball';
  const zoneRows = [1, 2, 3, 4, 5, 6]
    .map((z) => ({ zone: z, n: summary.byCue[`zone-${z}`] ?? 0 }))
    .filter((r) => r.n > 0);
  const zoneMax = Math.max(1, ...zoneRows.map((r) => r.n));

  return (
    <div className="screen summary">
      <header className="topbar">
        <span className="wordmark">React8</span>
      </header>

      <div className="summary-head">
        <h1 className="summary-title">{summary.endedEarly ? 'Ended early.' : 'Session done.'}</h1>
        <p className="summary-sub">
          {mode.name}
          {saved ? ', saved to your history.' : '. Too short to save to history.'}
        </p>
      </div>

      <dl className="stat-row">
        <div className="stat">
          <dt>Cues</dt>
          <dd>{summary.cues}</dd>
        </div>
        <div className="stat">
          <dt>Work time</dt>
          <dd>{formatDuration(summary.activeMs / 1000)}</dd>
        </div>
        <div className="stat">
          <dt>Sets</dt>
          <dd>
            {summary.setsCompleted}
            <small>/{summary.setsPlanned}</small>
          </dd>
        </div>
        {summary.mode === 'gonogo' && (
          <div className="stat">
            <dt>Holds</dt>
            <dd>{summary.holds}</dd>
          </div>
        )}
      </dl>

      {summary.cues > 0 && (
        <section className="spread" aria-labelledby="spread-heading">
          <h2 id="spread-heading" className="group-title">Where the cues sent you</h2>
          {isZones ? (
            <ul className="zone-bars">
              {zoneRows.map((r) => (
                <li key={r.zone}>
                  <span className="zone-bars-label">Zone {r.zone}</span>
                  <span className="zone-bars-track">
                    <span style={{ width: `${(r.n / zoneMax) * 100}%` }} />
                  </span>
                  <span className="zone-bars-n">{r.n}</span>
                </li>
              ))}
            </ul>
          ) : (
            <Rosette counts={summary.byCue as Partial<Record<Direction, number>>} className="summary-rosette" />
          )}
        </section>
      )}

      <p className="summary-note">Reaction times per direction arrive with camera tracking in a later version.</p>

      <div className="summary-actions">
        <button type="button" className="start-btn" onClick={onAgain}>
          Run it again
        </button>
        <button type="button" className="ghost-btn" onClick={onSettings}>
          Change settings
        </button>
        <button type="button" className="link-btn" onClick={onHome}>
          Back to drills
        </button>
      </div>
    </div>
  );
}
