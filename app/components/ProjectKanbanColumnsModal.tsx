import React, { useEffect, useState } from 'react';
import { Eye, EyeOff, GripVertical, Plus, RotateCcw, Trash2, X } from 'lucide-react';
import { useFinance } from '../hooks/useFinance';
import { cn } from '../lib/utils';
import {
  DEFAULT_PROJECT_KANBAN_COLUMNS,
  normalizeProjectKanbanSettings,
  reorderProjectKanbanColumns,
  updateProjectKanbanColumn,
} from '../lib/projectKanbanColumns';
import type { ProjectKanbanColumn } from '../types';

const COLOR_OPTIONS = ['#64748b', '#0f766e', '#3b82f6', '#8b5cf6', '#b45309', '#dc2626', '#047857', '#db2777'];

interface Props {
  onClose: () => void;
}

export default function ProjectKanbanColumnsModal({ onClose }: Props) {
  const { projectKanbanColumns, updateProjectKanbanSettings } = useFinance();
  const [draftColumns, setDraftColumns] = useState(projectKanbanColumns);
  const [draggedStatus, setDraggedStatus] = useState<string | null>(null);
  const [newColumnName, setNewColumnName] = useState('');

  useEffect(() => {
    setDraftColumns(projectKanbanColumns);
  }, [projectKanbanColumns]);

  const saveColumns = (columns: ProjectKanbanColumn[]) => {
    const normalizedColumns = normalizeProjectKanbanSettings({ columns }).columns;
    setDraftColumns(normalizedColumns);
    updateProjectKanbanSettings({ columns: normalizedColumns });
  };

  const renameColumn = (status: string, label: string) => {
    saveColumns(updateProjectKanbanColumn(draftColumns, status, { label }));
  };

  const changeColor = (status: string, color: string) => {
    saveColumns(updateProjectKanbanColumn(draftColumns, status, { color }));
  };

  const toggleColumn = (column: ProjectKanbanColumn) => {
    const visibleCount = draftColumns.filter(item => item.visible).length;
    if (column.visible && visibleCount <= 1) return;
    saveColumns(updateProjectKanbanColumn(draftColumns, column.status, { visible: !column.visible }));
  };

  const removeCustomColumn = (status: string) => {
    saveColumns(draftColumns.filter(column => column.status !== status));
  };

  const addColumn = () => {
    const label = newColumnName.trim();
    if (!label) return;
    const status = `CUSTOM_${crypto.randomUUID()}`;
    saveColumns([
      ...draftColumns,
      {
        status,
        label,
        color: COLOR_OPTIONS[draftColumns.length % COLOR_OPTIONS.length],
        order: draftColumns.length,
        visible: true,
      },
    ]);
    setNewColumnName('');
  };

  const handleDrop = (targetStatus: string) => {
    if (!draggedStatus) return;
    saveColumns(reorderProjectKanbanColumns(draftColumns, draggedStatus, targetStatus));
    setDraggedStatus(null);
  };

  const resetColumns = () => {
    saveColumns(DEFAULT_PROJECT_KANBAN_COLUMNS);
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/30 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h3 className="font-bold text-slate-900">Editar colunas</h3>
            <p className="text-xs text-slate-500 mt-0.5">Renomeie, reordene, oculte ou adicione etapas do Kanban.</p>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3 max-h-[65vh] overflow-y-auto">
          {draftColumns.map(column => {
            const isDefault = DEFAULT_PROJECT_KANBAN_COLUMNS.some(defaultColumn => defaultColumn.status === column.status);
            const canHide = !column.visible || draftColumns.filter(item => item.visible).length > 1;

            return (
              <div
                key={column.status}
                draggable
                onDragStart={() => setDraggedStatus(column.status)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => handleDrop(column.status)}
                onDragEnd={() => setDraggedStatus(null)}
                className={cn(
                  'flex items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 transition-all',
                  draggedStatus === column.status && 'opacity-50'
                )}
              >
                <GripVertical className="w-4 h-4 text-slate-300 cursor-grab shrink-0" />
                <input
                  type="text"
                  value={column.label}
                  onChange={(e) => renameColumn(column.status, e.target.value)}
                  className="flex-1 min-w-0 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#3b82f6]"
                />
                <div className="flex items-center gap-1">
                  {COLOR_OPTIONS.map(color => (
                    <button
                      key={color}
                      type="button"
                      onClick={() => changeColor(column.status, color)}
                      className={cn(
                        'w-5 h-5 rounded-full border-2 cursor-pointer',
                        column.color === color ? 'border-slate-900' : 'border-white'
                      )}
                      style={{ backgroundColor: color }}
                      aria-label={`Usar cor ${color}`}
                    />
                  ))}
                </div>
                <button
                  onClick={() => toggleColumn(column)}
                  disabled={!canHide}
                  className="p-2 text-slate-400 hover:text-slate-700 disabled:opacity-30 cursor-pointer"
                  title={column.visible ? 'Ocultar coluna' : 'Mostrar coluna'}
                >
                  {column.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                {!isDefault && (
                  <button
                    onClick={() => removeCustomColumn(column.status)}
                    className="p-2 text-slate-400 hover:text-red-500 cursor-pointer"
                    title="Remover coluna customizada"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            );
          })}

          <div className="flex items-center gap-2 pt-2">
            <input
              value={newColumnName}
              onChange={(e) => setNewColumnName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addColumn();
                }
              }}
              placeholder="Nome da nova coluna..."
              className="flex-1 px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-[#3b82f6]"
            />
            <button
              onClick={addColumn}
              disabled={!newColumnName.trim()}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-[#3b82f6] text-white text-sm font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Adicionar
            </button>
          </div>
        </div>

        <div className="flex justify-between items-center px-5 py-4 border-t border-slate-100 bg-slate-50/50">
          <button
            onClick={resetColumns}
            className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 cursor-pointer"
          >
            <RotateCcw className="w-4 h-4" />
            Restaurar padrão
          </button>
          <button onClick={onClose} className="px-4 py-2 bg-slate-900 text-white rounded-lg text-sm font-medium cursor-pointer">
            Concluir
          </button>
        </div>
      </div>
    </div>
  );
}
