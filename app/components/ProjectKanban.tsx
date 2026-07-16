import React, { useMemo, useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import { cn } from '../lib/utils';
import { format, parseISO, isAfter, differenceInDays } from 'date-fns';
import { MoreHorizontal, Pencil, Trash2, Clock, DollarSign, Layers, GripVertical, Settings2 } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import ProjectModal from './ProjectModal';
import ProjectKanbanColumnsModal from './ProjectKanbanColumnsModal';
import { CANCELLED_PROJECT_STATUS } from '../lib/projectKanbanColumns';
import type { Project, ProjectStatus } from '../types';

interface Props {
  searchTerm: string;
  serviceTypeFilter: string;
}

interface MenuState {
  project: Project;
  x: number;
  y: number;
}

export default function ProjectKanban({ searchTerm, serviceTypeFilter }: Props) {
  const { projects, serviceTypes, projectKanbanColumns, updateProject, deleteProject } = useFinance();
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isColumnsModalOpen, setIsColumnsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);
  const [contextMenu, setContextMenu] = useState<MenuState | null>(null);
  const [draggedProject, setDraggedProject] = useState<Project | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ProjectStatus | null>(null);

  const visibleColumns = useMemo(
    () => projectKanbanColumns.filter(column => column.visible),
    [projectKanbanColumns]
  );

  const filteredProjects = useMemo(() => {
    return projects
      .filter(p => p.status !== CANCELLED_PROJECT_STATUS)
      .filter(p => (serviceTypeFilter ? p.serviceTypeId === serviceTypeFilter : true))
      .filter(p =>
        !searchTerm ||
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [projects, searchTerm, serviceTypeFilter]);

  const getServiceTypeName = (serviceTypeId?: string) => {
    if (!serviceTypeId) return null;
    return serviceTypes.find(st => st.id === serviceTypeId)?.name;
  };

  const getProjectsByStatus = (status: ProjectStatus) =>
    filteredProjects.filter(p => p.status === status);

  const changeStatus = (project: Project, newStatus: ProjectStatus) => {
    updateProject(project.id, { status: newStatus });
  };

  const isOverdue = (dueDate?: string) => {
    if (!dueDate) return false;
    return isAfter(new Date(), parseISO(dueDate));
  };

  const getDaysRemaining = (dueDate?: string) => {
    if (!dueDate) return null;
    const days = differenceInDays(parseISO(dueDate), new Date());
    return days;
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, project: Project) => {
    setDraggedProject(project);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', project.id);
    (e.currentTarget as HTMLElement).classList.add('opacity-40');
  };

  const handleDragEnd = (e: React.DragEvent) => {
    setDraggedProject(null);
    setDragOverColumn(null);
    (e.currentTarget as HTMLElement).classList.remove('opacity-40');
  };

  const handleDragOver = (e: React.DragEvent, status: ProjectStatus) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverColumn(status);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    setDragOverColumn(null);
  };

  const handleDrop = (e: React.DragEvent, status: ProjectStatus) => {
    e.preventDefault();
    setDragOverColumn(null);
    if (draggedProject && draggedProject.status !== status) {
      changeStatus(draggedProject, status);
    }
    setDraggedProject(null);
  };

  // Context menu handlers
  const openMenu = (e: React.MouseEvent, project: Project) => {
    e.stopPropagation();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    setContextMenu({
      project,
      x: rect.right - 144,
      y: rect.bottom + 4,
    });
  };

  const closeMenu = () => setContextMenu(null);

  // Close menu on click outside
  React.useEffect(() => {
    if (!contextMenu) return;
    const handler = () => closeMenu();
    document.addEventListener('click', handler);
    return () => document.removeEventListener('click', handler);
  }, [contextMenu]);

  const renderCard = (project: Project) => {
    const stName = getServiceTypeName(project.serviceTypeId);
    const totalSteps = project.stepStatuses.length;
    const doneSteps = project.stepStatuses.filter(s => s.done).length;
    const progressPct = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;
    const overdue = isOverdue(project.dueDate);
    const daysLeft = getDaysRemaining(project.dueDate);

    const isDragging = draggedProject?.id === project.id;    return (
      <div
        key={project.id}
        draggable
        onDragStart={(e) => handleDragStart(e, project)}
        onDragEnd={handleDragEnd}
        onClick={() => { setEditingProject(project); setIsModalOpen(true); }}
        className={cn(
          'clay clay-hover p-4 group cursor-pointer',
          isDragging && 'opacity-40 shadow-md border-slate-300'
        )}
      >
        {/* Drag handle + Title + Menu */}
        <div className="flex items-start gap-2 mb-2.5">
          <GripVertical className="w-3.5 h-3.5 text-slate-300 mt-0.5 shrink-0" />
          <h4
            className="text-sm font-semibold text-slate-900 leading-snug flex-1 hover:text-slate-700 transition-colors"
          >
            {project.title}
          </h4>
          <button
            onClick={(e) => openMenu(e, project)}
            className="p-0.5 text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Client & Service Type */}
        <div className="flex items-center gap-2 text-xs text-slate-500 mb-3">
          {project.clientName && (
            <span className="truncate text-slate-600 font-medium">{project.clientName}</span>
          )}
          {stName && (
            <span className="px-2 py-0.5 bg-slate-100/80 text-slate-500 text-[0.65rem] font-semibold rounded-full truncate">
              {stName}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {totalSteps > 0 && (
          <div className="mb-3 bg-slate-50/50 p-2 rounded-xl border border-slate-100/30">
            <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
              <span>Progresso</span>
              <span className="font-semibold text-slate-500">{doneSteps}/{totalSteps}</span>
            </div>
            <div className="w-full h-1 bg-slate-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: progressPct === 100 ? '#047857' : '#0f766e'
                }}
              />
            </div>
          </div>
        )}

        {/* Footer: price + due date */}
        <div className="flex items-center gap-3 text-xs text-gray-400">
          {project.price ? (
            <span className="flex items-center gap-1">
              <DollarSign className="w-3 h-3" />
              {project.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
            </span>
          ) : null}
          {project.dueDate && (
            <span className={cn(
              'flex items-center gap-1',
              overdue && 'text-red-500 font-medium'
            )}>
              <Clock className="w-3 h-3" />
              {format(parseISO(project.dueDate), 'dd/MM')}
              {daysLeft !== null && !overdue && (
                <span className="text-gray-300">
                  ({daysLeft === 0 ? 'hoje' : `${daysLeft}d`})
                </span>
              )}
              {overdue && <span className="text-red-400">atrasado</span>}
            </span>
          )}
          {project.leadId && (
            <span className="text-gray-300" title="Vinculado a lead">
              <Layers className="w-3 h-3" />
            </span>
          )}
        </div>
      </div>
    );
  };

  return (
    <div>
      <div className="flex justify-end mb-3">
        <button
          onClick={() => setIsColumnsModalOpen(true)}
          className="inline-flex items-center gap-2 px-3 py-2 border border-slate-200 rounded-lg text-sm font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
        >
          <Settings2 className="w-4 h-4" />
          Editar colunas
        </button>
      </div>

      {/* Kanban Columns */}
      <div
        className="grid gap-4 min-w-full"
        style={{ gridTemplateColumns: `repeat(${Math.max(visibleColumns.length, 1)}, minmax(260px, 1fr))` }}
      >
        {visibleColumns.map(col => {
          const colProjects = getProjectsByStatus(col.status);
          const isOver = dragOverColumn === col.status;
          const canDrop = draggedProject && draggedProject.status !== col.status;

          return (
            <div
              key={col.status}
              className={cn(
                'rounded-2xl border min-h-[220px] flex flex-col transition-all duration-200 shadow-[0_1px_3px_rgba(0,0,0,0.015)]',
                'bg-slate-50/60',
                isOver && canDrop ? 'border-slate-300 bg-slate-100/50 shadow-[inset_0_1px_4px_rgba(0,0,0,0.02)]' : 'border-slate-100'
              )}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.status)}
            >
              {/* Column header */}
              <div className="px-4 py-3.5 border-b border-slate-100/80 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="text-[0.68rem] font-bold text-slate-700 uppercase tracking-wider">
                  {col.label}
                </span>
                <span className="ml-auto text-[0.62rem] bg-slate-100 text-slate-500 font-bold px-2 py-0.5 rounded-md border border-slate-200/30">
                  {colProjects.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2.5 space-y-2.5">
                {colProjects.length === 0 ? (
                  <div className={cn(
                    'flex items-center justify-center py-10 text-xs font-semibold tracking-wide transition-colors',
                    isOver && canDrop ? 'text-slate-800' : 'text-slate-300'
                  )}>
                    {isOver && canDrop ? 'Soltar aqui' : 'Vazio'}
                  </div>
                ) : (
                  colProjects.map(project => renderCard(project))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Context Menu (rendered at root level to avoid scroll clipping) */}
      {contextMenu && (
        <div
          className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg w-36 py-1"
          style={{ left: contextMenu.x, top: contextMenu.y }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => { setEditingProject(contextMenu.project); setIsModalOpen(true); closeMenu(); }}
            className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
          >
            <Pencil className="w-3 h-3" /> Editar
          </button>
          {visibleColumns.filter(c => c.status !== contextMenu.project.status).map(c => (
            <button
              key={c.status}
              onClick={() => { changeStatus(contextMenu.project, c.status); closeMenu(); }}
              className="w-full text-left px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: c.color }} />
              Mover para {c.label}
            </button>
          ))}
          <button
            onClick={() => { changeStatus(contextMenu.project, CANCELLED_PROJECT_STATUS); closeMenu(); }}
            className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
          >
            Cancelar
          </button>
          <hr className="my-1 border-gray-100" />
          <button
            onClick={() => { setConfirmDelete(contextMenu.project); closeMenu(); }}
            className="w-full text-left px-3 py-1.5 text-xs text-red-500 hover:bg-gray-50 flex items-center gap-2 cursor-pointer"
          >
            <Trash2 className="w-3 h-3" /> Excluir
          </button>
        </div>
      )}

      {/* Modals */}
      {isModalOpen && (
        <ProjectModal
          project={editingProject}
          onClose={() => { setIsModalOpen(false); setEditingProject(undefined); }}
        />
      )}

      {isColumnsModalOpen && (
        <ProjectKanbanColumnsModal onClose={() => setIsColumnsModalOpen(false)} />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Excluir projeto"
          message={`Deseja excluir o projeto "${confirmDelete.title}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          variant="danger"
          onConfirm={() => {
            deleteProject(confirmDelete.id);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
