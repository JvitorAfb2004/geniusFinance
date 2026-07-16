import React, { useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import { cn } from '../lib/utils';
import { Trash2, Pencil, Plus, X, GripVertical, ChevronUp, ChevronDown, Layers, Check } from 'lucide-react';
import ConfirmModal from './ConfirmModal';
import type { ServiceType, ServiceTypeStep, CustomFieldDef } from '../types';

export default function ServiceTypesView() {
  const { serviceTypes, addServiceType, updateServiceType, deleteServiceType } = useFinance();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingType, setEditingType] = useState<ServiceType | undefined>(undefined);
  const [confirmDelete, setConfirmDelete] = useState<ServiceType | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [steps, setSteps] = useState<ServiceTypeStep[]>([]);
  const [customFieldDefs, setCustomFieldDefs] = useState<CustomFieldDef[]>([]);
  const [newStepTitle, setNewStepTitle] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldKey, setNewFieldKey] = useState('');
  const [saving, setSaving] = useState(false);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [editStepValue, setEditStepValue] = useState('');

  const openAdd = () => {
    setEditingType(undefined);
    setName('');
    setSteps([]);
    setCustomFieldDefs([]);
    setNewStepTitle('');
    setNewFieldLabel('');
    setNewFieldKey('');
    setIsModalOpen(true);
  };

  const openEdit = (st: ServiceType) => {
    setEditingType(st);
    setName(st.name);
    setSteps([...st.steps]);
    setCustomFieldDefs([...st.customFieldDefs]);
    setNewStepTitle('');
    setNewFieldLabel('');
    setNewFieldKey('');
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingType(undefined);
  };

  const addStep = () => {
    if (!newStepTitle.trim()) return;
    const maxOrder = steps.reduce((m, s) => Math.max(m, s.order), -1);
    setSteps([...steps, { order: maxOrder + 1, title: newStepTitle.trim() }]);
    setNewStepTitle('');
  };

  const removeStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index).map((s, i) => ({ ...s, order: i })));
  };

  const moveStep = (index: number, direction: 'up' | 'down') => {
    const newSteps = [...steps];
    const target = direction === 'up' ? index - 1 : index + 1;
    if (target < 0 || target >= newSteps.length) return;
    [newSteps[index], newSteps[target]] = [newSteps[target], newSteps[index]];
    setSteps(newSteps.map((s, i) => ({ ...s, order: i })));
  };

  const startEditStep = (index: number) => {
    setEditingStepIndex(index);
    setEditStepValue(steps[index].title);
  };

  const saveEditStep = () => {
    if (editingStepIndex === null || !editStepValue.trim()) return;
    setSteps(steps.map((s, i) => i === editingStepIndex ? { ...s, title: editStepValue.trim() } : s));
    setEditingStepIndex(null);
    setEditStepValue('');
  };

  const cancelEditStep = () => {
    setEditingStepIndex(null);
    setEditStepValue('');
  };

  const addField = () => {
    if (!newFieldLabel.trim() || !newFieldKey.trim()) return;
    const key = newFieldKey.trim().toLowerCase().replace(/\s+/g, '_').replace(/[^a-z0-9_]/g, '');
    if (!key) return;
    if (customFieldDefs.some(f => f.key === key)) return;
    setCustomFieldDefs([...customFieldDefs, { key, label: newFieldLabel.trim() }]);
    setNewFieldLabel('');
    setNewFieldKey('');
  };

  const removeField = (index: number) => {
    setCustomFieldDefs(customFieldDefs.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      const data = { name: name.trim(), steps, customFieldDefs };
      if (editingType) {
        await updateServiceType(editingType.id, data);
      } else {
        await addServiceType(data);
      }
      closeModal();
    } finally {
      setSaving(false);
    }
  };

  const sortedTypes = [...serviceTypes].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return (
    <div className="flex flex-col h-full gap-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
            <Layers className="w-5 h-5 text-primary" />
            Tipos de Serviço
          </h2>
          <p className="text-sm text-gray-500 mt-0.5">
            {serviceTypes.length} tipo{serviceTypes.length !== 1 ? 's' : ''} de serviço cadastrado{serviceTypes.length !== 1 ? 's' : ''}
          </p>
        </div>
        <button
          onClick={openAdd}
          className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors font-medium text-sm cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          Novo Tipo
        </button>
      </div>

      <div className="clay overflow-hidden flex-1">
        <div className="overflow-auto flex-1">
          {sortedTypes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <Layers className="w-12 h-12 mb-3 opacity-30" />
              <p className="text-sm font-medium">Nenhum tipo de serviço cadastrado</p>
              <p className="text-xs mt-1">Crie tipos de serviço para usar como template nos projetos</p>
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 sticky top-0 z-10">
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">Nome</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden sm:table-cell">Passos</th>
                  <th className="text-left py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider hidden md:table-cell">Campos Extras</th>
                  <th className="text-center py-3 px-4 text-xs font-semibold text-gray-500 uppercase tracking-wider w-20">Ações</th>
                </tr>
              </thead>
              <tbody>
                {sortedTypes.map((st) => (
                  <tr key={st.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="py-3 px-4 font-medium text-gray-900">{st.name}</td>
                    <td className="py-3 px-4 hidden sm:table-cell text-gray-600">
                      {st.steps.length > 0
                        ? st.steps.map(s => s.title).join(' → ')
                        : <span className="text-gray-400">--</span>}
                    </td>
                    <td className="py-3 px-4 hidden md:table-cell text-gray-600">
                      {st.customFieldDefs.length > 0
                        ? st.customFieldDefs.map(f => f.label).join(', ')
                        : <span className="text-gray-400">--</span>}
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => openEdit(st)}
                          className="p-1.5 text-gray-400 hover:text-primary rounded transition-colors cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setConfirmDelete(st)}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative clay shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingType ? 'Editar Tipo de Serviço' : 'Novo Tipo de Serviço'}
              </h3>
              <button onClick={closeModal} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-4 space-y-5 flex-1">
              {/* Name */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Landing Page, Sistema Web..."
                  className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary transition-colors"
                />
              </div>

              {/* Steps */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Passos do Processo
                </label>
                {steps.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {steps.map((step, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2 group">
                        <GripVertical className="w-3.5 h-3.5 text-gray-300" />
                        <span className="text-xs text-gray-400 font-mono mr-1">{i + 1}.</span>
                        {editingStepIndex === i ? (
                          <>
                            <input
                              type="text"
                              value={editStepValue}
                              onChange={(e) => setEditStepValue(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') saveEditStep(); if (e.key === 'Escape') cancelEditStep(); }}
                              className="flex-1 px-2 py-1 text-sm border border-primary rounded outline-none"
                              autoFocus
                            />
                            <button onClick={saveEditStep} className="p-0.5 text-emerald-500 hover:text-emerald-600 cursor-pointer" title="Salvar">
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button onClick={cancelEditStep} className="p-0.5 text-gray-400 hover:text-gray-600 cursor-pointer" title="Cancelar">
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        ) : (
                          <>
                            <span
                              className="flex-1 text-sm text-gray-700 cursor-pointer hover:text-primary"
                              onClick={() => startEditStep(i)}
                              title="Clique para editar"
                            >
                              {step.title}
                            </span>
                            <button
                              onClick={() => startEditStep(i)}
                              className="p-0.5 text-gray-300 hover:text-primary opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                              title="Editar passo"
                            >
                              <Pencil className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => moveStep(i, 'up')}
                              disabled={i === 0}
                              className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-20 cursor-pointer"
                            >
                              <ChevronUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => moveStep(i, 'down')}
                              disabled={i === steps.length - 1}
                              className="p-0.5 text-gray-300 hover:text-gray-500 disabled:opacity-20 cursor-pointer"
                            >
                              <ChevronDown className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => removeStep(i)}
                              className="p-0.5 text-gray-300 hover:text-red-400 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </>
                        )}
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newStepTitle}
                    onChange={(e) => setNewStepTitle(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addStep(); } }}
                    placeholder="Novo passo..."
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary transition-colors"
                  />
                  <button
                    onClick={addStep}
                    disabled={!newStepTitle.trim()}
                    className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-40 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>

              {/* Custom Fields */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Campos Personalizados
                </label>
                {customFieldDefs.length > 0 && (
                  <div className="space-y-1 mb-3">
                    {customFieldDefs.map((field, i) => (
                      <div key={i} className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
                        <span className="flex-1 text-sm text-gray-700">
                          <span className="font-medium">{field.label}</span>
                          <span className="text-gray-400 text-xs ml-2">({field.key})</span>
                        </span>
                        <button
                          onClick={() => removeField(i)}
                          className="p-0.5 text-gray-300 hover:text-red-400 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addField(); } }}
                    placeholder="Label (ex: Tech Stack)"
                    className="flex-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary transition-colors"
                  />
                  <input
                    type="text"
                    value={newFieldKey}
                    onChange={(e) => setNewFieldKey(e.target.value)}
                    placeholder="Chave"
                    className="w-28 px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary transition-colors"
                  />
                  <button
                    onClick={addField}
                    disabled={!newFieldLabel.trim() || !newFieldKey.trim()}
                    className="px-3 py-1.5 text-xs bg-gray-100 text-gray-600 rounded-lg hover:bg-gray-200 disabled:opacity-40 cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 mt-1">A chave será usada como identificador interno (ex: tech_stack).</p>
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button
                onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !name.trim()}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer transition-colors"
              >
                {saving ? 'Salvando...' : editingType ? 'Atualizar' : 'Criar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <ConfirmModal
          title="Excluir tipo de serviço"
          message={`Deseja excluir "${confirmDelete.name}"? Projetos que usam este tipo não serão afetados.`}
          confirmLabel="Excluir"
          variant="danger"
          onConfirm={() => {
            deleteServiceType(confirmDelete.id);
            setConfirmDelete(null);
          }}
          onCancel={() => setConfirmDelete(null)}
        />
      )}
    </div>
  );
}
