# Project: Linear Day Timeline

## 1. Vision

A web application to visualize daily routines on a linear timeline, designed for children and families. The app will make time tangible by representing tasks as colored blocks, with real-time progress indicators and audio alerts.

## 2. Core Features

- **Timeline:** A zoomed-in, horizontal timeline that scrolls from right to left. A fixed vertical line positioned 25% from the left of the screen will represent "Now."
- **Tasks:** Tasks are displayed as colored blocks on the timeline. The width of each block is proportional to its duration. Each block will have a label and an icon.
- **Routines:**
    - The app will support different routines for each day of the week.
    - Routines are defined in a `routines.json` file.
    - Users can edit routines (add, edit, reorder, delete tasks).
- **Time Calculation:** The user sets an end time for a routine, and the app calculates the start time based on the total duration of the tasks.
- **Alerts:** Audio alerts will notify users of task milestones (e.g., "5 minutes remaining," "task complete").
- **Visual Feedback:** Completed tasks will be visually distinct (e.g., grayscale with a checkmark) to provide a sense of accomplishment.
- **Responsive Design:** The app will be accessible and usable on TVs, tablets, phones, and PCs.

## 3. Technical Implementation

- **Frontend:** React with Tailwind CSS.
- **Data Storage:** `localStorage` will be used to store routine data, loaded from a `routines.json` file.
- **No Backend:** The application will be a pure client-side application.
- **Local Network Access:** The app will be accessible on the local network by running a local development server.
- **Progressive Web App (PWA):** The app will be configured as a PWA to allow for installation on supported devices.

## 4. Next Steps

1.  Set up the React project with `create-react-app`.
2.  Integrate Tailwind CSS.
3.  Create the `routines.json` data structure.
4.  Implement the core components: `RoutineSelector`, `Timeline`, `TaskBlock`, `TimeIndicator`.
5.  Implement the timeline logic with smooth scrolling.
6.  Develop the routine editing functionality.
7.  Add audio alerts.
