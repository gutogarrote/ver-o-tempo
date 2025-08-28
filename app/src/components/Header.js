import React from 'react';

export function Header({ routineId, setRoutineId, onEditRoutine, onEditDefaults, onToggleReorder, isReorderMode }) {
  const routineOptions = [
    { id: "manha", label: "Manhã" },
    { id: "noite", label: "Noite" }
  ];

  return (
    <header className="bg-white shadow-sm">
      {/* Mobile: Stack layout */}
      <div className="flex flex-col gap-3 p-4 sm:hidden">
        <h1 className="text-2xl font-extrabold tracking-tight text-gray-800 text-center">
          Rotina da Nina ✨
        </h1>
        
        {/* Mobile: Routine Selector */}
        <div className="flex rounded-2xl bg-slate-100 p-1 shadow-inner">
          {routineOptions.map(opt => (
            <button
              key={opt.id}
              onClick={() => setRoutineId(opt.id)}
              className={
                "flex-1 px-4 py-3 text-base rounded-2xl transition touch-manipulation " +
                (routineId === opt.id 
                  ? "bg-white shadow font-semibold text-gray-800" 
                  : "text-slate-600 hover:text-slate-800")
              }
            >
              {opt.label}
            </button>
          ))}
        </div>

        {/* Mobile: Edit Buttons */}
        <div className="flex gap-2">
          <button 
            onClick={isReorderMode ? onToggleReorder : onEditRoutine}
            className={`flex-1 px-4 py-3 text-base font-semibold rounded-lg transition touch-manipulation min-h-[44px] flex items-center justify-center ${
              isReorderMode 
                ? 'bg-green-500 hover:bg-green-600 text-white' 
                : 'bg-blue-500 hover:bg-blue-600 text-white'
            }`}
            title={isReorderMode ? "Salvar ordem" : "Editar rotina atual"}
          >
            {isReorderMode ? '✅ Salvar' : '✏️ Editar'}
          </button>
          <button 
            onClick={isReorderMode ? onToggleReorder : onToggleReorder}
            className={`flex-1 px-4 py-3 text-base font-semibold rounded-lg transition touch-manipulation min-h-[44px] flex items-center justify-center ${
              isReorderMode 
                ? 'bg-gray-500 hover:bg-gray-600 text-white' 
                : 'bg-purple-500 hover:bg-purple-600 text-white'
            }`}
            title={isReorderMode ? "Cancelar reordenação" : "Reordenar tarefas"}
          >
            {isReorderMode ? '❌ Cancelar' : '↔️ Reordenar'}
          </button>
          {!isReorderMode && (
            <button 
              onClick={onEditDefaults}
              className="flex-1 px-4 py-3 text-base bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition touch-manipulation min-h-[44px] flex items-center justify-center"
              title="Editar todas as rotinas"
            >
              ⚙️ Rotinas
            </button>
          )}
        </div>
      </div>

      {/* Desktop: Original horizontal layout */}
      <div className="hidden sm:flex items-center justify-between gap-4 p-4">
        <h1 className="text-3xl md:text-4xl font-extrabold tracking-tight text-gray-800">
          Rotina da Nina ✨
        </h1>
        
        <div className="flex items-center gap-4">
          {/* Routine Selector */}
          <div className="flex rounded-2xl bg-slate-100 p-1 shadow-inner">
            {routineOptions.map(opt => (
              <button
                key={opt.id}
                onClick={() => setRoutineId(opt.id)}
                className={
                  "px-4 py-2 text-sm md:text-base rounded-2xl transition " +
                  (routineId === opt.id 
                    ? "bg-white shadow font-semibold text-gray-800" 
                    : "text-slate-600 hover:text-slate-800")
                }
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Edit Buttons */}
          <div className="flex gap-2">
            <button 
              onClick={isReorderMode ? onToggleReorder : onEditRoutine}
              className={`px-3 py-2 text-sm font-semibold rounded-lg transition ${
                isReorderMode 
                  ? 'bg-green-500 hover:bg-green-600 text-white' 
                  : 'bg-blue-500 hover:bg-blue-600 text-white'
              }`}
              title={isReorderMode ? "Salvar ordem" : "Editar rotina atual"}
            >
              {isReorderMode ? '✅ Salvar' : '✏️ Editar'}
            </button>
            <button 
              onClick={onToggleReorder}
              className={`px-3 py-2 text-sm font-semibold rounded-lg transition ${
                isReorderMode 
                  ? 'bg-gray-500 hover:bg-gray-600 text-white' 
                  : 'bg-purple-500 hover:bg-purple-600 text-white'
              }`}
              title={isReorderMode ? "Cancelar reordenação" : "Reordenar tarefas"}
            >
              {isReorderMode ? '❌ Cancelar' : '↔️ Reordenar'}
            </button>
            {!isReorderMode && (
              <button 
                onClick={onEditDefaults}
                className="px-3 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition"
                title="Editar todas as rotinas"
              >
                ⚙️ Rotinas
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;