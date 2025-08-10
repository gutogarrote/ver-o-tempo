# Ver o Tempo ⏰

**Ver o Tempo** is a family-friendly timeline visualization app designed to help children and families track their daily routines in real-time. The app displays tasks as colorful blocks on a scrolling horizontal timeline with live progress indicators and audio alerts.

![Timeline Example](https://via.placeholder.com/800x200/f3f4f6/1f2937?text=Timeline+Visualization)

## 🌟 Features

### ✨ Interactive Timeline
- **Real-time visualization** of daily routines on a horizontal timeline
- **Fixed timeline layout** with start time on the left, end time on the right
- **Moving "AGORA" (NOW) indicator** shows current time progress
- **Colorful task blocks** with emoji icons and duration display
- **Responsive design** optimized for TV, tablet, phone, and PC

### 🎯 Smart Routine Management
- **Morning and Evening routines** for each day of the week
- **Visual task editor** for modifying individual routine sessions
- **Comprehensive default editor** for managing all routines
- **Custom end times** for each routine
- **Persistent storage** using browser localStorage

### 🔧 Advanced Editing Capabilities
- **Visual color picker** for task customization
- **Emoji icon selection** for each task
- **Duration adjustment** with minute precision
- **Add/delete tasks** dynamically
- **Create new routines** for any day and period
- **Delete entire routines** with confirmation

### 🎵 Audio Alerts (Placeholder)
- Alerts at 5 minutes, 1 minute, and task completion
- Designed for auditory progress cues

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ 
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/gutogarrote/ver-o-tempo.git
   cd ver-o-tempo
   ```

2. **Install dependencies**
   ```bash
   cd app
   npm install
   ```

3. **Start the development server**
   ```bash
   npm start
   ```

4. **Open your browser** to http://localhost:3000

## 📱 How to Use

### Basic Workflow
1. **Select a routine** (Manhã or Noite) from the main screen
2. **Set end time** for your routine (or use default)
3. **Watch the timeline** progress in real-time with the moving NOW indicator
4. **View task progress** with colorful blocks and remaining time

### Editing a Session
1. Click **"Editar"** button in the header while viewing a timeline
2. **Modify tasks**: names, durations, colors, icons
3. **Add new tasks** with the green button
4. **Delete tasks** with the red X button
5. Click **"Save Routine"** to apply changes

### Managing Default Routines
1. Click **"Editar Rotinas"** in the header from any screen
2. **Edit existing routines**: modify any task properties or routine end times
3. **Create new routines**: select day, enter period and name
4. **Delete routines**: remove entire routine sets with confirmation
5. **Save changes** to make them permanent

## 🏗️ Architecture

### Technology Stack
- **Frontend**: React 19.1.1 with functional components and hooks
- **Styling**: Tailwind CSS 3.4.17 for responsive design
- **Storage**: Browser localStorage for persistence
- **Testing**: React Testing Library with Jest
- **Audio**: Local sound files (placeholder implementation)

### Component Structure
```
App.js                    # Main application orchestrator
├── RoutineSelector.js    # Day/routine selection interface
├── EndTimeSetter.js      # Routine end time configuration
├── Timeline.js           # Main timeline visualization
├── TimeIndicator.js      # NOW line with current time display
├── RoutineEditor.js      # Individual routine session editor
├── DefaultRoutineEditor.js # Comprehensive routine management
└── AudioAlerts.js        # Audio notification system
```

### Data Structure
```javascript
{
  "monday": {
    "morning": {
      "name": "Manhã",
      "endTime": "05:30",
      "tasks": [
        {
          "id": 1,
          "name": "Acordar", 
          "duration": 5,
          "color": "#FBBF24",
          "icon": "☀️"
        }
        // ... more tasks
      ]
    },
    "evening": { /* similar structure */ }
  }
  // ... other days
}
```

## 🎨 Design Philosophy

### Family-Friendly Design
- **Large, clear icons** easily visible from across the room
- **Vibrant colors** that appeal to children and adults
- **Intuitive navigation** requiring minimal technical knowledge
- **TV-optimized layout** for family room displays

### Accessibility Features
- **High contrast text** with automatic color calculation
- **Responsive font sizes** for different devices
- **Clear visual hierarchy** with proper spacing
- **Touch-friendly controls** for tablet interaction

## 🔧 Development

### Project Structure
```
ver-o-tempo/
├── app/                 # React application
│   ├── public/
│   │   ├── routines.json    # Default routine definitions
│   │   └── sounds/          # Audio alert files
│   ├── src/
│   │   ├── components/      # React components
│   │   └── App.js          # Main app component
├── CLAUDE.md           # Development guidelines
├── progress.md         # Development log
└── README.md          # This file
```

### Development Commands
```bash
npm start          # Development server
npm test           # Run tests
npm run build      # Production build
npm run lint       # Code linting (if configured)
```

### Contributing
1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 🗺️ Future Roadmap

### Planned Features
- **Journey Map Gamification**: More playful, path-based timeline visualization
- **Multiple User Profiles**: Switch between different family members
- **PWA Enhancements**: Better offline support and installation
- **Real Audio Files**: Replace placeholder audio alerts
- **Smart TV Compatibility**: QR code sharing and sync codes
- **Export/Import**: Backup and share custom routines

### Smart TV Integration
- **QR Code Sharing**: Export routines as scannable codes
- **6-Digit Sync Codes**: Simple cross-device routine sharing
- **Remote-Friendly Navigation**: Optimized for TV remote controls

## 🔒 Privacy & Data

- **Local Storage Only**: No data sent to external servers
- **Offline Capable**: Works without internet connection
- **Family Safe**: No tracking, analytics, or external dependencies
- **Browser Storage**: Uses localStorage for routine persistence

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Designed for families seeking better routine visualization
- Optimized for children's attention spans and visual learning
- Built with modern web technologies for reliability and performance

---

**Ver o Tempo** - Making time visible for families ⏰✨
