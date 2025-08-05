# Linear Day Timeline — Visual & Functional Canvas

## 1. Project Vision
Create a simple web app to visualize the passage of time linearly (horizontally), showing sequential daily tasks as colored blocks on a timeline. This is designed for children and families who need to visualize routines without needing to read traditional clocks. Milestones (now called "tasks") are clearly indicated as periods (blocks) of time, with real-time progress, visual cues, and gentle sound alerts.

---

## 2. Key Concepts
- **Linear Timeline:** A full-width horizontal bar representing the day, left (start) to right (end).
- **Tasks (Blocks):** Each task is a block/segment on the timeline with a start and end time, colored and possibly with an icon or image.
- **Current Time Indicator:** A moving line or marker shows “now.”
- **Sound Alerts:** Gentle chimes play:
  - 5 minutes before a task ends (“almost up”)
  - When a task ends (distinct sound)
- **Routine by Day:** Different schedule for each day of the week. Selectable.
- **Profile (Future Option):** Possibility to have multiple user profiles/routines (optional, for v2).
- **No Account/Backend Needed:** All data stored locally; simple to save, load, or share routines as files.

---

## 3. User Flow
1. **Choose Day:** User selects (or auto-selects) current day of week.
2. **Timeline Displays:** The day’s routine appears as a timeline bar, with colored task blocks and a moving “now” indicator.
3. **Tasks:**
   - Each task shows icon + label (e.g., 🥣 Breakfast, 🦷 Brush Teeth, 👕 Get Dressed).
   - Tasks are sequential, no overlaps.
   - Past tasks fade out visually.
4. **Task Alerting:**
   - 5 minutes before a task ends: “almost up” chime
   - When a task ends: “done” chime
5. **Routine Editing:**
   - UI for adding, editing, reordering, deleting tasks
   - Set start & end time, color, icon, label for each task
   - Save/load routine as local file (JSON or similar)
6. **Display:**
   - Responsive: Looks good on TV, phone, or PC
   - Minimal animations (smooth marker movement)
   - Customizable background color or image
   - Optional: Dark/night mode

---

## 4. Visuals / UI Sketch
- **Horizontal timeline bar**
    - Full width (screen edge to edge)
    - Colored blocks for tasks, sized to duration
    - Task icons above/below each block
    - Label under/over icon, simple text (for adults)
    - “Now” is a vertical line or arrow, smoothly moving left to right
    - Past blocks fade out, upcoming blocks full color
    - Time (HH:MM) can be hidden or displayed, optional toggle
- **Day Selector:** Simple buttons or dropdown to switch between days
- **Edit Routine:** Floating “edit” button to enter routine setup
- **Settings:** Minimal — sound on/off, background options

---

## 5. Technical / Implementation Notes
- **Frontend:** HTML/CSS/JS (React ideal for future extensibility, but could be plain JS for simplicity)
- **Data:** JSON config per routine/day, stored in localStorage
- **No backend required** (but could add Github integration for advanced sharing later)
- **PWA:** Consider making it installable as a web app for TVs/phones
- **Audio:** Simple sound files for alerts, bundled locally
- **Icons:** Use SVG or Emoji; customizable per task

---

## 6. Key Specs (v1)
- Max ~6 tasks per session (morning/evening), up to ~12 per day
- All tasks are sequential blocks, no overlaps
- Each task: start time, end time, label, color, icon
- Optional: custom background (color/image)
- Local data only (no logins/accounts needed)
- Responsive UI for smart TVs, phones, tablets, PCs
- Minimal, non-distracting design

---

## 7. Next Steps
1. **Confirm visual direction** (Option A — horizontal timeline)
2. **Make simple wireframes/mockups**
3. **Draft JSON structure for a routine**
4. **Define sound alerts and icon set
5. **Draft specifications.md for development
6. **Plan for editing UI (for parents)
7. **Implement simple HTML prototype
8. **(Future) Explore journey map (Option D) for gamified/kid mode

---

## 8. Open Questions
- What is the preferred default color scheme?
- Do you want default icons, or to pick from a set?
- Should the app “start” at wake-up time, or always show the full day?
- Anything essential missing from this scope?

---

Let’s refine/add any other ideas here! When ready, next step is specifications.md and/or a simple wireframe mockup.

