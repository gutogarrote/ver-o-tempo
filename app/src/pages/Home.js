import React, { useState } from 'react';
import Header from '../components/Header';
import Timeline from '../components/Timeline';
import AgoraCard from '../components/AgoraCard';
import { useRoutineState } from '../hooks/useRoutineState';

function Home({ routines, currentTime, onEditRoutine, onEditDefaults }) {
  const [routineId, setRoutineId] = useState('manha');
  const [isReorderMode, setIsReorderMode] = useState(false);

  const selectedRoutine = routines?.monday?.[routineId === 'manha' ? 'morning' : 'evening'];
  
  const handleEditRoutine = () => {
    if (selectedRoutine) {
      onEditRoutine(selectedRoutine);
    }
  };

  const handleReorderTasks = (reorderedTasks) => {
    // Update the routine with reordered tasks
    const updatedRoutine = {
      ...selectedRoutine,
      tasks: reorderedTasks
    };
    
    // Call the parent's edit routine handler to save the changes
    onEditRoutine(updatedRoutine, true); // true flag indicates this is a reorder, not full edit
  };
  
  // Always call hooks - pass null if no routine available
  const {
    deadlineStr,
    setDeadlineStr,
    useDeadline,
    setUseDeadline,
    startTime,
    endsAt,
    totalPct,
    currentTaskInfo,
    currentPct,
    totalMinutes,
    isPlaying,
    setIsPlaying,
    handleJumpToTask,
    startNow,
    startAtDefault
  } = useRoutineState(selectedRoutine, currentTime);

  if (!routines) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800 mb-2">Carregando...</div>
          <div className="text-gray-600">Preparando a rotina da Nina ✨</div>
        </div>
      </div>
    );
  }

  if (!routines) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800 mb-2">Carregando...</div>
          <div className="text-gray-600">Preparando a rotina da Nina ✨</div>
        </div>
      </div>
    );
  }

  if (!selectedRoutine) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-2xl font-bold text-gray-800 mb-2">Rotina não encontrada</div>
          <div className="text-gray-600">Verifique se os dados estão corretos</div>
          <div className="text-xs text-gray-400 mt-2">
            Routine ID: {routineId}, Available: {JSON.stringify(Object.keys(routines?.monday || {}))}
          </div>
        </div>
      </div>
    );
  }

  const currentTask = selectedRoutine.tasks[currentTaskInfo.index];
  const inTaskRemaining = currentTask ? currentTask.minutes - currentTaskInfo.inTaskElapsed : 0;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        routineId={routineId} 
        setRoutineId={setRoutineId}
        onEditRoutine={handleEditRoutine}
        onEditDefaults={onEditDefaults}
        onToggleReorder={() => setIsReorderMode(!isReorderMode)}
        isReorderMode={isReorderMode}
      />
      
      <main className="pb-6">
        <Timeline
          tasks={selectedRoutine.tasks}
          totalMinutes={totalMinutes}
          currentIdx={currentTaskInfo.index}
          totalPct={totalPct}
          onJump={handleJumpToTask}
          onReorderTasks={handleReorderTasks}
          deadlineStr={deadlineStr}
          setDeadlineStr={setDeadlineStr}
          useDeadline={useDeadline}
          setUseDeadline={setUseDeadline}
          startTime={startTime}
          endsAt={endsAt}
          isEditMode={isReorderMode}
        />

        <AgoraCard
          current={currentTask}
          currentPct={currentPct}
          endsAt={endsAt}
          inTaskRemaining={inTaskRemaining}
          isPlaying={isPlaying}
          setIsPlaying={setIsPlaying}
          startNow={startNow}
          startAtDefault={startAtDefault}
          totalPct={totalPct}
          currentTime={currentTime}
        />

        {/* Tip section */}
        <section className="mt-6 mx-auto max-w-3xl px-4">
          <div className="rounded-2xl border border-slate-200 bg-amber-50 p-3 text-amber-900 text-xs">
            <div className="flex items-center gap-2">
              <span>📺</span>
              <p>Use tela cheia. Toque na linha do tempo para pular para uma tarefa. Ative o "Horário limite" para sincronizar o término.</p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}

export default Home;