import React, { useState, useEffect } from "react";
import AudioAlerts from "./components/AudioAlerts";
import Home from "./pages/Home";
import defaultRoutines from './lib/defaultRoutines.json';
import { applyRoutineUrl, parseRoutineUrl } from './lib/routineUrl';
import { captureLinkContext } from './lib/linkDiagnostics';
import InvalidLinkNotice from './components/InvalidLinkNotice';

function App({ preserveUpdate = false }) {
  const [routines, setRoutines] = useState(null);
  const [urlConfig] = useState(() => {
    const context = captureLinkContext();
    return { ...parseRoutineUrl(context.search, context.pathname), context };
  });
  const [currentTime, setCurrentTime] = useState(new Date());

  function normalizeMinutes(data) {
    if (!data || typeof data !== 'object') return data;
    const clone = JSON.parse(JSON.stringify(data));
    Object.keys(clone || {}).forEach((day) => {
      Object.keys(clone[day] || {}).forEach((period) => {
        const r = clone[day][period];
        if (r && Array.isArray(r.tasks)) {
          r.tasks = r.tasks.map((t) => {
            const minutes = t.minutes ?? t.duration ?? 0;
            const { duration, ...rest } = t;
            return { ...rest, minutes };
          });
        }
      });
    });
    return clone;
  }

  useEffect(() => {
    let active = true;
    function load(data, preserveStored = false) {
      if (!active) return;
      const normalized = normalizeMinutes(data);
      const next = preserveStored ? normalized : applyRoutineUrl(normalized, urlConfig);
      setRoutines(next);
      // An invalid link must not change existing storage, even during fallback.
      if (!preserveStored && urlConfig.status !== 'invalid' && urlConfig.source !== 'path') {
        try { localStorage.setItem('routines', JSON.stringify(next)); } catch (_) {}
      }
    }
    async function initialize() {
      try {
        const stored = urlConfig.status === 'invalid' || urlConfig.source === 'path' ? null : localStorage.getItem('routines');
        if (stored) {
          const data = JSON.parse(stored);
          if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid routines');
          load(data, preserveUpdate);
          return;
        }
      } catch (error) {
        console.warn('Failed to read stored routines; refetching', error);
      }
      try {
        const response = await fetch('/routines.json?v=' + Date.now(), { cache: 'no-store' });
        load(await response.json());
      } catch (error) {
        console.warn('Failed to load routines.json', error);
        // A bundled copy keeps safe fallback and pathname shortcuts usable offline.
        load(defaultRoutines);
      }
    }
    initialize();

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => { active = false; clearInterval(timer); };
  }, [urlConfig, preserveUpdate]);

  return (
    <div className="min-h-screen" style={{ background: "#FFF6E9" }}>
      {/* Home places the notice itself (inside the phone screen, or above the TV/editors). */}
      {!routines && urlConfig.status === 'invalid' && <InvalidLinkNotice {...urlConfig} />}
      {routines ? (
        <Home initialRoutineId={urlConfig.period || 'morning'} routines={routines} setRoutines={setRoutines} currentTime={currentTime}
          notice={urlConfig.status === 'invalid' ? <InvalidLinkNotice {...urlConfig} /> : null} />
      ) : (
        <div className="p-6">Carregando rotinas…</div>
      )}
      {/* Keep alerts behavior unchanged */}
      <AudioAlerts routine={null} currentTime={currentTime} />
    </div>
  );
}

export default App;
