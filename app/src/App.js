import React, { useState, useEffect } from "react";
import AudioAlerts from "./components/AudioAlerts";
import "./App.css";
import Home from "./pages/Home";
import defaultRoutines from './lib/defaultRoutines.json';
import { applyRoutineUrl, parseRoutineUrl } from './lib/routineUrl';

function App() {
  const [routines, setRoutines] = useState(null);
  const [urlConfig] = useState(() => parseRoutineUrl(window.location.search, window.location.pathname));
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
    function load(data) {
      if (!active) return;
      const next = applyRoutineUrl(normalizeMinutes(data), urlConfig);
      setRoutines(next);
      // An invalid link must not change existing storage, even during fallback.
      if (urlConfig.status !== 'invalid' && urlConfig.source !== 'path') {
        try { localStorage.setItem('routines', JSON.stringify(next)); } catch (_) {}
      }
    }
    async function initialize() {
      try {
        const stored = urlConfig.status === 'invalid' || urlConfig.source === 'path' ? null : localStorage.getItem('routines');
        if (stored) {
          const data = JSON.parse(stored);
          if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid routines');
          load(data);
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
  }, [urlConfig]);

  return (
    <div className="min-h-screen" style={{ background: "#FFF6E9" }}>
      {urlConfig.status === 'invalid' && <div role="alert" className="p-4">{urlConfig.error}</div>}
      {routines ? (
        <Home initialRoutineId={urlConfig.period || 'morning'} routines={routines} setRoutines={setRoutines} currentTime={currentTime} />
      ) : (
        <div className="p-6">Carregando rotinas…</div>
      )}
      {/* Keep alerts behavior unchanged */}
      <AudioAlerts routine={null} currentTime={currentTime} />
    </div>
  );
}

export default App;
