import React, { useState } from 'react';
import { useFinance } from '../hooks/useFinance';
import { Plus, Trash2, X, Check } from 'lucide-react';
import type { FinancialGoal } from '../types';
import { motion } from 'motion/react';
import { AnimatedNumber } from './AnimatedNumber';

const CAT_LABELS: Record<string, string> = { SAVINGS: 'Reserva', INVESTMENT: 'Investimento', DEBT_PAYOFF: 'Quitar Dívida', PURCHASE: 'Compra' };
const CAT_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

export default function GoalsView() {
  const { goals, addGoal, updateGoal, deleteGoal } = useFinance();
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', targetAmount: '', currentAmount: '', deadline: '', category: 'SAVINGS' as FinancialGoal['category'], color: '#3b82f6' });

  async function handleAdd() {
    if (!form.name || !form.targetAmount || !form.deadline) return;
    await addGoal({
      name: form.name, targetAmount: parseFloat(form.targetAmount), currentAmount: parseFloat(form.currentAmount) || 0,
      deadline: form.deadline, category: form.category, color: form.color,
    });
    setForm({ name: '', targetAmount: '', currentAmount: '', deadline: '', category: 'SAVINGS', color: '#3b82f6' });
    setShowForm(false);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-slate-800">Metas Financeiras</h2>
          <p className="text-sm text-slate-500">Acompanhe seus objetivos de economia e investimento.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 cursor-pointer flex items-center gap-2 text-sm font-medium">
          <Plus className="w-4 h-4" /> Nova Meta
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-3">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <input placeholder="Nome da meta" value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
            <input type="number" placeholder="Valor alvo (R$)" value={form.targetAmount} onChange={(e) => setForm((f) => ({ ...f, targetAmount: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
            <input type="number" placeholder="Valor atual (R$)" value={form.currentAmount} onChange={(e) => setForm((f) => ({ ...f, currentAmount: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
            <input type="date" value={form.deadline} onChange={(e) => setForm((f) => ({ ...f, deadline: e.target.value }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-blue-400" />
          </div>
          <div className="flex items-center gap-3">
            <select value={form.category} onChange={(e) => setForm((f) => ({ ...f, category: e.target.value as FinancialGoal['category'] }))} className="border border-slate-200 rounded-lg px-3 py-2 text-sm cursor-pointer">
              {Object.entries(CAT_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <div className="flex gap-1.5">{CAT_COLORS.map((c) => <button key={c} onClick={() => setForm((f) => ({ ...f, color: c }))} className={`w-6 h-6 rounded-full border-2 cursor-pointer ${form.color === c ? 'border-slate-800 scale-125' : 'border-transparent'}`} style={{ backgroundColor: c }} />)}</div>
            <button onClick={handleAdd} className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 cursor-pointer text-sm font-medium"><Check className="w-4 h-4" /></button>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 cursor-pointer"><X className="w-5 h-5" /></button>
          </div>
        </div>
      )}

      {goals.length === 0 && !showForm && (
        <div className="bg-white rounded-xl border border-slate-200 p-12 text-center text-slate-400">Nenhuma meta definida. Crie sua primeira meta!</div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {goals.map((g) => {
          const pct = g.targetAmount > 0 ? Math.min((g.currentAmount / g.targetAmount) * 100, 100) : 0;
          const daysLeft = Math.max(0, Math.ceil((new Date(g.deadline).getTime() - Date.now()) / (1000 * 60 * 60 * 24)));
          const monthlyNeeded = daysLeft > 0 ? (g.targetAmount - g.currentAmount) / Math.max(daysLeft / 30, 1) : 0;
          return (
            <div key={g.id} className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div className="flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: g.color }} />
                    <h3 className="font-semibold text-slate-800">{g.name}</h3>
                  </div>
                  <span className="text-xs text-slate-500">{CAT_LABELS[g.category]} • {daysLeft} dias restantes</span>
                </div>
                <button onClick={() => deleteGoal(g.id)} className="text-slate-300 hover:text-red-500 cursor-pointer"><Trash2 className="w-4 h-4" /></button>
              </div>
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-slate-600">
                    <AnimatedNumber value={g.currentAmount} /> de <AnimatedNumber value={g.targetAmount} />
                  </span>
                  <span className="font-bold" style={{ color: g.color }}><AnimatedNumber value={pct} kind="percent" decimals={0} /></span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-3">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pct}%` }}
                    transition={{ duration: 0.5, ease: 'easeOut' }}
                    className="h-3 rounded-full"
                    style={{ backgroundColor: g.color }}
                  />
                </div>
              </div>
              {pct < 100 && (
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    placeholder="Aporte"
                    className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none"
                    onKeyDown={async (e) => {
                      if (e.key === 'Enter') {
                        const val = parseFloat((e.target as HTMLInputElement).value);
                        if (val > 0) { await updateGoal(g.id, { currentAmount: g.currentAmount + val }); (e.target as HTMLInputElement).value = ''; }
                      }
                    }}
                  />
                  <span className="text-xs text-slate-500 whitespace-nowrap">
                    {monthlyNeeded > 0 ? <><AnimatedNumber value={monthlyNeeded} />/mês</> : ''}
                  </span>
                </div>
              )}
              {pct >= 100 && <p className="text-emerald-600 text-sm font-bold">Meta atingida!</p>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
