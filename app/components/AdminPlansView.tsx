import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import { formatPriceFromCents } from '../lib/subscriptionService';

interface Plan {
  id: string;
  name: string;
  basePrice: number;
  type: string;
  abacateProductId: string;
  isPublic: boolean;
  createdBy: string;
  createdAt: string;
}

const PLAN_TYPES = [
  { value: 'PERSONAL', label: 'Pessoal' },
  { value: 'BUSINESS', label: 'Empresa' },
  { value: 'EXTRA_BUSINESS', label: 'Empresa Adicional' },
  { value: 'EXTRA_MEMBER', label: 'Membro Extra' },
];

const emptyForm = { name: '', basePrice: 0, type: 'PERSONAL', abacateProductId: '', isPublic: true };

export function AdminPlansView() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [showModal, setShowModal] = useState(false);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const res = await apiFetch('/api/admin/plans');
      setPlans(res.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    setSaving(true);
    setError('');
    try {
      if (editingId) {
        await apiFetch('/api/admin/plans', { method: 'PUT', body: JSON.stringify({ id: editingId, ...form }) });
      } else {
        await apiFetch('/api/admin/plans', { method: 'POST', body: JSON.stringify(form) });
      }
      closeModal();
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este plano?')) return;
    try {
      await apiFetch('/api/admin/plans', { method: 'DELETE', body: JSON.stringify({ id }) });
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openNew = () => {
    setEditingId(null);
    setForm(emptyForm);
    setShowModal(true);
  };

  const openEdit = (plan: Plan) => {
    setEditingId(plan.id);
    setForm({ name: plan.name, basePrice: plan.basePrice, type: plan.type, abacateProductId: plan.abacateProductId, isPublic: plan.isPublic });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
    setForm(emptyForm);
  };

  if (loading) return <div className="p-6 text-center text-text-secondary">Carregando planos...</div>;

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Gestão de Planos</h2>
          <p className="text-sm text-gray-500">Crie e gerencie os planos de assinatura disponíveis.</p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-1.5 text-sm font-medium bg-primary text-white px-4 py-2 rounded-lg hover:bg-primary-hover cursor-pointer transition-colors">
          <Plus className="w-4 h-4" /> Novo Plano
        </button>
      </div>

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="clay overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Nome</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Preço</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody>
            {plans.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-6 text-center text-gray-400">Nenhum plano criado.</td></tr>
            ) : plans.map(p => (
              <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2.5 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{p.type}</td>
                <td className="px-4 py-2.5 text-gray-700">{formatPriceFromCents(p.basePrice)}</td>
                <td className="px-4 py-2.5 flex gap-2">
                  <button onClick={() => openEdit(p)}
                    className="text-gray-400 hover:text-blue-600 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(p.id)}
                    className="text-gray-400 hover:text-red-500 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative clay shadow-xl w-full max-w-md mx-4">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">
                {editingId ? 'Editar Plano' : 'Novo Plano'}
              </h3>
              <button onClick={closeModal} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4">
              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Nome</label>
                <input type="text" placeholder="Nome do plano" value={form.name}
                  onChange={e => setForm({ ...form, name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-colors" />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Preço (centavos)</label>
                <input type="number" placeholder="0" value={form.basePrice || ''}
                  onChange={e => setForm({ ...form, basePrice: Number(e.target.value) })}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Tipo</label>
                <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer bg-white">
                  {PLAN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">ID Produto Abacate Pay</label>
                <input type="text" placeholder="abc123" value={form.abacateProductId}
                  onChange={e => setForm({ ...form, abacateProductId: e.target.value })}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
              </div>

              <label className="flex items-center gap-2 text-sm cursor-pointer">
                <input type="checkbox" checked={form.isPublic}
                  onChange={e => setForm({ ...form, isPublic: e.target.checked })}
                  className="w-4 h-4 rounded border-gray-300 cursor-pointer" />
                Plano público
              </label>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={closeModal}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleSave} disabled={saving || !form.name}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer transition-colors flex items-center gap-1.5">
                <Check className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
