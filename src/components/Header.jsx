import React from "react";
import {
  Code,
  Network,
  Database,
  AlignLeft,
  Save,
  Moon,
  Sun,
  Workflow,
  Columns,
  ChevronRight,
  Home
} from "lucide-react";
import { Button } from "./ui/Button";

export const Header = ({
  activeFileId,
  activeFile,
  viewMode,
  setViewMode,
  theme,
  setTheme,
  handleImportCSV,
  formatSQL,
  handleDownloadSQL,
  isSplitView,
  setIsSplitView,
}) => {
  if (!activeFileId) return null;

  
  const folderParts = activeFile?.folder ? activeFile.folder.split("/") : [];

  return (
    <div
      className={`
        h-14 border-b flex items-center justify-between px-4 z-20 backdrop-blur-md sticky top-0 transition-colors duration-300
        ${
          theme === "dark"
            ? "bg-zinc-900/80 border-zinc-800"
            : "bg-white/80 border-slate-200"
        }
      `}
    >
      <div className="flex items-center gap-4">
        
        {}
        <div className="flex items-center gap-1 text-xs select-none overflow-hidden max-w-[300px]">
           <span className={`${theme === 'dark' ? 'text-zinc-600' : 'text-slate-400'}`}>
             <Home size={14} />
           </span>
           <ChevronRight size={14} className={`${theme === 'dark' ? 'text-zinc-700' : 'text-slate-300'}`} />
           
           {folderParts.map((part, i) => (
             <React.Fragment key={i}>
               <span className={`truncate max-w-[80px] ${theme === 'dark' ? 'text-zinc-400' : 'text-slate-500'}`}>
                 {part}
               </span>
               <ChevronRight size={14} className={`${theme === 'dark' ? 'text-zinc-700' : 'text-slate-300'}`} />
             </React.Fragment>
           ))}

           <span className={`font-semibold truncate max-w-[120px] ${theme === 'dark' ? 'text-zinc-200' : 'text-slate-700'}`}>
             {activeFile?.title}
           </span>
        </div>

        {}
        <div className={`w-px h-4 ${theme === "dark" ? "bg-zinc-800" : "bg-slate-300"}`} />

        {}
        <div
          className={`flex rounded-lg p-1 gap-1 border ${
            theme === "dark"
              ? "bg-zinc-800 border-zinc-700"
              : "bg-slate-100 border-slate-200"
          }`}
        >
          <Button
            variant={viewMode === "editor" && !isSplitView ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("editor")}
            className={viewMode === "editor" && !isSplitView ? "shadow-sm" : ""}
          >
            <Code className="w-4 h-4" /> Editor
          </Button>
          <Button
            variant={viewMode === "diagram" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("diagram")}
            className={viewMode === "diagram" ? "shadow-sm" : ""}
          >
            <Network className="w-4 h-4" /> Diagramma
          </Button>
          <Button
            variant={viewMode === "logic-flow" ? "secondary" : "ghost"}
            size="sm"
            onClick={() => setViewMode("logic-flow")}
            className={viewMode === "logic-flow" ? "shadow-sm" : ""}
          >
            <Workflow className="w-4 h-4" /> Logic Flow
          </Button>
        </div>

        <div className={`w-px h-4 mx-1 ${theme === "dark" ? "bg-zinc-800" : "bg-slate-300"}`} />

        <Button
          variant={isSplitView ? "secondary" : "ghost"}
          size="sm"
          onClick={() => setIsSplitView(!isSplitView)}
          className={isSplitView ? "shadow-sm text-indigo-500" : ""}
          title="Vista Divisa"
        >
          <Columns className="w-4 h-4" /> Split
        </Button>
      </div>

      <div className="flex gap-3 items-center">
        <label
          className={`
          cursor-pointer px-3 py-1.5 rounded-md text-xs font-medium flex gap-2 items-center transition-colors
          ${
            theme === "dark"
              ? "text-zinc-400 hover:text-zinc-200 hover:bg-white/5"
              : "text-slate-500 hover:text-slate-800 hover:bg-black/5"
          }
        `}
        >
          <input
            type="file"
            accept=".csv"
            className="hidden"
            onChange={handleImportCSV}
          />
          <Database className="w-4 h-4" /> Importa CSV
        </label>

        <div
          className={`w-px h-4 ${
            theme === "dark" ? "bg-zinc-800" : "bg-slate-300"
          }`}
        ></div>

        {(viewMode === "editor" || isSplitView) && (
          <button
            onClick={formatSQL}
            className={`px-3 py-1.5 rounded-md text-xs flex gap-2 items-center font-bold transition-colors ${
              theme === "dark"
                ? "text-indigo-400 hover:bg-indigo-500/10"
                : "text-indigo-600 hover:bg-indigo-50"
            }`}
          >
            <AlignLeft className="w-4 h-4" /> Formatta
          </button>
        )}

        <button
          onClick={handleDownloadSQL}
          title="Scarica .sql"
          className={`px-3 py-1.5 rounded-md text-xs flex gap-2 items-center font-bold transition-colors ${
            theme === "dark"
              ? "text-emerald-400 hover:bg-emerald-500/10"
              : "text-emerald-600 hover:bg-emerald-50"
          }`}
        >
          <Save className="w-4 h-4" /> Scarica
        </button>

        <div
          className={`w-px h-4 ${
            theme === "dark" ? "bg-zinc-800" : "bg-slate-300"
          }`}
        ></div>

        <button
          onClick={() => setTheme(theme === "light" ? "dark" : "light")}
          className={`p-2 rounded-full transition-colors ${
            theme === "dark"
              ? "text-zinc-400 hover:bg-white/10 hover:text-zinc-100"
              : "text-slate-400 hover:bg-black/5 hover:text-slate-700"
          }`}
        >
          {theme === "light" ? (
            <Moon className="w-4 h-4" />
          ) : (
            <Sun className="w-4 h-4" />
          )}
        </button>
      </div>
    </div>
  );
};