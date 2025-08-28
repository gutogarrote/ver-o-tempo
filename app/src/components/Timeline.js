import React from 'react';
import { formatTime } from '../lib/time';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Sortable Task Component
function SortableTask({ task, index, widthPct, isCurrent, totalMinutes, onJump, isEditMode }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    width: `${widthPct}%`,
    backgroundColor: task?.color || '#gray',
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  return (
    <button
      ref={setNodeRef}
      style={style}
      onClick={() => !isEditMode && onJump && onJump(index)}
      className={`sortable-item timeline-task relative flex-none h-24 sm:h-32 md:h-40 lg:h-48 focus:outline-none transition-all duration-200 active:scale-[0.98] focus-visible:ring-4 focus-visible:ring-offset-2 focus-visible:ring-blue-500 hover:brightness-110 touch-manipulation ${
        isDragging ? 'dragging' : ''
      } ${isEditMode ? 'cursor-move' : 'cursor-pointer'}`}
      title={`${task?.name || 'Task'} — ${task?.minutes || 0} min`}
      aria-label={`${isEditMode ? 'Arrastar' : 'Pular para'} ${task?.name || 'Task'}`}
      {...(isEditMode ? { ...attributes, ...listeners } : {})}
    >
      {/* Drag Handle - only visible in edit mode */}
      {isEditMode && (
        <div className="drag-handle absolute top-1 left-1 z-10 bg-black/30 backdrop-blur rounded p-1.5 border border-white/20">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" className="text-white">
            <circle cx="4" cy="4" r="1.5"/>
            <circle cx="12" cy="4" r="1.5"/>
            <circle cx="4" cy="8" r="1.5"/>
            <circle cx="12" cy="8" r="1.5"/>
            <circle cx="4" cy="12" r="1.5"/>
            <circle cx="12" cy="12" r="1.5"/>
          </svg>
        </div>
      )}
      
      <div className="absolute inset-0 p-2 md:p-4">
        <div className="flex h-full w-full flex-col items-center justify-center text-white/95 drop-shadow-sm text-center">
          <div className="text-3xl md:text-4xl lg:text-5xl leading-none mb-1">{task?.icon || '⭕'}</div>
          {/* Show text only on md+ screens */}
          <div className="w-full hidden md:block">
            <div className="text-sm font-semibold leading-tight whitespace-normal break-words px-1">
              {task?.name || 'Task'}
            </div>
            <div className="text-xs opacity-90 mt-1">{task?.minutes || 0} min</div>
          </div>
          {/* Mobile: Show only duration below icon */}
          <div className="text-xs opacity-90 mt-1 md:hidden font-medium">
            {task?.minutes || 0}m
          </div>
        </div>
      </div>
      {isCurrent && (
        <div className="absolute inset-0 ring-2 md:ring-4 ring-white/80 shadow-lg pointer-events-none animate-pulse" />
      )}
    </button>
  );
}

export function Timeline({ 
  tasks, 
  totalMinutes, 
  currentIdx, 
  totalPct, 
  onJump, 
  onReorderTasks,
  deadlineStr, 
  setDeadlineStr, 
  useDeadline, 
  setUseDeadline, 
  startTime, 
  endsAt,
  isEditMode = false
}) {
  // Set up sensors for drag and drop (must be before early return)
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  if (!tasks || tasks.length === 0) return null;

  // Handle drag end event
  const handleDragEnd = (event) => {
    const { active, over } = event;

    if (active.id !== over.id) {
      const oldIndex = tasks.findIndex(task => task.id === active.id);
      const newIndex = tasks.findIndex(task => task.id === over.id);
      
      const reorderedTasks = arrayMove(tasks, oldIndex, newIndex);
      onReorderTasks && onReorderTasks(reorderedTasks);
    }
  };

  // Ensure tasks have IDs for dnd-kit
  const tasksWithIds = tasks.map((task, index) => ({
    ...task,
    id: task.id || `task-${index}`
  }));

  return (
    <section className="w-full px-3 md:px-6 pt-4">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">

        {/* Legend ABOVE - Scrollable on mobile */}
        <div className="mb-3 overflow-x-auto">
          <div className="flex gap-3 text-xs justify-center md:flex-wrap md:justify-center pb-2">
            {tasksWithIds.map((t, i) => (
              <div key={t.id} className="flex items-center gap-2 whitespace-nowrap flex-shrink-0">
                <span 
                  className="inline-block size-3 rounded flex-shrink-0" 
                  style={{ backgroundColor: t.color }} 
                />
                <span className="text-slate-600">{t.icon} {t.name}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Header + deadline control */}
        <div className="mb-4 space-y-3 md:space-y-0 md:flex md:items-center md:justify-between md:gap-3">
          <div className="text-slate-500 text-xs uppercase tracking-wide text-center md:text-left">
            {isEditMode ? '↔️ Arraste as tarefas para reordenar' : 'Linha do tempo'}
          </div>
          {!isEditMode && (
            <div className="flex flex-col sm:flex-row items-center gap-3 sm:gap-2 text-xs">
              <label className="text-slate-600 text-center sm:text-left">Horário limite:</label>
              <div className="flex items-center gap-3">
                <input 
                  type="time" 
                  className="rounded-lg border border-slate-300 px-3 py-2 text-slate-700 min-h-[44px] text-base md:text-xs md:min-h-0 md:px-2 md:py-1" 
                  value={deadlineStr} 
                  onChange={e => setDeadlineStr(e.target.value)} 
                />
                <label className="inline-flex items-center gap-2 text-slate-700 min-h-[44px] md:min-h-0">
                  <input 
                    type="checkbox" 
                    className="scale-125 md:scale-100"
                    checked={useDeadline} 
                    onChange={e => setUseDeadline(e.target.checked)} 
                  />
                  <span>Ativar</span>
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Timeline with drag and drop */}
        <div className={`relative w-full overflow-hidden rounded-2xl ${isEditMode ? 'timeline-edit-mode' : ''}`}>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleDragEnd}
          >
            <SortableContext items={tasksWithIds.map(t => t.id)} strategy={horizontalListSortingStrategy}>
              <div className="flex w-full" style={{ minHeight: '96px' }}>
                {tasksWithIds.map((task, index) => {
                  const widthPct = ((task?.minutes || 0) / totalMinutes) * 100;
                  const isCurrent = index === currentIdx;
                  
                  return (
                    <SortableTask
                      key={task.id}
                      task={task}
                      index={index}
                      widthPct={widthPct}
                      isCurrent={isCurrent}
                      totalMinutes={totalMinutes}
                      onJump={onJump}
                      isEditMode={isEditMode}
                    />
                  );
                })}
              </div>
            </SortableContext>

            {/* Now marker - only show in normal mode */}
            {!isEditMode && (
              <div 
                className="pointer-events-none absolute top-0 bottom-0 w-0.5 bg-white shadow [filter:drop-shadow(0_0_4px_rgba(0,0,0,0.4))]" 
                style={{ left: `${Math.min(totalPct * 100, 100)}%` }} 
              />
            )}
          </DndContext>
        </div>

        {/* Start/End labels - only show in normal mode */}
        {!isEditMode && (
          <div className="mt-2 flex justify-between text-xs text-slate-500">
            <span>Início: {startTime ? formatTime(startTime) : '--:--'}</span>
            <span>Previsto: {endsAt ? formatTime(endsAt) : '--:--'}</span>
          </div>
        )}
      </div>
    </section>
  );
}


export default Timeline;
