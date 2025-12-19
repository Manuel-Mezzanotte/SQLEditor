import React, { useState, useEffect, useRef, useMemo } from "react";
import { format } from "sql-formatter";
import { Sidebar } from "./components/Sidebar";
import { Header } from "./components/Header";
import { TabBar } from "./components/TabBar";
import { EditorArea } from "./components/EditorArea";
import { TableDetailModal } from "./components/TableDetailModal";
import { CommandPalette } from "./components/CommandPalette";

const useScript = (src) => {
  const [status, setStatus] = useState(src ? "loading" : "idle");
  useEffect(() => {
    if (!src) return;
    let script = document.querySelector(`script[src="${src}"]`);
    if (!script) {
      script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.crossOrigin = "anonymous";
      script.setAttribute("data-status", "loading");
      document.body.appendChild(script);
      const handleLoad = () => {
        script.setAttribute("data-status", "ready");
        setStatus("ready");
      };
      const handleError = () => {
        script.setAttribute("data-status", "error");
        setStatus("error");
      };
      script.addEventListener("load", handleLoad);
      script.addEventListener("error", handleError);
    } else {
      const currentStatus = script.getAttribute("data-status");
      setStatus(currentStatus || "loading");
      if (currentStatus === "loading") {
        const handleLoad = () => setStatus("ready");
        const handleError = () => setStatus("error");
        script.addEventListener("load", handleLoad);
        script.addEventListener("error", handleError);
        return () => {
          script.removeEventListener("load", handleLoad);
          script.removeEventListener("error", handleError);
        };
      }
    }
  }, [src]);
  return status;
};

const useHistory = (initialPresent, updateCallback) => {
  const [history, setHistory] = useState([initialPresent]);
  const [pointer, setPointer] = useState(0);

  const push = (newPresent) => {
    const newHistory = history.slice(0, pointer + 1);
    newHistory.push(newPresent);
    setHistory(newHistory);
    setPointer(newHistory.length - 1);
  };

  const undo = () => {
    if (pointer > 0) {
      const newPointer = pointer - 1;
      setPointer(newPointer);
      updateCallback(history[newPointer]);
    }
  };

  const redo = () => {
    if (pointer < history.length - 1) {
      const newPointer = pointer + 1;
      setPointer(newPointer);
      updateCallback(history[newPointer]);
    }
  };

  return {
    push,
    undo,
    redo,
    canUndo: pointer > 0,
    canRedo: pointer < history.length - 1,
  };
};

const parseSQLToSchema = (sql) => {
  if (!sql) return { tables: [], relationships: [] };

  const tables = [];
  const relationships = [];
  const lines = sql.split("\n");
  let currentTable = null;
  let currentTableObj = null;

  lines.forEach((line) => {
    const cleanLine = line.trim();
    if (cleanLine.startsWith("--") && !cleanLine.includes("FK")) return;

    const createMatch = cleanLine.match(
      /CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?(?:["`\[]?([\w.]+)["`\]]?)/i
    );
    if (createMatch) {
      currentTable = createMatch[1];
      currentTable = currentTable.replace(/[\[\]"`]/g, "");
      currentTableObj = { name: currentTable, columns: [] };
      tables.push(currentTableObj);
      return;
    }

    if (currentTable && cleanLine.startsWith(")")) {
      currentTable = null;
      return;
    }

    if (currentTable && currentTableObj) {
      const fkMatch = cleanLine.match(
        /FOREIGN\s+KEY\s*\(([\w_]+)\)\s*REFERENCES\s+([\w.]+)\s*\(([\w_]+)\)/i
      );
      if (fkMatch) {
        let targetTable = fkMatch[2].replace(/[\[\]"`]/g, "");

        if (
          !relationships.find(
            (r) => r.from === currentTable && r.to === targetTable
          )
        ) {
          relationships.push({ from: currentTable, to: targetTable });
        }
        return;
      }

      if (
        cleanLine.match(/^(PRIMARY|KEY|CONSTRAINT|UNIQUE|INDEX)/i) &&
        !cleanLine.match(/FOREIGN\s+KEY/i)
      )
        return;

      const parts = cleanLine.split(/\s+/);
      if (parts.length >= 2 && !cleanLine.toUpperCase().startsWith("FOREIGN")) {
        const colName = parts[0].replace(/["`,]/g, "");
        let colType = parts[1].replace(/[,);]/g, "");

        if (cleanLine.includes("(")) {
          const typeMatch = cleanLine.match(/(\w+\([^)]+\))/);
          if (typeMatch) colType = typeMatch[1];
        }

        const isPk = cleanLine.toUpperCase().includes("PRIMARY KEY");

        if (/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(colName)) {
          currentTableObj.columns.push({ name: colName, type: colType, isPk });
        }
      }
    }
  });

  const tableMap = new Map();
  tables.forEach((t) => {
    const rawName = t.name.toLowerCase();
    const cleanName = rawName.includes(".")
      ? rawName.split(".").pop()
      : rawName;

    tableMap.set(rawName, t.name);
    tableMap.set(cleanName, t.name);

    if (cleanName.endsWith("s")) {
      tableMap.set(cleanName.slice(0, -1), t.name);
    } else {
      tableMap.set(cleanName + "s", t.name);
    }
  });

  tables.forEach((table) => {
    table.columns.forEach((col) => {
      let target = null;
      const colLower = col.name.toLowerCase();

      if (colLower.endsWith("_id")) {
        const baseName = colLower.replace("_id", "");

        if (tableMap.has(baseName)) target = tableMap.get(baseName);
      }

      if (target && target !== table.name) {
        if (
          !relationships.find((r) => r.from === table.name && r.to === target)
        ) {
          relationships.push({ from: table.name, to: target });
        }
      }
    });
  });

  return { tables, relationships };
};

const generateTableSQL = (table) => {
  let sql = `CREATE TABLE ${table.name} (\n`;
  const colDefs = table.columns.map(
    (c) => `    ${c.name} ${c.type}${c.isPk ? " PRIMARY KEY" : ""}`
  );
  sql += colDefs.join(",\n");
  sql += `\n);`;
  return sql;
};

const DEFAULT_FOLDERS = [];
const DEFAULT_FILES = [];

export default function SQLNoteApp() {
  const [folders, setFolders] = useState(() => {
    const saved = localStorage.getItem("folders");
    return saved ? JSON.parse(saved) : DEFAULT_FOLDERS;
  });

  const [activeFileId, setActiveFileId] = useState(() => {
    return localStorage.getItem("activeFileId") || null;
  });

  const [files, setFiles] = useState(() => {
    const saved = localStorage.getItem("files");
    return saved ? JSON.parse(saved) : DEFAULT_FILES;
  });

  const [openFiles, setOpenFiles] = useState(() => {
    const saved = localStorage.getItem("openFiles");
    return saved ? JSON.parse(saved) : [];
  });

  const [expandedFolders, setExpandedFolders] = useState(() => {
    const saved = localStorage.getItem("expandedFolders");
    return saved ? JSON.parse(saved) : {};
  });

  const [selectedIds, setSelectedIds] = useState(new Set());
  const [lastSelectedId, setLastSelectedId] = useState(null);

  const [isSplitView, setIsSplitView] = useState(false);

  const updateStateFromHistory = ({ folders, files }) => {
    setFolders(folders);
    setFiles(files);
  };

  const history = useHistory({ folders, files }, updateStateFromHistory);

  useEffect(() => {
    localStorage.setItem("folders", JSON.stringify(folders));
  }, [folders]);

  useEffect(() => {
    localStorage.setItem("files", JSON.stringify(files));
  }, [files]);

  useEffect(() => {
    localStorage.setItem("openFiles", JSON.stringify(openFiles));
  }, [openFiles]);

  useEffect(() => {
    if (activeFileId) localStorage.setItem("activeFileId", activeFileId);
    else localStorage.removeItem("activeFileId");
  }, [activeFileId]);

  useEffect(() => {
    localStorage.setItem("expandedFolders", JSON.stringify(expandedFolders));
  }, [expandedFolders]);

  const [viewMode, setViewMode] = useState("editor");

  const [theme, setTheme] = useState(() => {
    const savedTheme = localStorage.getItem("theme");
    if (savedTheme) return savedTheme;
    if (
      window.matchMedia &&
      window.matchMedia("(prefers-color-scheme: dark)").matches
    ) {
      return "dark";
    }
    return "light";
  });

  const [sidebarWidth, setSidebarWidth] = useState(250);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [renaming, setRenaming] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [contextMenu, setContextMenu] = useState(null);
  const [pendingScrollLine, setPendingScrollLine] = useState(null);
  const [editingTable, setEditingTable] = useState(null);
  const [isCommandPaletteOpen, setIsCommandPaletteOpen] = useState(false);

  const monacoStatus = useScript(
    "https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.45.0/min/vs/loader.min.js"
  );

  const monacoInstanceRef = useRef(null);

  const handleLogicFlowNodeClick = (lineNumber) => {
    setPendingScrollLine(lineNumber);
    if (!isSplitView) {
      setViewMode("editor");
    }
  };

  const toggleCommandPalette = () => {
    setIsCommandPaletteOpen((prev) => !prev);
  };

  useEffect(() => {
    if ((viewMode === "editor" || isSplitView) && pendingScrollLine) {
      const t = setTimeout(() => setPendingScrollLine(null), 1000);
      return () => clearTimeout(t);
    }
  }, [viewMode, pendingScrollLine, isSplitView]);

  const formatSQL = () => {
    if (!monacoInstanceRef.current) {
      alert("Editor non inizializzato");
      return;
    }
    try {
      const val = monacoInstanceRef.current.getValue();
      const formatted = format(val, { language: "tsql", keywordCase: "upper" });
      monacoInstanceRef.current.setValue(formatted);
    } catch (e) {
      console.error(e);
      alert("Errore nella formattazione SQL: " + e.message);
    }
  };

  useEffect(() => {
    localStorage.setItem("theme", theme);
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  }, [theme]);

  const openFile = (fileId) => {
    if (!openFiles.includes(fileId)) {
      setOpenFiles([...openFiles, fileId]);
    }
    setActiveFileId(fileId);
  };

  const closeTab = (e, fileId) => {
    e.stopPropagation();
    const newOpen = openFiles.filter((id) => id !== fileId);
    setOpenFiles(newOpen);
    if (activeFileId === fileId) {
      setActiveFileId(newOpen.length > 0 ? newOpen[newOpen.length - 1] : null);
    }
  };

  const handleTabReorder = (draggedId, targetId) => {
    const draggedIndex = openFiles.indexOf(draggedId);
    const targetIndex = openFiles.indexOf(targetId);
    if (
      draggedIndex === -1 ||
      targetIndex === -1 ||
      draggedIndex === targetIndex
    )
      return;

    const newOpenFiles = [...openFiles];
    newOpenFiles.splice(draggedIndex, 1);
    newOpenFiles.splice(targetIndex, 0, draggedId);
    setOpenFiles(newOpenFiles);
  };

  const activeFile = files.find((f) => f.id === activeFileId);

  const schema = useMemo(() => {
    return activeFile
      ? parseSQLToSchema(activeFile.content || "")
      : { tables: [], relationships: [] };
  }, [activeFile?.content]);

  const handleCreateFolder = (parentPath = null) => {
    const defaultName = "Nuova Cartella";
    let newPath = parentPath ? `${parentPath}/${defaultName}` : defaultName;
    let counter = 1;
    while (folders.includes(newPath)) {
      newPath = parentPath
        ? `${parentPath}/${defaultName} (${counter})`
        : `${defaultName} (${counter})`;
      counter++;
    }
    setFolders([...folders, newPath]);
    setExpandedFolders({ ...expandedFolders, [newPath]: true });
    if (parentPath)
      setExpandedFolders((prev) => ({ ...prev, [parentPath]: true }));

    setRenaming({
      type: "folder",
      id: newPath,
      value: newPath.split("/").pop(),
    });
    history.push({ folders: [...folders, newPath], files });
  };

  const handleCreateFile = (folder = null) => {
    const targetFolder =
      folder !== null
        ? folder
        : lastSelectedId && folders.includes(lastSelectedId)
        ? lastSelectedId
        : "";

    const newFile = {
      id: Date.now().toString(),
      title: "Nuovo File.sql",
      folder: targetFolder,
      content: "",
      layout: {},
      updatedAt: Date.now(),
    };
    setFiles([...files, newFile]);
    setOpenFiles([...openFiles, newFile.id]);
    setActiveFileId(newFile.id);
    if (targetFolder) {
      setExpandedFolders((prev) => ({ ...prev, [targetFolder]: true }));
    }
    setRenaming({ type: "file", id: newFile.id, value: newFile.title });
    history.push({ folders, files: [...files, newFile] });
  };

  const handleRename = () => {
    if (!renaming) return;
    if (renaming.type === "folder") {
      const oldPath = renaming.id;
      const pathParts = oldPath.split("/");
      pathParts.pop();
      const parentPath = pathParts.join("/");
      const newName =
        renaming.value.replace(/[\/]/g, "").trim() || "Senza Nome";
      const newPath = parentPath ? `${parentPath}/${newName}` : newName;

      if (folders.includes(newPath) && newPath !== oldPath) {
        alert("Esiste già una cartella con questo nome");
        setRenaming(null);
        return;
      }

      setFolders(
        folders.map((f) => {
          if (f === oldPath) return newPath;
          if (f.startsWith(oldPath + "/"))
            return newPath + f.substring(oldPath.length);
          return f;
        })
      );

      setFiles(
        files.map((f) => {
          if (f.folder === oldPath) return { ...f, folder: newPath };
          if (f.folder?.startsWith(oldPath + "/"))
            return {
              ...f,
              folder: newPath + f.folder.substring(oldPath.length),
            };
          return f;
        })
      );

      const newExpanded = {};
      Object.keys(expandedFolders).forEach((k) => {
        if (k === oldPath) newExpanded[newPath] = expandedFolders[k];
        else if (k.startsWith(oldPath + "/"))
          newExpanded[newPath + k.substring(oldPath.length)] =
            expandedFolders[k];
        else newExpanded[k] = expandedFolders[k];
      });
      setExpandedFolders(newExpanded);

      if (selectedIds.has(oldPath)) {
        const newSet = new Set(selectedIds);
        newSet.delete(oldPath);
        newSet.add(newPath);
        setSelectedIds(newSet);
        if (lastSelectedId === oldPath) setLastSelectedId(newPath);
      }
    } else {
      const newTitle =
        renaming.value.replace(/[\/]/g, "").trim() || "Senza Titolo";
      setFiles(
        files.map((f) => (f.id === renaming.id ? { ...f, title: newTitle } : f))
      );
    }
    setRenaming(null);
  };

  const handleDeleteFolder = (path) => {
    setFolders(folders.filter((f) => f !== path && !f.startsWith(path + "/")));
    setFiles(
      files.filter((f) => f.folder !== path && !f.folder.startsWith(path + "/"))
    );
    const deletedFiles = files
      .filter((f) => f.folder === path || f.folder.startsWith(path + "/"))
      .map((f) => f.id);
    setOpenFiles((prev) => prev.filter((id) => !deletedFiles.includes(id)));
    if (deletedFiles.includes(activeFileId)) setActiveFileId(null);
  };

  const handleDeleteFile = (id) => {
    setFiles(files.filter((f) => f.id !== id));
    closeTab({ stopPropagation: () => {} }, id);
  };

  const handleMove = (source, target) => {
    if (!source || !target) return;

    if (source.type === "file") {
      const fileId = source.id;
      const targetFolder = target.type === "root" ? "" : target.id;

      setFiles((prev) =>
        prev.map((f) => (f.id === fileId ? { ...f, folder: targetFolder } : f))
      );
    } else if (source.type === "folder") {
      const sourcePath = source.id;
      const targetParentPath = target.type === "root" ? "" : target.id;

      const folderName = sourcePath.split("/").pop();
      const newPath = targetParentPath
        ? `${targetParentPath}/${folderName}`
        : folderName;

      if (newPath === sourcePath || newPath.startsWith(sourcePath + "/"))
        return;
      if (folders.includes(newPath)) {
        alert("Una cartella con questo nome esiste già nella destinazione");
        return;
      }

      setFolders((prev) =>
        prev.map((f) => {
          if (f === sourcePath) return newPath;
          if (f.startsWith(sourcePath + "/"))
            return newPath + f.substring(sourcePath.length);
          return f;
        })
      );

      setFiles((prev) =>
        prev.map((f) => {
          if (f.folder === sourcePath) return { ...f, folder: newPath };
          if (f.folder?.startsWith(sourcePath + "/"))
            return {
              ...f,
              folder: newPath + f.folder.substring(sourcePath.length),
            };
          return f;
        })
      );

      const newExpanded = {};
      Object.keys(expandedFolders).forEach((k) => {
        if (k === sourcePath) newExpanded[newPath] = expandedFolders[k];
        else if (k.startsWith(sourcePath + "/"))
          newExpanded[newPath + k.substring(sourcePath.length)] =
            expandedFolders[k];
        else newExpanded[k] = expandedFolders[k];
      });
      setExpandedFolders(newExpanded);

      if (selectedIds.has(sourcePath)) {
        const newSet = new Set(selectedIds);
        newSet.delete(sourcePath);
        newSet.add(newPath);
        setSelectedIds(newSet);
        if (lastSelectedId === sourcePath) setLastSelectedId(newPath);
      }
    }
  };

  const handleImportCSV = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const text = evt.target.result;
      const lines = text.split("\n");
      if (lines.length < 1) return;
      const headers = lines[0]
        .split(",")
        .map((h) => h.trim().replace(/"/g, ""));
      const tableName = file.name
        .replace(".csv", "")
        .replace(/\s+/g, "_")
        .toLowerCase();

      let sql = `CREATE TABLE ${tableName} (\n`;
      sql += headers.map((h) => `    ${h} VARCHAR(255)`).join(",\n");
      sql += `\n);\n`;

      const newContent = (activeFile?.content || "") + "\n\n" + sql;
      const newLayout = {
        ...(activeFile?.layout || {}),
        [tableName]: { x: 100, y: 100 },
      };

      setFiles((prev) =>
        prev.map((f) =>
          f.id === activeFileId
            ? {
                ...f,
                content: newContent,
                layout: newLayout,
                updatedAt: Date.now(),
              }
            : f
        )
      );
    };
    reader.readAsText(file);
  };

  const handleDownloadSQL = () => {
    if (!activeFile) return;
    const blob = new Blob([activeFile.content], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeFile.title;
    a.click();
    URL.revokeObjectURL(url);
  };

  const updateFileLayout = (newLayout) => {
    setFiles((prev) =>
      prev.map((f) => (f.id === activeFileId ? { ...f, layout: newLayout } : f))
    );
  };

  const updateLogicFlowLayout = (newLayout) => {
    setFiles((prev) =>
      prev.map((f) =>
        f.id === activeFileId ? { ...f, logicFlowLayout: newLayout } : f
      )
    );
  };

  const handleTableUpdate = (oldTableName, newTableData) => {
    let content = activeFile.content || "";
    const newSQL = generateTableSQL(newTableData);

    const regex = new RegExp(
      `CREATE\\s+TABLE\\s+["\`]?${oldTableName}["\`]?\\s*\\([\\s\\S]*?\\);`,
      "im"
    );
    if (regex.test(content)) content = content.replace(regex, newSQL);
    else content += "\n\n" + newSQL;

    setFiles((prev) =>
      prev.map((f) =>
        f.id === activeFileId ? { ...f, content, updatedAt: Date.now() } : f
      )
    );
  };

  const handleTableDelete = (tableName) => {
    let content = activeFile.content || "";
    const regex = new RegExp(
      `CREATE\\s+TABLE\\s+["\`]?${tableName}["\`]?\\s*\\([\\s\\S]*?\\);?`,
      "im"
    );
    setFiles((prev) =>
      prev.map((f) =>
        f.id === activeFileId
          ? { ...f, content: content.replace(regex, ""), updatedAt: Date.now() }
          : f
      )
    );
  };

  const handleTableAdd = (x, y) => {
    const name = `NewTable_${Math.floor(Math.random() * 1000)}`;
    const newTable = {
      name,
      columns: [{ name: "id", type: "INT", isPk: true }],
    };
    const sql = generateTableSQL(newTable);
    const newContent = (activeFile.content || "") + "\n\n" + sql;
    const newLayout = {
      ...(activeFile.layout || {}),
      [name]: { x: x || 100, y: y || 100 },
    };
    setFiles((prev) =>
      prev.map((f) =>
        f.id === activeFileId
          ? {
              ...f,
              content: newContent,
              layout: newLayout,
              updatedAt: Date.now(),
            }
          : f
      )
    );
  };

  const onEditorChange = (val) => {
    setFiles((prev) => {
      const updated = prev.map((f) =>
        f.id === activeFileId
          ? { ...f, content: val, updatedAt: Date.now() }
          : f
      );
      return updated;
    });
  };

  const handleContextMenu = (e, type, target) => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, type, target });

    if (type === "folder" && !selectedIds.has(target)) {
      setSelectedIds(new Set([target]));
      setLastSelectedId(target);
    }
    if (type === "file" && !selectedIds.has(target.id)) {
      setSelectedIds(new Set([target.id]));
      setLastSelectedId(target.id);
      setActiveFileId(target.id);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA")
        return;

      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "p")) {
        e.preventDefault();
        toggleCommandPalette();
        return;
      }

      
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div
      className={`flex h-screen w-full transition-colors duration-300 ${
        theme === "dark"
          ? "bg-zinc-950 text-zinc-100"
          : "bg-slate-50 text-slate-800"
      }`}
      onClick={() => setContextMenu(null)}
    >
      <TableDetailModal
        isOpen={!!editingTable}
        table={editingTable}
        onClose={() => setEditingTable(null)}
        onSave={handleTableUpdate}
        onDelete={handleTableDelete}
        theme={theme}
      />

      <Sidebar
        isSidebarOpen={isSidebarOpen}
        sidebarWidth={sidebarWidth}
        setSidebarWidth={setSidebarWidth}
        theme={theme}
        folders={folders}
        files={files}
        expandedFolders={expandedFolders}
        setExpandedFolders={setExpandedFolders}
        selectedIds={selectedIds}
        setSelectedIds={setSelectedIds}
        lastSelectedId={lastSelectedId}
        setLastSelectedId={setLastSelectedId}
        renaming={renaming}
        setRenaming={setRenaming}
        handleRename={handleRename}
        handleCreateFile={handleCreateFile}
        handleCreateFolder={handleCreateFolder}
        handleContextMenu={handleContextMenu}
        openFile={openFile}
        searchTerm={searchTerm}
        setSearchTerm={setSearchTerm}
        handleMove={handleMove}
      />

      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        <Header
          activeFileId={activeFileId}
          activeFile={activeFile}
          viewMode={viewMode}
          setViewMode={setViewMode}
          theme={theme}
          setTheme={setTheme}
          handleImportCSV={handleImportCSV}
          formatSQL={formatSQL}
          handleDownloadSQL={handleDownloadSQL}
          isSplitView={isSplitView}
          setIsSplitView={setIsSplitView}
        />

        {activeFileId && (
          <TabBar
            openFiles={openFiles}
            files={files}
            activeFileId={activeFileId}
            setActiveFileId={setActiveFileId}
            closeTab={closeTab}
            theme={theme}
            onReorder={handleTabReorder}
          />
        )}

        <EditorArea
          activeFileId={activeFileId}
          activeFile={activeFile}
          viewMode={viewMode}
          theme={theme}
          monacoStatus={monacoStatus}
          monacoInstanceRef={monacoInstanceRef}
          onEditorChange={onEditorChange}
          schema={schema}
          onLayoutChange={updateFileLayout}
          onLogicFlowLayoutChange={updateLogicFlowLayout}
          onNodeClick={handleLogicFlowNodeClick}
          setEditingTable={setEditingTable}
          onTableAdd={handleTableAdd}
          pendingScrollLine={pendingScrollLine}
          isSplitView={isSplitView}
          onToggleCommandPalette={toggleCommandPalette} 
        />
      </div>

      {contextMenu && (
        <div
          className="fixed z-[100] bg-white dark:bg-[#252525] border border-gray-200 dark:border-gray-700 shadow-xl rounded-lg py-1 min-w-[150px] text-sm text-gray-800 dark:text-gray-200"
          style={{ top: contextMenu.y, left: contextMenu.x }}
        >
          {contextMenu.type === "root" && (
            <>
              <button
                onClick={() => handleCreateFolder()}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                Nuova Cartella
              </button>
              <button
                onClick={() => handleCreateFile()}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                Nuovo File
              </button>
            </>
          )}
          {contextMenu.type === "folder" && (
            <>
              <button
                onClick={() => handleCreateFile(contextMenu.target)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                Nuovo File
              </button>
              <button
                onClick={() => handleCreateFolder(contextMenu.target)}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                Nuova Sottocartella
              </button>
              <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />
              <button
                onClick={() =>
                  setRenaming({
                    type: "folder",
                    id: contextMenu.target,
                    value: contextMenu.target.split("/").pop(),
                  })
                }
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                Rinomina
              </button>
              <button
                onClick={() => {
                  if (confirm("Eliminare cartella?"))
                    handleDeleteFolder(contextMenu.target);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/10 text-red-500"
              >
                Elimina
              </button>
            </>
          )}
          {contextMenu.type === "file" && (
            <>
              <button
                onClick={() =>
                  setRenaming({
                    type: "file",
                    id: contextMenu.target.id,
                    value: contextMenu.target.title,
                  })
                }
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/10"
              >
                Rinomina
              </button>
              <button
                onClick={() => {
                  if (confirm("Eliminare file?"))
                    handleDeleteFile(contextMenu.target.id);
                }}
                className="w-full text-left px-4 py-2 hover:bg-gray-100 dark:hover:bg-white/10 text-red-500"
              >
                Elimina
              </button>
            </>
          )}
        </div>
      )}

      <CommandPalette
        isOpen={isCommandPaletteOpen}
        onClose={() => setIsCommandPaletteOpen(false)}
        files={files}
        folders={folders}
        openFile={openFile}
        theme={theme}
        actions={{
          formatSQL,
          downloadFile: handleDownloadSQL,
          setViewMode,
          toggleTheme: () =>
            setTheme((prev) => (prev === "dark" ? "light" : "dark")),
          createFile: (name, folder) => {
            const newFile = {
              id: Date.now().toString(),
              title: name.endsWith(".sql") ? name : `${name}.sql`,
              folder: folder || "",
              content: "",
              layout: {},
              updatedAt: Date.now(),
            };
            const newFiles = [...files, newFile];
            setFiles(newFiles);
            setOpenFiles((prev) => [...prev, newFile.id]);
            setActiveFileId(newFile.id);
            if (folder) {
              setExpandedFolders((prev) => ({ ...prev, [folder]: true }));
            }
            history.push({ folders, files: newFiles });
          },
        }}
      />
    </div>
  );
}