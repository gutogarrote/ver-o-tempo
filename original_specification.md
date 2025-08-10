# Linear Day Timeline — Visual & Functional Canvas

## 1. Project Vision

Create a simple web app to visualize the passage of time linearly (horizontally), showing sequential daily tasks as colored blocks on a timeline. This is designed for children and families who need to visualize routines without needing to read traditional clocks. Tasks are clearly indicated as periods (blocks) of time, with real-time progress, visual cues, and gentle sound alerts.

---

## 2. Key ConceptsO

- **Linear Timeline v1:** A full-width horizontal bar representing the day, left (start) to right (end).
- **Linear Timeline v2:** If tasks are small in duration, consider a larger, zoomed in horizontal timeline in the middle of the screen for better visibility of the passing of time in the current task, with a smaller overview full period timeline at the top or bottom. The "Now" indicator would be fixed in the screen so the timeline would move and the indicator would stay put. "Now" should be about 25% from left to right, so you can see more of the future tasks than past tasks.
- **Tasks (Blocks):** Each task is a block/segment on the timeline with a duration, with width proportional to task duration, colored and possibly with an icon or image, with a label. Start and end time will be defined by Routine end time (and calculated start time from task durations).
- **Current Time Indicator v1:** A vertical moving line or marker shows “now.”
- **Current Time Indicator v2:** A vertical fixed “now” indicator that stays in place while the timeline scrolls, placed about 25% from left to right, so you can see more of the future tasks than past tasks.
- **Sound Alerts:** Gentle chimes play:
  - If tasks are > 10 minutes long, a sound plays:
    - 5 minutes before a task ends (“Faltam 5 minutos”)
    - 1 minute before a task ends (“Tempo acabando”)
    - When a task ends (distinct sound)
  - If tasks are < 10 minutes long, a sound plays:
    - 1 minute before a task ends (“Tempo acabando”)
    - When a task ends (distinct sound)
- **Task Editing:** UI for parents to add, edit, reorder, and delete tasks.
- **Routine End time:** To start a routine, user must set an END time for routine, so the start time can be calculated automatically from the sum of task durations and shown to user.
- **Routine by Day:** Different schedule for each day of the week. Selectable. E.g. Mondays are always the same (until edited), Tuesdays are always the same (until edited), but Mondays and Tuesdays are not necessarily the same.
- **Profile (Future Option):** Possibility to have multiple user profiles/routines (optional, for v2).
- **Accessing the App:** Via web browser, just input URL,no login required.
- **Responsive Design:** Works on TV, tablet, phone, PC.

---

## 3. User Flow
1. **Choose Day:** User selects (or auto-selects) current day of week, showing each routines total duration.
2. **Show selected routine as timeline on screen** showing total duration of routine and tasks with respective duration.
3. **Timeline Starts:** The day’s routine appears as a timeline bar, with colored task blocks and a moving “now” indicator.
4. **Tasks:**
   - Each task shows icon + label (e.g., 🥣 Breakfast, 🦷 Brush Teeth, 👕 Get Dressed).
   - Tasks are sequential, no overlaps.
   - Past tasks fade out visually.
5. **Choose end time:** User selects default end time (that was set when creating routine, or written in file) or sets new session-only end time for the routine (e.g., 6:30 AM). When end time is selected, start time and now time are shown and the timeline should be running.
6. **Task Alerting:**
   - If tasks are > 10 minutes long, a sound plays:
    - 5 minutes before a task ends (“Faltam 5 minutos”)
    - 1 minute before a task ends (“Tempo acabando”)
    - When a task ends (distinct done sound)
  - If tasks are < 10 minutes long, a sound plays:
    - 1 minute before a task ends (“Tempo acabando”)
    - When a task ends (distinct done sound)
7. **Routine Editing:**
   - UI for adding, editing, reordering, deleting tasks
   - Set duration, color, icon, label for each task
   - Save/load routine as local file (JSON or similar)
8. **Display:**
   - Responsive: Looks good on TV, phone, or PC
   - Minimal animations (smooth marker movement)
   - Customizable background color or image (optional)
   - Optional: Dark/night mode

---

## 4. Visuals / UI Sketch
- **Horizontal timeline bar**
    - Full width (screen edge to edge) v1
      - Full width whole routine preview timeline in the top of the screen, taller full width (edge to edge), zoomed in timeline in center of screen for v2
    - Colored blocks for tasks, sized to duration
    - Task icons in each block
    - Label under/over icon, simple text (for adults)
    - “Now” is a vertical line or arrow, smoothly moving left to right v1
      - "Now" is a vertical fixed “now” indicator that stays in place while the main zoomed in timeline scrolls, placed about 25% from left to right, so you can see more of the future tasks than past tasks v2
    - Past blocks fade out, upcoming blocks full color
- **Day Selector:** Simple buttons, radio buttons or dropdown to switch between days
- **Edit Routine:** Floating “edit” button to enter routine setup
- **Settings:** Minimal - basically light/dark mode and edit button at first

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
- Max ~7 tasks per session (morning/evening)
- All tasks are sequential blocks, no overlaps
- Each task: duration, label, color, icon
- Optional: custom background (color/image)
- Local data only (no logins/accounts needed)?
- Responsive UI for smart TVs, phones, tablets, PCs
- Minimal, non-distracting design

---

## 7. Next Steps
1. **Confirm visual direction** (Option A — horizontal timeline)
2. **Make simple wireframes/mockups**
3. **Draft JSON structure for a routine**
4. **Define sound alerts and icon set**
5. **Draft specifications.md for development**
6. **Plan for editing UI (for parents)**
7. **Implement simple HTML prototype**
8. **(Future) Explore journey map (Option D) for gamified/kid mode**: This would make the present routine as a single path, snaking through the screen, starting in the left bottom corner, going up, then right, then down, then left, and so on. The “now” indicator would be a little character that moves along the path, and the tasks would be little icons or player animations along the path (e.g. during task 'Breakfast", character is cooking or eating, during task "Brush teeth", character is brushing, etc.). This would be a more playful way to visualize the routine for kids.

---

## 8. Open Questions
- What is the preferred default color scheme?
   - We'll figure this out later, make it colourful at first, we'll customize as we go.
- Do you want default icons, or to pick from a set?
   - I'm open to suggestions, let's get the MVP up and running and we'll pick icons later.
- Should the app “start” at wake-up time, or always show the full day?
   - The app should only show the present routine selected. When end time is selected, start time and now time are shown and the timeline should be running.
- Anything essential missing from this scope?
   - User inputs for time are each task duration and Routine end time. Tasks start and end time are calculated based on that. For example, if there are 5 tasks that last (20, 10, 5, 5, 10) minutes, routine duration is 50 minutes.

---

Let’s refine/add any other ideas here! When ready, next step is specifications.md and/or a simple wireframe mockup.

