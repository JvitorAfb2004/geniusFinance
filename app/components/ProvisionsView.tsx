import { useState } from 'react';
import { useNavigate } from 'react-router';
import { usePluggy } from '../hooks/usePluggy';
import { useFinance } from '../hooks/useFinance';
import { TransactionModal } from './TransactionModal';
import ConfirmModal from './ConfirmModal';
import { ArrowUpCircle, ArrowDownCircle, RefreshCw, CheckCircle, Ban, Undo2, Building2, User, Landmark } from 'lucide-react';
import type { PluggyProvision } from '../types';

type Filter = 'ALL' | 'PROVISION' | 'CONVERTED' | 'IGNORED';
type TypeFilter = 'ALL' | 'INCOME' | 'EXPENSE';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function ProvisionsView() {
  const { connection, provisions, pendingCount, ignoreProvision, restoreProvision, updateProvision } = usePluggy();
  const { activeScope, accounts } = useFinance();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<Filter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [converting, setConverting] = useState<PluggyProvision | null>(null);
  const [confirmIgnore, setConfirmIgnore] = useState<PluggyProvision | null>(null);

  const scopeLabel = activeScope.type === 'PERSONAL'
    ? 'Pessoal'
    : accounts.find((a) => a.id === activeScope.accountId)?.name || 'Empresa';

  const visible = provisions.filter((p) => {
    if (filter !== 'ALL' && p.provisionStatus !== filter) return false;
    if (typeFilter !== 'ALL' && p.type !== typeFilter) return false;
    return true;
  });

  if (!connection) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <Landmark className="w-12 h-12 text-slate-400" />
        <h2 className="text-lg font-semibold text-slate-200">Nenhum banco conectado</h2>
        <p className="text-sm text-slate-400 max-w-md">
          Conecte seu banco em Configurações &gt; Integrações para importar suas movimentações automaticamente.
        </p>
        <button
          onClick={() => navigate('/settings')}
          className="px-4 py-2 rounded-md bg-primary text-white font-medium text-sm cursor-pointer border-none hover:opacity-90"
        >
          Ir para Integrações
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primary" /> Provisões
          </h1>
          <p className="text-sm text-slate-400">
            {connection.institutionName} · {activeScope.type === 'PERSONAL' ? <User className="inline w-3.5 h-3.5" /> : <Building2 className="inline w-3.5 h-3.5" />} {scopeLabel} ·{' '}
            <span className="text-amber-400">{pendingCount} pendente(s)</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)}
            className="px-2 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-sm text-slate-200">
            <option value="ALL">Todas</option>
            <option value="PROVISION">Pendentes</option>
            <option value="CONVERTED">Convertidas</option>
            <option value="IGNORED">Ignoradas</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="px-2 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-sm text-slate-200">
            <option value="ALL">Entrada e saída</option>
            <option value="INCOME">Entradas</option>
            <option value="EXPENSE">Saídas</option>
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800">
          Nenhuma provisão aqui.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              {p.type === 'INCOME' ? (
                <ArrowUpCircle className="w-6 h-6 text-emerald-400 shrink-0" />
              ) : (
                <ArrowDownCircle className="w-6 h-6 text-red-400 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-100 truncate">{p.description}</p>
                <p className="text-xs text-slate-500">
                  {p.date} · {p.status === 'PENDING' ? 'Pendente' : 'Confirmada'}
                </p>
              </div>
              <span className={`text-sm font-semibold ${p.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                {p.type === 'INCOME' ? '+' : '-'}{brl.format(p.amount)}
              </span>
              {p.provisionStatus === 'PROVISION' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setConverting(p)}
                    className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold cursor-pointer border-none hover:opacity-90 flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Converter
                  </button>
                  <button
                    onClick={() => setConfirmIgnore(p)}
                    className="px-3 py-1.5 rounded-md bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer border border-slate-700 hover:bg-slate-700"
                  >
                    <Ban className="w-3.5 h-3.5" /> Ignorar
                  </button>
                </div>
              )}
              {p.provisionStatus === 'CONVERTED' && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Convertida
                </span>
              )}
              {p.provisionStatus === 'IGNORED' && (
                <button
                  onClick={() => restoreProvision(p.id)}
                  className="px-3 py-1.5 rounded-md bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer border border-slate-700 hover:bg-slate-700 flex items-center gap-1.5"
                >
                  <Undo2 className="w-3.5 h-3.5" /> Restaurar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {converting && (
        <TransactionModal
          initialData={{
            id: '',
            title: converting.description,
            amount: converting.amount,
            date: converting.date,
            type: converting.type,
            status: converting.status === 'PENDING' ? 'PENDING' : 'PAID',
            context: activeScope.type === 'ACCOUNT' ? 'BUSINESS' : 'PERSONAL',
            userId: '',
            createdAt: '',
            updatedAt: '',
            categoryId: '',
            tagIds: [],
          }}
          onSaved={(newId) => {
            if (newId) updateProvision(converting.id, { provisionStatus: 'CONVERTED', convertedToTransactionId: newId });
            setConverting(null);
          }}
          onClose={() => setConverting(null)}
        />
      )}

      {confirmIgnore && (
        <ConfirmModal
          title="Ignorar provisão?"
          message={`A provisão "${confirmIgnore.description}" será ocultada da lista de pendências. Você pode restaurar depois.`}
          confirmLabel="Ignorar"
          variant="warning"
          onConfirm={() => { ignoreProvision(confirmIgnore.id); setConfirmIgnore(null); }}
          onCancel={() => setConfirmIgnore(null)}
        />
      )}
    </div>
  );
}
