import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { X } from 'lucide-react';

interface Report {
  id: string;
  type: string;
  title: string;
  description: string;
  severity?: string;
  module?: string;
  reporterEmail: string;
  status: string;
  adminNotes?: string;
  createdAt: string;
}

export function AdminReportsView() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Report | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState('open');
  const [saving, setSaving] = useState(false);

  const load = async () => {
    try {
      const r = await apiFetch('/api/admin/reports');
      setReports(r.data || []);
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleUpdate = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await apiFetch('/api/admin/reports', {
        method: 'PUT',
        body: JSON.stringify({ id: selected.id, status: newStatus, adminNotes }),
      });
      await load();
      setSelected(null);
    } catch {} finally {
      setSaving(false);
    }
  };

  const handleSelect = (r: Report) => {
    setSelected(r);
    setNewStatus(r.status);
    setAdminNotes(r.adminNotes || '');
  };

  const statusColors: Record<string, string> = {
    open: 'bg-amber-100 text-amber-700',
    in_progress: 'bg-blue-100 text-blue-700',
    resolved: 'bg-green-100 text-green-700',
    closed: 'bg-gray-100 text-gray-500',
  };

  if (loading) return <div className="p-6 text-center text-text-secondary">Carregando reports...</div>;

  return (
    <div className="max-w-5xl mx-auto">
      <div className="clay overflow-hidden">
        <div className="p-4 border-b border-[#e2e8f0]">
          <h2 className="text-lg font-bold text-gray-900">Reports Recebidos</h2>
          <p className="text-xs text-gray-500">{reports.length} reports</p>
        </div>
        <div className="max-h-[70vh] overflow-y-auto">
          {reports.length === 0 ? (
            <p className="p-6 text-center text-gray-400 text-sm">Nenhum report recebido.</p>
          ) : reports.map(r => (
            <div key={r.id} onClick={() => handleSelect(r)}
              className="px-4 py-3 border-t border-gray-50 cursor-pointer hover:bg-gray-50/50 transition-colors">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 truncate max-w-[400px]">{r.title}</p>
                <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${statusColors[r.status] || 'bg-gray-100'}`}>
                  {r.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 mt-0.5">{r.type} — {r.reporterEmail} — {new Date(r.createdAt).toLocaleDateString('pt-BR')}</p>
            </div>
          ))}
        </div>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[10vh]">
          <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setSelected(null)} />
          <div className="relative clay shadow-xl w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-900">{selected.title}</h3>
              <button onClick={() => setSelected(null)} className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-4 space-y-4 flex-1">
              <p className="text-sm text-gray-600 whitespace-pre-wrap">{selected.description}</p>

              <div className="grid grid-cols-2 gap-3 text-xs text-gray-500">
                <div>
                  <span className="font-semibold text-text-secondary uppercase tracking-wider block mb-0.5">Tipo</span>
                  {selected.type}
                </div>
                <div>
                  <span className="font-semibold text-text-secondary uppercase tracking-wider block mb-0.5">Módulo</span>
                  {selected.module || 'N/A'}
                </div>
                <div>
                  <span className="font-semibold text-text-secondary uppercase tracking-wider block mb-0.5">Severidade</span>
                  {selected.severity || 'N/A'}
                </div>
                <div>
                  <span className="font-semibold text-text-secondary uppercase tracking-wider block mb-0.5">Reportado por</span>
                  {selected.reporterEmail}
                </div>
                <div className="col-span-2">
                  <span className="font-semibold text-text-secondary uppercase tracking-wider block mb-0.5">Data</span>
                  {new Date(selected.createdAt).toLocaleString('pt-BR')}
                </div>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Status</label>
                <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer bg-white">
                  <option value="open">Aberto</option>
                  <option value="in_progress">Em Progresso</option>
                  <option value="resolved">Resolvido</option>
                  <option value="closed">Fechado</option>
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider">Notas internas</label>
                <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={3}
                  className="w-full mt-1 px-3 py-2 border border-border rounded-lg text-sm outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary resize-y" />
              </div>
            </div>

            <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100">
              <button onClick={() => setSelected(null)}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">
                Cancelar
              </button>
              <button onClick={handleUpdate} disabled={saving}
                className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 cursor-pointer transition-colors">
                {saving ? 'Salvando...' : 'Atualizar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
