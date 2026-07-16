import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useFinance } from '../hooks/useFinance';
import { format, parseISO } from 'date-fns';
import { X, Plus, Pencil, Trash2, Check, Search } from 'lucide-react';
import type { Lead, LeadOption } from '../types';

const STATUS_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

export default function LeadModal({ lead, onClose }: { lead?: Lead; onClose: () => void }) {
  const { addLead, updateLead, leadOptions, addLeadOption, updateLeadOption, deleteLeadOption } = useFinance();

  const [submitting, setSubmitting] = useState(false);

  // Form fields
  const [clientName, setClientName] = useState(lead?.clientName || '');
  const [responsible, setResponsible] = useState(lead?.responsible || '');
  const [email, setEmail] = useState(lead?.email || '');
  const [phone, setPhone] = useState(lead?.phone || '');
  const [service, setService] = useState(lead?.service || '');
  const [status, setStatus] = useState(lead?.status || 'Novo');
  const [description, setDescription] = useState(lead?.description || '');
  const [source, setSource] = useState(lead?.source || '');
  const [link, setLink] = useState(lead?.link || '');
  const [additionalField, setAdditionalField] = useState(lead?.additionalField || '');
  const [proposalDate, setProposalDate] = useState(lead?.proposalDate || format(new Date(), 'yyyy-MM-dd'));

  // Inline option editing state
  const [editingOptionId, setEditingOptionId] = useState<string | null>(null);
  const [editingOptionValue, setEditingOptionValue] = useState('');
  const [editingOptionColor, setEditingOptionColor] = useState('');
  const [showNewOption, setShowNewOption] = useState<'status' | 'source' | 'service' | null>(null);
  const [newOptionValue, setNewOptionValue] = useState('');
  const [newOptionColor, setNewOptionColor] = useState('#3b82f6');

  const statusOptions = useMemo(
    () => leadOptions.filter((o) => o.field === 'status').sort((a, b) => a.order - b.order),
    [leadOptions],
  );
  const sourceOptions = useMemo(
    () => leadOptions.filter((o) => o.field === 'source').sort((a, b) => a.order - b.order),
    [leadOptions],
  );
  const serviceOptions = useMemo(
    () => leadOptions.filter((o) => o.field === 'service').sort((a, b) => a.order - b.order),
    [leadOptions],
  );

  const isEdit = !!lead;

  const handleSubmit = async () => {
    if (!clientName.trim()) return;
    setSubmitting(true);
    try {
      const data = {
        clientName: clientName.trim(),
        responsible: responsible.trim(),
        email: email.trim(),
        phone: phone.trim(),
        service: service.trim(),
        status: status || 'Novo',
        description: description.trim(),
        source: source.trim(),
        link: link.trim(),
        additionalField: additionalField.trim(),
        proposalDate,
      };

      if (isEdit && lead) {
        await updateLead(lead.id, data);
      } else {
        await addLead(data);
      }
      onClose();
    } finally {
      setSubmitting(false);
    }
  };

  const startEditOption = (opt: LeadOption) => {
    setEditingOptionId(opt.id);
    setEditingOptionValue(opt.value);
    setEditingOptionColor(opt.color || '#6b7280');
  };

  const saveEditOption = async () => {
    if (!editingOptionId || !editingOptionValue.trim()) return;
    const opt = leadOptions.find((o) => o.id === editingOptionId);
    const updates: { value?: string; color?: string } = {};
    if (opt?.value !== editingOptionValue.trim()) updates.value = editingOptionValue.trim();
    const colorToSave = opt?.field === 'status' ? editingOptionColor : undefined;
    if (colorToSave && opt?.color !== colorToSave) updates.color = colorToSave;
    if (Object.keys(updates).length > 0) {
      await updateLeadOption(editingOptionId, updates);
    }
    setEditingOptionId(null);
  };

  const handleAddOption = async () => {
    if (!showNewOption || !newOptionValue.trim()) return;
    await addLeadOption(showNewOption, newOptionValue.trim(), showNewOption === 'status' ? newOptionColor : undefined);
    setNewOptionValue('');
    setShowNewOption(null);
  };

  // Search state for each select field
  const [searchService, setSearchService] = useState('');
  const [searchStatus, setSearchStatus] = useState('');
  const [searchSource, setSearchSource] = useState('');
  const [showServiceDropdown, setShowServiceDropdown] = useState(false);
  const [showStatusDropdown, setShowStatusDropdown] = useState(false);
  const [showSourceDropdown, setShowSourceDropdown] = useState(false);
  const serviceDropdownRef = useRef<HTMLDivElement>(null);
  const statusDropdownRef = useRef<HTMLDivElement>(null);
  const sourceDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (serviceDropdownRef.current && !serviceDropdownRef.current.contains(e.target as Node)) setShowServiceDropdown(false);
      if (statusDropdownRef.current && !statusDropdownRef.current.contains(e.target as Node)) setShowStatusDropdown(false);
      if (sourceDropdownRef.current && !sourceDropdownRef.current.contains(e.target as Node)) setShowSourceDropdown(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredServiceOptions = useMemo(() => {
    if (!searchService) return serviceOptions;
    return serviceOptions.filter((o) => o.value.toLowerCase().includes(searchService.toLowerCase()));
  }, [serviceOptions, searchService]);

  const filteredStatusOptions = useMemo(() => {
    if (!searchStatus) return statusOptions;
    return statusOptions.filter((o) => o.value.toLowerCase().includes(searchStatus.toLowerCase()));
  }, [statusOptions, searchStatus]);

  const filteredSourceOptions = useMemo(() => {
    if (!searchSource) return sourceOptions;
    return sourceOptions.filter((o) => o.value.toLowerCase().includes(searchSource.toLowerCase()));
  }, [sourceOptions, searchSource]);

  const renderSelect = (
    label: string,
    value: string,
    onChange: (v: string) => void,
    options: LeadOption[],
    filteredOptions: LeadOption[],
    field: LeadOption['field'],
    search: string,
    setSearch: (s: string) => void,
    showDropdown: boolean,
    setShowDropdown: (s: boolean) => void,
    dropdownRef: React.RefObject<HTMLDivElement | null>,
  ) => (
    <div className="flex flex-col gap-1">
      <label className="text-xs font-medium text-gray-500">{label}</label>
      <div className="relative" ref={dropdownRef}>
        <div className="flex items-center border border-gray-200 rounded-lg focus-within:ring-2 focus-within:ring-primary/30 focus-within:border-primary transition-all bg-white">
          <Search className="w-4 h-4 text-gray-400 ml-3 flex-shrink-0" />
          <input
            type="text"
            value={showDropdown ? search : (value || '')}
            placeholder={`Buscar ${label.toLowerCase()}...`}
            onChange={(e) => {
              setSearch(e.target.value);
              if (!showDropdown) setShowDropdown(true);
            }}
            onFocus={() => {
              setShowDropdown(true);
              setSearch('');
            }}
            className="flex-1 px-2 py-2 text-sm outline-none bg-transparent"
          />
          <button
            type="button"
            onClick={() => {
              setShowNewOption(showNewOption === field ? null : field);
              setNewOptionValue('');
            }}
            className="px-2 py-2 text-gray-400 hover:text-primary transition-colors cursor-pointer"
            title={`Adicionar ${label.toLowerCase()}`}
          >
            <Plus className="w-4 h-4" />
          </button>
        </div>

        {showDropdown && (
          <div className="absolute z-20 left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-40 overflow-y-auto">
            {filteredOptions.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-gray-400">
                Nenhuma opção encontrada
              </div>
            ) : (
              filteredOptions.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setSearch('');
                    setShowDropdown(false);
                  }}
                  className="w-full px-3 py-2 text-sm text-left hover:bg-blue-50 transition-colors flex items-center justify-between group cursor-pointer"
                >
                  <span>{opt.value}</span>
                  <span className="opacity-0 group-hover:opacity-100 text-gray-400 hover:text-red-500 cursor-pointer"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteLeadOption(opt.id);
                    }}
                  >
                    <Trash2 className="w-3 h-3" />
                  </span>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* New option inline form */}
      {showNewOption === field && (
        <div className="flex items-center gap-1 p-2 bg-blue-50 rounded-lg border border-blue-100">
          <input
            type="text"
            placeholder={`Nova ${label.toLowerCase()}`}
            value={newOptionValue}
            onChange={(e) => setNewOptionValue(e.target.value)}
            className="flex-1 px-2 py-1 border border-gray-200 rounded text-sm outline-none"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddOption();
              if (e.key === 'Escape') setShowNewOption(null);
            }}
          />
          {field === 'status' && (
            <div className="flex gap-0.5">
              {STATUS_COLORS.slice(0, 6).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewOptionColor(c)}
                  className={`w-5 h-5 rounded-full border-2 cursor-pointer ${newOptionColor === c ? 'border-gray-800 scale-110' : 'border-transparent'}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          )}
          <button
            type="button"
            onClick={handleAddOption}
            disabled={!newOptionValue.trim()}
            className="px-2 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50 cursor-pointer"
          >
            <Check className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh] px-4">
      <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative clay shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#e2e8f0] shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">
              {isEdit ? 'Editar Lead' : 'Novo Lead'}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {isEdit ? 'Atualize as informações do lead' : 'Preencha os dados do lead'}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Form fields */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Client Name - full width on mobile */}
            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">
                Cliente/Projeto <span className="text-red-400">*</span>
              </label>
              <input
                type="text"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="Nome do cliente ou projeto"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Data da proposta</label>
              <input
                type="date"
                value={proposalDate}
                onChange={(e) => setProposalDate(e.target.value)}
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary cursor-pointer"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Responsável</label>
              <input
                type="text"
                value={responsible}
                onChange={(e) => setResponsible(e.target.value)}
                placeholder="Nome do responsável"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">E-mail</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="email@exemplo.com"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Telefone</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(11) 99999-9999"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary"
              />
            </div>

            {renderSelect('Serviço', service, setService, serviceOptions, filteredServiceOptions, 'service', searchService, setSearchService, showServiceDropdown, setShowServiceDropdown, serviceDropdownRef)}
            {renderSelect('Status', status, setStatus, statusOptions, filteredStatusOptions, 'status', searchStatus, setSearchStatus, showStatusDropdown, setShowStatusDropdown, statusDropdownRef)}
            {renderSelect('Origem', source, setSource, sourceOptions, filteredSourceOptions, 'source', searchSource, setSearchSource, showSourceDropdown, setShowSourceDropdown, sourceDropdownRef)}

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Link</label>
              <input
                type="url"
                value={link}
                onChange={(e) => setLink(e.target.value)}
                placeholder="https://..."
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Campo adicional</label>
              <input
                type="text"
                value={additionalField}
                onChange={(e) => setAdditionalField(e.target.value)}
                placeholder="Informação extra"
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary"
              />
            </div>

            <div className="sm:col-span-2 flex flex-col gap-1">
              <label className="text-xs font-medium text-gray-500">Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descreva a oportunidade, necessidades do cliente, valores discutidos..."
                className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary resize-none h-24"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#e2e8f0] bg-gray-50/50 shrink-0">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!clientName.trim() || submitting}
            className="px-6 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors font-medium text-sm cursor-pointer"
          >
            {submitting ? 'Salvando...' : isEdit ? 'Atualizar' : 'Salvar Lead'}
          </button>
        </div>
      </div>
    </div>
  );
}
