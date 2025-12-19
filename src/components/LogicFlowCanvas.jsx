import React, { useEffect, useCallback, useState, useRef, useImperativeHandle, forwardRef } from "react";
import ReactFlow, {
  Background,
  useNodesState,
  useEdgesState,
  Handle,
  Position,
  useReactFlow,
  ReactFlowProvider,
  getNodesBounds,
  getViewportForBounds,
} from "reactflow";
import "reactflow/dist/style.css";
import { Parser } from "node-sql-parser";
import dagre from "dagre";
import {
  Play,
  StopCircle,
  Activity,
  GitBranch,
  RefreshCw,
  Network,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Download,
  ShieldAlert,
  ShieldCheck,
  Layers,
  FileText,
  Pause,
  Square,
  StepForward,
  FastForward,
  Bug,
  ChevronDown,
} from "lucide-react";
import { toPng } from "html-to-image";

const parser = new Parser();

const dagreGraph = new dagre.graphlib.Graph();
dagreGraph.setDefaultEdgeLabel(() => ({}));

const nodeWidth = 240;
const nodeHeight = 100;

const getLayoutedElements = (nodes, edges, direction = "TB") => {
  const isHorizontal = direction === "LR";
  dagreGraph.setGraph({ rankdir: direction, nodesep: 80, ranksep: 80 });

  nodes.forEach((node) => {
    let width = nodeWidth;
    let height = nodeHeight;
    if (node.type === "decision") {
      width = 150;
      height = 150;
    }
    if (node.type === "start" || node.type === "end") {
      width = 150;
      height = 60;
    }
    dagreGraph.setNode(node.id, { width, height });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    node.position = {
      x: nodeWithPosition.x - nodeWidth / 2,
      y: nodeWithPosition.y - nodeHeight / 2,
    };
    return node;
  });

  return { nodes: layoutedNodes, edges };
};

const StartNode = ({ data }) => (
  <div
    className={`px-4 py-2 shadow-lg rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 border-2 border-white/20 flex items-center gap-2 min-w-[120px] justify-center text-white font-bold tracking-wide transition-all duration-300 ${
      data.isActive ? "ring-4 ring-yellow-400 scale-110 shadow-yellow-400/50" : ""
    }`}
  >
    <Play className="w-4 h-4 fill-current" />
    <span>{data.label}</span>
    <Handle
      type="source"
      position={Position.Bottom}
      className="w-3 h-3 bg-teal-600 border-2 border-white"
    />
    {data.isBreakpoint && (
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm" />
    )}
  </div>
);

const EndNode = ({ data }) => (
  <div
    className={`px-4 py-2 shadow-lg rounded-full bg-gradient-to-r from-rose-500 to-pink-500 border-2 border-white/20 flex items-center gap-2 min-w-[120px] justify-center text-white font-bold tracking-wide transition-all duration-300 ${
      data.isActive ? "ring-4 ring-yellow-400 scale-110 shadow-yellow-400/50" : ""
    }`}
  >
    <StopCircle className="w-5 h-5" />
    <span>{data.label}</span>
    <Handle
      type="target"
      position={Position.Top}
      className="w-3 h-3 bg-rose-600 border-2 border-white"
    />
    {data.isBreakpoint && (
      <div className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 rounded-full border-2 border-white shadow-sm" />
    )}
  </div>
);

const ActionNode = ({ data }) => {
  let Icon = Activity;
  let borderColor = "border-indigo-500";
  let iconColor = "text-indigo-600 dark:text-indigo-400";
  let handleColor = "!bg-indigo-500";
  let labelType = "Action";

  const upperLabel = data.label ? data.label.toUpperCase() : "";

  if (
    upperLabel.startsWith("BEGIN TRAN") ||
    upperLabel.startsWith("BEGIN TRANSACTION") ||
    upperLabel.startsWith("COMMIT") ||
    upperLabel.startsWith("ROLLBACK")
  ) {
    Icon = Layers;
    borderColor = "border-purple-500";
    iconColor = "text-purple-600 dark:text-purple-400";
    handleColor = "!bg-purple-500";
    labelType = "Transaction";
  } else if (upperLabel.startsWith("BEGIN TRY")) {
    Icon = ShieldCheck;
    borderColor = "border-blue-500";
    iconColor = "text-blue-600 dark:text-blue-400";
    handleColor = "!bg-blue-500";
    labelType = "Try Block";
  } else if (upperLabel.startsWith("BEGIN CATCH")) {
    Icon = ShieldAlert;
    borderColor = "border-amber-500";
    iconColor = "text-amber-600 dark:text-amber-400";
    handleColor = "!bg-amber-500";
    labelType = "Catch Block";
  }

  return (
    <div
      className={`px-4 py-3 shadow-xl rounded-xl bg-white dark:bg-zinc-800 border-l-4 ${borderColor} min-w-[200px] max-w-[300px] flex flex-col gap-1 relative group transition-all duration-300 ${
        data.isActive
          ? "ring-4 ring-yellow-400 scale-105 shadow-yellow-400/50 z-50"
          : ""
      }`}
    >
      <div
        className={`flex items-center gap-2 ${iconColor} font-bold text-xs uppercase tracking-wider`}
      >
        <Icon className="w-3 h-3" />
        <span>{labelType}</span>
      </div>
      <div className="text-sm font-medium text-slate-700 dark:text-slate-200 leading-tight break-words">
        {data.label}
      </div>
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-slate-300 dark:!bg-zinc-600 w-2 h-2"
      />
      <Handle
        type="source"
        position={Position.Bottom}
        className={`${handleColor} w-2 h-2`}
      />
      {data.isBreakpoint && (
        <div className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 rounded-full border-2 border-white shadow-md flex items-center justify-center">
          <Bug className="w-3 h-3 text-white fill-current" />
        </div>
      )}
    </div>
  );
};

const DecisionNode = ({ data }) => {
  let Icon = GitBranch;
  let gradient = "from-amber-400 to-orange-500";
  let textColor = "text-amber-600 dark:text-amber-500";
  let borderColor = "border-amber-100 dark:border-amber-900/30";
  let handleColor = "!bg-amber-500";

  if (data.decisionType === "WHILE") {
    Icon = RefreshCw;
    gradient = "from-cyan-400 to-blue-500";
    textColor = "text-cyan-600 dark:text-cyan-500";
    borderColor = "border-cyan-100 dark:border-cyan-900/30";
    handleColor = "!bg-cyan-500";
  } else if (data.decisionType === "CASE") {
    Icon = Network;
    gradient = "from-violet-400 to-purple-500";
    textColor = "text-violet-600 dark:text-violet-500";
    borderColor = "border-violet-100 dark:border-violet-900/30";
    handleColor = "!bg-violet-500";
  }

  return (
    <div
      className={`relative flex items-center justify-center w-[120px] h-[120px] transition-all duration-300 ${
        data.isActive ? "scale-110 drop-shadow-[0_0_15px_rgba(250,204,21,0.6)]" : ""
      }`}
    >
      <Handle
        type="target"
        position={Position.Top}
        className={`!-top-1 ${handleColor} z-10 w-2 h-2`}
      />
      <div
        className={`w-16 h-16 bg-gradient-to-br ${gradient} rotate-45 rounded-lg shadow-lg border-2 border-white/30 flex items-center justify-center transform hover:scale-110 transition-transform duration-200 z-0`}
      >
        <div className="-rotate-45 text-white">
          <Icon className="w-8 h-8 opacity-90" />
        </div>
      </div>
      <div
        className={`absolute top-full -mt-2 bg-white dark:bg-zinc-800 px-3 py-1 rounded-full shadow-md text-xs font-bold ${textColor} border ${borderColor} whitespace-nowrap z-20 max-w-[200px] truncate`}
      >
        {data.label}
      </div>
      <Handle
        id="right"
        type="source"
        position={Position.Right}
        className="!-right-4 !bg-rose-400 w-2 h-2"
      />
      <Handle
        id="bottom"
        type="source"
        position={Position.Bottom}
        className="!-bottom-4 !bg-emerald-400 w-2 h-2"
      />
      {data.isBreakpoint && (
        <div className="absolute top-0 right-0 w-5 h-5 bg-red-500 rounded-full border-2 border-white shadow-md flex items-center justify-center z-30">
          <Bug className="w-3 h-3 text-white fill-current" />
        </div>
      )}
    </div>
  );
};

const nodeTypes = {
  start: StartNode,
  end: EndNode,
  action: ActionNode,
  decision: DecisionNode,
};

const generateFlow = (sql, theme) => {
  const { nodes, edges, stats } = generateFallbackFlow(sql, theme);
  const layouted = getLayoutedElements(nodes, edges);
  return { ...layouted, stats };
};

const generateFallbackFlow = (sql, theme) => {
  const nodes = [];
  const edges = [];
  let idCounter = 0;

  const stats = {
    lines: 0,
    maxLoopDepth: 0,
    decisions: 0,
  };

  const labelBgColor = theme === "dark" ? "#111" : "#ffffff";

  const lines = sql
    .split("\n")
    .map((l, i) => ({ text: l.trim(), lineIndex: i + 1 }))
    .filter((l) => l.text);

  stats.lines = lines.length;

  let previousNode = null;
  let stack = [];
  let currentBuffer = [];

  const createNode = (
    text,
    type,
    lineNumber = null,
    absorbBreaks = true,
    decisionType = null
  ) => {
    idCounter++;
    const id = `${idCounter}`;
    nodes.push({
      id,
      position: { x: 0, y: 0 },
      data: { label: text, lineNumber, decisionType, isActive: false, isBreakpoint: false },
      type,
    });

    if (absorbBreaks) {
      const parent = stack[stack.length - 1];
      if (parent && parent.pendingBreaks && parent.pendingBreaks.length > 0) {
        parent.pendingBreaks.forEach((breakId) => {
          edges.push({
            id: `e-break-${breakId}-${id}`,
            source: breakId,
            target: id,
            type: "smoothstep",
            animated: true,
            style: {
              stroke: "#94a3b8",
              strokeWidth: 2,
              strokeDasharray: "5,5",
            },
          });
        });
        parent.pendingBreaks = [];
      }
    }
    return id;
  };

  const flushBuffer = () => {
    if (currentBuffer.length === 0) return null;

    const fullText = currentBuffer.map((i) => i.text).join("\n");
    const firstItem = currentBuffer[0];
    const label = fullText.length > 60 ? firstItem.text + "..." : fullText;

    const nodeId = createNode(label, "action", firstItem.lineIndex);
    const parent = stack[stack.length - 1];

    if (previousNode) {
      let sourceHandle = null;
      let edgeLabel = null;
      let edgeColor = "#94a3b8";

      if (parent && parent.decisionId === previousNode) {
        if (parent.type === "CASE") {
          sourceHandle = "bottom";
          edgeLabel = parent.currentCondition || "Next";
          edgeColor = parent.inElse ? "#f43f5e" : "#3b82f6";
        } else if (parent.type === "TRY") {
          sourceHandle = "bottom";
          edgeColor = "#94a3b8";
        } else if (parent.inElse) {
          sourceHandle = "right";
          edgeLabel = "False";
          edgeColor = "#f43f5e";
        } else if (parent.isLoopExit) {
          sourceHandle = "right";
          edgeLabel = "False";
          edgeColor = "#f43f5e";
          parent.isLoopExit = false;
        } else {
          sourceHandle = "bottom";
          edgeLabel = "True";
          edgeColor = "#10b981";
        }
      }

      edges.push({
        id: `e-${previousNode}-${nodeId}`,
        source: previousNode,
        target: nodeId,
        sourceHandle,
        label: edgeLabel,
        type: "smoothstep",
        animated: true,
        labelStyle: { fill: edgeColor, fontWeight: 700 },
        labelBgStyle: { fill: labelBgColor, fillOpacity: 0.8 },
        style: { stroke: edgeColor, strokeWidth: 2 },
      });
    }

    previousNode = nodeId;
    currentBuffer = [];
    return nodeId;
  };

  previousNode = createNode("START", "start");

  const ATOMIC_STARTS = [
    "CREATE", "INSERT", "UPDATE", "DELETE", "SELECT", "DROP", "ALTER", "TRUNCATE",
    "DECLARE", "SET", "CALL", "EXEC", "EXECUTE", "PRINT", "RETURN", "MERGE",
    "BREAK", "LEAVE", "THROW", "RAISERROR",
  ];

  const NOISE_REGEX = /^([);]+|GO)$/i;

  for (let i = 0; i < lines.length; i++) {
    const { text: line, lineIndex } = lines[i];
    const upper = line.toUpperCase();

    if (line.startsWith("--")) continue;
    if (NOISE_REGEX.test(line)) continue;

    if (upper === "BEGIN") {
      if (stack.length > 0) stack[stack.length - 1].hasBegin = true;
      continue;
    }

    if (upper.startsWith("BEGIN TRAN") || upper.startsWith("BEGIN TRANSACTION")) {
      flushBuffer();
      const transNodeId = createNode("BEGIN TRANSACTION", "action", lineIndex);
      if (previousNode) {
        edges.push({
          id: `e-${previousNode}-${transNodeId}`,
          source: previousNode,
          target: transNodeId,
          type: "smoothstep",
          style: { stroke: "#94a3b8", strokeWidth: 2 },
        });
      }
      previousNode = transNodeId;
      continue;
    }

    if (upper.startsWith("COMMIT") || upper.startsWith("ROLLBACK")) {
      flushBuffer();
      const type = upper.startsWith("COMMIT") ? "COMMIT" : "ROLLBACK";
      const transEndId = createNode(type, "action", lineIndex);
      if (previousNode) {
        edges.push({
          id: `e-${previousNode}-${transEndId}`,
          source: previousNode,
          target: transEndId,
          type: "smoothstep",
          style: { stroke: type === "COMMIT" ? "#10b981" : "#f43f5e", strokeWidth: 2 },
        });
      }
      previousNode = transEndId;
      continue;
    }

    if (upper.startsWith("BEGIN TRY")) {
      flushBuffer();
      const tryId = createNode("BEGIN TRY", "action", lineIndex);
      if (previousNode) {
        edges.push({
          id: `e-${previousNode}-${tryId}`,
          source: previousNode,
          target: tryId,
          type: "smoothstep",
          style: { stroke: "#94a3b8", strokeWidth: 2 },
        });
      }
      stack.push({ decisionId: tryId, type: "TRY", hasBegin: true, mergeNodes: [] });
      previousNode = tryId;
      continue;
    }

    if (upper.startsWith("END TRY")) {
      flushBuffer();
      const parent = stack[stack.length - 1];
      if (parent && parent.type === "TRY") {
        if (previousNode) parent.mergeNodes.push(previousNode);
        previousNode = null;
      }
      continue;
    }

    if (upper.startsWith("BEGIN CATCH")) {
      flushBuffer();
      const parent = stack[stack.length - 1];
      if (parent && parent.type === "TRY") {
        const catchId = createNode("BEGIN CATCH", "action", lineIndex);
        edges.push({
          id: `e-try-error-${parent.decisionId}-${catchId}`,
          source: parent.decisionId,
          target: catchId,
          sourceHandle: "bottom",
          label: "On Error",
          type: "smoothstep",
          animated: true,
          style: { stroke: "#f43f5e", strokeWidth: 2, strokeDasharray: "5,5" },
          labelStyle: { fill: "#f43f5e", fontWeight: 700 },
          labelBgStyle: { fill: labelBgColor, fillOpacity: 0.8 },
        });
        parent.inCatch = true;
        previousNode = catchId;
      }
      continue;
    }

    if (upper.startsWith("END CATCH")) {
      flushBuffer();
      const parent = stack[stack.length - 1];
      if (parent && parent.type === "TRY") {
        stack.pop();
        if (previousNode) parent.mergeNodes.push(previousNode);
        const mergeId = createNode("End Try/Catch", "action", lineIndex, false);
        parent.mergeNodes.forEach((src) => {
          edges.push({
            id: `e-merge-${src}-${mergeId}`,
            source: src,
            target: mergeId,
            type: "smoothstep",
            style: { stroke: "#94a3b8", strokeWidth: 2 },
          });
        });
        previousNode = mergeId;
      }
      continue;
    }

    if (upper.startsWith("IF ") || upper.startsWith("WHILE ")) {
      flushBuffer();
      const isWhile = upper.startsWith("WHILE ");
      const condition = line.substring(isWhile ? 5 : 3).replace(/then$|do$/i, "").trim();
      const type = isWhile ? "WHILE" : "IF";
      stats.decisions++;
      if (isWhile) {
        const currentLoopDepth = stack.filter((s) => s.type === "WHILE").length + 1;
        if (currentLoopDepth > stats.maxLoopDepth) stats.maxLoopDepth = currentLoopDepth;
      }
      const decisionId = createNode(condition, "decision", lineIndex, true, type);
      const parent = stack[stack.length - 1];
      if (previousNode) {
        let sourceHandle = null;
        let edgeLabel = null;
        let edgeColor = "#94a3b8";
        if (parent && parent.decisionId === previousNode) {
          if (parent.type === "CASE") {
            sourceHandle = "bottom";
            edgeLabel = parent.currentCondition;
            edgeColor = "#3b82f6";
          } else if (parent.type === "TRY") {
            sourceHandle = "bottom";
            edgeColor = "#94a3b8";
          } else if (parent.inElse) {
            sourceHandle = "right";
            edgeLabel = "False";
            edgeColor = "#f43f5e";
          } else if (parent.isLoopExit) {
            sourceHandle = "right";
            edgeLabel = "False";
            edgeColor = "#f43f5e";
            parent.isLoopExit = false;
          } else {
            sourceHandle = "bottom";
            edgeLabel = "True";
            edgeColor = "#10b981";
          }
        }
        edges.push({
          id: `e-${previousNode}-${decisionId}`,
          source: previousNode,
          target: decisionId,
          sourceHandle,
          label: edgeLabel,
          type: "smoothstep",
          animated: true,
          labelStyle: { fill: edgeColor, fontWeight: 700 },
          labelBgStyle: { fill: labelBgColor, fillOpacity: 0.8 },
          style: { stroke: edgeColor, strokeWidth: 2 },
        });
      }
      stack.push({ decisionId, type, hasBegin: false });
      previousNode = decisionId;
      continue;
    }

    if (upper.startsWith("CASE")) {
      flushBuffer();
      stats.decisions++;
      const decisionId = createNode("CASE", "decision", lineIndex, true, "CASE");
      if (previousNode) {
        const parent = stack[stack.length - 1];
        let sourceHandle = null;
        let edgeLabel = null;
        let edgeColor = "#94a3b8";
        if (parent && parent.decisionId === previousNode) {
          if (parent.type === "CASE") {
            sourceHandle = "bottom";
            edgeLabel = parent.currentCondition;
            edgeColor = "#3b82f6";
          } else if (parent.type === "TRY") {
            sourceHandle = "bottom";
            edgeColor = "#94a3b8";
          } else if (parent.inElse) {
            sourceHandle = "right";
            edgeLabel = "False";
            edgeColor = "#f43f5e";
          } else {
            sourceHandle = "bottom";
            edgeLabel = "True";
            edgeColor = "#10b981";
          }
        }
        edges.push({
          id: `e-${previousNode}-${decisionId}`,
          source: previousNode,
          target: decisionId,
          sourceHandle,
          label: edgeLabel,
          type: "smoothstep",
          animated: true,
          labelStyle: { fill: edgeColor, fontWeight: 700 },
          labelBgStyle: { fill: labelBgColor, fillOpacity: 0.8 },
          style: { stroke: edgeColor, strokeWidth: 2 },
        });
      }
      stack.push({ decisionId, type: "CASE", mergeNodes: [], hasBegin: false });
      previousNode = decisionId;
      continue;
    }

    const isWholeWordCase = /\bCASE\b/i.test(line);
    if (isWholeWordCase && !upper.startsWith("CASE")) {
      flushBuffer();
      stats.decisions++;
      const prefix = line.substring(0, upper.indexOf("CASE")).trim();
      if (prefix) {
        const prefixId = createNode(prefix, "action", lineIndex);
        if (previousNode) {
          const parent = stack[stack.length - 1];
          let sourceHandle = null;
          let edgeLabel = null;
          let edgeColor = "#94a3b8";
          if (parent && parent.decisionId === previousNode) {
            if (parent.type === "CASE") {
              sourceHandle = "bottom";
              edgeLabel = parent.currentCondition;
              edgeColor = "#3b82f6";
            } else if (parent.type === "TRY") {
              sourceHandle = "bottom";
              edgeColor = "#94a3b8";
            } else if (parent.inElse) {
              sourceHandle = "right";
              edgeLabel = "False";
              edgeColor = "#f43f5e";
            } else {
              sourceHandle = "bottom";
              edgeLabel = "True";
              edgeColor = "#10b981";
            }
          }
          edges.push({
            id: `e-${previousNode}-${prefixId}`,
            source: previousNode,
            target: prefixId,
            sourceHandle,
            label: edgeLabel,
            type: "smoothstep",
            labelStyle: { fill: edgeColor, fontWeight: 700 },
            labelBgStyle: { fill: labelBgColor, fillOpacity: 0.8 },
            style: { stroke: edgeColor, strokeWidth: 2 },
          });
        }
        previousNode = prefixId;
      }
      const decisionId = createNode("CASE", "decision", lineIndex, true, "CASE");
      if (previousNode) {
        edges.push({
          id: `e-${previousNode}-${decisionId}`,
          source: previousNode,
          target: decisionId,
          type: "smoothstep",
          style: { stroke: "#94a3b8", strokeWidth: 2 },
        });
      }
      stack.push({ decisionId, type: "CASE", mergeNodes: [], hasBegin: false });
      previousNode = decisionId;
      continue;
    }

    if (upper.startsWith("WHEN ")) {
      flushBuffer();
      const parent = stack[stack.length - 1];
      if (parent && parent.type === "CASE") {
        if (previousNode && previousNode !== parent.decisionId) {
          parent.mergeNodes.push(previousNode);
        }
        previousNode = parent.decisionId;
        let condition = line.substring(5);
        let actionPart = null;
        const thenIndex = condition.toUpperCase().indexOf(" THEN ");
        if (thenIndex !== -1) {
          actionPart = condition.substring(thenIndex + 6).trim();
          condition = condition.substring(0, thenIndex).trim();
        } else if (condition.toUpperCase().endsWith(" THEN")) {
          condition = condition.substring(0, condition.length - 5).trim();
        }
        parent.currentCondition = condition;
        parent.inElse = false;
        if (actionPart) {
          const nodeId = createNode(actionPart, "action", lineIndex);
          edges.push({
            id: `e-${parent.decisionId}-${nodeId}`,
            source: parent.decisionId,
            target: nodeId,
            sourceHandle: "bottom",
            label: condition,
            type: "smoothstep",
            animated: true,
            labelStyle: { fill: "#3b82f6", fontWeight: 700 },
            labelBgStyle: { fill: labelBgColor, fillOpacity: 0.8 },
            style: { stroke: "#3b82f6", strokeWidth: 2 },
          });
          previousNode = nodeId;
        }
      }
      continue;
    }

    if (upper === "ELSE" || upper.startsWith("ELSE ")) {
      flushBuffer();
      const parent = stack[stack.length - 1];
      if (parent) {
        if (parent.type === "IF") {
          parent.lastThenNode = previousNode;
          previousNode = parent.decisionId;
          parent.inElse = true;
        } else if (parent.type === "CASE") {
          if (previousNode && previousNode !== parent.decisionId) {
            parent.mergeNodes.push(previousNode);
          }
          previousNode = parent.decisionId;
          parent.inElse = true;
          parent.currentCondition = "ELSE";
          let elseContent = line.substring(4).trim();
          if (elseContent) {
            const nodeId = createNode(elseContent, "action", lineIndex);
            edges.push({
              id: `e-${parent.decisionId}-${nodeId}`,
              source: parent.decisionId,
              target: nodeId,
              sourceHandle: "bottom",
              label: "ELSE",
              type: "smoothstep",
              animated: true,
              labelStyle: { fill: "#f43f5e", fontWeight: 700 },
              labelBgStyle: { fill: labelBgColor, fillOpacity: 0.8 },
              style: { stroke: "#f43f5e", strokeWidth: 2 },
            });
            previousNode = nodeId;
          }
        }
      }
      continue;
    }

    if (upper.startsWith("END IF") || upper.startsWith("END WHILE") || upper.startsWith("END CASE") || upper === "END" || upper.startsWith("END ") || upper.startsWith("END;") || upper.startsWith("END,")) {
      flushBuffer();
      let handled = false;
      while (stack.length > 0 && !handled) {
        const parent = stack[stack.length - 1];
        if (parent.type === "TRY") {
          if (parent.hasBegin) {
            parent.hasBegin = false;
            handled = true;
          } else {
            handled = true;
            break;
          }
        } else if (parent.type === "CASE") {
          stack.pop();
          if (previousNode && previousNode !== parent.decisionId) {
            parent.mergeNodes.push(previousNode);
          }
          let endLabel = "End Case";
          const matchAlias = line.match(/END\s+(AS\s+.+)/i);
          if (matchAlias) endLabel = matchAlias[1];
          const mergeId = createNode(endLabel, "action", lineIndex, false);
          parent.mergeNodes.forEach((src) => {
            edges.push({
              id: `e-${src}-${mergeId}`,
              source: src,
              target: mergeId,
              type: "smoothstep",
              animated: true,
              style: { stroke: "#94a3b8", strokeWidth: 2 },
            });
          });
          previousNode = mergeId;
          handled = true;
        } else {
          stack.pop();
          if (parent.type === "WHILE") {
            if (previousNode) {
              edges.push({
                id: `e-loop-${previousNode}-${parent.decisionId}`,
                source: previousNode,
                target: parent.decisionId,
                type: "smoothstep",
                animated: true,
                style: { stroke: "#fbbf24", strokeWidth: 2, strokeDasharray: "5,5" },
                label: "Loop Back",
                labelStyle: { fill: "#fbbf24", fontWeight: 700 },
                labelBgStyle: { fill: labelBgColor, fillOpacity: 0.8 },
              });
            }
            previousNode = parent.decisionId;
            parent.isLoopExit = true;
          } else {
            const truePathDead = !parent.lastThenNode;
            let falsePathDead = false;
            if (parent.inElse) falsePathDead = !previousNode;
            if (!(parent.inElse && truePathDead && falsePathDead)) {
              const convergeId = createNode("Merge", "action", lineIndex, false);
              if (parent.inElse && parent.lastThenNode)
                edges.push({
                  id: `e-${parent.lastThenNode}-${convergeId}`,
                  source: parent.lastThenNode,
                  target: convergeId,
                  type: "smoothstep",
                  animated: true,
                  style: { stroke: "#94a3b8", strokeWidth: 2 },
                });
              else if (!parent.inElse && previousNode && previousNode !== parent.decisionId)
                edges.push({
                  id: `e-${previousNode}-${convergeId}`,
                  source: previousNode,
                  target: convergeId,
                  type: "smoothstep",
                  animated: true,
                  style: { stroke: "#94a3b8", strokeWidth: 2 },
                });
              else if (!parent.inElse && previousNode === parent.decisionId)
                edges.push({
                  id: `e-${parent.decisionId}-${convergeId}-true`,
                  source: parent.decisionId,
                  sourceHandle: "bottom",
                  target: convergeId,
                  label: "True",
                  type: "smoothstep",
                  animated: true,
                  labelStyle: { fill: "#10b981", fontWeight: 700 },
                  labelBgStyle: { fill: labelBgColor, fillOpacity: 0.8 },
                  style: { stroke: "#10b981", strokeWidth: 2 },
                });
              if (parent.inElse && previousNode)
                edges.push({
                  id: `e-${previousNode}-${convergeId}`,
                  source: previousNode,
                  target: convergeId,
                  type: "smoothstep",
                  animated: true,
                  style: { stroke: "#94a3b8", strokeWidth: 2 },
                });
              else if (!parent.inElse)
                edges.push({
                  id: `e-${parent.decisionId}-${convergeId}-false`,
                  source: parent.decisionId,
                  sourceHandle: "right",
                  target: convergeId,
                  label: "False",
                  type: "smoothstep",
                  animated: true,
                  labelStyle: { fill: "#f43f5e", fontWeight: 700 },
                  labelBgStyle: { fill: labelBgColor, fillOpacity: 0.8 },
                  style: { stroke: "#f43f5e", strokeWidth: 2 },
                });
              previousNode = convergeId;
            } else {
              previousNode = null;
            }
          }
          const isSpecificEnd = (parent.type === "IF" && upper.startsWith("END IF")) || (parent.type === "WHILE" && upper.startsWith("END WHILE"));
          if (parent.hasBegin || isSpecificEnd) handled = true;
        }
      }
      continue;
    }

    if (upper.startsWith("CONTINUE") || upper.startsWith("ITERATE") || upper.startsWith("BREAK") || upper.startsWith("LEAVE")) {
      flushBuffer();
      const isBreak = upper.startsWith("BREAK") || upper.startsWith("LEAVE");
      const loopFrame = [...stack].reverse().find((s) => s.type === "WHILE");
      if (loopFrame) {
        const nodeId = createNode(isBreak ? "BREAK" : "CONTINUE", "action", lineIndex);
        if (previousNode) {
          const parent = stack[stack.length - 1];
          let sourceHandle = null;
          let edgeLabel = null;
          let edgeColor = "#94a3b8";
          if (parent && parent.decisionId === previousNode) {
            if (parent.inElse) {
              sourceHandle = "right";
              edgeLabel = "False";
              edgeColor = "#f43f5e";
            } else {
              sourceHandle = "bottom";
              edgeLabel = "True";
              edgeColor = "#10b981";
            }
          }
          edges.push({
            id: `e-${previousNode}-${nodeId}`,
            source: previousNode,
            target: nodeId,
            sourceHandle,
            label: edgeLabel,
            type: "smoothstep",
            labelBgStyle: { fill: labelBgColor },
            style: { stroke: edgeColor, strokeWidth: 2 },
          });
        }
        if (isBreak) {
          if (!loopFrame.pendingBreaks) loopFrame.pendingBreaks = [];
          loopFrame.pendingBreaks.push(nodeId);
        } else {
          edges.push({
            id: `e-cont-${nodeId}-${loopFrame.decisionId}`,
            source: nodeId,
            target: loopFrame.decisionId,
            type: "smoothstep",
            style: { stroke: "#fbbf24", strokeWidth: 2, strokeDasharray: "5,5" },
          });
        }
        previousNode = null;
      }
      continue;
    }

    const isAtomic = ATOMIC_STARTS.some((start) => upper.startsWith(start));
    if (isAtomic) {
      flushBuffer();
      currentBuffer.push({ text: line, lineIndex });
    } else {
      currentBuffer.push({ text: line, lineIndex });
    }
  }

  flushBuffer();
  const endId = createNode("END", "end");
  if (previousNode)
    edges.push({
      id: `e-${previousNode}-${endId}`,
      source: previousNode,
      target: endId,
      type: "smoothstep",
      style: { stroke: "#94a3b8", strokeWidth: 2 },
    });

  const parent = stack[stack.length - 1];
  if (parent && parent.pendingBreaks) {
    parent.pendingBreaks.forEach((bid) =>
      edges.push({
        id: `e-brk-${bid}-${endId}`,
        source: bid,
        target: endId,
        type: "smoothstep",
        style: { stroke: "#94a3b8", strokeWidth: 2, strokeDasharray: "5,5" },
      })
    );
  }

  return { nodes, edges, stats };
};

const LogicFlowCanvasInner = forwardRef(({
  activeFile,
  theme,
  logicFlowLayout,
  onLayoutChange,
  onNodeClick,
  onStateChange, 
}, ref) => {
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);
  const [flowStats, setFlowStats] = useState({
    lines: 0,
    maxLoopDepth: 0,
    decisions: 0,
  });
  const { zoomIn, zoomOut, fitView, getNodes, getEdges } = useReactFlow();

  const [executionState, setExecutionState] = useState("idle"); 
  const [activeNodeId, setActiveNodeId] = useState(null);
  const [speed, setSpeed] = useState(1000);
  const [variables, setVariables] = useState({});
  const [logs, setLogs] = useState([]);
  const [breakpoints, setBreakpoints] = useState(new Set());
  const [pendingDecision, setPendingDecision] = useState(null);
  const [showSpeedMenu, setShowSpeedMenu] = useState(false); 

  useImperativeHandle(ref, () => ({
    resolveDecision: (result) => {
        if (executionState !== 'waiting_decision' || !activeNodeId) return;

        const outgoingEdges = getEdges().filter((e) => e.source === activeNodeId);
        let targetEdge;

        
        
        const edgeByTarget = outgoingEdges.find(e => e.target === result);

        if (edgeByTarget) {
            targetEdge = edgeByTarget;
        } 
        
        else if (typeof result === 'boolean') {
            if (result) {
                targetEdge = outgoingEdges.find(e => 
                    e.sourceHandle === 'bottom' || 
                    (e.label && ['True', 'Loop', 'Next', 'Then'].includes(e.label))
                );
                
                if (!targetEdge && outgoingEdges.length > 0) targetEdge = outgoingEdges[0];
            } else {
                targetEdge = outgoingEdges.find(e => 
                    e.sourceHandle === 'right' || 
                    (e.label && ['False', 'Else', 'No'].includes(e.label))
                );
                
                if (!targetEdge && outgoingEdges.length > 0) targetEdge = outgoingEdges[outgoingEdges.length - 1];
            }
        }

        if (targetEdge) {
            setActiveNodeId(targetEdge.target);
            setExecutionState('running');
            setPendingDecision(null);
            
            
            const label = targetEdge.label || (typeof result === 'boolean' ? (result ? 'VERO' : 'FALSO') : 'Selezione');
            setLogs(prev => [...prev, `✅ Percorso scelto: ${label}`]);
        }
    }
  }));

  useEffect(() => {
    if (onStateChange) {
      onStateChange({
        executionState,
        variables,
        logs,
        pendingDecision 
      });
    }
  }, [executionState, variables, logs, pendingDecision, onStateChange]);

  useEffect(() => {
    if (activeFile?.content) {
      const {
        nodes: generatedNodes,
        edges: layoutedEdges,
        stats: generatedStats,
      } = generateFlow(activeFile.content, theme);
      const nodesWithSavedPositions = generatedNodes.map((node) => {
        if (logicFlowLayout && logicFlowLayout[node.id])
          return { ...node, position: logicFlowLayout[node.id] };
        return node;
      });
      setNodes([...nodesWithSavedPositions]);
      setEdges([...layoutedEdges]);
      setFlowStats(generatedStats);
      setActiveNodeId(null);
      setExecutionState("idle");
      setVariables({});
      setLogs([]);
      setPendingDecision(null);
    }
  }, [activeFile?.content, theme, setNodes, setEdges]);

  const [opacity, setOpacity] = React.useState(0);

  useEffect(() => {
    if (nodes.length > 0) {
      setOpacity(0);
      setTimeout(() => {
        fitView({ padding: 0.2, duration: 0 });
        setTimeout(() => {
          setOpacity(1);
        }, 50);
      }, 50);
    }
  }, [nodes.length, fitView]);

  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isActive: n.id === activeNodeId,
          isBreakpoint: breakpoints.has(n.id),
        },
      }))
    );
  }, [activeNodeId, breakpoints, setNodes]);

  const handleNodeDragStop = (event, node) => {
    if (onLayoutChange) {
      const newLayout = { ...(logicFlowLayout || {}) };
      newLayout[node.id] = node.position;
      onLayoutChange(newLayout);
    }
  };

  const handleNodeClick = (event, node) => {
    if (onNodeClick && node.data && node.data.lineNumber) {
      onNodeClick(node.data.lineNumber);
    }
  };

  const handleNodeContextMenu = (event, node) => {
    event.preventDefault();
    const newBreakpoints = new Set(breakpoints);
    if (newBreakpoints.has(node.id)) {
      newBreakpoints.delete(node.id);
    } else {
      newBreakpoints.add(node.id);
    }
    setBreakpoints(newBreakpoints);
  };

  const handleDownloadImage = () => {
    const nodes = getNodes();
    if (nodes.length === 0) return;

    const bounds = getNodesBounds(nodes);
    const padding = 50;
    const width = bounds.width + padding * 2;
    const height = bounds.height + padding * 2;
    const viewportEl = document.querySelector(".react-flow__viewport");
    const transformX = -bounds.x + padding;
    const transformY = -bounds.y + padding;

    toPng(viewportEl, {
      backgroundColor: theme === "dark" ? "#111" : "#f8fafc",
      width: width,
      height: height,
      style: {
        width: width,
        height: height,
        transform: `translate(${transformX}px, ${transformY}px) scale(1)`,
      },
    }).then((dataUrl) => {
      const link = document.createElement("a");
      link.download = "logic-flow.png";
      link.href = dataUrl;
      link.click();
    });
  };

  const runSimulation = () => {
    if (executionState === "idle" || executionState === "paused") {
      setExecutionState("running");
      if (executionState === "idle") {
        setLogs(["Avvio esecuzione..."]);
        setVariables({});
        const startNode = nodes.find((n) => n.type === "start");
        if (startNode) setActiveNodeId(startNode.id);
      }
    }
  };

  const pauseSimulation = () => {
    setExecutionState("paused");
    setLogs((prev) => [...prev, "⏸️ Esecuzione in pausa."]);
  };

  const stopSimulation = () => {
    setExecutionState("idle");
    setActiveNodeId(null);
    setVariables({});
    setPendingDecision(null);
    setLogs((prev) => [...prev, "⏹️ Esecuzione terminata."]);
  };

  const executeStep = useCallback(() => {
    if (!activeNodeId) return;

    const currentNode = nodes.find((n) => n.id === activeNodeId);
    if (!currentNode) return;

    const label = currentNode.data.label;
    
    
    
    
    
    if (currentNode.type === 'action' && !label.toUpperCase().startsWith("SET ") && !label.toUpperCase().startsWith("DECLARE ") && !label.toUpperCase().startsWith("PRINT ") && !label.toUpperCase().startsWith("BEGIN ")) {
         setLogs(prev => [...prev, `⚡ Esecuzione: ${label.length > 50 ? label.substring(0, 50) + '...' : label}`]);
    }

    if (label.toUpperCase().startsWith("SET ") || label.toUpperCase().startsWith("DECLARE ")) {
        const parts = label.split("=");
        if (parts.length === 2) {
            const varName = parts[0].replace(/SET|DECLARE|INT|VARCHAR|DECIMAL|DATE/gi, "").trim();
            
            let expr = parts[1].trim();
            Object.entries(variables).forEach(([k, v]) => {
                
                const re = new RegExp(`@${k}\\b`, 'gi');
                expr = expr.replace(re, v);
            });
            
            
            let val = expr;
            try {
                
                if (/^[\d\s+\-*/().]+$/.test(expr)) {
                    val = eval(expr); 
                }
            } catch(e) {}

            setVariables(prev => ({ ...prev, [varName]: val }));
            setLogs(prev => [...prev, `💾 Assegnazione: @${varName} = ${val}`]);
        }
    } else if (label.toUpperCase().startsWith("PRINT ")) {
        let msg = label.substring(6); 
        
        
        Object.entries(variables).forEach(([k, v]) => {
             const re = new RegExp(`@${k}\\b`, 'gi');
             msg = msg.replace(re, v);
        });

        
        msg = msg.replace(/'/g, "")
                 .replace(/\s*\+\s*/g, "") 
                 .replace(/CAST\((.*?)\s+AS\s+VARCHAR\)/gi, "$1"); 

        setLogs(prev => [...prev, `> ${msg}`]);
    }

    
    const allOutgoingEdges = edges.filter((e) => e.source === activeNodeId);

    
    const loopBackEdge = allOutgoingEdges.find(e => e.label === "Loop Back");
    if (loopBackEdge) {
        setLogs(prev => [...prev, "🔄 Ritorno a inizio ciclo..."]);
        setActiveNodeId(loopBackEdge.target);
        return;
    }

    
    const interactiveEdges = allOutgoingEdges.filter(e => e.label !== "Loop Back");

    if (interactiveEdges.length === 0) {
      setExecutionState("idle");
      setLogs((prev) => [...prev, "🏁 Fine flusso raggiunta."]);
      setActiveNodeId(null);
      return;
    }

    if (interactiveEdges.length === 1) {
      const nextNodeId = interactiveEdges[0].target;
      if (breakpoints.has(nextNodeId) && executionState === 'running') {
          setExecutionState("paused");
          setLogs((prev) => [...prev, `🛑 Breakpoint raggiunto al nodo ID ${nextNodeId}`]);
      }
      setActiveNodeId(nextNodeId);
    } else {
      
      setExecutionState("waiting_decision"); 
      
      
      let rawOptions = interactiveEdges.map(edge => {
          const targetNode = nodes.find(n => n.id === edge.target);
          const targetLabel = targetNode?.data?.label || "Node";
          const cleanTargetLabel = targetLabel.replace(/[\n\r]+/g, ' ').trim();
          const shortTarget = cleanTargetLabel.length > 20 ? cleanTargetLabel.substring(0, 20) + "..." : cleanTargetLabel;
          
          return {
              originalLabel: edge.label || "Percorso",
              targetId: edge.target,
              targetSnippet: shortTarget
          };
      });

      
      const labelCounts = {};
      rawOptions.forEach(opt => {
          labelCounts[opt.originalLabel] = (labelCounts[opt.originalLabel] || 0) + 1;
      });

      
      const decisionOptions = rawOptions.map(opt => {
          let finalLabel = opt.originalLabel;
          
          
          if (currentNode.data.decisionType === 'WHILE') {
              if (opt.originalLabel === 'True') finalLabel = 'Entra nel Ciclo';
              if (opt.originalLabel === 'False') finalLabel = 'Esci dal Ciclo';
          }
          
          
          if (labelCounts[opt.originalLabel] > 1 || opt.originalLabel === "Percorso") {
              finalLabel = `${finalLabel} : ${opt.targetSnippet}`;
          }
          
          return {
              label: finalLabel,
              value: opt.targetId,
              isTargetId: true
          };
      });

      setPendingDecision({
          id: currentNode.id,
          label: currentNode.data.label,
          type: currentNode.data.decisionType || 'DECISION', 
          options: decisionOptions 
      });
      
    }
  }, [activeNodeId, nodes, edges, breakpoints, executionState, variables]);

  useEffect(() => {
    let interval;
    if (executionState === "running") {
      interval = setInterval(() => {
        executeStep();
      }, speed);
    }
    return () => clearInterval(interval);
  }, [executionState, speed, executeStep]);

  const bg = theme === "dark" ? "#111" : "#f8fafc";

  return (
    <div
      className="w-full h-full relative"
      style={{
        opacity: opacity,
        transition: "opacity 0.3s ease-in-out",
        background: bg,
      }}
    >
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 bg-white dark:bg-zinc-900 border border-slate-200 dark:border-zinc-700 p-2 rounded-xl shadow-xl backdrop-blur-md">
        <button
          onClick={runSimulation}
          className={`p-2 rounded-lg transition-colors ${
            executionState === "running"
              ? "bg-green-500 text-white shadow-lg shadow-green-500/30"
              : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300"
          }`}
          title="Play / Resume"
        >
          <Play className="w-5 h-5 fill-current" />
        </button>
        <button
          onClick={pauseSimulation}
          className={`p-2 rounded-lg transition-colors ${
            executionState === "paused"
              ? "bg-amber-500 text-white shadow-lg shadow-amber-500/30"
              : "hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300"
          }`}
          title="Pause"
        >
          <Pause className="w-5 h-5 fill-current" />
        </button>
        
        <button
          onClick={stopSimulation}
          className="p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 text-red-500 transition-colors"
          title="Stop & Reset"
        >
          <Square className="w-5 h-5 fill-current" />
        </button>
        
        <div className="w-px h-6 bg-slate-200 dark:bg-zinc-700 mx-1" />
        
        {}
        <div className="relative">
            <button
                onClick={() => setShowSpeedMenu(!showSpeedMenu)}
                className="flex items-center gap-1 p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 transition-colors min-w-[80px] justify-center"
                title="Execution Speed"
            >
                <span className="text-xs font-mono font-medium">{speed}ms</span>
                <ChevronDown className="w-3 h-3 opacity-50" />
            </button>
            
            {showSpeedMenu && (
                <div className="absolute top-full mt-2 left-0 w-full bg-white dark:bg-zinc-800 border border-slate-200 dark:border-zinc-700 rounded-lg shadow-xl overflow-hidden py-1 z-50">
                    {[2000, 1000, 500, 200, 50].map((s) => (
                        <button
                            key={s}
                            onClick={() => { setSpeed(s); setShowSpeedMenu(false); }}
                            className={`w-full text-left px-3 py-1.5 text-xs font-mono hover:bg-indigo-50 dark:hover:bg-indigo-500/20 ${speed === s ? 'text-indigo-500 font-bold' : 'text-slate-600 dark:text-slate-300'}`}
                        >
                            {s}ms
                        </button>
                    ))}
                </div>
            )}
        </div>
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeDragStop={handleNodeDragStop}
        onNodeClick={handleNodeClick}
        onNodeContextMenu={handleNodeContextMenu}
        nodeTypes={nodeTypes}
        fitView={!logicFlowLayout || Object.keys(logicFlowLayout).length === 0}
        minZoom={0.2}
        maxZoom={4}
        attributionPosition="bottom-right"
        defaultEdgeOptions={{
          type: "smoothstep",
          animated: executionState === 'running',
          style: { strokeWidth: 2, stroke: executionState === 'running' ? '#fbbf24' : '#94a3b8' },
        }}
      >
        <Background
          color={theme === "dark" ? "#333" : "#cbd5e1"}
          gap={20}
          size={1}
        />
      </ReactFlow>

      <div
        className={`absolute top-4 right-4 flex flex-col gap-2 p-3 rounded-xl shadow-lg border backdrop-blur-md ${
          theme === "dark"
            ? "bg-zinc-900/80 border-zinc-700 text-zinc-300"
            : "bg-white/80 border-slate-200 text-slate-600"
        }`}
      >
        <div className="text-[10px] font-bold uppercase tracking-wider opacity-60 mb-1">
          Analisi Complessità
        </div>
        <div className="flex items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-2" title="Righe di Codice">
            <FileText className="w-4 h-4 text-indigo-500" />
            <span>{flowStats.lines} Linee</span>
          </div>
          <div className="flex items-center gap-2" title="Numero di Decisioni">
            <GitBranch className="w-4 h-4 text-amber-500" />
            <span>{flowStats.decisions} Decisioni</span>
          </div>
          <div className="flex items-center gap-2" title="Profondità Cicli">
            <RefreshCw className="w-4 h-4 text-cyan-500" />
            <span>{flowStats.maxLoopDepth} Loop Depth</span>
          </div>
        </div>
      </div>

      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 p-1 rounded-lg shadow-lg border ${
          theme === "dark"
            ? "bg-zinc-800 border-zinc-700"
            : "bg-white border-slate-200"
        }`}
      >
        <button
          onClick={() => zoomOut()}
          className={`p-2 rounded-md ${
            theme === "dark"
              ? "hover:bg-zinc-700 text-zinc-300"
              : "hover:bg-slate-100 text-slate-600"
          }`}
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => zoomIn()}
          className={`p-2 rounded-md ${
            theme === "dark"
              ? "hover:bg-zinc-700 text-zinc-300"
              : "hover:bg-slate-100 text-slate-600"
          }`}
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <div
          className={`w-px mx-1 ${
            theme === "dark" ? "bg-zinc-700" : "bg-slate-200"
          }`}
        />
        <button
          onClick={() => fitView({ padding: 0.2 })}
          className={`p-2 rounded-md ${
            theme === "dark"
              ? "hover:bg-zinc-700 text-zinc-300"
              : "hover:bg-slate-100 text-slate-600"
          }`}
          title="Fit View"
        >
          <Maximize2 className="w-4 h-4" />
        </button>
        <div
          className={`w-px mx-1 ${
            theme === "dark" ? "bg-zinc-700" : "bg-slate-200"
          }`}
        />
        <button
          onClick={handleDownloadImage}
          className={`p-2 rounded-md ${
            theme === "dark"
              ? "hover:bg-zinc-700 text-zinc-300"
              : "hover:bg-slate-100 text-slate-600"
          }`}
          title="Download Image"
        >
          <Download className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
});

export const LogicFlowCanvas = forwardRef((props, ref) => (
  <ReactFlowProvider>
    <LogicFlowCanvasInner {...props} ref={ref} />
  </ReactFlowProvider>
));