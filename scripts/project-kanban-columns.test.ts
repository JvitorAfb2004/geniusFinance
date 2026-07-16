import assert from 'node:assert/strict';
import {
  DEFAULT_PROJECT_KANBAN_COLUMNS,
  normalizeProjectKanbanSettings,
  reorderProjectKanbanColumns,
  updateProjectKanbanColumn,
} from '../app/lib/projectKanbanColumns';

const normalized = normalizeProjectKanbanSettings(undefined);
assert.equal(normalized.columns.length, 4);
assert.deepEqual(normalized.columns.map(column => column.status), ['BACKLOG', 'IN_PROGRESS', 'REVIEW', 'DONE']);
assert.equal(normalized.columns[0].label, 'Backlog');
assert.equal(normalized.columns[0].visible, true);

const partial = normalizeProjectKanbanSettings({
  columns: [
    { status: 'DONE', label: 'Finalizado', color: '#111111', order: 0, visible: true },
    { status: 'BACKLOG', label: 'Entrada', color: '#222222', order: 1, visible: false },
    { status: 'CUSTOM_WAITING', label: 'Aguardando Cliente', color: '#8b5cf6', order: 2, visible: true },
  ],
});
assert.deepEqual(partial.columns.map(column => column.status), ['DONE', 'BACKLOG', 'CUSTOM_WAITING', 'IN_PROGRESS', 'REVIEW']);
assert.equal(partial.columns[0].label, 'Finalizado');
assert.equal(partial.columns[1].visible, false);
assert.equal(partial.columns[2].label, 'Aguardando Cliente');

const renamed = updateProjectKanbanColumn(normalized.columns, 'BACKLOG', { label: 'A fazer' });
assert.equal(renamed.find(column => column.status === 'BACKLOG')?.label, 'A fazer');

const hidden = updateProjectKanbanColumn(renamed, 'REVIEW', { visible: false });
assert.equal(hidden.find(column => column.status === 'REVIEW')?.visible, false);

const reordered = reorderProjectKanbanColumns(DEFAULT_PROJECT_KANBAN_COLUMNS, 'DONE', 'BACKLOG');
assert.deepEqual(reordered.map(column => column.status), ['DONE', 'BACKLOG', 'IN_PROGRESS', 'REVIEW']);
assert.deepEqual(reordered.map(column => column.order), [0, 1, 2, 3]);

console.log('project-kanban-columns tests passed');
