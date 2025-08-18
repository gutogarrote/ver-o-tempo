import React, { useState } from 'react';

const RoutineEditor = ({ routine, onSave }) => {
  const [tasks, setTasks] = useState(routine?.tasks || []);
  
  // Guard against null routine
  if (!routine || !routine.tasks) {
    return <div className="bg-white p-4 rounded-lg shadow-md">Error: No routine selected</div>;
  }

  const handleAddTask = () => {
    const newTask = { id: Date.now(), name: 'New Task', duration: 10, color: '#CCCCCC', icon: '✨' };
    setTasks([...tasks, newTask]);
  };

  const handleDeleteTask = (taskId) => {
    setTasks(tasks.filter(task => task.id !== taskId));
  };

  const handleTaskChange = (taskId, field, value) => {
    setTasks(tasks.map(task => (task.id === taskId ? { ...task, [field]: value } : task)));
  };

  // Move task up or down in the list
  const handleMoveTask = (taskId, direction) => {
    const taskIndex = tasks.findIndex(task => task.id === taskId);
    if (taskIndex === -1) return;

    const newTasks = [...tasks];
    const targetIndex = direction === 'up' ? taskIndex - 1 : taskIndex + 1;

    // Check bounds
    if (targetIndex < 0 || targetIndex >= tasks.length) return;

    // Swap tasks
    [newTasks[taskIndex], newTasks[targetIndex]] = [newTasks[targetIndex], newTasks[taskIndex]];
    setTasks(newTasks);
  };

  const handleSave = () => {
    onSave({ ...routine, tasks });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Edit Routine: {routine.name}</h2>
      <div>
        {tasks.map((task, index) => (
          <div key={task.id} className="flex items-center space-x-2 mb-2 p-2 bg-gray-50 rounded">
            {/* Reorder buttons */}
            <div className="flex flex-col space-y-1">
              <button 
                onClick={() => handleMoveTask(task.id, 'up')}
                disabled={index === 0}
                className={`text-xs px-1 py-0.5 rounded ${
                  index === 0 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
                title="Move up"
              >
                ↑
              </button>
              <button 
                onClick={() => handleMoveTask(task.id, 'down')}
                disabled={index === tasks.length - 1}
                className={`text-xs px-1 py-0.5 rounded ${
                  index === tasks.length - 1 
                    ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                    : 'bg-blue-500 text-white hover:bg-blue-600'
                }`}
                title="Move down"
              >
                ↓
              </button>
            </div>

            {/* Task order number */}
            <div className="text-sm text-gray-500 font-mono w-6 text-center">
              {index + 1}.
            </div>

            {/* Task inputs */}
            <input
              type="text"
              value={task.name}
              onChange={(e) => handleTaskChange(task.id, 'name', e.target.value)}
              className="border p-1 rounded flex-1"
              placeholder="Task name"
            />
            <input
              type="number"
              value={task.duration}
              onChange={(e) => handleTaskChange(task.id, 'duration', parseInt(e.target.value, 10))}
              className="border p-1 rounded w-16 text-center"
              min="1"
            />
            <span className="text-xs text-gray-500">min</span>
            
            <input
              type="color"
              value={task.color}
              onChange={(e) => handleTaskChange(task.id, 'color', e.target.value)}
              className="border p-1 rounded w-12 h-10"
            />
            
            {/* Larger icon input */}
            <input
              type="text"
              value={task.icon}
              onChange={(e) => handleTaskChange(task.id, 'icon', e.target.value)}
              className="border p-2 rounded w-16 h-10 text-center text-lg"
              placeholder="🎯"
              title="Enter emoji icon"
            />
            
            <button 
              onClick={() => handleDeleteTask(task.id)} 
              className="bg-red-500 text-white px-2 py-1 rounded hover:bg-red-600"
              title="Delete task"
            >
              ×
            </button>
          </div>
        ))}
      </div>
      <button onClick={handleAddTask} className="bg-green-500 text-white p-2 rounded mt-4">Add Task</button>
      <button onClick={handleSave} className="bg-blue-500 text-white p-2 rounded mt-4 ml-2">Save Routine</button>
    </div>
  );
};

export default RoutineEditor;
