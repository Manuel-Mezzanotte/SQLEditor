import React, { useState, useEffect } from "react";
import { Trash2, Plus, GripVertical, Key } from "lucide-react";
import { Modal } from "./ui/Modal";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

export const TableDetailModal = ({
  isOpen,
  onClose,
  onSave,
  onDelete,
  table,
  theme,
}) => {
  const [draftTable, setDraftTable] = useState(null);

  useEffect(() => {
    if (isOpen && table) setDraftTable(JSON.parse(JSON.stringify(table)));
    else setDraftTable(null);
  }, [isOpen, table]);

  if (!draftTable) return null;

  const isDirty = JSON.stringify(draftTable) !== JSON.stringify(table);

  const updateName = (val) => setDraftTable({ ...draftTable, name: val });

  const updateColumn = (idx, field, val) => {
    const newCols = [...draftTable.columns];
    newCols[idx][field] = val;
    setDraftTable({ ...draftTable, columns: newCols });
  };

  const addColumn = () =>
    setDraftTable({
      ...draftTable,
      columns: [
        ...draftTable.columns,
        { name: "new_column", type: "VARCHAR(255)", isPk: false },
      ],
    });

  const removeColumn = (idx) =>
    setDraftTable({
      ...draftTable,
      columns: draftTable.columns.filter((_, i) => i !== idx),
    });

  const footer = (
    <>
      <Button
        variant="danger"
        size="sm"
        onClick={() => {
          if (window.confirm("Sei sicuro di voler eliminare questa tabella?")) {
            onDelete(table.name);
            onClose();
          }
        }}
      >
        Elimina
      </Button>
      <div className="flex-1" />
      <Button variant="ghost" onClick={onClose}>
        Annulla
      </Button>
      <Button
        disabled={!isDirty}
        variant="primary"
        onClick={() => {
          onSave(table.name, draftTable);
          onClose();
        }}
      >
        Salva Modifiche
      </Button>
    </>
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Modifica Tabella"
      size="lg"
      footer={footer}
    >
      <div className="space-y-4">
        {}
        <Input
          label="Nome Tabella"
          value={draftTable.name}
          onChange={(e) => updateName(e.target.value)}
          className="font-bold text-lg"
        />

        {}
        <div className="flex justify-between items-center pt-4 border-t border-zinc-100 dark:border-zinc-800">
          <h4 className="text-sm font-semibold text-zinc-500 uppercase tracking-wider">
            Colonne ({draftTable.columns.length})
          </h4>
          <Button size="sm" variant="secondary" onClick={addColumn} icon={Plus}>
            Aggiungi
          </Button>
        </div>

        {}
        <div className="space-y-2 max-h-[300px] overflow-y-auto pr-1 custom-scrollbar">
          {draftTable.columns.map((col, idx) => (
            <div
              key={idx}
              className="group flex items-center gap-2 p-2 rounded-lg bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/50 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors"
            >
              <div className="cursor-move text-zinc-400">
                <GripVertical className="w-4 h-4" />
              </div>

              <button
                onClick={() => updateColumn(idx, "isPk", !col.isPk)}
                className={`p-1.5 rounded transition-colors ${
                  col.isPk
                    ? "bg-amber-100 text-amber-600 dark:bg-amber-900/30 dark:text-amber-500"
                    : "text-zinc-300 hover:text-zinc-500 dark:text-zinc-600 dark:hover:text-zinc-400"
                }`}
                title="Primary Key"
              >
                <Key className="w-4 h-4" />
              </button>

              <div className="flex-1">
                <input
                  value={col.name}
                  onChange={(e) => updateColumn(idx, "name", e.target.value)}
                  className="w-full bg-transparent text-sm font-medium outline-none text-zinc-700 dark:text-zinc-200 placeholder-zinc-400"
                  placeholder="Nome colonna"
                />
              </div>

              <div className="w-1/3 border-l border-zinc-200 dark:border-zinc-700 pl-2">
                <input
                  value={col.type}
                  onChange={(e) => updateColumn(idx, "type", e.target.value)}
                  className="w-full bg-transparent text-xs font-mono text-zinc-500 outline-none"
                  placeholder="TYPE"
                />
              </div>

              <button
                onClick={() => removeColumn(idx)}
                className="p-1.5 text-zinc-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all rounded hover:bg-red-50 dark:hover:bg-red-900/10"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
};
