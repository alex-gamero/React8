import { useEffect, useState } from 'react';
import { sound } from './audio/sound';
import type { DrillConfig, ModeId, SessionSummary } from './engine/types';
import { modeById } from './lib/modes';
import {
  addSession,
  clearHistory,
  loadConfigs,
  loadHistory,
  loadPrefs,
  saveConfig,
  savePrefs,
  type Preferences,
  type SessionRecord,
} from './lib/storage';
import { History } from './screens/History';
import { Home } from './screens/Home';
import { Run } from './screens/Run';
import { Setup } from './screens/Setup';
import { Summary } from './screens/Summary';

type Screen =
  | { name: 'home' }
  | { name: 'setup' }
  | { name: 'run'; runId: number }
  | { name: 'summary'; summary: SessionSummary; saved: boolean }
  | { name: 'history' };

/** Sessions shorter than this are not worth a history entry. */
const MIN_SAVE_MS = 5000;

function configFor(mode: ModeId): DrillConfig {
  return { ...modeById(mode).defaults, ...loadConfigs()[mode], mode };
}

export default function App() {
  const [screen, setScreen] = useState<Screen>({ name: 'home' });
  const [config, setConfig] = useState<DrillConfig>(() => configFor('classic'));
  const [prefs, setPrefs] = useState<Preferences>(loadPrefs);
  const [history, setHistory] = useState<SessionRecord[]>(loadHistory);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [screen.name]);

  const updateConfig = (c: DrillConfig) => {
    setConfig(c);
    saveConfig(c);
  };
  const updatePrefs = (p: Preferences) => {
    setPrefs(p);
    savePrefs(p);
  };

  const start = () => {
    // Unlock audio inside the tap, then go. Clips keep loading in the background.
    void sound.unlock();
    setScreen({ name: 'run', runId: Date.now() });
  };

  const finish = (summary: SessionSummary) => {
    const saved = summary.activeMs >= MIN_SAVE_MS;
    if (saved) {
      addSession(summary);
      setHistory(loadHistory());
    }
    setScreen({ name: 'summary', summary, saved });
  };

  switch (screen.name) {
    case 'home':
      return (
        <Home
          onPick={(mode) => {
            setConfig(configFor(mode));
            setScreen({ name: 'setup' });
          }}
          onHistory={() => setScreen({ name: 'history' })}
        />
      );
    case 'setup':
      return (
        <Setup
          config={config}
          prefs={prefs}
          onConfig={updateConfig}
          onPrefs={updatePrefs}
          onStart={start}
          onBack={() => setScreen({ name: 'home' })}
        />
      );
    case 'run':
      return <Run key={screen.runId} config={config} prefs={prefs} onFinish={finish} />;
    case 'summary':
      return (
        <Summary
          summary={screen.summary}
          saved={screen.saved}
          onAgain={start}
          onSettings={() => setScreen({ name: 'setup' })}
          onHome={() => setScreen({ name: 'home' })}
        />
      );
    case 'history':
      return (
        <History
          history={history}
          onClear={() => {
            clearHistory();
            setHistory([]);
          }}
          onBack={() => setScreen({ name: 'home' })}
        />
      );
  }
}
