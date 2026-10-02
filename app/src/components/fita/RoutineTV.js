import React, { useEffect, useState } from 'react';
import { C, FREDOKA, NUNITO, agoraColors, doneOverlay, hatch, statusStyle } from './theme';

const STAGE_W = 1440;
const STAGE_H = 810;

// Scale the fixed 1440×810 stage to fit any TV / window, letterboxed.
function useStageScale() {
  const calc = () => Math.min(window.innerWidth / STAGE_W, window.innerHeight / STAGE_H);
  const [scale, setScale] = useState(calc);
  useEffect(() => {
    const onResize = () => setScale(calc());
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return scale;
}

const flag = {
  position: 'absolute', top: 10, transform: 'translateX(-50%)', background: C.ink, color: '#fff',
  padding: '7px 16px', borderRadius: 999, font: `900 20px ${NUNITO}`, whiteSpace: 'nowrap',
  boxShadow: `0 0 0 4px ${C.bg}`, zIndex: 2,
};

function Pill({ on, onClick, children }) {
  return (
    <button
      onClick={onClick}
      aria-pressed={on}
      style={{
        padding: '10px 26px', borderRadius: 999, whiteSpace: 'nowrap', border: 0, cursor: 'pointer',
        ...(on
          ? { background: '#fff', color: C.ink, font: `600 24px ${FREDOKA}`, boxShadow: '0 3px 0 rgba(0,0,0,.1)' }
          : { background: 'transparent', color: C.muted, font: `500 24px ${FREDOKA}` }),
      }}
    >
      {children}
    </button>
  );
}

function TaskBlock({ t, i, count, v, span, onJump }) {
  const pct = (t.minutes / span) * 100;
  const ring = t.isCurrent && !v.overtime;
  const radius = i === 0 ? '30px 0 0 30px' : i === count - 1 ? '0 30px 30px 0' : '0';
  return (
    <button
      onClick={() => onJump(i)}
      aria-label={`Pular para ${t.name}`}
      title={`${t.name} — ${t.minutes} min`}
      style={{
        position: 'relative', overflow: 'hidden', flex: 'none', width: `${(t.minutes / v.total) * 100}%`,
        background: t.color, borderRadius: radius, border: 0, padding: 0, cursor: 'pointer', font: 'inherit',
        boxShadow: [`inset -3px 0 0 ${C.bg}`, t.done && doneOverlay(0.62), ring && 'inset 0 0 0 7px #fff'].filter(Boolean).join(','),
        transition: 'box-shadow .3s',
      }}
    >
      <div style={{ position: 'absolute', inset: '0 auto 0 0', width: `${t.isCurrent ? v.currentPct : 0}%`, background: 'rgba(0,0,0,.22)' }} />
      <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 7, padding: 8, textAlign: 'center', boxSizing: 'border-box' }}>
        <div style={{ fontSize: (t.isCurrent ? 62 : 44) / Math.sqrt(t.catalogIds?.length || 1), whiteSpace: 'nowrap', lineHeight: 1, animation: t.isCurrent ? 'bob 1.8s ease-in-out infinite' : 'none', opacity: t.done ? 0.5 : 1 }}>{t.icon}</div>
        <div style={{ font: `900 ${pct < 7 ? 18 : 21}px/1.12 ${NUNITO}`, color: t.done ? C.doneInk : '#fff', textShadow: t.done ? 'none' : '0 2px 5px rgba(0,0,0,.3)' }}>{t.name}</div>
        <div style={{ font: `700 17px ${NUNITO}`, whiteSpace: 'nowrap', color: t.done ? 'rgba(58,48,38,.8)' : 'rgba(255,255,255,.92)' }}>{t.minutes} min</div>
      </div>
      {t.done && (
        <div style={{ position: 'absolute', top: 12, right: 12, width: 40, height: 40, borderRadius: 999, background: '#fff', color: C.check, display: 'flex', alignItems: 'center', justifyContent: 'center', font: `900 24px ${NUNITO}`, boxShadow: '0 3px 0 rgba(0,0,0,.15)' }}>✓</div>
      )}
    </button>
  );
}

export default function RoutineTV({ v, closing, bufferMin, clock, startLabel, endLabel, isMorning, onPick, onJump, onReset, badge }) {
  const scale = useStageScale();
  const ot = v.overtime;
  const span = v.total + bufferMin;
  const agora = agoraColors({ urgent: v.urgent, overtime: ot, color: v.current.color });
  const nowPct = v.nowFrac * 100;

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: C.bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ width: STAGE_W * scale, height: STAGE_H * scale, flex: 'none' }}>
        <div style={{ width: STAGE_W, height: STAGE_H, transform: `scale(${scale})`, transformOrigin: '0 0', boxSizing: 'border-box', background: C.bg, color: C.ink, fontFamily: NUNITO, display: 'flex', flexDirection: 'column', padding: '26px 30px', gap: 16 }}>

          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              {badge({ size: 58, radius: 20, fontSize: 30, shadow: 4 })}
              <h1 style={{ margin: 0, fontFamily: FREDOKA, fontSize: 42, fontWeight: 600, letterSpacing: -0.5, whiteSpace: 'nowrap' }}>Rotina da Nina</h1>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 22 }}>
              <div style={{ display: 'flex', gap: 6, background: C.toggleBg, padding: 6, borderRadius: 999 }}>
                <Pill on={isMorning} onClick={() => onPick('morning')}>☀️ Manhã</Pill>
                <Pill on={!isMorning} onClick={() => onPick('evening')}>🌙 Noite</Pill>
              </div>
              <div style={{ fontFamily: FREDOKA, fontSize: 46, fontWeight: 600, fontVariantNumeric: 'tabular-nums', letterSpacing: -1 }}>{clock}</div>
            </div>
          </div>

          {/* Start / remaining / end */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', font: `800 17px ${NUNITO}`, color: C.muted, letterSpacing: 1.5, whiteSpace: 'nowrap' }}>
            <span>COMEÇOU {startLabel}</span><span>{v.leftLabel}</span><span>TERMINA {endLabel}</span>
          </div>

          {/* Ribbon + closing zone */}
          <div style={{ display: 'flex', alignItems: 'stretch', gap: 5, height: 300 }}>
            <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
              <div style={{ display: 'flex', height: '100%', width: '100%', borderRadius: 30, background: C.track, boxShadow: '0 8px 0 rgba(0,0,0,.07)' }}>
                {v.blocks.map((t, i) => (
                  <TaskBlock key={t.id ?? i} t={t} i={i} count={v.blocks.length} v={v} span={span} onJump={onJump} />
                ))}
              </div>
              <div style={{ position: 'absolute', top: 0, bottom: 0, left: `${nowPct}%`, width: 6, background: C.ink, transform: 'translateX(-3px)', boxShadow: '0 0 0 2px rgba(255,255,255,.7)', pointerEvents: 'none' }} />
              {!ot && <div style={{ ...flag, left: `${Math.min(Math.max(nowPct, 7), 93)}%`, pointerEvents: 'none' }}>AGORA {clock}</div>}
            </div>

            <div style={{
              position: 'relative', flex: 'none', width: 148, boxSizing: 'border-box', borderRadius: 30, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 5,
              padding: ot ? '52px 8px 12px' : '12px 8px', textAlign: 'center', transition: 'background .4s',
              background: ot ? hatch(closing.color, 16) : 'transparent',
              border: `4px dashed ${ot ? '#fff' : 'rgba(154,134,107,.4)'}`,
              boxShadow: ot ? '0 8px 0 rgba(0,0,0,.07)' : 'none',
            }}>
              {ot && <div style={{ ...flag, left: '50%' }}>AGORA {clock}</div>}
              <div style={{ fontSize: ot ? 50 : 38, lineHeight: 1, animation: 'bob 2.6s ease-in-out infinite', opacity: ot ? 1 : 0.5 }}>{closing.icon}</div>
              <div style={{ font: `900 ${ot ? 21 : 19}px/1.12 ${NUNITO}`, color: ot ? '#fff' : C.muted, textShadow: ot ? '0 2px 5px rgba(0,0,0,.3)' : 'none' }}>{closing.name}</div>
              <div style={{ font: `800 15px ${NUNITO}`, color: ot ? 'rgba(255,255,255,.95)' : C.muted }}>{v.closeSub}</div>
              {ot && (
                <button onClick={onReset} style={{ marginTop: 4, background: '#fff', color: C.ink, padding: '7px 14px', borderRadius: 999, border: 0, font: `900 17px ${NUNITO}`, whiteSpace: 'nowrap', cursor: 'pointer', boxShadow: '0 3px 0 rgba(0,0,0,.18)' }}>↺ Recomeçar</button>
              )}
            </div>
          </div>

          {/* AGORA card + A seguir */}
          <div style={{ display: 'flex', gap: 18, flex: 1, minHeight: 0 }}>
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', background: agora.bg, border: `4px solid ${agora.border}`, borderRadius: 28, padding: '20px 26px', boxSizing: 'border-box', boxShadow: '0 6px 0 rgba(0,0,0,.06)' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: 22, flex: 'none' }}>
                <div style={{ width: 104, height: 104, flex: 'none', borderRadius: 30, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 58 / Math.sqrt(v.current.catalogIds?.length || 1), whiteSpace: 'nowrap', background: `${v.current.color}2e` }}>{v.current.icon}</div>
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ font: `900 16px ${NUNITO}`, letterSpacing: 3, color: C.muted }}>AGORA</div>
                  <div style={{ fontFamily: FREDOKA, fontSize: 42, fontWeight: 600, lineHeight: 1.12, letterSpacing: -0.5, overflowWrap: 'anywhere' }}>{v.current.name}</div>
                  <div style={{ marginTop: 6, display: 'inline-block', ...statusStyle({ urgent: v.urgent, overtime: ot }, { size: 20, pad: '6px 16px' }), ...(v.urgent || ot ? {} : { padding: '6px 0' }) }}>{v.statusText}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ display: 'block', fontFamily: FREDOKA, fontWeight: 600, fontSize: 74, lineHeight: 1.12, paddingBottom: 6, letterSpacing: -2, whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums', color: agora.count }}>{v.countdown}</div>
                  <div style={{ font: `800 16px ${NUNITO}`, letterSpacing: 2, color: C.muted, whiteSpace: 'nowrap' }}>{v.countLabel}</div>
                </div>
              </div>
              <div style={{ marginTop: 'auto', height: 26, borderRadius: 999, background: C.barBg, overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${v.currentPct}%`, borderRadius: 999, background: agora.bar }} />
              </div>
            </div>

            <div style={{ width: 430, background: '#fff', borderRadius: 28, padding: '20px 22px', boxSizing: 'border-box', boxShadow: '0 6px 0 rgba(0,0,0,.06)', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ font: `900 16px ${NUNITO}`, letterSpacing: 3, color: C.muted }}>{v.nextHeading}</div>
              {ot && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, background: `${closing.color}1f`, border: `3px dashed ${closing.color}80`, borderRadius: 22, padding: '16px 18px' }}>
                  <div style={{ fontSize: 54, lineHeight: 1, animation: 'bob 2.6s ease-in-out infinite' }}>{closing.icon}</div>
                  <div style={{ fontFamily: FREDOKA, fontSize: 32, fontWeight: 600, lineHeight: 1.15 }}>{closing.title}</div>
                  <div style={{ font: `700 19px/1.35 ${NUNITO}`, color: C.muted, textWrap: 'pretty' }}>{closing.note}</div>
                </div>
              )}
              {v.nextUp.map((n, i) => (
                <div key={n.id ?? i} style={{ display: 'flex', alignItems: 'center', gap: 14, background: C.rowBg, borderRadius: 20, padding: '12px 14px' }}>
                  <div style={{ width: 58, height: 58, flex: 'none', borderRadius: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 / Math.sqrt(n.catalogIds?.length || 1), whiteSpace: 'nowrap', background: `${n.color}2e` }}>{n.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ font: `800 24px/1.15 ${NUNITO}` }}>{n.name}</div>
                    <div style={{ font: `700 17px ${NUNITO}`, color: C.muted }}>às {n.at} · {n.minutes} min</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
