import React, { useState } from 'react';

const DefaultRoutineEditor = ({ routines, onSave, onCancel }) => {
  const [editableRoutines, setEditableRoutines] = useState(JSON.parse(JSON.stringify(routines)));
  const [newRoutineDay, setNewRoutineDay] = useState('');
  const [newRoutinePeriod, setNewRoutinePeriod] = useState('');
  const [newRoutineName, setNewRoutineName] = useState('');

  // Helper function to generate unique task ID
  const generateTaskId = (dayRoutines) => {
    let maxId = 0;
    Object.values(dayRoutines).forEach(routine => {
      routine.tasks.forEach(task => {
        if (task.id > maxId) maxId = task.id;
      });
    });
    return maxId + 1;
  };

  // Add new task to a routine
  const handleAddTask = (day, period) => {
    const newTaskId = generateTaskId(editableRoutines[day]);
    const newTask = { 
      id: newTaskId, 
      name: 'Nova Tarefa', 
      duration: 10, 
      color: '#CCCCCC', 
      icon: '✨' 
    };
    
    setEditableRoutines(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [period]: {
          ...prev[day][period],
          tasks: [...prev[day][period].tasks, newTask]
        }
      }
    }));
  };

  // Delete task from routine
  const handleDeleteTask = (day, period, taskId) => {
    setEditableRoutines(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [period]: {
          ...prev[day][period],
          tasks: prev[day][period].tasks.filter(task => task.id !== taskId)
        }
      }
    }));
  };

  // Update task properties
  const handleTaskChange = (day, period, taskId, field, value) => {
    setEditableRoutines(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [period]: {
          ...prev[day][period],
          tasks: prev[day][period].tasks.map(task => 
            task.id === taskId ? { ...task, [field]: value } : task
          )
        }
      }
    }));
  };

  // Update routine properties (name, endTime)
  const handleRoutineChange = (day, period, field, value) => {
    setEditableRoutines(prev => ({
      ...prev,
      [day]: {
        ...prev[day],
        [period]: {
          ...prev[day][period],
          [field]: value
        }
      }
    }));
  };

  // Add new routine
  const handleAddRoutine = () => {
    if (!newRoutineDay || !newRoutinePeriod || !newRoutineName) {
      alert('Por favor, preencha todos os campos para criar nova rotina.');
      return;
    }

    const newRoutine = {
      name: newRoutineName,
      endTime: '12:00',
      tasks: [
        { id: 1, name: 'Primeira Tarefa', duration: 15, color: '#FBBF24', icon: '⭐' }
      ]
    };

    setEditableRoutines(prev => ({
      ...prev,
      [newRoutineDay]: {
        ...prev[newRoutineDay],
        [newRoutinePeriod]: newRoutine
      }
    }));

    // Clear form
    setNewRoutineDay('');
    setNewRoutinePeriod('');
    setNewRoutineName('');
  };

  // Delete entire routine
  const handleDeleteRoutine = (day, period) => {
    if (window.confirm(`Tem certeza que deseja excluir a rotina "${editableRoutines[day][period].name}"?`)) {
      setEditableRoutines(prev => {
        const updated = { ...prev };
        delete updated[day][period];
        return updated;
      });
    }
  };

  const handleSave = () => {
    onSave(editableRoutines);
  };

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames = {
    monday: 'Segunda',
    tuesday: 'Terça',
    wednesday: 'Quarta', 
    thursday: 'Quinta',
    friday: 'Sexta',
    saturday: 'Sábado',
    sunday: 'Domingo'
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md max-w-6xl mx-auto">
      <h2 className="text-2xl font-bold mb-6">Editar Rotinas Padrão</h2>
      
      {/* Existing Routines */}
      <div className="grid gap-6">
        {Object.keys(editableRoutines).map(day => (
          <div key={day} className="border rounded-lg p-4">
            <h3 className="text-xl font-semibold mb-4 capitalize">
              {dayNames[day] || day}
            </h3>
            
            <div className="grid md:grid-cols-2 gap-6">
              {Object.keys(editableRoutines[day]).map(period => {
                const routine = editableRoutines[day][period];
                return (
                  <div key={period} className="border rounded p-4 bg-gray-50">
                    {/* Routine Header */}
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center space-x-4">
                        <input
                          type="text"
                          value={routine.name}
                          onChange={(e) => handleRoutineChange(day, period, 'name', e.target.value)}
                          className="font-semibold text-lg border rounded px-2 py-1"
                        />
                        <div className="flex items-center space-x-2">
                          <label className="text-sm">Fim:</label>
                          <input
                            type="time"
                            value={routine.endTime}
                            onChange={(e) => handleRoutineChange(day, period, 'endTime', e.target.value)}
                            className="border rounded px-2 py-1"
                          />
                        </div>
                      </div>
                      <button 
                        onClick={() => handleDeleteRoutine(day, period)}
                        className="bg-red-500 text-white px-2 py-1 rounded text-sm hover:bg-red-600"
                      >
                        Excluir Rotina
                      </button>
                    </div>

                    {/* Tasks */}
                    <div className="space-y-2">
                      {routine.tasks.map(task => (
                        <div key={task.id} className="flex items-center space-x-2 bg-white p-2 rounded">
                          <input
                            type="text"
                            value={task.name}
                            onChange={(e) => handleTaskChange(day, period, task.id, 'name', e.target.value)}
                            className="border p-1 rounded flex-1"
                            placeholder="Nome da tarefa"
                          />
                          <input
                            type="number"
                            value={task.duration}
                            onChange={(e) => handleTaskChange(day, period, task.id, 'duration', parseInt(e.target.value, 10))}
                            className="border p-1 rounded w-16"
                            min="1"
                          />
                          <span className="text-xs text-gray-500">min</span>
                          <input
                            type="color"
                            value={task.color}
                            onChange={(e) => handleTaskChange(day, period, task.id, 'color', e.target.value)}
                            className="border p-1 rounded w-12 h-8"
                          />
                          <input
                            type="text"
                            value={task.icon}
                            onChange={(e) => handleTaskChange(day, period, task.id, 'icon', e.target.value)}
                            className="border p-1 rounded w-12 text-center"
                            placeholder="🎯"
                          />
                          <button 
                            onClick={() => handleDeleteTask(day, period, task.id)}
                            className="bg-red-500 text-white p-1 rounded text-sm hover:bg-red-600"
                          >
                            ×
                          </button>
                        </div>
                      ))}
                      
                      {/* Add Task Button */}
                      <button 
                        onClick={() => handleAddTask(day, period)}
                        className="w-full bg-green-500 text-white p-2 rounded mt-2 hover:bg-green-600"
                      >
                        + Adicionar Tarefa
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Add New Routine Section */}
      <div className="mt-8 border-t pt-6">
        <h3 className="text-xl font-semibold mb-4">Adicionar Nova Rotina</h3>
        <div className="flex items-center space-x-4 mb-4">
          <select 
            value={newRoutineDay}
            onChange={(e) => setNewRoutineDay(e.target.value)}
            className="border rounded px-3 py-2"
          >
            <option value="">Selecionar Dia</option>
            {daysOfWeek.map(day => (
              <option key={day} value={day}>{dayNames[day] || day}</option>
            ))}
          </select>
          
          <input
            type="text"
            value={newRoutinePeriod}
            onChange={(e) => setNewRoutinePeriod(e.target.value)}
            placeholder="Período (ex: morning, afternoon, night)"
            className="border rounded px-3 py-2 flex-1"
          />
          
          <input
            type="text"
            value={newRoutineName}
            onChange={(e) => setNewRoutineName(e.target.value)}
            placeholder="Nome da Rotina"
            className="border rounded px-3 py-2 flex-1"
          />
          
          <button 
            onClick={handleAddRoutine}
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
          >
            Criar Rotina
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex justify-end space-x-4 mt-8 pt-6 border-t">
        <button 
          onClick={onCancel}
          className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
        >
          Cancelar
        </button>
        <button 
          onClick={handleSave}
          className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
        >
          Salvar Alterações
        </button>
      </div>
    </div>
  );
};

export default DefaultRoutineEditor;