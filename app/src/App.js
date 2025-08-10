import React, { useState, useEffect } from 'react';
import RoutineSelector from './components/RoutineSelector';
import EndTimeSetter from './components/EndTimeSetter';
import Timeline from './components/Timeline';
import AudioAlerts from './components/AudioAlerts';
import RoutineEditor from './components/RoutineEditor';
import DefaultRoutineEditor from './components/DefaultRoutineEditor';
import './App.css';

function App() {
  const [routines, setRoutines] = useState(null);
  const [selectedRoutine, setSelectedRoutine] = useState(null);
  const [finalEndTime, setFinalEndTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingDefaults, setIsEditingDefaults] = useState(false);

  useEffect(() => {
    // Load routines from localStorage first, fallback to routines.json
    const storedRoutines = localStorage.getItem('routines');
    if (storedRoutines) {
      setRoutines(JSON.parse(storedRoutines));
    } else {
      fetch('/routines.json')
        .then(response => response.json())
        .then(data => {
          setRoutines(data);
          localStorage.setItem('routines', JSON.stringify(data));
        });
    }

    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const handleSelectRoutine = (routine) => {
    setSelectedRoutine(routine);
  };

  const handleSetEndTime = (endTime) => {
    setFinalEndTime(endTime);
  };

  const handleSaveRoutine = (updatedRoutine) => {
    const updatedRoutines = { ...routines };
    // This logic needs to be improved to update the correct routine
    updatedRoutines.monday.morning = updatedRoutine;
    setRoutines(updatedRoutines);
    localStorage.setItem('routines', JSON.stringify(updatedRoutines));
    setSelectedRoutine(updatedRoutine);
    setIsEditing(false);
  };

  const handleSaveDefaultRoutines = (updatedRoutines) => {
    setRoutines(updatedRoutines);
    localStorage.setItem('routines', JSON.stringify(updatedRoutines));
    setIsEditingDefaults(false);
    // Reset selected routine to null to go back to routine selector
    setSelectedRoutine(null);
    setFinalEndTime(null);
  };

  const getDisplay = () => {
    if (isEditingDefaults) {
      return (
        <DefaultRoutineEditor 
          routines={routines} 
          onSave={handleSaveDefaultRoutines}
          onCancel={() => setIsEditingDefaults(false)}
        />
      );
    }
    if (isEditing) {
      return <RoutineEditor routine={selectedRoutine} onSave={handleSaveRoutine} />;
    }
    if (finalEndTime) {
      return <Timeline routine={selectedRoutine} endTime={finalEndTime} currentTime={currentTime} />;
    }
    if (selectedRoutine) {
      const defaultEndTime = selectedRoutine.endTime || (selectedRoutine.name === 'Manhã' ? '05:30' : '23:59');
      return <EndTimeSetter defaultEndTime={defaultEndTime} onSetEndTime={handleSetEndTime} />;
    }
    return <RoutineSelector routines={routines} onSelectRoutine={handleSelectRoutine} />;
  };

  return (
    <div className="bg-gray-100 min-h-screen">
      <header className="bg-white shadow-md p-4 flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Ver o Tempo</h1>
          <p className="text-lg text-gray-600">{currentTime.toLocaleTimeString()}</p>
        </div>
        <div className="flex space-x-2">
          <button 
            onClick={() => setIsEditingDefaults(!isEditingDefaults)} 
            className="bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded"
          >
            {isEditingDefaults ? 'Cancelar' : 'Editar Rotinas'}
          </button>
          {selectedRoutine && !isEditingDefaults && (
            <button 
              onClick={() => setIsEditing(!isEditing)} 
              className="bg-gray-300 hover:bg-gray-400 text-gray-800 font-bold py-2 px-4 rounded"
            >
              {isEditing ? 'Cancelar' : 'Editar'}
            </button>
          )}
        </div>
      </header>
      <main className="p-0">
        {getDisplay()}
      </main>
      <AudioAlerts routine={selectedRoutine} currentTime={currentTime} />
    </div>
  );
}

export default App;
