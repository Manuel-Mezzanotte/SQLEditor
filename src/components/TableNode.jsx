import React from "react";
import { Database, Edit3, Key } from "lucide-react";

export const TableNode = React.memo(
  ({ table, pos, theme, onMouseDown }) => {
    return (
      <div
        id={`node-${table.name}`}
        className={`table-node absolute w-64 rounded-xl shadow-lg overflow-hidden border flex flex-col transition-shadow duration-200 group hover:shadow-2xl cursor-pointer ${
          theme === "dark"
            ? "bg-[#1e1e1e] border-gray-700 shadow-black/50 hover:border-gray-500"
            : "bg-white border-gray-200 shadow-xl hover:border-amber-300"
        }`}
        style={{
          transform: `translate3d(${Math.round(pos.x)}px, ${Math.round(
            pos.y
          )}px, 0)`,
          zIndex: 10,
        }}
        onMouseDown={onMouseDown}
      >
        <div
          className={`p-3 px-4 border-b flex justify-between items-center ${
            theme === "dark"
              ? "bg-[#2d2d2d] border-gray-700 group-hover:bg-[#333]"
              : "bg-gray-50 border-gray-100 group-hover:bg-amber-50"
          }`}
        >
          <div className="flex items-center gap-2 overflow-hidden">
            <Database className="w-4 h-4 opacity-50 flex-shrink-0" />
            <span
              className="font-bold text-sm truncate select-none text-zinc-800 dark:text-zinc-200"
              title={table.name}
            >
              {table.name}
            </span>
          </div>
          <Edit3 className="w-3 h-3 opacity-0 group-hover:opacity-50 text-zinc-500" />
        </div>
        <div className="text-xs p-1">
          {table.columns.slice(0, 8).map((col, idx) => (
            <div
              key={idx}
              className={`flex justify-between items-center p-1.5 px-2 rounded ${
                idx % 2 === 0
                  ? "bg-transparent"
                  : theme === "dark"
                  ? "bg-white/5"
                  : "bg-gray-50/50"
              }`}
            >
              <div className="flex items-center gap-1.5 overflow-hidden flex-1">
                {col.isPk && (
                  <Key className="w-3 h-3 text-amber-500 flex-shrink-0" />
                )}
                <span
                  className={`truncate select-none ${
                    col.isPk
                      ? "font-bold text-amber-600 dark:text-amber-400"
                      : "text-zinc-600 dark:text-zinc-400"
                  }`}
                  title={col.name}
                >
                  {col.name}
                </span>
              </div>
              <span
                className="opacity-50 font-mono text-[10px] ml-2 truncate max-w-[80px] text-right select-none text-zinc-500"
                title={col.type}
              >
                {col.type}
              </span>
            </div>
          ))}
          {table.columns.length > 8 && (
            <div className="text-center p-1 text-[10px] opacity-40 italic select-none text-zinc-500">
              ...altri {table.columns.length - 8} campi
            </div>
          )}
        </div>
      </div>
    );
  },
  (prev, next) =>
    prev.table === next.table &&
    prev.pos === next.pos &&
    prev.theme === next.theme
);
