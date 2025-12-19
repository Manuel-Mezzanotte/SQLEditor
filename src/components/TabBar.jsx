import React from "react";
import { FileCode, X } from "lucide-react";

export const TabBar = ({
  openFiles,
  files,
  activeFileId,
  setActiveFileId,
  closeTab,
  theme,
  onReorder,
}) => {
  const [draggedTabId, setDraggedTabId] = React.useState(null);

  const handleDragStart = (e, fileId) => {
    setDraggedTabId(fileId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", fileId);
  };

  const handleDragOver = (e) => {
    e.preventDefault(); 
  };

  const handleDrop = (e, targetFileId) => {
    e.preventDefault();
    if (draggedTabId && targetFileId && draggedTabId !== targetFileId) {
      onReorder(draggedTabId, targetFileId);
    }
    setDraggedTabId(null);
  };

  return (
    <div
      className={`
        flex overflow-x-auto no-scrollbar pt-2 px-2 gap-1 border-b
        ${
          theme === "dark"
            ? "bg-zinc-950 border-zinc-800"
            : "bg-slate-50 border-slate-200"
        }
      `}
    >
      {openFiles.map((fileId) => {
        const file = files.find((f) => f.id === fileId);
        if (!file) return null;
        const isActive = activeFileId === fileId;

        return (
          <div
            key={fileId}
            draggable
            onDragStart={(e) => handleDragStart(e, fileId)}
            onDragOver={handleDragOver}
            onDrop={(e) => handleDrop(e, fileId)}
            onClick={() => setActiveFileId(fileId)}
            className={`
                group flex items-center gap-2 px-4 py-2 text-xs cursor-pointer border-t border-x rounded-t-lg min-w-[140px] max-w-[220px] transition-all relative select-none
                ${
                  isActive
                    ? theme === "dark"
                      ? "bg-zinc-900 text-indigo-400 border-zinc-700 border-b-zinc-900 z-10"
                      : "bg-white text-indigo-600 border-slate-300 border-b-white z-10 shadow-sm"
                    : theme === "dark"
                    ? "bg-zinc-950 text-zinc-500 hover:bg-zinc-900/50 hover:text-zinc-300 border-transparent border-b-zinc-800"
                    : "bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700 border-transparent border-b-slate-200"
                }
            `}
            style={{ marginBottom: "-1px" }}
          >
            {isActive && (
              <div className="absolute top-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full" />
            )}

            <FileCode
              className={`w-3.5 h-3.5 ${
                isActive ? "opacity-100" : "opacity-60"
              }`}
            />
            <span className="truncate flex-1 font-medium">
              {file.title}
            </span>
            <button
              onClick={(e) => closeTab(e, fileId)}
              className={`
                p-0.5 rounded-full opacity-0 group-hover:opacity-100 transition-all
                ${
                  theme === "dark"
                    ? "hover:bg-zinc-700 text-zinc-400 hover:text-zinc-200"
                    : "hover:bg-slate-200 text-slate-400 hover:text-slate-600"
                }
              `}
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        );
      })}
    </div>
  );
};