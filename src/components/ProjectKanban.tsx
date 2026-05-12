import React, { useMemo, useState, useRef, useCallback } from 'react';
import { useFinance } from '../hooks/useFinance';
import { cn } from '../lib/utils';
import { format, parseISO, isAfter, differenceInDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { MoreHorizontal, Pencil, Trash2, Calendar, Clock, DollarSign, Layers, GripVertical } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import ProjectModal from './ProjectModal';
import type { Project, ProjectStatus } from '../types';

const COLUMNS: { status: ProjectStatus; label: string; color: string; bg: string; border: string }[] = [
  { status: 'BACKLOG', label: 'Backlog', color: '#6b7280', bg: 'bg-gray-50', border: 'border-gray-200' },
  { status: 'IN_PROGRESS', label: 'Em Andamento', color: '#3b82f6', bg: 'bg-blue-50/30', border: 'border-blue-200' },
  { status: 'REVIEW', label: 'Revisão', color: '#f59e0b', bg: 'bg-amber-50/30', border: 'border-amber-200' },
  { status: 'DONE', label: 'Concluído', color: '#10b981', bg: 'bg-emerald-50/30', border: 'border-emerald-200' },
];

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
  const { projects, serviceTypes, updateProject, deleteProject } = useFinance();
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);
  const [contextMenu, setContextMenu] = useState<MenuState | null>(null);
  const [draggedProject, setDraggedProject] = useState<Project | null>(null);
  const [dragOverColumn, setDragOverColumn] = useState<ProjectStatus | null>(null);

  const filteredProjects = useMemo(() => {
    return projects
      .filter(p => p.status !== 'CANCELLED')
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

  const totalProjects = filteredProjects.length;

  const renderCard = (project: Project) => {
    const stName = getServiceTypeName(project.serviceTypeId);
    const totalSteps = project.stepStatuses.length;
    const doneSteps = project.stepStatuses.filter(s => s.done).length;
    const progressPct = totalSteps > 0 ? Math.round((doneSteps / totalSteps) * 100) : 0;
    const overdue = isOverdue(project.dueDate);
    const daysLeft = getDaysRemaining(project.dueDate);

    const isDragging = draggedProject?.id === project.id;

    return (
      <div
        key={project.id}
        draggable
        onDragStart={(e) => handleDragStart(e, project)}
        onDragEnd={handleDragEnd}
        className={cn(
          'bg-white rounded-lg border border-gray-200 p-3 shadow-sm hover:shadow-md transition-shadow group cursor-grab active:cursor-grabbing',
          isDragging && 'opacity-40 shadow-lg'
        )}
      >
        {/* Drag handle + Title + Menu */}
        <div className="flex items-start gap-2 mb-2">
          <GripVertical className="w-3.5 h-3.5 text-gray-300 mt-0.5 shrink-0" />
          <h4
            className="text-sm font-semibold text-gray-900 leading-snug flex-1 cursor-pointer hover:text-[#3b82f6] transition-colors"
            onClick={() => { setEditingProject(project); setIsModalOpen(true); }}
          >
            {project.title}
          </h4>
          <button
            onClick={(e) => openMenu(e, project)}
            className="p-0.5 text-gray-300 hover:text-gray-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
          >
            <MoreHorizontal className="w-4 h-4" />
          </button>
        </div>

        {/* Client & Service Type */}
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-2">
          {project.clientName && (
            <span className="truncate">{project.clientName}</span>
          )}
          {stName && (
            <span className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 text-[0.65rem] font-medium truncate">
              {stName}
            </span>
          )}
        </div>

        {/* Progress bar */}
        {totalSteps > 0 && (
          <div className="mb-2">
            <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
              <span>Progresso</span>
              <span>{doneSteps}/{totalSteps}</span>
            </div>
            <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-300"
                style={{
                  width: `${progressPct}%`,
                  backgroundColor: progressPct === 100 ? '#10b981' : '#3b82f6'
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
      {/* Summary bar */}
      <div className="flex items-center gap-4 mb-4 text-sm text-gray-500 flex-wrap">
        <span>{totalProjects} projeto{totalProjects !== 1 ? 's' : ''}</span>
        {COLUMNS.map(col => {
          const count = getProjectsByStatus(col.status).length;
          return (
            <span key={col.status} className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: col.color }} />
              {count} {col.label}
            </span>
          );
        })}
      </div>

      {/* Kanban Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {COLUMNS.map(col => {
          const colProjects = getProjectsByStatus(col.status);
          const isOver = dragOverColumn === col.status;
          const canDrop = draggedProject && draggedProject.status !== col.status;

          return (
            <div
              key={col.status}
              className={cn(
                'rounded-xl border min-h-[200px] flex flex-col transition-colors duration-200',
                col.bg,
                isOver && canDrop ? 'border-[#3b82f6] bg-blue-50/50' : col.border
              )}
              onDragOver={(e) => handleDragOver(e, col.status)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, col.status)}
            >
              {/* Column header */}
              <div className="px-3 py-2.5 border-b border-inherit flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.color }} />
                <span className="text-xs font-semibold text-gray-700 uppercase tracking-wider">
                  {col.label}
                </span>
                <span className="ml-auto text-xs text-gray-400 font-medium">
                  {colProjects.length}
                </span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {colProjects.length === 0 ? (
                  <div className={cn(
                    'flex items-center justify-center py-8 text-xs transition-colors',
                    isOver && canDrop ? 'text-[#3b82f6]' : 'text-gray-300'
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
          {COLUMNS.filter(c => c.status !== contextMenu.project.status).map(c => (
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
            onClick={() => { changeStatus(contextMenu.project, 'CANCELLED'); closeMenu(); }}
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
