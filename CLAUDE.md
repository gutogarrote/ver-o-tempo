# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

"Ver o Tempo" is a React-based web application that visualizes daily routines on a linear timeline, designed for children and families. The app displays tasks as colored blocks on a scrolling horizontal timeline with real-time progress indicators and audio alerts.

## Development Commands

This is a React application using Create React App. All commands should be run from the `/app` directory:

```bash
cd app
npm start       # Start development server (http://localhost:3000)
npm test        # Run tests
npm run build   # Build for production
```

## Architecture

### Core Components

- **App.js** (`app/src/App.js`): Main application component managing state for routines, selected routine, end time, and editing mode
- **RoutineSelector** (`app/src/components/RoutineSelector.js`): Allows users to select from available routines
- **EndTimeSetter** (`app/src/components/EndTimeSetter.js`): Interface for setting routine end time
- **Timeline** (`app/src/components/Timeline.js`): Main timeline view with scrolling task blocks
- **RoutineEditor** (`app/src/components/RoutineEditor.js`): Interface for editing routines (add/edit/delete tasks)
- **AudioAlerts** (`app/src/components/AudioAlerts.js`): Handles audio notifications for task milestones
- **TimeIndicator** (`app/src/components/TimeIndicator.js`): Shows current time position on timeline

### Data Structure

- **Routines** are stored in `app/public/routines.json` and cached in localStorage
- Each routine has: name, endTime, and tasks array
- Tasks have: id, name, duration (minutes), color (hex), icon (emoji)
- Currently supports different routines for each day (monday.morning, monday.evening, etc.)

### Timeline Logic

- Timeline calculates start time by subtracting total task duration from end time
- Tasks are rendered as blocks with width proportional to duration
- Timeline scrolls left as time progresses (translateX with negative percentage)
- Current time indicator is fixed at 25% from left edge

## Key Features

1. **Time Visualization**: Linear horizontal timeline showing task progression
2. **Audio Alerts**: Plays sounds at 5 minutes, 1 minute, and task completion
3. **Responsive Design**: Works on TV, tablet, phone, PC using Tailwind CSS
4. **Local Storage**: Routines persist between sessions via localStorage
5. **Routine Editing**: Parents can modify tasks, durations, colors, and icons

## Technical Stack

- **Frontend**: React 19.1.1 with functional components and hooks
- **Styling**: Tailwind CSS 3.4.17
- **Testing**: React Testing Library with Jest
- **Audio**: Local sound files in `app/public/sounds/`
- **No Backend**: Pure client-side application

## Development Notes

- Application state flows: RoutineSelector → EndTimeSetter → Timeline
- Timeline uses viewport width units (vw) for task block sizing
- Time calculations use JavaScript Date objects with minute precision
- Icons are emoji characters stored as strings in routine data
