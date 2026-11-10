import { Arrow } from '../components/Arrow';
import { CourtZones } from '../components/CourtZones';
import { Rosette } from '../components/Rosette';
import type { ModeId } from '../engine/types';
import { MODES } from '../lib/modes';

interface Props {
  onPick: (mode: ModeId) => void;
  onHistory: () => void;
}

function ModeGlyph({ mode }: { mode: ModeId }) {
  if (mode === 'classic') return <Arrow direction="up-right" tone="tape" className="glyph" />;
  if (mode === 'gonogo')
    return (
      <span className="glyph glyph-pair">
        <Arrow direction="left" tone="tape" />
        <Arrow direction="right" tone="hold" />
      </span>
    );
  if (mode === 'memory')
    return (
      <span className="glyph glyph-chain">
        <Arrow direction="up" tone="line" />
        <Arrow direction="down-left" tone="line" />
        <Arrow direction="right" tone="tape" />
      </span>
    );
  return <CourtZones active={6} className="glyph glyph-court" />;
}

export function Home({ onPick, onHistory }: Props) {
  return (
    <div className="screen home">
      <header className="topbar">
        <span className="wordmark">React8</span>
        <button type="button" className="link-btn" onClick={onHistory}>
          History
        </button>
      </header>

      <section className="hero">
        <Rosette demo className="hero-rosette" />
        <h1 className="hero-title">Move on the cue.</h1>
        <p className="hero-lead">
          Reaction and footwork drills for any court. Prop your phone up, step back, and go the moment a direction lights up.
        </p>
      </section>

      <section aria-labelledby="modes-heading" className="modes">
        <h2 id="modes-heading" className="section-title">Pick a drill</h2>
        <ul className="mode-list">
          {MODES.map((m) => (
            <li key={m.id}>
              <button type="button" className="mode-row" onClick={() => onPick(m.id)}>
                <ModeGlyph mode={m.id} />
                <span className="mode-text">
                  <span className="mode-name">{m.name}</span>
                  <span className="mode-tagline">{m.tagline}</span>
                </span>
                <svg viewBox="0 0 20 20" className="chevron" aria-hidden="true">
                  <path d="M7 4 L13 10 L7 16" />
                </svg>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <footer className="home-foot">
        Works offline. Add it to your home screen to use it like an app.
      </footer>
    </div>
  );
}
