import { useState } from 'react';
import { useNavigate } from 'react-router';
import { usePluggy } from '../hooks/usePluggy';
import { useFinance } from '../hooks/useFinance';
import { TransactionModal } from './TransactionModal';
import ConfirmModal from './ConfirmModal';
import { ArrowUpCircle, ArrowDownCircle, CheckCircle, Ban, Undo2, Building2, User, Landmark, Plus } from 'lucide-react';
import type { PluggyProvision } from '../types';

type Filter = 'ALL' | 'PROVISION' | 'CONVERTED' | 'IGNORED';
type TypeFilter = 'ALL' | 'INCOME' | 'EXPENSE';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function ProvisionsView() {
  const { connection, provisions, pendingCount, ignoreProvision, restoreProvision, updateProvision, createManualProvision } = usePluggy();
  const { activeScope, accounts } = useFinance();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<Filter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [converting, setConverting] = useState<PluggyProvision | null>(null);
  const [confirmIgnore, setConfirmIgnore] = useState<PluggyProvision | null>(null);
  const [showManual, setShowManual] = useState(false);
  const [manualForm, setManualForm] = useState({ description: '', amount: '', date: new Date().toISOString().slice(0, 10), type: 'EXPENSE' as 'INCOME' | 'EXPENSE' });

  const scopeLabel = activeScope.type === 'PERSONAL'
    ? 'Pessoal'
    : accounts.find((a) => a.id === activeScope.accountId)?.name || 'Empresa';

  const visible = provisions.filter((p) => {
    if (filter !== 'ALL' && p.provisionStatus !== filter) return false;
    if (typeFilter !== 'ALL' && p.type !== typeFilter) return false;
    return true;
  });

  const handleManualSubmit = async () => {
    const amount = parseFloat(manualForm.amount.replace(',', '.'));
    if (!manualForm.description.trim() || !amount || amount <= 0 || !manualForm.date) return;
    await createManualProvision({
      description: manualForm.description.trim(),
      amount,
      date: manualForm.date,
      type: manualForm.type,
    });
    setManualForm({ description: '', amount: '', date: new Date().toISOString().slice(0, 10), type: 'EXPENSE' });
    setShowManual(false);
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-text-primary flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primary" /> Provisões
          </h1>
          <p className="text-sm text-text-secondary">
            {connection ? (
              <>{connection.institutionName} · </>
            ) : (
              <span className="text-text-muted">Sem banco conectado · </span>
            )}
            {activeScope.type === 'PERSONAL' ? <User className="inline w-3.5 h-3.5" /> : <Building2 className="inline w-3.5 h-3.5" />} {scopeLabel}
            {connection && <> · <span className="text-amber-500">{pendingCount} pendente(s)</span></>}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setShowManual(true)}
            className="px-3 py-1.5 rounded-md clay-btn-primary text-white text-sm font-medium cursor-pointer border-none hover:opacity-90 flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Nova provisão
          </button>
          <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)}
            className="px-2 py-1.5 rounded-md clay-input text-sm text-text-primary">
            <option value="ALL">Todas</option>
            <option value="PROVISION">Pendentes</option>
            <option value="CONVERTED">Convertidas</option>
            <option value="IGNORED">Ignoradas</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="px-2 py-1.5 rounded-md clay-input text-sm text-text-primary">
            <option value="ALL">Entrada e saída</option>
            <option value="INCOME">Entradas</option>
            <option value="EXPENSE">Saídas</option>
          </select>
        </div>
      </div>

      {!connection && provisions.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-10 text-center rounded-xl bg-surface border border-border">
          <Landmark className="w-10 h-10 text-text-muted" />
          <p className="text-sm text-text-secondary max-w-md">
            Nenhum banco conectado ainda. Conecte seu banco em Configurações &gt; Integrações para importar movimentações automaticamente, ou registre provisões manualmente.
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setShowManual(true)}
              className="px-4 py-2 rounded-md clay-btn-primary text-white font-medium text-sm cursor-pointer border-none hover:opacity-90"
            >
              Nova provisão manual
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="px-4 py-2 rounded-md clay-btn text-text-primary font-medium text-sm cursor-pointer border border-border hover:brightness-95"
            >
              Ir para Integrações
            </button>
          </div>
        </div>
      )}

      {showManual && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface border border-border rounded-2xl p-6 w-full max-w-md space-y-4">
            <h2 className="text-lg font-semibold text-text-primary">Nova provisão</h2>
            <input
              type="text"
              placeholder="Descrição"
              value={manualForm.description}
              onChange={(e) => setManualForm((f) => ({ ...f, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-md clay-input text-sm text-text-primary outline-none placeholder:text-text-muted"
            />
            <div className="grid grid-cols-2 gap-3">
              <input
                type="number"
                min="0"
                step="0.01"
                placeholder="Valor (R$)"
                value={manualForm.amount}
                onChange={(e) => setManualForm((f) => ({ ...f, amount: e.target.value }))}
                className="w-full px-3 py-2 rounded-md clay-input text-sm text-text-primary outline-none placeholder:text-text-muted"
              />
              <input
                type="date"
                value={manualForm.date}
                onChange={(e) => setManualForm((f) => ({ ...f, date: e.target.value }))}
                className="w-full px-3 py-2 rounded-md clay-input text-sm text-text-primary outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              {(['INCOME', 'EXPENSE'] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setManualForm((f) => ({ ...f, type: t }))}
                  className={`px-3 py-2 rounded-md text-sm font-medium cursor-pointer border transition-colors ${
                    manualForm.type === t
                      ? t === 'INCOME'
                        ? 'border-emerald-400 bg-emerald-50 text-emerald-700'
                        : 'border-red-400 bg-red-50 text-red-700'
                      : 'clay-btn border-none text-text-secondary hover:brightness-95'
                  }`}
                >
                  {t === 'INCOME' ? 'Entrada' : 'Saída'}
                </button>
              ))}
            </div>
            <div className="flex gap-3 pt-1">
              <button
                onClick={() => setShowManual(false)}
                className="flex-1 px-3 py-2 rounded-md clay-btn text-text-primary text-sm font-medium cursor-pointer border border-border hover:brightness-95"
              >
                Cancelar
              </button>
              <button
                onClick={handleManualSubmit}
                disabled={!manualForm.description.trim() || !manualForm.amount || parseFloat(manualForm.amount) <= 0}
                className="flex-1 px-3 py-2 rounded-md clay-btn-primary text-white text-sm font-medium cursor-pointer border-none hover:opacity-90 disabled:opacity-50"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="py-16 text-center text-sm text-text-secondary bg-surface rounded-xl border border-border">
          Nenhuma provisão aqui.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-surface border border-border">
              {p.type === 'INCOME' ? (
                <ArrowUpCircle className="w-6 h-6 text-emerald-500 shrink-0" />
              ) : (
                <ArrowDownCircle className="w-6 h-6 text-red-500 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-text-primary truncate">{p.description}</p>
                <p className="text-xs text-text-muted">
                  {p.date} · {p.status === 'PENDING' ? 'Pendente' : 'Confirmada'}
                </p>
              </div>
              <span className={`text-sm font-semibold ${p.type === 'INCOME' ? 'text-emerald-600' : 'text-red-600'}`}>
                {p.type === 'INCOME' ? '+' : '-'}{brl.format(p.amount)}
              </span>
              {p.provisionStatus === 'PROVISION' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setConverting(p)}
                    className="px-3 py-1.5 rounded-md clay-btn-primary text-white text-xs font-semibold cursor-pointer border-none hover:opacity-90 flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Converter
                  </button>
                  <button
                    onClick={() => setConfirmIgnore(p)}
                    className="px-3 py-1.5 rounded-md clay-btn text-text-primary text-xs font-semibold cursor-pointer border border-border hover:brightness-95"
                  >
                    <Ban className="w-3.5 h-3.5" /> Ignorar
                  </button>
                </div>
              )}
              {p.provisionStatus === 'CONVERTED' && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Convertida
                </span>
              )}
              {p.provisionStatus === 'IGNORED' && (
                <button
                  onClick={() => restoreProvision(p.id)}
                  className="px-3 py-1.5 rounded-md clay-btn text-text-primary text-xs font-semibold cursor-pointer border border-border hover:brightness-95 flex items-center gap-1.5"
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
