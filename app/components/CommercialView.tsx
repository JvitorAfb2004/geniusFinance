import React, { useState, useMemo } from 'react';
import { useFinance } from '../hooks/useFinance';
import { format, parseISO, isAfter, isBefore, isToday } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '../lib/utils';
import { Trash2, Pencil, Search, Plus, Users, Phone, Mail, ExternalLink, FilterX, FolderKanban } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import LeadModal from './LeadModal';
import ProjectModal from './ProjectModal';
import type { Lead, LeadOption } from '../types';

export default function CommercialView() {
  const { leads, leadOptions, deleteLead } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingLead, setEditingLead] = useState<Lead | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<Lead | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [convertLead, setConvertLead] = useState<Lead | undefined>(undefined);

  const statusOptions = useMemo(
    () => leadOptions.filter((o) => o.field === 'status').sort((a, b) => a.order - b.order),
    [leadOptions],
  );

  const sourceOptions = useMemo(
    () => leadOptions.filter((o) => o.field === 'source').sort((a, b) => a.order - b.order),
    [leadOptions],
  );

  const filteredLeads = useMemo(() => {
    return leads
      .filter((l) => (statusFilter ? l.status === statusFilter : true))
      .filter((l) => (sourceFilter ? l.source === sourceFilter : true))
      .filter(
        (l) =>
          !searchTerm ||
          l.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.responsible.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.service.toLowerCase().includes(searchTerm.toLowerCase()) ||
          l.description.toLowerCase().includes(searchTerm.toLowerCase()),
      )
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [leads, statusFilter, sourceFilter, searchTerm]);

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('');
    setSourceFilter('');
  };

  const hasFilters = searchTerm || statusFilter || sourceFilter;

  const getStatusColor = (status: string) => {
    const opt = statusOptions.find((o) => o.value === status);
    return opt?.color || '#6b7280';
  };

  const handleEdit = (lead: Lead) => {
    setEditingLead(lead);
    setIsModalOpen(true);
  };

  const handleAdd = () => {
    setEditingLead(undefined);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setEditingLead(undefined);
  };

  return (
    <div className="flex flex-col h-full gap-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-slate-700" />
            Gestão de Leads
          </h2>
          <p className="text-sm text-slate-500 mt-0.5 font-medium">
            {leads.length} lead{leads.length !== 1 ? 's' : ''} cadastrado{leads.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleAdd}
            className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-all font-semibold text-sm cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.05)] focus:outline-none focus:ring-4 focus:ring-slate-900/5 active:scale-[0.98]"
          >
            <Plus className="w-4 h-4" />
            Novo Lead
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, email, responsável, serviço..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-slate-100 focus:border-slate-800 rounded-xl text-sm outline-none focus:ring-4 focus:ring-slate-900/5 transition-all text-slate-800 placeholder:text-slate-400 font-medium"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3.5 py-2.5 border border-slate-100 focus:border-slate-800 rounded-xl text-sm outline-none focus:ring-4 focus:ring-slate-900/5 cursor-pointer bg-white min-w-[150px] text-slate-700 font-semibold transition-all"
        >
          <option value="">Todos os status</option>
          {statusOptions.map((opt) => (
            <option key={opt.id} value={opt.value}>
              {opt.value}
            </option>
          ))}
        </select>
        <select
          value={sourceFilter}
          onChange={(e) => setSourceFilter(e.target.value)}
          className="px-3.5 py-2.5 border border-slate-100 focus:border-slate-800 rounded-xl text-sm outline-none focus:ring-4 focus:ring-slate-900/5 cursor-pointer bg-white min-w-[150px] text-slate-700 font-semibold transition-all"
        >
          <option value="">Todas as origens</option>
          {sourceOptions.map((opt) => (
            <option key={opt.id} value={opt.value}>
              {opt.value}
            </option>
          ))}
        </select>
        {hasFilters && (
          <button
            onClick={clearFilters}
            className="flex items-center gap-1.5 px-3 py-2.5 text-sm text-slate-500 hover:text-slate-800 font-semibold transition-colors cursor-pointer"
          >
            <FilterX className="w-4 h-4" />
            Limpar
          </button>
        )}
      </div>

      {/* Table */}
      <div className="clay overflow-hidden flex-1 flex flex-col">
        <div className="overflow-auto flex-1">
          {filteredLeads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
              <Users className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">
                {leads.length === 0 ? 'Nenhum lead cadastrado' : 'Nenhum lead encontrado com esses filtros'}
              </p>
              <p className="text-xs mt-1">
                {leads.length === 0 ? 'Clique em "Novo Lead" para começar' : 'Tente ajustar os filtros'}
              </p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/70 sticky top-0 z-10">
                  <th className="text-left py-3.5 px-4 text-[0.68rem] font-bold text-slate-500 uppercase tracking-wider">Cliente</th>
                  <th className="text-left py-3.5 px-4 text-[0.68rem] font-bold text-slate-500 uppercase tracking-wider hidden md:table-cell">Serviço</th>
                  <th className="text-left py-3.5 px-4 text-[0.68rem] font-bold text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="text-left py-3.5 px-4 text-[0.68rem] font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Origem</th>
                  <th className="text-left py-3.5 px-4 text-[0.68rem] font-bold text-slate-500 uppercase tracking-wider hidden xl:table-cell">Responsável</th>
                  <th className="text-left py-3.5 px-4 text-[0.68rem] font-bold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Data</th>
                  <th className="text-center py-3.5 px-4 text-[0.68rem] font-bold text-slate-500 uppercase tracking-wider w-20">Ações</th>
                </tr>
              </thead>
              <tbody>
                {filteredLeads.map((lead) => {
                  const statusColor = getStatusColor(lead.status);
                  return (
                    <tr
                      key={lead.id}
                      className="border-b border-slate-50 hover:bg-slate-50/40 transition-colors group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col">
                          <span className="font-semibold text-slate-800">{lead.clientName || '--'}</span>
                          <span className="text-[0.68rem] text-slate-400 font-medium mt-0.5 md:hidden">{lead.service || 'Sem serviço'}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 hidden md:table-cell">
                        <span className="text-slate-600 font-medium">{lead.service || '--'}</span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span
                          className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[0.68rem] font-bold uppercase tracking-wider border"
                          style={{
                            backgroundColor: `${statusColor}08`,
                            color: statusColor,
                            borderColor: `${statusColor}20`
                          }}
                        >
                          {lead.status || 'Novo'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 hidden lg:table-cell">
                        <span className="text-slate-500 font-medium">{lead.source || '--'}</span>
                      </td>
                      <td className="py-3.5 px-4 hidden xl:table-cell">
                        <span className="text-slate-500 font-medium">{lead.responsible || '--'}</span>
                      </td>
                      <td className="py-3.5 px-4 hidden lg:table-cell">
                        <span className="text-slate-400 font-mono text-xs font-semibold">
                          {lead.proposalDate ? format(parseISO(lead.proposalDate), 'dd/MM/yyyy') : '--'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center justify-center gap-0.5">
                          {lead.link && (
                            <a
                              href={lead.link}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all"
                              title={lead.link}
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {lead.email && (
                            <a
                              href={`mailto:${lead.email}`}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all"
                              title={lead.email}
                            >
                              <Mail className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {lead.phone && (
                            <a
                              href={`tel:${lead.phone}`}
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-lg transition-all"
                              title={lead.phone}
                            >
                              <Phone className="w-3.5 h-3.5" />
                            </a>
                          )}
                          {lead.status === 'Fechado (Ganho)' && (
                            <button
                              onClick={() => setConvertLead(lead)}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all cursor-pointer"
                              title="Converter em projeto"
                            >
                              <FolderKanban className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            onClick={() => handleEdit(lead)}
                            className="p-1.5 text-slate-400 hover:text-slate-800 hover:bg-slate-50 rounded-lg transition-all cursor-pointer"
                            title="Editar lead"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => setConfirmDelete(lead)}
                            className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all cursor-pointer"
                            title="Excluir lead"
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

      {/* Modals */}
      {isModalOpen && (
        <LeadModal lead={editingLead} onClose={handleCloseModal} />
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Excluir lead"
          message={`Deseja excluir o lead "${confirmDelete.clientName || 'Sem nome'}"? Esta ação não pode ser desfeita.`}
          confirmLabel="Excluir"
          variant="danger"
          onConfirm={() => {
            deleteLead(confirmDelete.id);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}

      {convertLead && (
        <ProjectModal
          lead={convertLead}
          onClose={() => setConvertLead(undefined)}
        />
      )}
    </div>
  );
}
