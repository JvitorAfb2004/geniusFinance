import type { ProjectKanbanColumn, ProjectKanbanSettings } from '../types';

export const CANCELLED_PROJECT_STATUS = 'CANCELLED';

export const DEFAULT_PROJECT_KANBAN_COLUMNS: ProjectKanbanColumn[] = [
  { status: 'BACKLOG', label: 'Backlog', color: '#64748b', order: 0, visible: true },
  { status: 'IN_PROGRESS', label: 'Em Andamento', color: '#0f766e', order: 1, visible: true },
  { status: 'REVIEW', label: 'Revisão', color: '#b45309', order: 2, visible: true },
  { status: 'DONE', label: 'Concluído', color: '#047857', order: 3, visible: true },
];

const defaultByStatus = new Map(DEFAULT_PROJECT_KANBAN_COLUMNS.map(column => [column.status, column]));

function isValidColumn(column: Partial<ProjectKanbanColumn>): column is ProjectKanbanColumn {
  return typeof column.status === 'string' &&
    column.status.trim().length > 0 &&
    column.status !== CANCELLED_PROJECT_STATUS &&
    typeof column.label === 'string' &&
    column.label.trim().length > 0;
}

export function sortProjectKanbanColumns(columns: ProjectKanbanColumn[]): ProjectKanbanColumn[] {
  return [...columns]
    .sort((a, b) => a.order - b.order)
    .map((column, index) => ({ ...column, order: index }));
}

function reindexProjectKanbanColumns(columns: ProjectKanbanColumn[]): ProjectKanbanColumn[] {
  return columns.map((column, index) => ({ ...column, order: index }));
}

export function normalizeProjectKanbanSettings(settings?: Partial<ProjectKanbanSettings> | null): ProjectKanbanSettings {
  const providedColumns = Array.isArray(settings?.columns) ? settings.columns : [];
  const seen = new Set<string>();
  const validColumns = providedColumns.reduce<ProjectKanbanColumn[]>((acc, column) => {
    if (!isValidColumn(column) || seen.has(column.status)) return acc;
    seen.add(column.status);
    const defaultColumn = defaultByStatus.get(column.status);
    acc.push({
      ...defaultColumn,
      ...column,
      label: column.label.trim(),
      color: column.color || defaultColumn?.color || '#64748b',
      order: typeof column.order === 'number' ? column.order : acc.length,
      visible: column.visible !== false,
    });
    return acc;
  }, []);

  const seenStatuses = new Set(validColumns.map(column => column.status));
  const missingColumns = DEFAULT_PROJECT_KANBAN_COLUMNS
    .filter(column => !seenStatuses.has(column.status))
    .map((column, index) => ({ ...column, order: validColumns.length + index }));

  return {
    ...settings,
    columns: sortProjectKanbanColumns([...validColumns, ...missingColumns]),
  };
}

export function updateProjectKanbanColumn(
  columns: ProjectKanbanColumn[],
  status: ProjectKanbanColumn['status'],
  updates: Partial<Omit<ProjectKanbanColumn, 'status' | 'order'>>,
): ProjectKanbanColumn[] {
  return sortProjectKanbanColumns(
    columns.map(column => column.status === status ? { ...column, ...updates } : column)
  );
}

export function reorderProjectKanbanColumns(
  columns: ProjectKanbanColumn[],
  draggedStatus: ProjectKanbanColumn['status'],
  targetStatus: ProjectKanbanColumn['status'],
): ProjectKanbanColumn[] {
  if (draggedStatus === targetStatus) return sortProjectKanbanColumns(columns);

  const sorted = sortProjectKanbanColumns(columns);
  const fromIndex = sorted.findIndex(column => column.status === draggedStatus);
  const toIndex = sorted.findIndex(column => column.status === targetStatus);

  if (fromIndex < 0 || toIndex < 0) return sorted;

  const [draggedColumn] = sorted.splice(fromIndex, 1);
  sorted.splice(toIndex, 0, draggedColumn);

  return reindexProjectKanbanColumns(sorted);
}
