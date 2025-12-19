import React, { useState, useCallback, useRef } from "react";
import { Database } from "lucide-react";
import { SqlEditor } from "./SqlEditor";
import { CustomDiagramCanvas } from "./CustomDiagramCanvas";
import { LogicFlowCanvas } from "./LogicFlowCanvas";
import { ConsolePanel } from "./ConsolePanel";

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true };
  }
  componentDidCatch(error, errorInfo) {
    console.error("ErrorBoundary:", error, errorInfo);
  }
  render() {
    if (this.state.hasError)
      return (
        <div className="flex items-center justify-center h-full text-red-500">
          Errore Render
        </div>
      );
    return this.props.children;
  }
}

export const EditorArea = ({
  activeFileId,
  activeFile,
  viewMode,
  theme,
  monacoStatus,
  monacoInstanceRef,
  onEditorChange,
  schema,
  onLayoutChange,
  onLogicFlowLayoutChange,
  onNodeClick,
  setEditingTable,
  onTableAdd,
  pendingScrollLine,
  isSplitView,
  onToggleCommandPalette,
}) => {
  const logicFlowRef = useRef(null); 

  const [flowState, setFlowState] = useState({
    logs: [],
    variables: {},
    executionState: "idle",
    pendingDecision: null, 
  });

  const handleFlowStateChange = useCallback((newState) => {
    setFlowState((prev) => ({ ...prev, ...newState }));
  }, []);

  const handleClearConsole = () => {
    setFlowState((prev) => ({ ...prev, logs: [], variables: {} }));
  };

  
  const handleDecision = (result) => {
    if (logicFlowRef.current) {
      logicFlowRef.current.resolveDecision(result);
    }
  };

  if (!activeFileId || !activeFile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center opacity-30 select-none">
        <div
          className={`p-6 rounded-full mb-4 ${
            theme === "dark" ? "bg-zinc-900" : "bg-slate-100"
          }`}
        >
          <Database
            className={`w-12 h-12 ${
              theme === "dark" ? "text-zinc-600" : "text-slate-400"
            }`}
          />
        </div>
        <p
          className={`font-medium ${
            theme === "dark" ? "text-zinc-500" : "text-slate-400"
          }`}
        >
          Seleziona un file per iniziare
        </p>
      </div>
    );
  }

  
  const renderVisualArea = () => {
    
    const effectiveVisualMode =
      viewMode === "editor" && isSplitView ? "logic-flow" : viewMode;

    if (effectiveVisualMode === "diagram") {
      return (
        <CustomDiagramCanvas
          schema={schema}
          theme={theme}
          layout={activeFile?.layout || {}}
          onLayoutChange={onLayoutChange}
          onTableClick={(table) => setEditingTable(table)}
          onTableAdd={onTableAdd}
        />
      );
    }

    if (effectiveVisualMode === "logic-flow") {
      return (
        <div className="flex flex-col h-full">
          <div className="flex-1 relative overflow-hidden">
            <LogicFlowCanvas
              ref={logicFlowRef} 
              activeFile={activeFile}
              theme={theme}
              logicFlowLayout={activeFile?.logicFlowLayout || {}}
              onLayoutChange={onLogicFlowLayoutChange}
              onNodeClick={onNodeClick}
              onStateChange={handleFlowStateChange}
            />
          </div>
          <ConsolePanel
            logs={flowState.logs}
            variables={flowState.variables}
            pendingDecision={flowState.pendingDecision} 
            onDecision={handleDecision} 
            theme={theme}
            onClear={handleClearConsole}
          />
        </div>
      );
    }

    return null;
  };

  return (
    <div className="flex-1 relative overflow-hidden">
      <ErrorBoundary>
        {isSplitView ? (
          
          <div className="flex h-full w-full">
            {}
            <div
              className={`w-1/2 h-full border-r ${
                theme === "dark" ? "border-zinc-800" : "border-slate-200"
              }`}
            >
              <SqlEditor
                key={`split-editor-${activeFileId}`}
                content={activeFile.content || ""}
                theme={theme}
                monacoStatus={monacoStatus}
                onMount={(editor) => {
                  monacoInstanceRef.current = editor;
                }}
                onChange={onEditorChange}
                pendingScrollLine={pendingScrollLine}
                schema={schema}
                onToggleCommandPalette={onToggleCommandPalette}
              />
            </div>
            {}
            <div className={`w-1/2 h-full bg-[#f4f4f5] dark:bg-[#111]`}>
              {renderVisualArea()}
            </div>
          </div>
        ) : (
          
          <>
            <div
              className={`absolute inset-0 ${
                viewMode === "editor" ? "z-10" : "z-0 invisible"
              }`}
            >
              <SqlEditor
                key={activeFileId}
                content={activeFile.content || ""}
                theme={theme}
                monacoStatus={monacoStatus}
                onMount={(editor) => {
                  monacoInstanceRef.current = editor;
                }}
                onChange={onEditorChange}
                pendingScrollLine={pendingScrollLine}
                schema={schema}
                onToggleCommandPalette={onToggleCommandPalette}
              />
            </div>

            <div
              className={`absolute inset-0 bg-[#f4f4f5] dark:bg-[#111] ${
                viewMode === "diagram" || viewMode === "logic-flow"
                  ? "z-10"
                  : "z-0 invisible"
              }`}
            >
              {renderVisualArea()}
            </div>
          </>
        )}
      </ErrorBoundary>
    </div>
  );
};