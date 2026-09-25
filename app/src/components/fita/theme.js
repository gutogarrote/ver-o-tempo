// Shared tokens for the "Fita" (ribbon) timeline design.
export const C = {
  bg: '#FFF6E9',
  ink: '#2A2118',
  doneInk: '#3A3026',
  muted: '#9A866B',
  track: '#EADFCB',
  toggleBg: '#F1E2C9',
  barBg: '#EFE3CE',
  rowBg: '#FFF8EC',
  sun: '#FFB703',
  sunShadow: '#E09A00',
  red: '#E5484D',
  redBg: '#FFE9E6',
  amberBg: '#FFF0DB',
  amberPill: '#FFE3B0',
  amberInk: '#7A4A05',
  amberCount: '#C4761B',
  check: '#1F9D55',
};

export const FREDOKA = 'Fredoka, sans-serif';
export const NUNITO = 'Nunito, sans-serif';

export const doneOverlay = (alpha) => `inset 0 0 0 999px rgba(255,246,233,${alpha})`;

export const hatch = (color, band) =>
  `repeating-linear-gradient(135deg,${color} 0 ${band}px,${color}cc ${band}px ${band * 2}px)`;

// Current-task accent for the AGORA card
export function agoraColors({ urgent, overtime, color }) {
  return {
    bg: urgent ? C.redBg : overtime ? C.amberBg : '#fff',
    border: urgent ? C.red : overtime ? C.sunShadow : color,
    count: urgent ? C.red : overtime ? C.amberCount : 'inherit',
    bar: overtime
      ? `repeating-linear-gradient(135deg,${C.sunShadow} 0 14px,${C.sun} 14px 28px)`
      : urgent ? C.red : color,
  };
}

// Status pill under the task name; sizes differ between TV and phone.
export function statusStyle({ urgent, overtime }, { size, pad }) {
  const base = { whiteSpace: 'nowrap', font: `${urgent || overtime ? 900 : 700} ${size}px ${NUNITO}`, borderRadius: 999 };
  if (urgent) return { ...base, background: C.red, color: '#fff', padding: pad, animation: 'urgent 1s ease-in-out infinite' };
  if (overtime) return { ...base, background: C.amberPill, color: C.amberInk, padding: pad };
  return { ...base, color: C.muted };
}
