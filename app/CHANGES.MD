# Changelog

## 2026-09-25 — feature/rotina-redesign-1a-2a

- New "Fita" UI from the Claude Design handoff (designs 1a TV / 2a phone):
  - TV (landscape): fixed 1440×810 stage scaled to fit the screen; proportional ribbon with done tasks faded + ✓, white ring on the current task, AGORA marker, giant AGORA card with countdown, and an "A seguir" panel.
  - Phone (portrait / <768px): AGORA card on top, vertical ribbon at 11 px/min that auto-follows NOW (~40% down) and pauses for 10s after a manual scroll.
  - "Quase acabando" red state for the last 2 minutes of a task.
- Closing zone after the last task ("Hora de sair" / "Hora de dormir"; override with `closing` on a routine). Past the deadline the routine no longer resets: the zone lights up, the card counts up (`+mm:ss DEPOIS DA HORA`), and ↺ Recomeçar restarts it. Overtime lasts up to 3h after the deadline before rolling over to the next day.
- Manhã/Noite toggle moved into the header (☀️/🌙 icons on phone).
- Edit buttons and the "Horário limite" control moved into a parents' menu behind the ✨ badge.
- Removed `Header`, `TimelineNew` and `AgoraCard` (replaced by `components/fita/*`). Added `lib/routineView.js` with tests.

## 2025-08-28 — design-responsivo

- Re-enabled routine editing in the new UI:
  - Added buttons on Home (✏️ Editar, ⚙️ Rotinas) to open editors.
  - Wired `RoutineEditor` and `DefaultRoutineEditor` with save/cancel and `localStorage` persistence.
- Standardized task duration to `minutes` across the app:
  - Normalize on load from `localStorage`/`public/routines.json`.
  - Editors read/write `minutes`; timelines and alerts use `minutes`.
- Task reordering improvements:
  - Added up/down arrow controls in both editors.
  - Added desktop drag-and-drop with a grip handle; touch devices keep arrows.
- Mobile UX improvements:
  - Timeline shows only icons on small screens to avoid squished labels.
  - Timeline becomes horizontally scrollable on small screens.
- Minor UI tweaks:
  - Updated edit buttons to “✏️ Editar” and “⚙️ Rotinas”.

