import React, { useState, useCallback } from 'react';
import { useFinance } from '../hooks/useFinance';
import { parseTransactions as aiParseTransactions } from '../lib/ai';
import { formatCurrency } from '../lib/utils';
import { Upload, FileSpreadsheet, FileText, Trash2, Pencil, Check, X, Loader2, Plus } from 'lucide-react';
import type { Transaction } from '../types';

interface ParsedTx {
  key: string;
  title: string;
  amount: number;
  date: string;
  type: 'INCOME' | 'EXPENSE' | 'CREDIT_CARD';
  status: 'PAID' | 'PENDING';
  categoryId: string;
}

let idCounter = 0;
function nextKey() { return `import_${++idCounter}_${Date.now()}`; }

export default function ImportView() {
  const { addTransaction, activeContext, categories } = useFinance();
  const [parsedTxs, setParsedTxs] = useState<ParsedTx[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [importing, setImporting] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<ParsedTx>>({});
  const [inputText, setInputText] = useState('');
  const [fileName, setFileName] = useState('');

  // File upload
  function handleFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setFileName(file.name);
    const reader = new FileReader();

    if (file.name.endsWith('.csv')) {
      reader.onload = (ev) => parseText(ev.target?.result as string);
      reader.readAsText(file);
    } else {
      setError('Importação por arquivo aceita CSV. Para Excel, copie e cole os dados como texto.');
    }
    e.target.value = '';
  }

  // Text input
  function handleTextSubmit() {
    if (!inputText.trim()) return;
    setFileName('texto digitado');
    parseText(inputText);
  }

  async function parseText(raw: string) {
    setLoading(true);
    setError('');
    setParsedTxs([]);
    try {
      const txs = await aiParseTransactions(raw);
      if (!txs.length) {
        setError('Nenhuma transação encontrada no texto.');
        setLoading(false);
        return;
      }
      setParsedTxs(txs.map((t) => ({
        ...t,
        key: nextKey(),
        categoryId: '',
      })));
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Erro desconhecido';
      setError(msg);
    } finally {
      setLoading(false);
    }
  }

  // Edit
  function startEdit(tx: ParsedTx) {
    setEditingKey(tx.key);
    setEditForm({ ...tx });
  }
  function cancelEdit() { setEditingKey(null); setEditForm({}); }
  function saveEdit() {
    setParsedTxs((prev) => prev.map((t) => (t.key === editingKey ? { ...t, ...editForm } as ParsedTx : t)));
    cancelEdit();
  }
  function deleteTx(key: string) {
    setParsedTxs((prev) => prev.filter((t) => t.key !== key));
  }
  function addEmpty() {
    setParsedTxs((prev) => [{
      key: nextKey(),
      title: '',
      amount: 0,
      date: new Date().toISOString().slice(0, 10),
      type: 'EXPENSE',
      status: 'PENDING',
      categoryId: '',
    }, ...prev]);
  }

  // Bulk import
  async function handleImport() {
    if (!parsedTxs.length) return;
    setImporting(true);
    setImportedCount(0);
    for (const tx of parsedTxs) {
      try {
        const base: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'> = {
          title: tx.title,
          amount: tx.amount,
          date: tx.date,
          type: tx.type,
          status: tx.status,
          context: activeContext,
          tagIds: [],
        };
        if (tx.categoryId) base.categoryId = tx.categoryId;
        await addTransaction(base);
        setImportedCount((c) => c + 1);
      } catch {
        // continue
      }
    }
    setImporting(false);
    setParsedTxs([]);
    setFileName('');
    setInputText('');
  }

  const validTxs = parsedTxs.filter((t) => t.title && t.amount > 0);

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-bold text-slate-800">Importar Dados</h2>
        <p className="text-sm text-slate-500">Envie um arquivo (Excel, CSV) ou cole texto para extrair as transações.</p>
        <p className="text-xs text-slate-400 mt-0.5">Revise os dados antes de importar.</p>
      </div>

      {/* Input section */}
      {parsedTxs.length === 0 && !loading && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* File upload */}
          <div className="clay border-2 border-dashed border-slate-300 p-8 text-center hover:border-blue-400 transition-colors cursor-pointer">
            <label className="cursor-pointer flex flex-col items-center gap-3">
              <FileSpreadsheet className="w-10 h-10 text-slate-400" />
              <div>
                <p className="font-semibold text-slate-700">Clique para enviar</p>
                <p className="text-sm text-slate-400 mt-1">CSV</p>
              </div>
              <input type="file" accept=".csv" onChange={handleFile} className="hidden" />
            </label>
          </div>

          {/* Text paste */}
          <div className="clay p-5 flex flex-col gap-3">
            <div className="flex items-center gap-2 text-slate-600">
              <FileText className="w-5 h-5" />
              <span className="font-semibold text-sm">Ou cole os dados</span>
            </div>
            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Cole aqui extrato bancário, lista de transações, ou descreva as entradas/saídas..."
              className="flex-1 min-h-[120px] border border-slate-200 rounded-lg p-3 text-sm resize-none outline-none focus:ring-2 focus:ring-blue-400"
            />
            <button
              onClick={handleTextSubmit}
              disabled={!inputText.trim()}
              className="self-end px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 cursor-pointer flex items-center gap-2 text-sm font-medium"
            >
              Processar dados
            </button>
          </div>
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="clay p-12 text-center space-y-3">
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mx-auto" />
          <p className="text-slate-600 font-medium">Analisando os dados...</p>
          <p className="text-sm text-slate-400">{fileName}</p>
        </div>
      )}

      {/* Error */}
      {error && !loading && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-red-700 text-sm flex items-start gap-3">
          <X className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-medium">Erro ao processar</p>
            <p className="text-red-600 mt-1">{error}</p>
            <button onClick={() => setError('')} className="mt-2 text-red-600 underline cursor-pointer">Tentar novamente</button>
          </div>
        </div>
      )}

      {/* Import progress */}
      {importing && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-blue-700 text-sm flex items-center gap-3">
          <Loader2 className="w-5 h-5 animate-spin flex-shrink-0" />
          <span>Importando... {importedCount}/{parsedTxs.length}</span>
        </div>
      )}

      {/* Success */}
      {importedCount > 0 && !importing && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-emerald-700 text-sm">
          {importedCount} transações importadas com sucesso!
        </div>
      )}

      {/* Editable table */}
      {parsedTxs.length > 0 && !importing && (
        <>
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">{parsedTxs.length} transações encontradas</span>
            <div className="flex gap-2">
              <button
                onClick={addEmpty}
                className="px-3 py-1.5 text-xs font-medium border border-slate-200 rounded-lg hover:bg-slate-50 cursor-pointer flex items-center gap-1"
              >
                <Plus className="w-3 h-3" /> Adicionar
              </button>
              <button
                onClick={() => { setParsedTxs([]); setFileName(''); setInputText(''); }}
                className="px-3 py-1.5 text-xs font-medium border border-red-200 text-red-600 rounded-lg hover:bg-red-50 cursor-pointer"
              >
                Descartar
              </button>
              <button
                onClick={handleImport}
                disabled={validTxs.length === 0}
                className="px-4 py-1.5 text-xs font-semibold bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 cursor-pointer"
              >
                <Upload className="w-3 h-3 inline mr-1" />
                Importar {validTxs.length}
              </button>
            </div>
          </div>

          <div className="clay overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50">
                <tr>
                  <th className="text-left py-2 px-3 font-semibold text-slate-600 text-xs">Título</th>
                  <th className="text-right py-2 px-3 font-semibold text-slate-600 text-xs w-24">Valor</th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-600 text-xs w-28">Data</th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-600 text-xs w-24">Tipo</th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-600 text-xs w-24">Status</th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-600 text-xs w-32">Categoria</th>
                  <th className="text-center py-2 px-3 font-semibold text-slate-600 text-xs w-16"></th>
                </tr>
              </thead>
              <tbody>
                {parsedTxs.map((tx) => (
                  <tr key={tx.key} className="border-t border-slate-50 hover:bg-slate-50/50">
                    {editingKey === tx.key ? (
                      <>
                        <td className="py-1.5 px-3">
                          <input value={editForm.title || ''} onChange={(e) => setEditForm((f) => ({ ...f, title: e.target.value }))} className="w-full border border-slate-300 rounded px-2 py-1 text-xs" />
                        </td>
                        <td className="py-1.5 px-3">
                          <input type="number" value={editForm.amount || 0} onChange={(e) => setEditForm((f) => ({ ...f, amount: parseFloat(e.target.value) || 0 }))} className="w-24 border border-slate-300 rounded px-2 py-1 text-xs text-right" />
                        </td>
                        <td className="py-1.5 px-3">
                          <input type="date" value={editForm.date || ''} onChange={(e) => setEditForm((f) => ({ ...f, date: e.target.value }))} className="w-28 border border-slate-300 rounded px-2 py-1 text-xs" />
                        </td>
                        <td className="py-1.5 px-3">
                          <select value={editForm.type || 'EXPENSE'} onChange={(e) => setEditForm((f) => ({ ...f, type: e.target.value as ParsedTx['type'] }))} className="border border-slate-300 rounded px-2 py-1 text-xs cursor-pointer">
                            <option value="INCOME">Entrada</option>
                            <option value="EXPENSE">Despesa</option>
                            <option value="CREDIT_CARD">Cartão</option>
                          </select>
                        </td>
                        <td className="py-1.5 px-3">
                          <select value={editForm.status || 'PENDING'} onChange={(e) => setEditForm((f) => ({ ...f, status: e.target.value as ParsedTx['status'] }))} className="border border-slate-300 rounded px-2 py-1 text-xs cursor-pointer">
                            <option value="PAID">Pago</option>
                            <option value="PENDING">Pendente</option>
                          </select>
                        </td>
                        <td className="py-1.5 px-3">
                          <select value={editForm.categoryId || ''} onChange={(e) => setEditForm((f) => ({ ...f, categoryId: e.target.value }))} className="border border-slate-300 rounded px-2 py-1 text-xs w-28 cursor-pointer">
                            <option value="">--</option>
                            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                          </select>
                        </td>
                        <td className="py-1.5 px-3">
                          <div className="flex gap-1">
                            <button onClick={saveEdit} className="text-emerald-600 hover:text-emerald-700 cursor-pointer"><Check className="w-4 h-4" /></button>
                            <button onClick={cancelEdit} className="text-red-500 hover:text-red-600 cursor-pointer"><X className="w-4 h-4" /></button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-1.5 px-3 font-medium text-slate-700 truncate max-w-[180px]">{tx.title}</td>
                        <td className="py-1.5 px-3 text-right font-mono text-xs">{formatCurrency(tx.amount)}</td>
                        <td className="py-1.5 px-3 text-center text-xs text-slate-500">{tx.date}</td>
                        <td className="py-1.5 px-3 text-center">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            tx.type === 'INCOME' ? 'bg-emerald-50 text-emerald-700' :
                            tx.type === 'CREDIT_CARD' ? 'bg-blue-50 text-blue-700' :
                            'bg-rose-50 text-rose-700'
                          }`}>
                            {tx.type === 'INCOME' ? 'Entrada' : tx.type === 'CREDIT_CARD' ? 'Cartão' : 'Despesa'}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-center">
                          <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${
                            tx.status === 'PAID' ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
                          }`}>
                            {tx.status === 'PAID' ? 'Pago' : 'Pendente'}
                          </span>
                        </td>
                        <td className="py-1.5 px-3 text-center text-xs text-slate-400">
                          {categories.find((c) => c.id === tx.categoryId)?.name || '--'}
                        </td>
                        <td className="py-1.5 px-3 text-center">
                          <div className="flex gap-1 justify-center">
                            <button onClick={() => startEdit(tx)} className="text-slate-400 hover:text-blue-600 cursor-pointer"><Pencil className="w-3.5 h-3.5" /></button>
                            <button onClick={() => deleteTx(tx.key)} className="text-slate-400 hover:text-red-500 cursor-pointer"><Trash2 className="w-3.5 h-3.5" /></button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
