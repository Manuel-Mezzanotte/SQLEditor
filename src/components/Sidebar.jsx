import React, { useRef, useState } from "react";
import {
  Folder,
  FolderOpen,
  FileCode,
  ChevronRight,
  ChevronDown,
  Database,
} from "lucide-react";
import { Input } from "./ui/Input";

export const Sidebar = ({
  isSidebarOpen,
  sidebarWidth,
  setSidebarWidth,
  theme,
  folders,
  files,

  expandedFolders,
  setExpandedFolders,
  selectedIds,
  setSelectedIds,
  lastSelectedId,
  setLastSelectedId,
  renaming,
  setRenaming,
  handleRename,
  handleCreateFile,
  handleCreateFolder,
  handleContextMenu,
  openFile,
  searchTerm,
  setSearchTerm,
  handleMove,
}) => {
  const isResizingSidebar = useRef(false);
  const [isResizing, setIsResizing] = useState(false);
  const renameInputRef = useRef(null);

  React.useEffect(() => {
    if (renaming && renameInputRef.current) {
      renameInputRef.current.focus();
      renameInputRef.current.select();
    }
  }, [renaming?.id, renaming?.type]);

  const startResizing = () => {
    isResizingSidebar.current = true;
    setIsResizing(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };

  const stopResizing = () => {
    isResizingSidebar.current = false;
    setIsResizing(false);
    document.body.style.cursor = "";
    document.body.style.userSelect = "";
  };

  const resize = (e) => {
    if (isResizingSidebar.current) {
      setSidebarWidth(Math.max(200, Math.min(600, e.clientX)));
    }
  };

  React.useEffect(() => {
    window.addEventListener("mousemove", resize);
    window.addEventListener("mouseup", stopResizing);
    return () => {
      window.removeEventListener("mousemove", resize);
      window.removeEventListener("mouseup", stopResizing);
    };
  }, []);

  const renderFile = (file) => {
    const isFileSelected = selectedIds.has(file.id);
    return (
      <div
        draggable
        onDragStart={(e) => {
          e.dataTransfer.setData(
            "application/json",
            JSON.stringify({ type: "file", id: file.id })
          );
        }}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        key={file.id}
        className={`
          flex items-center gap-2 px-2 py-1.5 mx-2 ml-5 rounded-md cursor-pointer group transition-all relative z-10 select-none
          ${
            isFileSelected
              ? theme === "dark"
                ? "bg-indigo-600/20 text-indigo-300"
                : "bg-indigo-50 text-indigo-700 font-medium"
              : "hover:bg-black/5 dark:hover:bg-white/5 " +
                (theme === "dark" ? "text-zinc-400" : "text-slate-600")
          }
        `}
        onClick={(e) => {
          e.stopPropagation();
          if (e.metaKey || e.ctrlKey) {
            const newSet = new Set(selectedIds);
            if (newSet.has(file.id)) {
              newSet.delete(file.id);
            } else {
              newSet.add(file.id);
              setLastSelectedId(file.id);
            }
            setSelectedIds(newSet);
          } else if (e.shiftKey && lastSelectedId) {
            const newSet = new Set(selectedIds);
            newSet.add(file.id);
            setSelectedIds(newSet);
          } else {
            setSelectedIds(new Set([file.id]));
            setLastSelectedId(file.id);
            openFile(file.id);
          }
        }}
        onContextMenu={(e) => handleContextMenu(e, "file", file)}
      >
        {file.title.toLowerCase().endsWith(".sql") ? (
          <Database
            className={`w-3.5 h-3.5 flex-shrink-0 ${
              isFileSelected
                ? "text-indigo-500"
                : "opacity-60 group-hover:opacity-100"
            }`}
          />
        ) : (
          <FileCode
            className={`w-3.5 h-3.5 flex-shrink-0 ${
              isFileSelected
                ? "text-indigo-500"
                : "opacity-60 group-hover:opacity-100"
            }`}
          />
        )}
        {renaming?.type === "file" && renaming.id === file.id ? (
          <input
            ref={renameInputRef}
            value={renaming.value}
            onChange={(e) =>
              setRenaming({ ...renaming, value: e.target.value })
            }
            onBlur={handleRename}
            onKeyDown={(e) => e.key === "Enter" && handleRename()}
            onClick={(e) => e.stopPropagation()}
            className={`bg-white dark:bg-zinc-800 border-2 border-indigo-500 rounded px-1.5 text-xs py-0.5 outline-none w-full font-medium shadow-lg ${
              theme === "dark" ? "text-zinc-100" : "text-slate-900"
            }`}
          />
        ) : (
          <span
            className={`truncate flex-1 text-[11px] ${
              isFileSelected ? "opacity-100" : "opacity-90"
            }`}
          >
            {file.title}
          </span>
        )}
      </div>
    );
  };

  const renderNode = (nodes, depth = 0) => {
    return Object.values(nodes).map((node) => {
      const isOpen = expandedFolders[node.path];
      const hasChildren = Object.keys(node.children).length > 0;
      const hasFiles = node.files.length > 0;
      const isEmpty = !hasChildren && !hasFiles;

      if (searchTerm && !hasFiles && !hasChildren) return null;

      if (searchTerm && !hasFiles && !hasChildren) return null;

      const isFolderSelected = selectedIds.has(node.path);

      return (
        <div key={node.path} style={{ marginLeft: depth * 12 }}>
          {renaming?.type === "folder" && renaming.id === node.path ? (
            <div className="px-2 py-1 flex items-center gap-1.5 animate-pulse">
              <FolderOpen className="w-4 h-4 text-indigo-500" />
              <input
                ref={renameInputRef}
                value={renaming.value}
                onChange={(e) =>
                  setRenaming({ ...renaming, value: e.target.value })
                }
                onBlur={handleRename}
                onKeyDown={(e) => e.key === "Enter" && handleRename()}
                className={`bg-white dark:bg-zinc-800 border-2 border-indigo-500 rounded px-1.5 text-xs py-0.5 outline-none w-full font-medium shadow-lg ${
                  theme === "dark" ? "text-zinc-100" : "text-slate-900"
                }`}
              />
            </div>
          ) : (
            <div
              draggable
              onDragStart={(e) => {
                e.dataTransfer.setData(
                  "application/json",
                  JSON.stringify({ type: "folder", id: node.path })
                );
                e.stopPropagation();
              }}
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.style.background =
                  theme === "dark"
                    ? "rgba(99, 102, 241, 0.2)"
                    : "rgba(99, 102, 241, 0.1)";
              }}
              onDragLeave={(e) => {
                e.currentTarget.style.background = "";
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.stopPropagation();
                e.currentTarget.style.background = "";
                const data = e.dataTransfer.getData("application/json");
                if (data) {
                  const source = JSON.parse(data);
                  handleMove(source, { type: "folder", id: node.path });
                }
              }}
              className={`
                flex items-center gap-1.5 px-2 py-1.5 mx-2 rounded-md cursor-pointer group transition-all duration-200 border border-transparent select-none
                ${
                  isFolderSelected
                    ? theme === "dark"
                      ? "bg-indigo-500/10 text-indigo-300 border-indigo-500/20"
                      : "bg-indigo-50 text-indigo-700 border-indigo-200"
                    : "hover:bg-black/5 dark:hover:bg-white/5 " +
                      (theme === "dark"
                        ? "text-zinc-400 group-hover:text-zinc-200"
                        : "text-slate-500 group-hover:text-slate-700")
                }
              `}
              onClick={(e) => {
                e.stopPropagation();

                if (e.metaKey || e.ctrlKey) {
                  const newSet = new Set(selectedIds);
                  if (newSet.has(node.path)) newSet.delete(node.path);
                  else {
                    newSet.add(node.path);
                    setLastSelectedId(node.path);
                  }
                  setSelectedIds(newSet);
                } else {
                  setSelectedIds(new Set([node.path]));
                  setLastSelectedId(node.path);
                }
              }}
              onContextMenu={(e) => handleContextMenu(e, "folder", node.path)}
            >
              <div
                className={`transition-transform duration-200 ${
                  isOpen ? "rotate-90" : ""
                }`}
              >
                <ChevronRight
                  className={`w-3 h-3 ${
                    isFolderSelected ? "text-indigo-500" : "opacity-50"
                  }`}
                />
              </div>

              {isOpen ? (
                <FolderOpen
                  className={`w-3.5 h-3.5 transition-colors ${
                    isFolderSelected
                      ? "text-indigo-500"
                      : theme === "dark"
                      ? "text-zinc-400 group-hover:text-zinc-300"
                      : "text-slate-400 group-hover:text-slate-500"
                  }`}
                />
              ) : (
                <Folder
                  className={`w-3.5 h-3.5 transition-colors ${
                    isFolderSelected
                      ? "text-indigo-500"
                      : theme === "dark"
                      ? "text-zinc-400 group-hover:text-zinc-300"
                      : "text-slate-400 group-hover:text-slate-500"
                  }`}
                />
              )}
              <span className="text-[11px] font-semibold truncate flex-1">
                {node.name}
              </span>
            </div>
          )}

          {isOpen && (
            <div className="relative">
              {}
              <div
                className={`absolute left-[19px] top-0 bottom-0 w-px ${
                  theme === "dark" ? "bg-zinc-800" : "bg-slate-200"
                }`}
              />
              <div className="pt-0.5">
                {renderNode(node.children, depth + 1)}
                {node.files.map((file) => renderFile(file))}
              </div>
              {isEmpty && (
                <div
                  className={`px-4 py-2 text-[10px] italic ml-5 ${
                    theme === "dark" ? "text-zinc-700" : "text-slate-300"
                  }`}
                >
                  Vuota
                </div>
              )}
            </div>
          )}
        </div>
      );
    });
  };

  const getTree = () => {
    const tree = {};
    const sortedFolders = [...folders].sort();

    sortedFolders.forEach((path) => {
      const parts = path.split("/");
      let currentLevel = tree;
      parts.forEach((part, i) => {
        const currentPath = parts.slice(0, i + 1).join("/");
        if (!currentLevel[part]) {
          currentLevel[part] = {
            name: part,
            path: currentPath,
            children: {},
            files: files.filter(
              (f) =>
                f.folder === currentPath &&
                (f.title + f.content)
                  .toLowerCase()
                  .includes(searchTerm.toLowerCase())
            ),
          };
        }
        currentLevel = currentLevel[part].children;
      });
    });
    return tree;
  };

  return (
    <div
      style={{
        width: isSidebarOpen ? sidebarWidth : 0,
        opacity: isSidebarOpen ? 1 : 0,
      }}
      className={`
        flex-shrink-0 relative flex flex-col border-r backdrop-blur-xl z-20
        ${isResizing ? "" : "transition-all duration-300 ease-in-out"}
        ${
          theme === "dark"
            ? "border-zinc-800/50 bg-zinc-900/60"
            : "border-slate-200/60 bg-white/60"
        }
      `}
      onContextMenu={(e) => handleContextMenu(e, "root")}
    >
      <div
        onMouseDown={startResizing}
        className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-indigo-500/50 z-50 transition-colors group"
      >
        <div className="absolute right-[-1px] top-0 bottom-0 w-[1px] group-hover:bg-indigo-500 transition-colors delay-75" />
      </div>

      <div
        className={`p-4 flex justify-between items-center text-[10px] font-black tracking-[0.2em] select-none ${
          theme === "dark" ? "text-zinc-500" : "text-slate-400"
        }`}
      >
        <span>EXPLORER</span>
        <div className="flex gap-1 items-center"></div>
      </div>

      {}
      {}

      <div
        className="flex-1 overflow-y-auto px-2 pb-2 select-none no-scrollbar h-full"
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          const data = e.dataTransfer.getData("application/json");
          if (data) {
            const source = JSON.parse(data);
            handleMove(source, { type: "root" });
          }
        }}
      >
        {renderNode(getTree())}
        {files
          .filter(
            (f) =>
              (!f.folder || f.folder === "/") &&
              (f.title + f.content)
                .toLowerCase()
                .includes(searchTerm.toLowerCase())
          )
          .map((file) => renderFile(file))}
      </div>
    </div>
  );
};
