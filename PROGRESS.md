# Project Log: Ver o Tempo

This document tracks the development progress, decisions made, and next steps for the "Ver o Tempo" application.

## Completed Work

*   **Project Scaffolding:**
    *   Initialized a new Git branch: `feature/timeline-app`.
    *   Set up a new React application using `create-react-app`.
    *   Installed and configured Tailwind CSS for styling.
    *   Resolved dependency conflicts between `react-scripts` and `tailwindcss`.

*   **Core Components:**
    *   `App.js`: The main application component.
    *   `RoutineSelector.js`: Allows users to select a routine for the day.
    *   `Timeline.js`: The core visual component that displays the timeline of tasks.
    *   `TimeIndicator.js`: The "now" marker on the timeline.
    *   `AudioAlerts.js`: Handles playing audio cues for task milestones.
    *   `RoutineEditor.js`: A UI for adding, editing, and deleting tasks within a routine.

*   **Functionality:**
    *   **Timeline Logic:** The timeline now scrolls automatically based on the current time and the routine's defined end time.
    *   **Timeline Redesign (cldcd):** Updated timeline to be fixed with start time at left and end time at right. The "Now" indicator moves along the timeline instead of scrolling. Increased timeline height and added responsive design for mobile devices.
    *   **Enhanced NOW Line (cldcd):** Added dramatic glow effects with multiple shadow layers, enhanced depth with gradients and inner glow. NOW line now displays current time prominently above it for easy time checking. Changed "NOW" to "AGORA" in Portuguese.
    *   **Task Improvements (cldcd):** Added task duration display under task names in lighter font. Updated task colors to use vibrant, professional color combinations with proper contrast ratios.
    *   **Responsive Design (cldcd):** Timeline is now centered on screen with responsive heights (h-32 on mobile to h-56 on large screens) and proper padding for different screen sizes.
    *   **Data Management:**
        *   Routines are loaded from a `routines.json` file.
        *   Routine data is stored in the browser's `localStorage` to persist changes.
    *   **Audio Alerts:** The application is set up to play audio alerts at key moments (5 minutes left, 1 minute left, task complete). Placeholder audio files have been added.
    *   **Routine Editing:** A basic editing mode has been implemented, allowing users to modify routines.
*   **Default Routine Editor (cldcd):** Comprehensive visual editor for managing all default routines without manual JSON editing. Features include editing task names/colors/icons/durations, changing routine end times, creating new routines for any day/period, and deleting tasks or entire routines. All changes persist to localStorage.

## Decisions Made

*   **Technology Stack:**
    *   **Frontend:** React with Tailwind CSS.
    *   **Data Storage:** Browser `localStorage`.
    *   **Backend:** None (client-side only).
*   **Timeline Mechanic:** Implemented the "v2" timeline from the specification: a zoomed-in, scrolling timeline with a fixed "now" indicator.
*   **Initial Data:** A `routines.json` file provides the default routine structure.

## Next Steps & Improvements

### Immediate Priorities

1.  **Refine UI/UX:**
    *   Improve the visual design of the timeline, tasks, and editor.
    *   Add smoother transitions and animations.
    *   Make the `RoutineSelector` dynamic to handle different days of the week.
2.  **Enhance Routine Saving Logic:**
    *   The current saving logic in `App.js` is a placeholder. It needs to be updated to correctly save changes to the specific routine being edited (e.g., "Monday Morning," "Tuesday Evening").
3.  **Add Real Audio Files:**
    *   Replace the placeholder `.mp3` files with actual sound files for the alerts.

### Future Features (v2)

*   **"Journey Map" Gamification:** Implement the more playful, path-based timeline visualization.
*   **Customizable Icons and Colors:** Allow users to select from a wider range of icons and colors for their tasks.
*   **Multiple Profiles:** Add the ability to create and switch between different user profiles, each with their own set of routines.
*   **PWA Enhancements:** Improve the Progressive Web App manifest and service worker for a better offline and installation experience.

### Persistent Task Editing (Future Implementation)

**Problem**: Currently, task edits (names, colors, icons) are only saved to localStorage and are temporary.

**Proposed Solutions** (Easy → Complex):

1. **Enhanced localStorage Persistence** ⭐ *Recommended* (2-3 hours)
   - Modify save logic to always write to localStorage
   - Check localStorage first on startup, fallback to routines.json
   - Add backup/restore functionality
   
2. **Export/Import Feature** ⭐ *Good for Desktop/Mobile* (1-2 hours)
   - Download routines as JSON file
   - Upload custom routines from file
   - Perfect for backup/sharing custom routines
   - **Limitation**: Won't work on Smart TVs (no file system access)

2b. **Smart TV Compatible Solutions** ⭐ *Universal Device Support*
   - **QR Code Sharing** (2-3 hours): Export as QR code, scan to import
   - **Sync Codes** (3-4 hours): Generate 6-digit codes for cross-device sharing
   - **Cloud Integration**: Simple serverless storage with shareable codes
   - Works perfectly with TV remotes and limited input methods

3. **Simple Backend Integration** (5-10 hours)
   - Node.js server with file system or database storage
   - True cross-device persistence
   - **Challenges/Disadvantages**:
     - Requires hosting/deployment infrastructure
     - Database setup and maintenance
     - User authentication needed for multi-user support
     - Network dependency (no offline editing)
     - Backup/disaster recovery considerations
     - CORS configuration for frontend-backend communication
     - Security concerns (input validation, rate limiting)
     - Additional complexity for error handling (network failures, server downtime)
     - Cost implications for hosting and database services

4. **File System Access API** (3-4 hours)
   - Write directly back to routines.json
   - Limited browser support, requires user permission

### Code Quality

*   **Component Refactoring:** Break down larger components (like `App.js`) into smaller, more manageable pieces.
*   **Add Tests:** Implement unit and integration tests to ensure the application is robust.
*   **Error Handling:** Improve error handling, especially for file loading and `localStorage` operations.
