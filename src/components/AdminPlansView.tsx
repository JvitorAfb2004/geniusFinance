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
  const [showNew, setShowNew] = useState(false);
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
        await apiFetch(`/api/admin/plans/${editingId}`, { method: 'PUT', body: JSON.stringify(form) });
        setEditingId(null);
      } else {
        await apiFetch('/api/admin/plans', { method: 'POST', body: JSON.stringify(form) });
        setShowNew(false);
      }
      setForm(emptyForm);
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
      await apiFetch(`/api/admin/plans/${id}`, { method: 'DELETE' });
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const startEdit = (plan: Plan) => {
    setEditingId(plan.id);
    setForm({ name: plan.name, basePrice: plan.basePrice, type: plan.type, abacateProductId: plan.abacateProductId, isPublic: plan.isPublic });
    setShowNew(false);
  };

  if (loading) return <div className="p-6 text-center text-text-secondary">Carregando planos...</div>;

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Gestão de Planos</h2>
          <p className="text-sm text-gray-500">Crie e gerencie os planos de assinatura disponíveis.</p>
        </div>
        <button onClick={() => { setShowNew(true); setEditingId(null); setForm(emptyForm); }}
          className="flex items-center gap-1.5 text-sm font-medium bg-[#3b82f6] text-white px-4 py-2 rounded-lg hover:bg-[#2563eb] cursor-pointer transition-colors">
          <Plus className="w-4 h-4" /> Novo Plano
        </button>
      </div>

      {(showNew || editingId) && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 flex flex-col gap-3">
          <div className="flex gap-3">
            <input type="text" placeholder="Nome do plano" value={form.name}
              onChange={e => setForm({ ...form, name: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#3b82f6]" />
            <input type="number" placeholder="Preço (centavos)" value={form.basePrice || ''}
              onChange={e => setForm({ ...form, basePrice: Number(e.target.value) })}
              className="w-40 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#3b82f6]" />
          </div>
          <div className="flex gap-3">
            <select value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none cursor-pointer">
              {PLAN_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            <input type="text" placeholder="ID Produto Abacate Pay" value={form.abacateProductId}
              onChange={e => setForm({ ...form, abacateProductId: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#3b82f6]" />
          </div>
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.isPublic}
                onChange={e => setForm({ ...form, isPublic: e.target.checked })}
                className="w-4 h-4 rounded border-gray-300 cursor-pointer" />
              Plano público
            </label>
            <div className="flex gap-2">
              <button onClick={handleSave} disabled={saving || !form.name}
                className="flex items-center gap-1 text-sm bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 cursor-pointer transition-colors">
                <Check className="w-4 h-4" /> {saving ? 'Salvando...' : 'Salvar'}
              </button>
              <button onClick={() => { setEditingId(null); setShowNew(false); }}
                className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer px-3">Cancelar</button>
            </div>
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
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
                  <button onClick={() => startEdit(p)}
                    className="text-gray-400 hover:text-blue-600 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                  <button onClick={() => handleDelete(p.id)}
                    className="text-gray-400 hover:text-red-500 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
