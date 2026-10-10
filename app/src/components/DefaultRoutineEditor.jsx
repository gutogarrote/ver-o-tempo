import React, { useState } from 'react';
import { VALID_MINUTES_HINT, parseMinutes } from '../lib/routineDraft';

// Durations follow the same rule as the edit mode: typed text is kept as is while typing, and
// Salvar Alterações stays disabled until every task has a whole number from 1 to 180 minutes.
const MINUTES_ERROR_ID = 'full-editor-minutes-error';

const DefaultRoutineEditor = ({ routines, onSave, onCancel }) => {
  const [editableRoutines, setEditableRoutines] = useState(() => {
    const clone = JSON.parse(JSON.stringify(routines));
    Object.keys(clone || {}).forEach((day) => {
      Object.keys(clone[day] || {}).forEach((period) => {
        const r = clone[day][period];
        if (r && Array.isArray(r.tasks)) {
          r.tasks = r.tasks.map((t) => {
            const minutes = t.minutes ?? t.duration ?? 0;
            const { duration, ...rest } = t;
            return { ...rest, minutes };
          });
        }
      });
    });
    return clone;
  });
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
      minutes: 10, 
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

  // Reorder task up/down
  const handleMoveTask = (day, period, taskId, direction) => {
    setEditableRoutines(prev => {
      const curr = prev[day][period];
      const arr = curr.tasks.slice();
      const idx = arr.findIndex(t => t.id === taskId);
      if (idx === -1) return prev;
      const delta = direction === 'up' ? -1 : 1;
      const newIdx = idx + delta;
      if (newIdx < 0 || newIdx >= arr.length) return prev;
      const [item] = arr.splice(idx, 1);
      arr.splice(newIdx, 0, item);
      return {
        ...prev,
        [day]: {
          ...prev[day],
          [period]: {
            ...curr,
            tasks: arr
          }
        }
      };
    });
  };

  // Drag & drop within a routine list
  const isDesktop = typeof window !== 'undefined' && ((window.matchMedia && window.matchMedia('(pointer: fine)').matches) || (window.innerWidth >= 768));
  const handleDragStart = (e, day, period, taskId) => {
    // Only use taskId; we'll verify it exists in the target list
    e.dataTransfer.setData('text/plain', String(taskId));
    e.dataTransfer.effectAllowed = 'move';
  };
  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };
  const handleDrop = (e, day, period, targetTaskId) => {
    e.preventDefault();
    const sourceId = Number(e.dataTransfer.getData('text/plain'));
    if (!sourceId || sourceId === targetTaskId) return;
    setEditableRoutines(prev => {
      const curr = prev[day][period];
      const arr = curr.tasks.slice();
      const from = arr.findIndex(t => t.id === sourceId);
      const to = arr.findIndex(t => t.id === targetTaskId);
      if (from < 0 || to < 0) return prev; // ignore cross-list drops
      const [item] = arr.splice(from, 1);
      arr.splice(to, 0, item);
      return {
        ...prev,
        [day]: {
          ...prev[day],
          [period]: { ...curr, tasks: arr }
        }
      };
    });
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
        { id: 1, name: 'Primeira Tarefa', minutes: 15, color: '#FBBF24', icon: '⭐' }
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

  const invalidMinutes = [];
  Object.keys(editableRoutines || {}).forEach((day) => {
    Object.keys(editableRoutines[day] || {}).forEach((period) => {
      (editableRoutines[day][period]?.tasks || []).forEach((t) => {
        if (parseMinutes(t.minutes) === null) invalidMinutes.push(`${editableRoutines[day][period].name || period}: ${t.name || 'tarefa sem nome'}`);
      });
    });
  });

  const handleSave = () => {
    if (invalidMinutes.length) return;
    const clean = JSON.parse(JSON.stringify(editableRoutines));
    Object.keys(clean || {}).forEach((day) => {
      Object.keys(clean[day] || {}).forEach((period) => {
        const r = clean[day][period];
        if (r && Array.isArray(r.tasks)) {
          r.tasks = r.tasks.map((t) => {
            return {
              ...t,
              id: t.id,
              name: t.name,
              icon: t.icon,
              color: t.color,
              minutes: parseMinutes(t.minutes),
            };
          });
        }
      });
    });
    onSave(clean);
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

  // Same look as the main screen (cream, ink, sun-yellow primary) and the same rules as its
  // edit mode: ▲/▼ swap neighbours (disabled at the ends), Cancelar discards the draft,
  // Salvar Alterações writes once.
  const btn = 'inline-flex items-center justify-center gap-1 min-h-[44px] px-5 rounded-full font-extrabold whitespace-nowrap transition active:translate-y-px active:scale-[.98] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-[#2A2118] disabled:opacity-40 disabled:cursor-not-allowed';
  const white = `${btn} bg-white text-[#2A2118] shadow-[0_2px_0_rgba(0,0,0,.18)] hover:brightness-95`;
  const primary = `${btn} bg-[#FFB703] text-[#2A2118] shadow-[0_3px_0_#E09A00] hover:brightness-95`;
  const danger = `${btn} bg-white text-[#E5484D] shadow-[inset_0_0_0_2px_#E5484D] hover:bg-[#FFE9E6]`;
  const arrow = 'w-11 h-9 shrink-0 rounded-xl bg-white text-[#2A2118] text-sm font-black shadow-[0_2px_0_rgba(0,0,0,.18)] transition active:translate-y-px focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#2A2118] disabled:opacity-35 disabled:shadow-none disabled:cursor-not-allowed';
  const field = 'border-2 border-[#F1E2C9] rounded-xl px-2 py-1.5 bg-white text-[#2A2118] font-bold focus:outline-none focus:border-[#E09A00]';

  return (
    <div className="bg-white p-4 sm:p-6 rounded-[28px] shadow-[0_6px_0_rgba(0,0,0,.06)] max-w-6xl mx-auto text-[#2A2118]">
      <h2 className="text-2xl sm:text-3xl font-semibold mb-1" style={{ fontFamily: 'Fredoka, sans-serif' }}>Editar Rotinas Padrão</h2>
      <p className="text-[#9A866B] font-bold mb-6">Todas as rotinas e horários finais. Para ajustar só a rotina que está na tela, use ✏️ Editar na tela principal.</p>

      {/* Existing Routines */}
      <div className="grid gap-6">
        {Object.keys(editableRoutines).map(day => (
          <div key={day} className="rounded-3xl p-4 bg-[#FFF6E9]">
            <h3 className="text-xl font-extrabold mb-4 capitalize text-[#9A866B] tracking-wide">
              {dayNames[day] || day}
            </h3>

            <div className="grid md:grid-cols-2 gap-6">
              {Object.keys(editableRoutines[day]).map(period => {
                const routine = editableRoutines[day][period];
                return (
                  <div key={period} className="rounded-2xl p-3 sm:p-4 bg-[#EADFCB]">
                    {/* Routine Header */}
                    <div className="flex flex-wrap justify-between items-center gap-3 mb-4">
                      <div className="flex flex-wrap items-center gap-3">
                        <input
                          type="text"
                          value={routine.name}
                          onChange={(e) => handleRoutineChange(day, period, 'name', e.target.value)}
                          className={`${field} text-lg w-44`}
                          aria-label="Nome da rotina"
                        />
                        <div className="flex items-center gap-2">
                          <label className="text-sm font-extrabold text-[#9A866B]">Fim:</label>
                          <input
                            type="time"
                            value={routine.endTime}
                            onChange={(e) => handleRoutineChange(day, period, 'endTime', e.target.value)}
                            className={field}
                            aria-label={`Horário final de ${routine.name}`}
                          />
                        </div>
                      </div>
                      <button
                        onClick={() => handleDeleteRoutine(day, period)}
                        className={`${danger} text-sm min-h-[40px] px-4`}
                      >
                        Excluir Rotina
                      </button>
                    </div>

                    {/* Tasks */}
                    <div className="space-y-2">
                      {routine.tasks.map((task, index) => (
                        <div
                          key={task.id}
                          className="flex flex-wrap sm:flex-nowrap items-center gap-2 p-2 rounded-2xl"
                          style={{ background: task.color || '#CCCCCC' }}
                          draggable={isDesktop}
                          onDragStart={(e) => handleDragStart(e, day, period, task.id)}
                          onDragOver={handleDragOver}
                          onDrop={(e) => handleDrop(e, day, period, task.id)}
                        >
                          <div
                            className="hidden md:flex items-center justify-center w-5 h-10 text-white/90 cursor-move select-none"
                            title="Arraste para reordenar"
                          >
                            ⋮⋮
                          </div>
                          <div className="flex shrink-0 gap-1">
                            <button
                              type="button"
                              onClick={() => handleMoveTask(day, period, task.id, 'up')}
                              className={arrow}
                              aria-label="Mover tarefa para cima"
                              disabled={index === 0}
                            >
                              ▲
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveTask(day, period, task.id, 'down')}
                              className={arrow}
                              aria-label="Mover tarefa para baixo"
                              disabled={index === routine.tasks.length - 1}
                            >
                              ▼
                            </button>
                          </div>
                          <input
                            type="text"
                            value={task.icon}
                            onChange={(e) => handleTaskChange(day, period, task.id, 'icon', e.target.value)}
                            className={`${field} text-center ${task.catalogIds?.length > 1 ? 'w-24' : 'w-12'}`}
                            placeholder="🎯"
                            aria-label="Ícone"
                          />
                          <input
                            type="text"
                            value={task.name}
                            onChange={(e) => handleTaskChange(day, period, task.id, 'name', e.target.value)}
                            className={`${field} flex-1 min-w-[8rem]`}
                            placeholder="Nome da tarefa"
                          />
                          <span className="inline-flex shrink-0 items-center gap-1 bg-white rounded-xl pr-2">
                            <input
                              type="number"
                              value={task.minutes ?? ''}
                              onChange={(e) => handleTaskChange(day, period, task.id, 'minutes', e.target.value)}
                              className={`${field} w-16 border-0 ${parseMinutes(task.minutes) === null ? 'bg-[#FFE9E6] text-[#E5484D] ring-[3px] ring-[#E5484D]' : ''}`}
                              min="1"
                              max="180"
                              step="1"
                              aria-label="Minutos"
                              aria-invalid={parseMinutes(task.minutes) === null || undefined}
                              aria-describedby={parseMinutes(task.minutes) === null ? MINUTES_ERROR_ID : undefined}
                            />
                            <span className="text-xs font-extrabold text-[#9A866B]">min</span>
                          </span>
                          <input
                            type="color"
                            value={task.color}
                            onChange={(e) => handleTaskChange(day, period, task.id, 'color', e.target.value)}
                            className="w-11 h-9 shrink-0 rounded-xl bg-white p-1 border-0"
                            aria-label="Cor"
                          />
                          <button
                            onClick={() => handleDeleteTask(day, period, task.id)}
                            className="w-11 h-9 shrink-0 rounded-xl bg-white text-[#E5484D] font-black shadow-[0_2px_0_rgba(0,0,0,.18)] transition active:translate-y-px hover:bg-[#FFE9E6] focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-[#2A2118]"
                            aria-label="Remover tarefa"
                            title="Remover tarefa"
                          >
                            ×
                          </button>
                        </div>
                      ))}

                      {/* Add Task Button */}
                      <button
                        onClick={() => handleAddTask(day, period)}
                        className={`${white} w-full mt-2`}
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
      <div className="mt-8 pt-6 border-t-2 border-[#F1E2C9]">
        <h3 className="text-xl font-extrabold mb-4">Adicionar Nova Rotina</h3>
        <div className="flex flex-wrap items-center gap-3 mb-4">
          <select
            value={newRoutineDay}
            onChange={(e) => setNewRoutineDay(e.target.value)}
            className={`${field} min-h-[44px]`}
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
            className={`${field} min-h-[44px] flex-1 min-w-[12rem]`}
          />

          <input
            type="text"
            value={newRoutineName}
            onChange={(e) => setNewRoutineName(e.target.value)}
            placeholder="Nome da Rotina"
            className={`${field} min-h-[44px] flex-1 min-w-[10rem]`}
          />

          <button
            onClick={handleAddRoutine}
            className={white}
          >
            Criar Rotina
          </button>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="sticky bottom-0 flex flex-wrap items-center justify-end gap-3 mt-8 pt-4 pb-2 border-t-2 border-[#F1E2C9] bg-white">
        {invalidMinutes.length > 0 && (
          <div id={MINUTES_ERROR_ID} role="alert" className="mr-auto rounded-xl bg-[#FFE9E6] text-[#E5484D] font-extrabold px-3 py-2 shadow-[inset_0_0_0_2px_#E5484D]">
            ⚠️ Duração inválida em {invalidMinutes.join(', ')}. {VALID_MINUTES_HINT} Corrija para poder salvar.
          </div>
        )}
        <button
          onClick={onCancel}
          className={white}
        >
          Cancelar
        </button>
        <button
          onClick={handleSave}
          className={primary}
          disabled={invalidMinutes.length > 0}
          aria-describedby={invalidMinutes.length ? MINUTES_ERROR_ID : undefined}
        >
          Salvar Alterações
        </button>
      </div>
    </div>
  );
};

export default DefaultRoutineEditor;
