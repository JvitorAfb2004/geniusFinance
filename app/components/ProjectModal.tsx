import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useFinance } from '../hooks/useFinance';
import { cn } from '../lib/utils';
import { X, Check, Plus, Search, ChevronDown, ChevronRight, Trash2, GripVertical } from 'lucide-react';
import type { Project, ServiceType, Lead, StepStatus, CustomFieldValue, Task, TaskPriority, Subtask } from '../types';

interface Props {
  project?: Project;
  lead?: Lead;
  onClose: () => void;
}

export default function ProjectModal({ project, lead, onClose }: Props) {
  const { serviceTypes, leads, addProject, updateProject, tasksMap, loadTasks, unloadTasks, addTask, updateTask, deleteTask, accountMembers } = useFinance();
  const isEdit = !!project;
  const tasks = project ? (tasksMap[project.id] || []) : [];

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

  // Task state
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPriority, setNewTaskPriority] = useState<TaskPriority>('MEDIUM');
  const [expandedTaskId, setExpandedTaskId] = useState<string | null>(null);
  const [editingSubtask, setEditingSubtask] = useState<{ taskId: string; text: string } | null>(null);
  const [taskDeleteConfirm, setTaskDeleteConfirm] = useState<string | null>(null);

  // Load/unload tasks when modal opens/closes for an existing project
  useEffect(() => {
    if (project) {
      loadTasks(project.id);
      return () => { unloadTasks(project.id); };
    }
  }, [project?.id]);

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

  // Task handlers
  const handleAddTask = async () => {
    if (!newTaskTitle.trim() || !project) return;
    await addTask(project.id, {
      title: newTaskTitle.trim(),
      done: false,
      priority: newTaskPriority,
      subtasks: [],
      order: tasks.length,
    });
    setNewTaskTitle('');
    setNewTaskPriority('MEDIUM');
  };

  const handleTaskKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAddTask();
    }
  };

  const toggleTaskDone = (task: Task) => {
    if (!project) return;
    updateTask(project.id, task.id, { done: !task.done });
  };

  const addSubtask = async (taskId: string, title: string) => {
    if (!project || !title.trim()) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const newSubtask: Subtask = { id: crypto.randomUUID(), title: title.trim(), done: false };
    await updateTask(project.id, taskId, { subtasks: [...task.subtasks, newSubtask] });
  };

  const toggleSubtask = async (taskId: string, subtaskId: string) => {
    if (!project) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    const updated = task.subtasks.map(s => s.id === subtaskId ? { ...s, done: !s.done } : s);
    await updateTask(project.id, taskId, { subtasks: updated });
  };

  const deleteSubtask = async (taskId: string, subtaskId: string) => {
    if (!project) return;
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;
    await updateTask(project.id, taskId, { subtasks: task.subtasks.filter(s => s.id !== subtaskId) });
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!project) return;
    await deleteTask(project.id, taskId);
    setTaskDeleteConfirm(null);
  };

  const getPriorityLabel = (p: TaskPriority) => {
    switch (p) {
      case 'HIGH': return 'Alta';
      case 'MEDIUM': return 'Média';
      case 'LOW': return 'Baixa';
    }
  };

  const getPriorityColor = (p: TaskPriority) => {
    switch (p) {
      case 'HIGH': return { bg: 'bg-red-100', text: 'text-red-700', dot: 'bg-red-500' };
      case 'MEDIUM': return { bg: 'bg-amber-100', text: 'text-amber-700', dot: 'bg-amber-500' };
      case 'LOW': return { bg: 'bg-blue-100', text: 'text-blue-700', dot: 'bg-blue-500' };
    }
  };

  const getAssigneeEmail = (uid?: string) => {
    if (!uid) return null;
    const member = accountMembers.find(m => m.uid === uid);
    return member?.email || uid;
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

          {/* Tasks Section (only for existing projects) */}
          {isEdit && project && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tarefas
                <span className="ml-2 text-xs text-gray-400 font-normal">
                  ({tasks.filter(t => !t.done).length} pendente{tasks.filter(t => !t.done).length !== 1 ? 's' : ''})
                </span>
              </label>

              {/* Quick add */}
              <div className="flex items-center gap-2 mb-3">
                <input
                  type="text"
                  value={newTaskTitle}
                  onChange={(e) => setNewTaskTitle(e.target.value)}
                  onKeyDown={handleTaskKeyDown}
                  placeholder="Nova tarefa..."
                  className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#3b82f6] transition-colors"
                />
                <select
                  value={newTaskPriority}
                  onChange={(e) => setNewTaskPriority(e.target.value as TaskPriority)}
                  className="px-2 py-2 border border-gray-200 rounded-lg text-xs outline-none focus:border-[#3b82f6] cursor-pointer bg-white"
                >
                  <option value="LOW">Baixa</option>
                  <option value="MEDIUM">Média</option>
                  <option value="HIGH">Alta</option>
                </select>
                <button
                  onClick={handleAddTask}
                  disabled={!newTaskTitle.trim()}
                  className="px-3 py-2 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer transition-colors shrink-0"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Task list */}
              {tasks.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-4 bg-gray-50 rounded-lg">
                  Nenhuma tarefa ainda. Adicione a primeira acima.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {tasks.map(task => {
                    const isExpanded = expandedTaskId === task.id;
                    const priorityColors = getPriorityColor(task.priority);
                    const doneSubtasks = task.subtasks.filter(s => s.done).length;
                    const totalSubtasks = task.subtasks.length;
                    const isOverdue = task.dueDate && new Date(task.dueDate) < new Date() && !task.done;

                    return (
                      <div
                        key={task.id}
                        className={cn(
                          'bg-gray-50 rounded-lg border transition-colors',
                          task.done ? 'border-gray-100 opacity-60' : 'border-gray-100 hover:border-gray-200'
                        )}
                      >
                        {/* Task row */}
                        <div className="flex items-center gap-2 p-2.5">
                          <input
                            type="checkbox"
                            checked={task.done}
                            onChange={() => toggleTaskDone(task)}
                            className="w-4 h-4 rounded border-gray-300 text-[#3b82f6] focus:ring-[#3b82f6] cursor-pointer shrink-0"
                          />
                          <span
                            className={cn(
                              'text-sm flex-1 cursor-pointer select-none',
                              task.done ? 'text-gray-400 line-through' : 'text-gray-800'
                            )}
                            onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                          >
                            {task.title}
                          </span>

                          {/* Priority badge */}
                          <span className={cn('inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[0.65rem] font-medium shrink-0', priorityColors.bg, priorityColors.text)}>
                            <span className={cn('w-1.5 h-1.5 rounded-full', priorityColors.dot)} />
                            {getPriorityLabel(task.priority)}
                          </span>

                          {/* Due date */}
                          {task.dueDate && (
                            <span className={cn('text-xs shrink-0', isOverdue ? 'text-red-500 font-medium' : 'text-gray-400')}>
                              {new Date(task.dueDate).toLocaleDateString('pt-BR')}
                            </span>
                          )}

                          {/* Subtask count */}
                          {totalSubtasks > 0 && (
                            <span className="text-xs text-gray-400 shrink-0">
                              {doneSubtasks}/{totalSubtasks}
                            </span>
                          )}

                          {/* Expand/collapse */}
                          <button
                            onClick={() => setExpandedTaskId(isExpanded ? null : task.id)}
                            className="p-0.5 text-gray-400 hover:text-gray-600 cursor-pointer shrink-0"
                          >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                          </button>

                          {/* Delete task */}
                          {taskDeleteConfirm === task.id ? (
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                onClick={() => handleDeleteTask(task.id)}
                                className="px-2 py-0.5 text-xs bg-red-500 text-white rounded cursor-pointer"
                              >
                                Excluir
                              </button>
                              <button
                                onClick={() => setTaskDeleteConfirm(null)}
                                className="px-2 py-0.5 text-xs bg-gray-200 text-gray-600 rounded cursor-pointer"
                              >
                                Não
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => setTaskDeleteConfirm(task.id)}
                              className="p-0.5 text-gray-300 hover:text-red-500 cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>

                        {/* Expanded detail area */}
                        {isExpanded && !task.done && (
                          <div className="px-3 pb-3 space-y-3 border-t border-gray-200/50 pt-3 ml-6">
                            {/* Description */}
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Descrição</label>
                              <textarea
                                value={task.description || ''}
                                onChange={(e) => {
                                  if (!project) return;
                                  updateTask(project.id, task.id, { description: e.target.value });
                                }}
                                placeholder="Adicionar descrição..."
                                rows={2}
                                className="w-full px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#3b82f6] resize-none"
                              />
                            </div>

                            {/* Due date */}
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Data Limite</label>
                              <input
                                type="date"
                                value={task.dueDate || ''}
                                onChange={(e) => {
                                  if (!project) return;
                                  updateTask(project.id, task.id, { dueDate: e.target.value || undefined });
                                }}
                                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#3b82f6]"
                              />
                            </div>

                            {/* Priority */}
                            <div>
                              <label className="block text-xs text-gray-500 mb-1">Prioridade</label>
                              <select
                                value={task.priority}
                                onChange={(e) => {
                                  if (!project) return;
                                  updateTask(project.id, task.id, { priority: e.target.value as TaskPriority });
                                }}
                                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#3b82f6] cursor-pointer bg-white"
                              >
                                <option value="LOW">Baixa</option>
                                <option value="MEDIUM">Média</option>
                                <option value="HIGH">Alta</option>
                              </select>
                            </div>

                            {/* Assignee (only in account scope) */}
                            {accountMembers.length > 0 && (
                              <div>
                                <label className="block text-xs text-gray-500 mb-1">Responsável</label>
                                <select
                                  value={task.assignee || ''}
                                  onChange={(e) => {
                                    if (!project) return;
                                    updateTask(project.id, task.id, { assignee: e.target.value || undefined });
                                  }}
                                  className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#3b82f6] cursor-pointer bg-white"
                                >
                                  <option value="">Nenhum</option>
                                  {accountMembers.map(m => (
                                    <option key={m.uid} value={m.uid}>{m.email}</option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Subtasks */}
                            <div>
                              <label className="block text-xs text-gray-500 mb-1.5">
                                Subtarefas ({doneSubtasks}/{totalSubtasks})
                              </label>
                              <div className="space-y-1 mb-2">
                                {task.subtasks.map(sub => (
                                  <div key={sub.id} className="flex items-center gap-2 group">
                                    <input
                                      type="checkbox"
                                      checked={sub.done}
                                      onChange={() => toggleSubtask(task.id, sub.id)}
                                      className="w-3.5 h-3.5 rounded border-gray-300 text-[#3b82f6] cursor-pointer shrink-0"
                                    />
                                    <span className={cn('text-sm flex-1', sub.done ? 'text-gray-400 line-through' : 'text-gray-700')}>
                                      {sub.title}
                                    </span>
                                    <button
                                      onClick={() => deleteSubtask(task.id, sub.id)}
                                      className="p-0.5 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
                                    >
                                      <Trash2 className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              {/* Add subtask */}
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={editingSubtask?.taskId === task.id ? (editingSubtask?.text || '') : ''}
                                  onChange={(e) => setEditingSubtask({ taskId: task.id, text: e.target.value })}
                                  onFocus={() => { if (editingSubtask?.taskId !== task.id) setEditingSubtask({ taskId: task.id, text: '' }); }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && editingSubtask?.taskId === task.id) {
                                      e.preventDefault();
                                      addSubtask(task.id, editingSubtask.text);
                                      setEditingSubtask(null);
                                    }
                                  }}
                                  placeholder="+ Adicionar subtarefa"
                                  className="flex-1 px-2 py-1 border border-gray-200 rounded text-xs outline-none focus:border-[#3b82f6]"
                                />
                                {editingSubtask?.taskId === task.id && editingSubtask.text.trim() && (
                                  <button
                                    onClick={() => {
                                      addSubtask(task.id, editingSubtask.text);
                                      setEditingSubtask(null);
                                    }}
                                    className="px-2 py-1 bg-[#3b82f6] text-white rounded text-xs cursor-pointer"
                                  >
                                    <Check className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
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
