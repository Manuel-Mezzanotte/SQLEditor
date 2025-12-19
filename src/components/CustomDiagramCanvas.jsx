import React, { useRef, useCallback, useEffect, useState } from "react";
import { toPng } from "html-to-image";
import { TableNode } from "./TableNode";
import { ZoomIn, ZoomOut, Maximize2, Download } from "lucide-react";

export const CustomDiagramCanvas = ({
  schema,
  theme,
  layout,
  onLayoutChange,
  onTableClick,
}) => {
  const containerRef = useRef(null);
  const contentRef = useRef(null);
  const backgroundRef = useRef(null);

  const transform = useRef({ x: 0, y: 0, scale: 1 });
  const isDraggingCanvas = useRef(false);
  const isDraggingNode = useRef(false);
  const draggingNodeName = useRef(null);
  const dragStart = useRef({ x: 0, y: 0 });
  const nodeStartPos = useRef({ x: 0, y: 0 });
  const initialNodePos = useRef({ x: 0, y: 0 });
  const hasCentered = useRef(false);

  const updateTransform = () => {
    if (contentRef.current && backgroundRef.current) {
      const { x, y, scale } = transform.current;
      contentRef.current.style.transform = `translate3d(${Math.round(
        x
      )}px, ${Math.round(y)}px, 0) scale(${scale})`;
      const bgSize = 25 * scale;
      backgroundRef.current.style.backgroundSize = `${bgSize}px ${bgSize}px`;
      backgroundRef.current.style.backgroundPosition = `${Math.round(
        x
      )}px ${Math.round(y)}px`;
    }
  };

  const fitView = useCallback(() => {
    if (schema.tables.length === 0 || !containerRef.current) return;
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    let hasNodes = false;
    const keys = Object.keys(layout);
    if (keys.length > 0) {
      keys.forEach((key) => {
        const pos = layout[key];
        if (pos) {
          minX = Math.min(minX, pos.x);
          minY = Math.min(minY, pos.y);
          maxX = Math.max(maxX, pos.x + 256);
          maxY = Math.max(maxY, pos.y + 200);
          hasNodes = true;
        }
      });
    }
    if (!hasNodes) {
      const cols = Math.ceil(Math.sqrt(schema.tables.length));
      schema.tables.forEach((_, i) => {
        const x = (i % cols) * 300 + 50;
        const y = Math.floor(i / cols) * 300 + 50;
        minX = Math.min(minX, x);
        minY = Math.min(minY, y);
        maxX = Math.max(maxX, x + 256);
        maxY = Math.max(maxY, y + 200);
      });
    }
    if (minX === Infinity) return;
    const PADDING = 100;
    minX -= PADDING;
    minY -= PADDING;
    maxX += PADDING;
    maxY += PADDING;
    const contentW = maxX - minX;
    const contentH = maxY - minY;
    const containerW = containerRef.current.clientWidth;
    const containerH = containerRef.current.clientHeight;

    if (contentW === 0 || contentH === 0) return;

    const scaleX = containerW / contentW;
    const scaleY = containerH / contentH;
    let newScale = Math.min(scaleX, scaleY, 1);
    newScale = Math.max(newScale, 0.2);
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;
    const newX = containerW / 2 - centerX * newScale;
    const newY = containerH / 2 - centerY * newScale;
    transform.current = { x: newX, y: newY, scale: newScale };
    updateTransform();
  }, [schema, layout]);

  useEffect(() => {
    if (schema.tables.length === 0) return;

    const missingTables = schema.tables.filter((t) => !layout[t.name]);
    if (missingTables.length === 0) return;

    const newLayout = { ...layout };
    const existingKeys = Object.keys(layout);

    const connections = {};
    schema.tables.forEach((t) => (connections[t.name] = 0));
    schema.relationships.forEach((r) => {
      connections[r.from] = (connections[r.from] || 0) + 1;
      connections[r.to] = (connections[r.to] || 0) + 1;
    });

    const sortedMissing = [...missingTables].sort(
      (a, b) => connections[b.name] - connections[a.name]
    );

    const COL_SPACING = 350;
    const ROW_SPACING = 280;

    if (existingKeys.length === 0) {
      const COLS = Math.ceil(Math.sqrt(sortedMissing.length)) + 1;
      sortedMissing.forEach((t, i) => {
        newLayout[t.name] = {
          x: (i % COLS) * COL_SPACING + 100,
          y: Math.floor(i / COLS) * ROW_SPACING + 100,
        };
      });
    } else {
      let maxX = 0;
      existingKeys.forEach((key) => {
        const pos = layout[key];
        if (pos && pos.x > maxX) maxX = pos.x;
      });

      const startX = maxX + COL_SPACING;
      const startY = 100;

      sortedMissing.forEach((t, i) => {
        newLayout[t.name] = {
          x: startX + (i % 2) * COL_SPACING,
          y: startY + Math.floor(i / 2) * ROW_SPACING,
        };
      });
    }

    onLayoutChange(newLayout);
  }, [schema.tables.length, layout]);

  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (Object.keys(layout).length > 0) {
      setOpacity(0);
      setTimeout(() => {
        fitView();
        setTimeout(() => {
          setOpacity(1);
        }, 50);
      }, 50);
    }
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const onWheel = (e) => {
      e.preventDefault();

      if (e.shiftKey) {
        transform.current.x -= e.deltaY;
        transform.current.y -= e.deltaX;
      } else {
        const rect = container.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const pointX = (mouseX - transform.current.x) / transform.current.scale;
        const pointY = (mouseY - transform.current.y) / transform.current.scale;

        const zoomFactor = 1 - e.deltaY * 0.002;
        const newScale = Math.min(
          Math.max(0.1, transform.current.scale * zoomFactor),
          4
        );

        transform.current.x = mouseX - pointX * newScale;
        transform.current.y = mouseY - pointY * newScale;
        transform.current.scale = newScale;
      }

      updateTransform();
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    return () => container.removeEventListener("wheel", onWheel);
  }, []);

  const handleMouseDown = (e) => {
    if (
      e.target === containerRef.current ||
      e.target === backgroundRef.current ||
      e.target.tagName === "svg"
    ) {
      isDraggingCanvas.current = true;
      dragStart.current = { x: e.clientX, y: e.clientY };
      containerRef.current.style.cursor = "grabbing";
    }
  };

  const handleNodeMouseDown = (e, tableName) => {
    e.stopPropagation();
    isDraggingNode.current = true;
    draggingNodeName.current = tableName;
    dragStart.current = { x: e.clientX, y: e.clientY };

    const currentLayoutPos = layout[tableName] || { x: 0, y: 0 };
    nodeStartPos.current = { ...currentLayoutPos };
    initialNodePos.current = { ...currentLayoutPos };

    document.body.style.cursor = "grabbing";
  };

  const handleMouseMove = (e) => {
    if (isDraggingCanvas.current) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;
      transform.current.x += dx;
      transform.current.y += dy;
      dragStart.current = { x: e.clientX, y: e.clientY };
      updateTransform();
    } else if (isDraggingNode.current) {
      const dx = e.clientX - dragStart.current.x;
      const dy = e.clientY - dragStart.current.y;

      const scale = transform.current.scale;
      const scaledDx = dx / scale;
      const scaledDy = dy / scale;

      const nodeEl = document.getElementById(
        `node-${draggingNodeName.current}`
      );
      if (nodeEl) {
        const newX = nodeStartPos.current.x + scaledDx;
        const newY = nodeStartPos.current.y + scaledDy;
        nodeStartPos.current = { x: newX, y: newY };
        nodeEl.style.transform = `translate3d(${Math.round(
          newX
        )}px, ${Math.round(newY)}px, 0)`;
        dragStart.current = { x: e.clientX, y: e.clientY };
      }
    }
  };

  const handleMouseUp = (e) => {
    if (isDraggingCanvas.current) {
      isDraggingCanvas.current = false;
      containerRef.current.style.cursor = "grab";
    }
    if (isDraggingNode.current) {
      isDraggingNode.current = false;
      document.body.style.cursor = "";
      const tableName = draggingNodeName.current;
      if (tableName) {
        const dist = Math.hypot(
          nodeStartPos.current.x - initialNodePos.current.x,
          nodeStartPos.current.y - initialNodePos.current.y
        );

        if (dist < 2) {
          onTableClick(schema.tables.find((t) => t.name === tableName));
        } else {
          const finalPos = nodeStartPos.current;
          onLayoutChange({ ...layout, [tableName]: finalPos });
        }
      }
      draggingNodeName.current = null;
    }
  };

  return (
    <div
      ref={containerRef}
      className={`w-full h-full relative overflow-hidden select-none cursor-grab active:cursor-grabbing ${
        theme === "dark" ? "bg-[#111]" : "bg-[#f4f4f5]"
      }`}
      style={{ opacity: opacity, transition: "opacity 0.3s ease-in-out" }}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onContextMenu={(e) => e.preventDefault()}
    >
      <div
        ref={backgroundRef}
        className="absolute inset-0 pointer-events-none opacity-5"
        style={{
          backgroundImage: `radial-gradient(${
            theme === "dark" ? "#fff" : "#000"
          } 1px, transparent 1px)`,
        }}
      />

      <div
        ref={contentRef}
        className="absolute top-0 left-0 origin-top-left will-change-transform"
      >
        <svg
          className="absolute top-0 left-0 overflow-visible pointer-events-none"
          style={{ width: 1, height: 1, zIndex: 0 }}
        >
          <defs>
            <marker
              id="arrowhead-diagram"
              markerWidth="10"
              markerHeight="7"
              refX="9"
              refY="3.5"
              orient="auto"
            >
              <polygon
                points="0 0, 10 3.5, 0 7"
                fill={theme === "dark" ? "#9ca3af" : "#6b7280"}
              />
            </marker>
          </defs>
          {schema.relationships.map((rel, i) => {
            const fromNode = layout[rel.from];
            const toNode = layout[rel.to];
            const fromTable = schema.tables.find((t) => t.name === rel.from);
            const toTable = schema.tables.find((t) => t.name === rel.to);

            if (!fromNode || !toNode || !fromTable || !toTable) return null;

            const getSmartAnchor = (node, table, targetNode) => {
              const W = 256;
              const visibleRows = Math.min(table.columns.length, 8);
              const hasFooter = table.columns.length > 8;
              const H = 45 + visibleRows * 29 + (hasFooter ? 25 : 10);

              const sx = node.x + W / 2;
              const sy = node.y + H / 2;
              const tx = targetNode.x + W / 2;
              const ty = targetNode.y + H / 2;

              const dx = tx - sx;
              const dy = ty - sy;

              if (Math.abs(dx) > Math.abs(dy)) {
                return dx > 0
                  ? { x: node.x + W, y: sy, dir: "right" }
                  : { x: node.x, y: sy, dir: "left" };
              } else {
                return dy > 0
                  ? { x: sx, y: node.y + H, dir: "down" }
                  : { x: sx, y: node.y, dir: "up" };
              }
            };

            const start = getSmartAnchor(fromNode, fromTable, toNode);
            const end = getSmartAnchor(toNode, toTable, fromNode);

            const c1x =
              start.dir === "right"
                ? start.x + 50
                : start.dir === "left"
                ? start.x - 50
                : start.x;
            const c1y =
              start.dir === "down"
                ? start.y + 50
                : start.dir === "up"
                ? start.y - 50
                : start.y;
            const c2x =
              end.dir === "right"
                ? end.x + 50
                : end.dir === "left"
                ? end.x - 50
                : end.x;
            const c2y =
              end.dir === "down"
                ? end.y + 50
                : end.dir === "up"
                ? end.y - 50
                : end.y;

            const path = `M ${start.x} ${start.y} C ${c1x} ${c1y}, ${c2x} ${c2y}, ${end.x} ${end.y}`;

            return (
              <path
                key={i}
                d={path}
                fill="none"
                stroke={theme === "dark" ? "#9ca3af" : "#6b7280"}
                strokeWidth="1.5"
                markerEnd="url(#arrowhead-diagram)"
                opacity="0.6"
              />
            );
          })}
        </svg>

        {schema.tables.map((table) => {
          const pos = layout[table.name] || { x: 0, y: 0 };
          return (
            <TableNode
              key={table.name}
              table={table}
              pos={pos}
              theme={theme}
              onMouseDown={(e) => handleNodeMouseDown(e, table.name)}
            />
          );
        })}
      </div>

      <div
        className={`absolute bottom-4 left-1/2 -translate-x-1/2 flex gap-1 p-1 rounded-lg shadow-lg border ${
          theme === "dark"
            ? "bg-zinc-800 border-zinc-700"
            : "bg-white border-slate-200"
        }`}
      >
        <button
          onClick={() => {
            transform.current.scale = Math.max(
              0.1,
              transform.current.scale - 0.2
            );
            updateTransform();
          }}
          className={`p-2 rounded-md transition-colors ${
            theme === "dark"
              ? "hover:bg-zinc-700 text-zinc-300"
              : "hover:bg-slate-100 text-slate-600"
          }`}
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <button
          onClick={() => {
            transform.current.scale = Math.min(
              4,
              transform.current.scale + 0.2
            );
            updateTransform();
          }}
          className={`p-2 rounded-md transition-colors ${
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
          onClick={() => {
            hasCentered.current = false;
            fitView();
            hasCentered.current = true;
          }}
          className={`p-2 rounded-md transition-colors ${
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
          onClick={() => {
            if (contentRef.current === null) return;

            let minX = Infinity,
              minY = Infinity,
              maxX = -Infinity,
              maxY = -Infinity;
            let hasNodes = false;

            Object.values(layout).forEach((pos) => {
              hasNodes = true;
              if (pos.x < minX) minX = pos.x;
              if (pos.y < minY) minY = pos.y;
              if (pos.x + 256 > maxX) maxX = pos.x + 256;
              if (pos.y + 200 > maxY) maxY = pos.y + 200;
            });

            if (!hasNodes) return;

            const padding = 50;
            const fullWidth = maxX - minX + padding * 2;
            const fullHeight = maxY - minY + padding * 2;

            toPng(contentRef.current, {
              cacheBust: true,
              backgroundColor: theme === "dark" ? "#121212" : "#f8f9fa",
              width: fullWidth,
              height: fullHeight,
              style: {
                transform: `translate(${-minX + padding}px, ${
                  -minY + padding
                }px) scale(1)`,
                transformOrigin: "top left",
                width: `${fullWidth}px`,
                height: `${fullHeight}px`,
              },
            })
              .then((dataUrl) => {
                const link = document.createElement("a");
                link.download = "database-diagram.png";
                link.href = dataUrl;
                link.click();
              })
              .catch((err) => {
                console.error("Errore export immagine", err);
              });
          }}
          className={`p-2 rounded-md transition-colors ${
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
};
