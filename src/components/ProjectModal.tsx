import React, { useState, useEffect, useMemo } from 'react';
import { useFinance } from '../hooks/useFinance';
import { cn } from '../lib/utils';
import { X, Check, Plus, Search } from 'lucide-react';
import type { Project, ServiceType, Lead, StepStatus, CustomFieldValue } from '../types';

interface Props {
  project?: Project;
  lead?: Lead;
  onClose: () => void;
}

export default function ProjectModal({ project, lead, onClose }: Props) {
  const { serviceTypes, leads, addProject, updateProject } = useFinance();
  const isEdit = !!project;

  const [title, setTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<Project['status']>('BACKLOG');
  const [serviceTypeId, setServiceTypeId] = useState('');
  const [linkedLeadId, setLinkedLeadId] = useState('');
  const [price, setPrice] = useState('');
  const [priceDisplay, setPriceDisplay] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [stepStatuses, setStepStatuses] = useState<StepStatus[]>([]);
  const [customFieldValues, setCustomFieldValues] = useState<CustomFieldValue[]>([]);
  const [submitting, setSubmitting] = useState(false);

  // Dropdown state
  const [serviceTypeOpen, setServiceTypeOpen] = useState(false);
  const [serviceTypeSearch, setServiceTypeSearch] = useState('');
  const [leadOpen, setLeadOpen] = useState(false);
  const [leadSearch, setLeadSearch] = useState('');

  useEffect(() => {
    if (project) {
      setTitle(project.title);
      setClientName(project.clientName);
      setDescription(project.description || '');
      setStatus(project.status);
      setServiceTypeId(project.serviceTypeId || '');
      setLinkedLeadId(project.leadId || '');
      setPrice(project.price ? String(Math.round(project.price * 100)) : '');
      setPriceDisplay(project.price ? formatPriceDisplay(String(Math.round(project.price * 100))) : '');
      setDueDate(project.dueDate || '');
      setStepStatuses([...project.stepStatuses]);
      setCustomFieldValues([...project.customFieldValues]);
    } else if (lead) {
      setTitle(lead.service || '');
      setClientName(lead.clientName || '');
      setDescription(lead.description || '');
      setLinkedLeadId(lead.id);
    }
  }, [project, lead]);

  const selectedServiceType = useMemo(
    () => serviceTypes.find(st => st.id === serviceTypeId),
    [serviceTypes, serviceTypeId],
  );

  const filteredServiceTypes = useMemo(
    () => serviceTypes.filter(st =>
      !serviceTypeSearch || st.name.toLowerCase().includes(serviceTypeSearch.toLowerCase())
    ),
    [serviceTypes, serviceTypeSearch],
  );

  const wonLeads = useMemo(
    () => leads
      .filter(l => l.status === 'Fechado (Ganho)')
      .filter(l => !leadSearch || l.clientName.toLowerCase().includes(leadSearch.toLowerCase())),
    [leads, leadSearch],
  );

  const handleServiceTypeChange = (id: string) => {
    setServiceTypeId(id);
    setServiceTypeOpen(false);
    setServiceTypeSearch('');

    const st = serviceTypes.find(s => s.id === id);
    if (st && !isEdit) {
      setStepStatuses(st.steps.map(s => ({ stepIndex: s.order, done: false })));
      setCustomFieldValues(st.customFieldDefs.map(f => ({ key: f.key, value: '' })));
    }
  };

  const toggleStep = (stepIndex: number) => {
    setStepStatuses(prev =>
      prev.map(s => s.stepIndex === stepIndex ? { ...s, done: !s.done } : s)
    );
  };

  const updateCustomField = (key: string, value: string) => {
    setCustomFieldValues(prev =>
      prev.map(f => f.key === key ? { ...f, value } : f)
    );
  };

  const handleSubmit = async () => {
    if (!title.trim()) return;
    setSubmitting(true);
    try {
      const data = {
        title: title.trim(),
        clientName: clientName.trim(),
        description: description.trim(),
        status,
        serviceTypeId: serviceTypeId || undefined,
        leadId: linkedLeadId || undefined,
        price: price ? parseFloat(price) / 100 : undefined,
        dueDate: dueDate || undefined,
        stepStatuses,
        customFieldValues,
      };

      if (isEdit && project) {
        await updateProject(project.id, data);
      } else {
        await addProject(data);
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const formatPriceDisplay = (raw: string): string => {
    const digits = raw.replace(/\D/g, '');
    if (!digits) return '';
    const num = parseInt(digits, 10);
    const reais = Math.floor(num / 100);
    const cents = num % 100;
    return `${reais.toLocaleString('pt-BR')},${cents.toString().padStart(2, '0')}`;
  };

  const handlePriceChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '');
    setPrice(raw);
    setPriceDisplay(formatPriceDisplay(raw));
  };

  const completedSteps = stepStatuses.filter(s => s.done).length;
  const totalSteps = stepStatuses.length;

  // Click-outside handler
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target.closest('[data-dropdown]')) {
        setServiceTypeOpen(false);
        setLeadOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[5vh]">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-2xl mx-4 max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h3 className="text-lg font-bold text-gray-900">
            {isEdit ? 'Editar Projeto' : 'Novo Projeto'}
          </h3>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-4 space-y-5 flex-1">
          {/* Basic info grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Título <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Nome do projeto"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#3b82f6] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nome do cliente"
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#3b82f6] transition-colors"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as Project['status'])}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#3b82f6] cursor-pointer bg-white"
              >
                <option value="BACKLOG">Backlog</option>
                <option value="IN_PROGRESS">Em Andamento</option>
                <option value="REVIEW">Revisão</option>
                <option value="DONE">Concluído</option>
                <option value="CANCELLED">Cancelado</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Preço (R$)</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
                <input
                  type="text"
                  inputMode="numeric"
                  value={priceDisplay}
                  onChange={handlePriceChange}
                  placeholder="0,00"
                  className="w-full pl-10 pr-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#3b82f6] transition-colors"
                />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Prazo</label>
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#3b82f6] transition-colors"
              />
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descrição</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Detalhes do projeto..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#3b82f6] transition-colors resize-none"
            />
          </div>

          {/* Service Type Select */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Serviço</label>
            <div className="relative" data-dropdown>
              <button
                type="button"
                onClick={() => { setServiceTypeOpen(!serviceTypeOpen); setLeadOpen(false); }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-left outline-none focus:border-[#3b82f6] cursor-pointer bg-white flex items-center justify-between"
              >
                <span className={selectedServiceType ? 'text-gray-900' : 'text-gray-400'}>
                  {selectedServiceType ? selectedServiceType.name : 'Selecionar tipo de serviço...'}
                </span>
                <span className="text-gray-400 text-xs">{serviceTypeOpen ? '▲' : '▼'}</span>
              </button>
              {serviceTypeOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  <div className="sticky top-0 bg-white p-2 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={serviceTypeSearch}
                        onChange={(e) => setServiceTypeSearch(e.target.value)}
                        placeholder="Buscar..."
                        className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setServiceTypeId(''); setServiceTypeOpen(false); setStepStatuses([]); setCustomFieldValues([]); }}
                    className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 cursor-pointer"
                  >
                    Nenhum (sem template)
                  </button>
                  {filteredServiceTypes.map(st => (
                    <button
                      key={st.id}
                      type="button"
                      onClick={() => handleServiceTypeChange(st.id)}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between',
                        serviceTypeId === st.id && 'bg-blue-50 text-[#3b82f6]'
                      )}
                    >
                      {st.name}
                      {serviceTypeId === st.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lead Link */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Lead de Origem (opcional)</label>
            <div className="relative" data-dropdown>
              <button
                type="button"
                onClick={() => { setLeadOpen(!leadOpen); setServiceTypeOpen(false); }}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm text-left outline-none focus:border-[#3b82f6] cursor-pointer bg-white flex items-center justify-between"
              >
                <span className={linkedLeadId ? 'text-gray-900' : 'text-gray-400'}>
                  {linkedLeadId
                    ? leads.find(l => l.id === linkedLeadId)?.clientName || 'Lead vinculado'
                    : 'Vincular a um lead ganho...'}
                </span>
                <span className="text-gray-400 text-xs">{leadOpen ? '▲' : '▼'}</span>
              </button>
              {leadOpen && (
                <div className="absolute z-20 mt-1 w-full bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                  <div className="sticky top-0 bg-white p-2 border-b border-gray-100">
                    <div className="relative">
                      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
                      <input
                        type="text"
                        value={leadSearch}
                        onChange={(e) => setLeadSearch(e.target.value)}
                        placeholder="Buscar lead..."
                        className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-200 rounded-lg outline-none"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setLinkedLeadId('')}
                    className="w-full text-left px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 cursor-pointer"
                  >
                    Nenhum
                  </button>
                  {wonLeads.map(l => (
                    <button
                      key={l.id}
                      type="button"
                      onClick={() => { setLinkedLeadId(l.id); setLeadOpen(false); }}
                      className={cn(
                        'w-full text-left px-3 py-2 text-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between',
                        linkedLeadId === l.id && 'bg-blue-50 text-[#3b82f6]'
                      )}
                    >
                      <div>
                        <span className="font-medium">{l.clientName}</span>
                        <span className="text-gray-400 text-xs ml-2">{l.service}</span>
                      </div>
                      {linkedLeadId === l.id && <Check className="w-4 h-4" />}
                    </button>
                  ))}
                  {wonLeads.length === 0 && (
                    <p className="px-3 py-2 text-xs text-gray-400">Nenhum lead ganho encontrado</p>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Checklist (from service type) */}
          {selectedServiceType && totalSteps > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Checklist — {selectedServiceType.name}
                {totalSteps > 0 && (
                  <span className="ml-2 text-xs text-gray-400 font-normal">
                    ({completedSteps}/{totalSteps})
                  </span>
                )}
              </label>
              <div className="space-y-1.5 bg-gray-50 rounded-lg p-3">
                {selectedServiceType.steps.map((step) => {
                  const ss = stepStatuses.find(s => s.stepIndex === step.order);
                  const isDone = ss?.done || false;
                  return (
                    <label
                      key={step.order}
                      className={cn(
                        'flex items-start gap-3 p-2 rounded-lg cursor-pointer transition-colors',
                        isDone ? 'bg-emerald-50' : 'hover:bg-white'
                      )}
                    >
                      <input
                        type="checkbox"
                        checked={isDone}
                        onChange={() => toggleStep(step.order)}
                        className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#3b82f6] focus:ring-[#3b82f6] cursor-pointer"
                      />
                      <span className={cn(
                        'text-sm flex-1',
                        isDone ? 'text-gray-400 line-through' : 'text-gray-700'
                      )}>
                        {step.title}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Custom Fields (from service type) */}
          {selectedServiceType && selectedServiceType.customFieldDefs.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Campos Personalizados
              </label>
              <div className="space-y-3">
                {selectedServiceType.customFieldDefs.map((field) => {
                  const fv = customFieldValues.find(v => v.key === field.key);
                  return (
                    <div key={field.key}>
                      <label className="block text-xs text-gray-500 mb-1">{field.label}</label>
                      <input
                        type="text"
                        value={fv?.value || ''}
                        onChange={(e) => updateCustomField(field.key, e.target.value)}
                        placeholder={field.label}
                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#3b82f6] transition-colors"
                      />
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || !title.trim()}
            className="px-4 py-2 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer transition-colors"
          >
            {submitting ? 'Salvando...' : isEdit ? 'Atualizar' : 'Criar'}
          </button>
        </div>
      </div>
    </div>
  );
}
