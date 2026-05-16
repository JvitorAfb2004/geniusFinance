import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { formatPriceFromCents } from '../lib/subscriptionService';
import { Plus, Search, X, Trash2 } from 'lucide-react';

interface SubEntry {
  id: string;
  userEmail?: string;
  status: string;
  paymentMethod?: string;
  totalAmount?: number;
  currentPeriodEnd?: string;
  items?: { planId: string; quantity: number; unitPrice: number }[];
}

interface Plan {
  id: string;
  name: string;
  basePrice: number;
  type: string;
}

export function AdminSubscriptionsView() {
  const [subs, setSubs] = useState<SubEntry[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAssign, setShowAssign] = useState(false);
  const [form, setForm] = useState({ targetEmail: '', planId: '', durationMonths: 1, indefinite: false });
  const [assigning, setAssigning] = useState(false);

  const load = async () => {
    try {
      const [subsRes, plansRes] = await Promise.all([
        apiFetch('/api/admin/subscriptions'),
        apiFetch('/api/admin/plans'),
      ]);
      setSubs(subsRes.data || []);
      setPlans(plansRes.data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const handleAssign = async () => {
    if (!form.targetEmail || !form.planId) return;
    setAssigning(true);
    setError('');
    try {
      await apiFetch('/api/admin/subscriptions', {
        method: 'POST',
        body: JSON.stringify({ ...form, action: 'assign' }),
      });
      setShowAssign(false);
      setForm({ targetEmail: '', planId: '', durationMonths: 1, indefinite: false });
      await load();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setAssigning(false);
    }
  };

  const handleRevoke = async (email: string) => {
    if (!confirm(`Revogar assinatura de ${email}?`)) return;
    try {
      await apiFetch('/api/admin/subscriptions', {
        method: 'POST',
        body: JSON.stringify({ targetEmail: email, action: 'revoke' }),
      });
      await load();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const statusBadge = (status: string) => {
    const map: Record<string, string> = {
      active: 'bg-green-100 text-green-700',
      trial: 'bg-amber-100 text-amber-700',
      past_due: 'bg-red-100 text-red-700',
      cancelled: 'bg-gray-100 text-gray-500',
      expired: 'bg-gray-100 text-gray-500',
      pending: 'bg-blue-100 text-blue-700',
    };
    return `text-xs font-semibold uppercase px-2 py-0.5 rounded ${map[status] || 'bg-gray-100 text-gray-500'}`;
  };

  if (loading) return <div className="p-6 text-center text-text-secondary">Carregando assinaturas...</div>;

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-gray-900">Gestão de Assinaturas</h2>
          <p className="text-sm text-gray-500">Atribua e gerencie assinaturas dos usuários.</p>
        </div>
        <button onClick={() => setShowAssign(true)}
          className="flex items-center gap-1.5 text-sm font-medium bg-[#3b82f6] text-white px-4 py-2 rounded-lg hover:bg-[#2563eb] cursor-pointer transition-colors">
          <Plus className="w-4 h-4" /> Atribuir Plano
        </button>
      </div>

      {showAssign && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 flex flex-col gap-3">
          <h3 className="font-semibold text-gray-900 text-sm">Atribuir assinatura</h3>
          <input type="email" placeholder="Email do usuário" value={form.targetEmail}
            onChange={e => setForm({ ...form, targetEmail: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#3b82f6]" />
          <select value={form.planId}
            onChange={e => setForm({ ...form, planId: e.target.value })}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none cursor-pointer">
            <option value="">Selecione um plano</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.name} — {formatPriceFromCents(p.basePrice)}</option>
            ))}
          </select>
          {!form.indefinite && (
            <input type="number" min={1} placeholder="Duração (meses)" value={form.durationMonths}
              onChange={e => setForm({ ...form, durationMonths: Number(e.target.value) })}
              className="w-48 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#3b82f6]" />
          )}
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={form.indefinite}
              onChange={e => setForm({ ...form, indefinite: e.target.checked })}
              className="w-4 h-4 rounded border-gray-300 cursor-pointer" />
            Indeterminado (sem expiração)
          </label>
          <div className="flex gap-2">
            <button onClick={handleAssign} disabled={assigning || !form.targetEmail || !form.planId}
              className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-lg hover:bg-emerald-700 disabled:opacity-50 cursor-pointer transition-colors">
              {assigning ? 'Atribuindo...' : 'Atribuir'}
            </button>
            <button onClick={() => setShowAssign(false)}
              className="text-sm text-gray-500 hover:text-gray-700 cursor-pointer px-3">Cancelar</button>
          </div>
        </div>
      )}

      {error && <p className="text-red-500 text-sm">{error}</p>}

      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Email</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Método</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Valor</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Expira</th>
              <th className="px-4 py-3 text-xs font-semibold text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody>
            {subs.length === 0 ? (
              <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-400">Nenhuma assinatura encontrada.</td></tr>
            ) : subs.map(s => (
              <tr key={s.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2.5 text-gray-700 text-xs font-mono">{s.userEmail || '—'}</td>
                <td className="px-4 py-2.5"><span className={statusBadge(s.status)}>{s.status}</span></td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{s.paymentMethod || 'manual'}</td>
                <td className="px-4 py-2.5 text-gray-700">{formatPriceFromCents(s.totalAmount)}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">
                  {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString('pt-BR') : '-'}
                </td>
                <td className="px-4 py-2.5">
                  {s.status !== 'cancelled' && s.userEmail && (
                    <button onClick={() => handleRevoke(s.userEmail!)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium cursor-pointer flex items-center gap-1">
                      <Trash2 className="w-3 h-3" /> Revogar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
