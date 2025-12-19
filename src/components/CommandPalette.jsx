import React, { useState, useEffect, useRef } from "react";
import {
  Search,
  FileCode,
  Layout,
  Moon,
  Sun,
  Database,
  Terminal,
  ArrowRight,
  Command,
} from "lucide-react";

export const CommandPalette = ({
  isOpen,
  onClose,
  files,
  openFile,
  actions,
  theme,
  folders = [],
}) => {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [step, setStep] = useState("main"); 
  const [fileName, setFileName] = useState("");

  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    if (isOpen) {
      setStep("main");
      setQuery("");
      setSelectedIndex(0);
      setFileName("");
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  
  let items = [];

  if (step === "main") {
    
    const commandItems = [
      {
        id: "cmd-new-file",
        label: "Nuovo File...",
        icon: FileCode,
        action: () => {
          setStep("filename");
          setQuery("");
          setSelectedIndex(0);
        },
        keywords: "new create file make",
        type: "command",
      },
      {
        id: "cmd-format",
        label: "Formatta SQL",
        icon: Terminal,
        action: actions.formatSQL,
        keywords: "format code clean prettier",
        type: "command",
      },
      {
        id: "cmd-download",
        label: "Scarica file corrente",
        icon: Database,
        action: actions.downloadFile,
        keywords: "save download export",
        type: "command",
      },
      {
        id: "cmd-view-flow",
        label: "Vista: Logic Flow",
        icon: Layout,
        action: () => actions.setViewMode("logic-flow"),
        keywords: "view mode logic flow diagram",
        type: "command",
      },
      {
        id: "cmd-view-diagram",
        label: "Vista: Diagramma Tabelle",
        icon: Layout,
        action: () => actions.setViewMode("diagram"), 
        keywords: "view mode diagram table er",
        type: "command",
      },
      {
        id: "cmd-view-editor",
        label: "Vista: Editor SQL",
        icon: FileCode,
        action: () => actions.setViewMode("editor"),
        keywords: "view mode editor code sql",
        type: "command",
      },
      {
        id: "cmd-theme-toggle",
        label: `Tema: Passa a ${theme === "dark" ? "Light" : "Dark"}`,
        icon: theme === "dark" ? Sun : Moon,
        action: actions.toggleTheme,
        keywords: "theme dark light color mode",
        type: "command",
      },
    ];

    const filteredCommands = commandItems.filter(
      (c) =>
        c.label.toLowerCase().includes(query.toLowerCase()) ||
        c.keywords.includes(query.toLowerCase())
    );

    const filteredFiles = files
      .filter((f) => f.title.toLowerCase().includes(query.toLowerCase()))
      .map((f) => ({ ...f, type: "file", label: f.title }));

    items = [...filteredCommands, ...filteredFiles];
  } else if (step === "filename") {
    
    items = [];
  } else if (step === "folder") {
    
    const allFolders = [
      { id: "root", label: "Root (/)", path: "", type: "folder-select" },
      ...folders.map((f) => ({
        id: f,
        label: f,
        path: f,
        type: "folder-select",
      })),
    ];
    items = allFolders.filter((f) =>
      f.label.toLowerCase().includes(query.toLowerCase())
    );
  }

  const handleKeyDown = (e) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      if (items.length > 0)
        setSelectedIndex((prev) => (prev < items.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      if (items.length > 0)
        setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter") {
      e.preventDefault();

      if (step === "filename") {
        const name = query.trim() || "Nuovo File";
        setFileName(name);
        
        
        if (folders.length === 0) {
          actions.createFile(name, "");
          onClose();
        } else {
          setStep("folder");
          setQuery("");
          setSelectedIndex(0);
        }
      } else {
        
        const selected = items[selectedIndex];
        if (selected) executeAction(selected);
      }
    } else if (e.key === "Escape") {
      e.preventDefault();
      
      if (step === "filename" || step === "folder") {
        setStep("main");
        setQuery("");
        setSelectedIndex(0);
      } else {
        onClose();
      }
    }
  };

  const executeAction = (item) => {
    if (item.type === "command") {
      item.action();
      if (item.id !== "cmd-new-file") onClose(); 
    } else if (item.type === "file") {
      openFile(item.id);
      onClose();
    } else if (item.type === "folder-select") {
      actions.createFile(fileName, item.path);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh]">
      <div
        className="fixed inset-0 bg-black/50 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-2xl bg-white dark:bg-zinc-900 rounded-xl shadow-2xl border border-slate-200 dark:border-zinc-800 overflow-hidden flex flex-col max-h-[60vh] animate-in fade-in zoom-in-95 duration-100 ease-out">
        <div className="flex items-center px-4 py-3 border-b border-slate-100 dark:border-zinc-800">
          {step === "main" ? (
            <Search className="w-5 h-5 text-slate-400 dark:text-zinc-500 mr-3" />
          ) : step === "filename" ? (
            <FileCode className="w-5 h-5 text-indigo-500 mr-3" />
          ) : (
            <Layout className="w-5 h-5 text-indigo-500 mr-3" />
          )}

          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent outline-none text-lg text-slate-700 dark:text-zinc-200 placeholder-slate-400 dark:placeholder-zinc-600"
            placeholder={
              step === "main"
                ? "Cerca file o esegui comandi..."
                : step === "filename"
                ? "Inserisci il nome del file..."
                : "Seleziona la cartella di destinazione..."
            }
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedIndex(0);
            }}
            onKeyDown={handleKeyDown}
          />
          <div className="flex items-center gap-1.5 ml-3">
            <kbd className="hidden sm:inline-flex h-5 items-center gap-1 rounded border border-slate-200 dark:border-zinc-700 bg-slate-50 dark:bg-zinc-800 px-1.5 font-mono text-[10px] font-medium text-slate-500 dark:text-zinc-400">
              <span className="text-xs">ESC</span>
            </kbd>
          </div>
        </div>

        <div
          ref={listRef}
          className="flex-1 overflow-y-auto overflow-x-hidden p-2 scroll-smooth"
        >
          {step === "filename" && (
            <div className="p-4 text-slate-500 dark:text-slate-400 text-sm">
              Premi <strong>Invio</strong> per confermare il nome "
              {query || "Nuovo File"}.sql"
            </div>
          )}

          {step !== "filename" &&
            allItemsRender(
              items,
              query,
              selectedIndex,
              executeAction,
              setSelectedIndex
            )}
        </div>

        <div className="bg-slate-50 dark:bg-zinc-800/50 px-4 py-2 text-[10px] text-slate-400 dark:text-zinc-500 border-t border-slate-100 dark:border-zinc-800 flex justify-between">
          <div className="flex gap-3">
            <span>
              <strong className="font-medium">↑↓</strong> naviga
            </span>
            <span>
              <strong className="font-medium">↵</strong> seleziona
            </span>
          </div>
          {items.length > 0 && <div>{items.length} opzioni</div>}
        </div>
      </div>
    </div>
  );
};


const allItemsRender = (
  items,
  query,
  selectedIndex,
  executeAction,
  setSelectedIndex
) => {
  if (items.length === 0) {
    return (
      <div className="p-8 text-center text-slate-500 dark:text-zinc-500 text-sm">
        Nessun risultato per "{query}"
      </div>
    );
  }
  return (
    <div className="space-y-1">
      {items.map((item, index) => {
        const isSelected = index === selectedIndex;
        return (
          <div
            key={item.id}
            onClick={() => executeAction(item)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={`
                      flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-colors
                      ${
                        isSelected
                          ? "bg-indigo-50 dark:bg-indigo-500/10 text-indigo-700 dark:text-indigo-300"
                          : "text-slate-700 dark:text-zinc-300 hover:bg-slate-50 dark:hover:bg-zinc-800"
                      }
                    `}
          >
            <div
              className={`p-1.5 rounded-md ${
                isSelected
                  ? "bg-indigo-100 dark:bg-indigo-500/20"
                  : "bg-slate-100 dark:bg-zinc-800 text-slate-500 dark:text-zinc-400"
              }`}
            >
              {item.type === "file" ? (
                <FileCode className="w-4 h-4" />
              ) : item.type === "folder-select" ? (
                <Layout className="w-4 h-4" />
              ) : (
                <item.icon className="w-4 h-4" />
              )}
            </div>

            <div className="flex-1 flex flex-col justify-center min-w-0">
              <span className="font-medium truncate">{item.label}</span>
              {item.type === "file" && item.folder && (
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 truncate flex items-center gap-1">
                  <span className="opacity-70">in</span> {item.folder}
                </span>
              )}
              {item.type === "command" && (
                <span className="text-[10px] text-slate-400 dark:text-zinc-500 truncate">
                  Comando
                </span>
              )}
            </div>

            {isSelected && <ArrowRight className="w-4 h-4 opacity-50" />}
          </div>
        );
      })}
    </div>
  );
};
