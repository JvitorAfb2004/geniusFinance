import React, { useState, useMemo } from 'react';
import { useFinance } from '../hooks/useFinance';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import {
  Plus, Search, FilterX, Pencil, Trash2, Kanban, List, Users, Layers,
  ExternalLink
} from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import ProjectModal from './ProjectModal';
import ProjectKanban from './ProjectKanban';
import type { Project, ProjectStatus } from '../types';

type Tab = 'kanban' | 'list';

const STATUS_LABELS: Record<ProjectStatus, string> = {
  BACKLOG: 'Backlog',
  IN_PROGRESS: 'Em Andamento',
  REVIEW: 'Revisão',
  DONE: 'Concluído',
  CANCELLED: 'Cancelado',
};

const STATUS_COLORS: Record<ProjectStatus, string> = {
  BACKLOG: '#6b7280',
  IN_PROGRESS: '#3b82f6',
  REVIEW: '#f59e0b',
  DONE: '#10b981',
  CANCELLED: '#ef4444',
};

export default function ProjectsView() {
  const { projects, serviceTypes, leads, deleteProject } = useFinance();
  const [tab, setTab] = useState<Tab>('kanban');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<Project | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  const hasFilters = searchTerm || serviceTypeFilter || statusFilter;

  const clearFilters = () => {
    setSearchTerm('');
    setServiceTypeFilter('');
    setStatusFilter('');
  };

  const filteredProjects = useMemo(() => {
    return projects
      .filter(p => (statusFilter ? p.status === statusFilter : true))
      .filter(p => (serviceTypeFilter ? p.serviceTypeId === serviceTypeFilter : true))
      .filter(p =>
        !searchTerm ||
        p.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        p.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      )
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }, [projects, searchTerm, serviceTypeFilter, statusFilter]);

  const getServiceTypeName = (id?: string) =>
    serviceTypes.find(st => st.id === id)?.name;

  const getLeadName = (id?: string) =>
    leads.find(l => l.id === id)?.clientName;

  const handleAdd = () => {
    setEditingProject(undefined);
    setIsModalOpen(true);
  };

  const handleEdit = (project: Project) => {
    setEditingProject(project);
    setIsModalOpen(true);
  };

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Kanban className="w-5 h-5 text-[#3b82f6]" />
            Projetos
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {projects.length} projeto{projects.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={handleAdd}
          className="flex items-center gap-2 px-4 py-2 bg-[#3b82f6] text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Projeto
        </button>
      </div>

      {/* Tabs + Filters */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 w-fit">
          <button
            onClick={() => setTab('kanban')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer',
              tab === 'kanban' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <Kanban className="w-4 h-4" />
            Kanban
          </button>
          <button
            onClick={() => setTab('list')}
            className={cn(
              'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors cursor-pointer',
              tab === 'list' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            )}
          >
            <List className="w-4 h-4" />
            Lista
          </button>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por título ou cliente..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#3b82f6] transition-colors"
            />
          </div>
          <select
            value={serviceTypeFilter}
            onChange={(e) => setServiceTypeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#3b82f6] cursor-pointer bg-white min-w-[160px]"
          >
            <option value="">Todos os tipos</option>
            {serviceTypes.map(st => (
              <option key={st.id} value={st.id}>{st.name}</option>
            ))}
          </select>
          {tab === 'list' && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#3b82f6] cursor-pointer bg-white min-w-[140px]"
            >
              <option value="">Todos os status</option>
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          )}
          {hasFilters && (
            <button
              onClick={clearFilters}
              className="flex items-center gap-1 px-3 py-2 text-sm text-gray-500 hover:text-gray-700 cursor-pointer"
            >
              <FilterX className="w-4 h-4" />
              Limpar
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      {tab === 'kanban' ? (
        <div className="flex-1 overflow-x-auto">
          <ProjectKanban searchTerm={searchTerm} serviceTypeFilter={serviceTypeFilter} />
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden flex-1 flex flex-col">
          <div className="overflow-auto flex-1">
            {filteredProjects.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 text-gray-400">
                <Users className="w-12 h-12 mb-3 opacity-30" />
                <p className="text-sm font-medium">
                  {projects.length === 0 ? 'Nenhum projeto cadastrado' : 'Nenhum projeto encontrado com esses filtros'}
                </p>
                <p className="text-xs mt-1">
                  {projects.length === 0 ? 'Clique em "Novo Projeto" para começar' : 'Tente ajustar os filtros'}
                </p>
              </div>
            ) : (
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10">
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Projeto</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Cliente</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden lg:table-cell">Tipo</th>
                    <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden xl:table-cell">Progresso</th>
                    <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Ações</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredProjects.map(project => {
                    const stName = getServiceTypeName(project.serviceTypeId);
                    const leadName = getLeadName(project.leadId);
                    const total = project.stepStatuses.length;
                    const done = project.stepStatuses.filter(s => s.done).length;
                    return (
                      <tr key={project.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                        <td className="py-3 px-4">
                          <div className="flex flex-col">
                            <span className="font-medium text-gray-900">{project.title}</span>
                            {project.price && (
                              <span className="text-xs text-gray-400 mt-0.5">
                                R$ {project.price.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4 hidden md:table-cell text-gray-700">
                          {project.clientName || '--'}
                          {leadName && <span className="text-xs text-gray-400 ml-1">(lead)</span>}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium text-white"
                            style={{ backgroundColor: STATUS_COLORS[project.status] }}
                          >
                            {STATUS_LABELS[project.status]}
                          </span>
                        </td>
                        <td className="py-3 px-4 hidden lg:table-cell text-gray-600">
                          {stName || '--'}
                        </td>
                        <td className="py-3 px-4 hidden xl:table-cell">
                          {total > 0 ? (
                            <div className="flex items-center gap-2">
                              <div className="w-20 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#3b82f6] rounded-full transition-all"
                                  style={{ width: `${Math.round((done / total) * 100)}%` }}
                                />
                              </div>
                              <span className="text-xs text-gray-400">{done}/{total}</span>
                            </div>
                          ) : (
                            <span className="text-gray-400">--</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center justify-center gap-1">
                            {project.leadId && (
                              <span className="text-gray-300" title={`Lead: ${leadName || ''}`}>
                                <Layers className="w-3.5 h-3.5" />
                              </span>
                            )}
                            <button
                              onClick={() => handleEdit(project)}
                              className="p-1.5 text-gray-400 hover:text-[#3b82f6] rounded transition-colors cursor-pointer"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => setConfirmDelete(project)}
                              className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
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
