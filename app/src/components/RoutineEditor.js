import React, { useState } from 'react';

const RoutineEditor = ({ routine, onSave }) => {
  const [tasks, setTasks] = useState(routine.tasks);

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

  const handleSave = () => {
    onSave({ ...routine, tasks });
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Edit Routine: {routine.name}</h2>
      <div>
        {tasks.map(task => (
          <div key={task.id} className="flex items-center space-x-2 mb-2">
            <input
              type="text"
              value={task.name}
              onChange={(e) => handleTaskChange(task.id, 'name', e.target.value)}
              className="border p-1 rounded w-full"
            />
            <input
              type="number"
              value={task.duration}
              onChange={(e) => handleTaskChange(task.id, 'duration', parseInt(e.target.value, 10))}
              className="border p-1 rounded w-20"
            />
            <input
              type="color"
              value={task.color}
              onChange={(e) => handleTaskChange(task.id, 'color', e.target.value)}
              className="border p-1 rounded"
            />
            <input
              type="text"
              value={task.icon}
              onChange={(e) => handleTaskChange(task.id, 'icon', e.target.value)}
              className="border p-1 rounded w-12"
            />
            <button onClick={() => handleDeleteTask(task.id)} className="bg-red-500 text-white p-1 rounded">X</button>
          </div>
        ))}
      </div>
      <button onClick={handleAddTask} className="bg-green-500 text-white p-2 rounded mt-4">Add Task</button>
      <button onClick={handleSave} className="bg-blue-500 text-white p-2 rounded mt-4 ml-2">Save Routine</button>
    </div>
  );
};

export default RoutineEditor;
