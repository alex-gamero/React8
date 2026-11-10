import { Field, Segmented, Stepper, Toggle } from '../components/Controls';
import { estimateSeconds } from '../engine/plan';
import type { DirectionSet, DrillConfig } from '../engine/types';
import type { SoundMode, VoiceLang } from '../audio/sound';
import type { Preferences } from '../lib/storage';
import { formatDuration, matchPreset, modeById } from '../lib/modes';

interface Props {
  config: DrillConfig;
  prefs: Preferences;
  onConfig: (c: DrillConfig) => void;
  onPrefs: (p: Preferences) => void;
  onStart: () => void;
  onBack: () => void;
}

const seconds = (v: number) => `${v.toFixed(1)} s`;

export function Setup({ config, prefs, onConfig, onPrefs, onStart, onBack }: Props) {
  const mode = modeById(config.mode);
  const preset = matchPreset(mode, config);
  const set = <K extends keyof DrillConfig>(key: K, value: DrillConfig[K]) => onConfig({ ...config, [key]: value });
  const isMemory = config.mode === 'memory';
  const directional = config.mode !== 'volleyball';

  const plan =
    config.sets === 1
      ? `One ${formatDuration(config.workSeconds)} set`
      : `${config.sets} sets of ${formatDuration(config.workSeconds)}, ${formatDuration(config.restSeconds)} rest`;

  return (
    <div className="screen setup">
      <header className="topbar">
        <button type="button" className="back-btn" onClick={onBack}>
          <svg viewBox="0 0 20 20" aria-hidden="true">
            <path d="M13 4 L7 10 L13 16" />
          </svg>
          Drills
        </button>
      </header>

      <div className="setup-intro">
        <h1 className="setup-title">{mode.name}</h1>
        <p className="setup-howto">{mode.howTo}</p>
      </div>

      <Segmented
        label="Preset"
        value={preset}
        options={[
          ...mode.presets.map((p) => ({ value: p.id, label: p.label })),
          { value: 'custom' as const, label: 'Custom' },
        ]}
        onChange={(id) => {
          const p = mode.presets.find((x) => x.id === id);
          if (p) onConfig({ ...config, ...p.values });
        }}
      />

      <section className="group" aria-labelledby="g-timing">
        <h2 id="g-timing" className="group-title">Timing</h2>
        {isMemory ? (
          <Field label="Time per move" hint="How long you get for each move when you run the chain.">
            <Stepper
              label="Time per move"
              value={(config.minInterval + config.maxInterval) / 2}
              min={0.6}
              max={4}
              step={0.1}
              format={seconds}
              onChange={(v) => onConfig({ ...config, minInterval: v, maxInterval: v })}
            />
          </Field>
        ) : (
          <>
            <Field label="Fastest gap" hint="Cues land at random between these two gaps.">
              <Stepper
                label="Fastest gap"
                value={config.minInterval}
                min={0.6}
                max={config.maxInterval}
                step={0.1}
                format={seconds}
                onChange={(v) => set('minInterval', v)}
              />
            </Field>
            <Field label="Slowest gap">
              <Stepper
                label="Slowest gap"
                value={config.maxInterval}
                min={config.minInterval}
                max={8}
                step={0.1}
                format={seconds}
                onChange={(v) => set('maxInterval', v)}
              />
            </Field>
          </>
        )}
        <Field label="Sets">
          <Stepper label="Sets" value={config.sets} min={1} max={20} step={1} onChange={(v) => set('sets', v)} />
        </Field>
        <Field label="Work">
          <Stepper label="Work" value={config.workSeconds} min={10} max={300} step={5} format={formatDuration} onChange={(v) => set('workSeconds', v)} />
        </Field>
        {config.sets > 1 && (
          <Field label="Rest">
            <Stepper label="Rest" value={config.restSeconds} min={5} max={180} step={5} format={formatDuration} onChange={(v) => set('restSeconds', v)} />
          </Field>
        )}
      </section>

      <section className="group" aria-labelledby="g-drill">
        <h2 id="g-drill" className="group-title">Drill</h2>
        {directional && (
          <Field label="Directions">
            <Segmented<DirectionSet>
              label="Directions"
              value={config.directionSet}
              options={[
                { value: 'all', label: 'All 8' },
                { value: 'cross', label: 'Cross' },
                { value: 'diagonal', label: 'Diagonal' },
              ]}
              onChange={(v) => set('directionSet', v)}
            />
          </Field>
        )}
        {config.mode === 'gonogo' && (
          <Field label="Hold cues" hint="Share of arrows that mean stay put.">
            <Stepper
              label="Hold cues"
              value={config.noGoRatio}
              min={0.1}
              max={0.5}
              step={0.05}
              format={(v) => `${Math.round(v * 100)}%`}
              onChange={(v) => set('noGoRatio', v)}
            />
          </Field>
        )}
        {isMemory && (
          <Field label="Chain length" hint="Moves to remember each round.">
            <Stepper label="Chain length" value={config.chainLength} min={2} max={8} step={1} onChange={(v) => set('chainLength', v)} />
          </Field>
        )}
        {config.mode === 'volleyball' && (
          <Field label="Back row only" hint="Zones 1, 6 and 5. Made for liberos and defenders.">
            <Toggle label="Back row only" checked={config.backRowOnly} onChange={(v) => set('backRowOnly', v)} />
          </Field>
        )}
      </section>

      <section className="group" aria-labelledby="g-sound">
        <h2 id="g-sound" className="group-title">Cues</h2>
        <Field label="Sound">
          <Segmented<SoundMode>
            label="Sound"
            value={prefs.sound}
            options={[
              { value: 'voice', label: 'Voice' },
              { value: 'beep', label: 'Beep' },
              { value: 'off', label: 'Off' },
            ]}
            onChange={(v) => onPrefs({ ...prefs, sound: v })}
          />
        </Field>
        {prefs.sound === 'voice' && (
          <Field label="Voice language">
            <Segmented<VoiceLang>
              label="Voice language"
              value={prefs.voiceLang}
              options={[
                { value: 'en', label: 'English' },
                { value: 'es', label: 'Español' },
              ]}
              onChange={(v) => onPrefs({ ...prefs, voiceLang: v })}
            />
          </Field>
        )}
        <Field label="Screen flash" hint="Flashes the whole screen on each cue. Easier to catch out of the corner of your eye.">
          <Toggle label="Screen flash" checked={prefs.flash} onChange={(v) => onPrefs({ ...prefs, flash: v })} />
        </Field>
      </section>

      <div className="start-bar">
        <p className="start-plan">
          {plan}
          <span className="start-total">About {formatDuration(estimateSeconds(config))} total</span>
        </p>
        <button type="button" className="start-btn" onClick={onStart}>
          Start drill
        </button>
      </div>
    </div>
  );
}
