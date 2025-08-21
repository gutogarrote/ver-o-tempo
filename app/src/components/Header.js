import React from 'react';

export function Header({ routineId, setRoutineId, onEditRoutine, onEditDefaults }) {
  const routineOptions = [
    { id: "manha", label: "Manhã" },
    { id: "noite", label: "Noite" }
  ];

  return (
    <header className="flex items-center justify-between gap-4 p-4 bg-white shadow-sm">
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
            onClick={onEditRoutine}
            className="px-3 py-2 text-sm bg-blue-500 hover:bg-blue-600 text-white font-semibold rounded-lg transition"
            title="Editar rotina atual"
          >
            ✏️ Editar
          </button>
          <button 
            onClick={onEditDefaults}
            className="px-3 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg transition"
            title="Editar todas as rotinas"
          >
            ⚙️ Rotinas
          </button>
        </div>
      </div>
    </header>
  );
}

export default Header;