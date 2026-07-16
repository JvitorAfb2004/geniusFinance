import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { Bug, Lightbulb, AlertTriangle, Send, Check } from 'lucide-react';
import type { ModuleName } from '../types';

const MODULES: { id: ModuleName | ''; label: string }[] = [
  { id: '', label: 'Não específico' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'transactions', label: 'Transações' },
  { id: 'fixed_monthly', label: 'Fixos Mensais' },
  { id: 'credit_cards', label: 'Cartões' },
  { id: 'dre', label: 'DRE' },
  { id: 'budget', label: 'Orçamento' },
  { id: 'sales', label: 'Vendas' },
  { id: 'goals', label: 'Metas' },
  { id: 'reports', label: 'Relatórios' },
  { id: 'leads', label: 'Leads' },
  { id: 'projects', label: 'Projetos' },
  { id: 'service_types', label: 'Tipos de Serviço' },
];

interface MyReport {
  id: string;
  type: string;
  title: string;
  status: string;
  createdAt: string;
}

export function ReportIssueView() {
  const [type, setType] = useState<'bug' | 'suggestion' | 'abuse'>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState('medium');
  const [module, setModule] = useState<ModuleName | ''>('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [myReports, setMyReports] = useState<MyReport[]>([]);

  useEffect(() => {
    apiFetch('/api/reports').then(r => setMyReports(r.data || [])).catch(() => {});
  }, [submitted]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setError('');
    setSending(true);
    try {
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          type, title: title.trim(), description: description.trim(),
          severity: type === 'bug' ? severity : undefined,
          module: module || undefined,
        }),
      });
      setSubmitted(true);
    } catch (err: any) { setError(err.message); }
    finally { setSending(false); }
  };

  if (submitted) {
    return (
      <div className="w-full max-w-5xl flex flex-col items-center py-20 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
          <Check className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Report Enviado!</h2>
        <p className="text-sm text-gray-500 mt-2">Obrigado pela contribuição.</p>
        <button onClick={() => setSubmitted(false)}
          className="mt-6 text-sm font-medium text-primary hover:underline cursor-pointer">
          Enviar outro report
        </button>
      </div>
    );
  }

  const types = [
    { value: 'bug' as const, icon: Bug, label: 'Bug' },
    { value: 'suggestion' as const, icon: Lightbulb, label: 'Sugestão' },
    { value: 'abuse' as const, icon: AlertTriangle, label: 'Denúncia' },
  ];

  return (
    <div className="w-full max-w-5xl grid grid-cols-1 xl:grid-cols-[minmax(0,1.1fr)_minmax(320px,0.9fr)] gap-6 items-start">
      <form onSubmit={handleSubmit} className="clay p-6 flex flex-col gap-4">
        <h2 className="text-xl font-bold text-gray-900">Reportar Problema</h2>
        <p className="text-sm text-gray-500 -mt-2">Encontrou um bug? Tem uma sugestão? Conte pra gente.</p>

        <div className="flex gap-2 flex-wrap">
          {types.map(opt => (
            <button key={opt.value} type="button" onClick={() => setType(opt.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                type === opt.value ? 'bg-primary text-white border-primary' : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}>
              <opt.icon className="w-4 h-4" />{opt.label}
            </button>
          ))}
        </div>

        <input type="text" placeholder="Título do report" value={title}
          onChange={e => setTitle(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary" required />

        <textarea placeholder="Descreva o problema em detalhes..." value={description}
          onChange={e => setDescription(e.target.value)} rows={4}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-primary resize-y" required />

        <div className="flex gap-3">
          <select value={module} onChange={e => setModule(e.target.value as ModuleName | '')}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none cursor-pointer">
            {MODULES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>
          {type === 'bug' && (
            <select value={severity} onChange={e => setSeverity(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none cursor-pointer">
              <option value="low">Baixa</option><option value="medium">Média</option>
              <option value="high">Alta</option><option value="critical">Crítica</option>
            </select>
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" disabled={sending || !title.trim() || !description.trim()}
          className="flex items-center justify-center gap-2 bg-primary text-white py-2.5 rounded-lg text-sm font-medium hover:bg-primary-hover disabled:opacity-50 cursor-pointer">
          <Send className="w-4 h-4" />{sending ? 'Enviando...' : 'Enviar Report'}
        </button>
      </form>

      {myReports.length > 0 && (
        <div className="clay p-6">
          <h3 className="font-bold text-gray-900 mb-3">Seus Reports Anteriores</h3>
          <div className="flex flex-col gap-2">
            {myReports.map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 border-t border-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-700">{r.title}</p>
                  <p className="text-xs text-gray-400">{r.type} — {new Date(r.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                  r.status === 'open' ? 'bg-amber-100 text-amber-700' :
                  r.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                  r.status === 'resolved' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                }`}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
