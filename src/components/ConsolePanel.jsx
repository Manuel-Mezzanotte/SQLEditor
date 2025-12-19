import React, { useEffect, useRef } from "react";
import { Terminal, Variable, Trash2, GitBranch, CheckCircle, XCircle, RefreshCw, ArrowRight } from "lucide-react";

export const ConsolePanel = ({ 
  logs = [], 
  variables = {}, 
  theme, 
  onClear,
  pendingDecision, 
  onDecision 
}) => {
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, pendingDecision]);

  return (
    <div
      className={`h-48 border-t flex flex-col transition-colors duration-300 relative ${
        theme === "dark"
          ? "bg-[#1e1e1e] border-zinc-700"
          : "bg-white border-slate-200"
      }`}
    >
      <div
        className={`flex items-center justify-between px-4 py-2 border-b text-xs font-bold uppercase tracking-wider select-none ${
          theme === "dark"
            ? "bg-[#252526] border-zinc-700 text-zinc-400"
            : "bg-slate-50 border-slate-200 text-slate-500"
        }`}
      >
        <div className="flex gap-4">
          <div className="flex items-center gap-2 cursor-pointer hover:text-indigo-500 transition-colors">
            <Terminal className="w-3.5 h-3.5" />
            <span>Output</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                theme === "dark" ? "bg-zinc-700" : "bg-slate-200"
              }`}
            >
              {logs.length}
            </span>
          </div>
          <div className="flex items-center gap-2 cursor-pointer hover:text-emerald-500 transition-colors">
            <Variable className="w-3.5 h-3.5" />
            <span>Variables</span>
            <span
              className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                theme === "dark" ? "bg-zinc-700" : "bg-slate-200"
              }`}
            >
              {Object.keys(variables).length}
            </span>
          </div>
        </div>
        <button
          onClick={onClear}
          title="Pulisci Console"
          className={`p-1 rounded hover:bg-red-500/10 hover:text-red-500 transition-colors ${
            theme === "dark" ? "text-zinc-500" : "text-slate-400"
          }`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden relative">
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto p-2 font-mono text-xs space-y-1 pb-20" 
        >
          {logs.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center opacity-30 select-none">
              <Terminal className="w-8 h-8 mb-2" />
              <span>Pronto per l'esecuzione</span>
            </div>
          ) : (
            logs.map((log, i) => (
              <div
                key={i}
                className={`break-words flex gap-2 ${
                  log.startsWith(">")
                    ? theme === "dark"
                      ? "text-emerald-400"
                      : "text-emerald-600 font-bold"
                    : theme === "dark"
                    ? "text-zinc-300"
                    : "text-slate-700"
                }`}
              >
                <span className="opacity-30 select-none shrink-0 w-14 text-right">
                  {new Date().toLocaleTimeString('it-IT', { hour12: false, hour: '2-digit', minute:'2-digit', second:'2-digit' })}
                </span>
                <span>{log}</span>
              </div>
            ))
          )}
        </div>

        <div
          className={`w-64 border-l overflow-y-auto p-2 ${
            theme === "dark" ? "border-zinc-700 bg-[#252526]" : "border-slate-200 bg-slate-50"
          }`}
        >
          <div
            className={`text-[10px] font-bold uppercase mb-2 ${
              theme === "dark" ? "text-zinc-500" : "text-slate-400"
            }`}
          >
            Watch Window
          </div>
          {Object.keys(variables).length === 0 ? (
            <div className="text-xs opacity-40 italic text-center mt-4">Nessuna variabile attiva</div>
          ) : (
            <div className="space-y-1">
              {Object.entries(variables).map(([key, val]) => (
                <div
                  key={key}
                  className={`flex justify-between items-center text-xs p-1.5 rounded border ${
                    theme === "dark" 
                        ? "bg-black/20 border-zinc-800" 
                        : "bg-white border-slate-200"
                  }`}
                >
                  <span className="font-mono text-indigo-500 font-semibold">{key}</span>
                  <span
                    className={`font-mono truncate max-w-[100px] ${
                      theme === "dark" ? "text-zinc-300" : "text-slate-700"
                    }`}
                    title={val}
                  >
                    {val}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* DECISION OVERLAY */}
        {pendingDecision && (
          <div className={`absolute bottom-4 left-4 right-72 z-20 p-3 rounded-lg shadow-xl border flex flex-wrap items-center justify-between gap-4 animate-in slide-in-from-bottom-2 duration-300 ${
             theme === 'dark' 
                ? 'bg-zinc-800 border-amber-500/50 text-zinc-100 shadow-black/50' 
                : 'bg-white border-amber-300 text-slate-800 shadow-amber-100'
          }`}>
             <div className="flex items-center gap-3 min-w-[200px]">
                <div className={`p-2 rounded-full ${theme === 'dark' ? 'bg-amber-500/20 text-amber-500' : 'bg-amber-100 text-amber-600'}`}>
                   <GitBranch className="w-5 h-5" />
                </div>
                <div>
                   <div className="text-[10px] font-bold uppercase opacity-60">
                       {pendingDecision.type === 'CASE' ? 'Scegli Percorso' : 'Decisione Richiesta'}
                   </div>
                   <div className="font-mono text-sm font-bold flex items-center gap-2 max-w-[300px] truncate" title={pendingDecision.label}>
                        {pendingDecision.type === 'WHILE' && <RefreshCw className="w-3 h-3" />}
                        {pendingDecision.label}?
                   </div>
                </div>
             </div>
             
             <div className="flex gap-2 flex-wrap justify-end">
                {pendingDecision.options && pendingDecision.options.length > 0 ? (
                    pendingDecision.options.map((option, idx) => (
                        <button 
                            key={idx}
                            onClick={() => onDecision(option.value)}
                            className={`flex items-center gap-1 px-4 py-1.5 rounded-md text-xs font-bold shadow-lg transition-all active:scale-95 border ${
                                option.label.toUpperCase() === 'VERO' || option.label === 'True'
                                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20 border-emerald-400/20'
                                    : option.label.toUpperCase() === 'FALSO' || option.label === 'False'
                                    ? 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/20 border-rose-400/20'
                                    : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-900/20 border-indigo-400/20'
                            }`}
                        >
                            {option.label.toUpperCase() === 'VERO' ? <CheckCircle className="w-3.5 h-3.5" /> : 
                             option.label.toUpperCase() === 'FALSO' ? <XCircle className="w-3.5 h-3.5" /> : 
                             <ArrowRight className="w-3.5 h-3.5" />}
                            {option.label}
                        </button>
                    ))
                ) : (
                    
                    <>
                        <button 
                        onClick={() => onDecision(true)}
                        className="flex items-center gap-1 px-4 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-md text-xs font-bold shadow-lg border border-emerald-400/20"
                        >
                        <CheckCircle className="w-3.5 h-3.5" /> VERO
                        </button>
                        <button 
                        onClick={() => onDecision(false)}
                        className="flex items-center gap-1 px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-md text-xs font-bold shadow-lg border border-rose-400/20"
                        >
                        <XCircle className="w-3.5 h-3.5" /> FALSO
                        </button>
                    </>
                )}
             </div>
          </div>
        )}
      </div>
    </div>
  );
};