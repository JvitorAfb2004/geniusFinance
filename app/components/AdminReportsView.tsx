import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';

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

  const load = async () => {
    try {
      const r = await apiFetch('/api/admin/reports');
      setReports(r.data || []);
    } catch {} finally { setLoading(false); }
  };
  useEffect(() => { load(); }, []);

  const handleUpdate = async () => {
    if (!selected) return;
    await apiFetch('/api/admin/reports', {
      method: 'PUT',
      body: JSON.stringify({ id: selected.id, status: newStatus, adminNotes }),
    });
    await load();
    setSelected(null);
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
    <div className="max-w-5xl mx-auto flex gap-6">
      <div className="flex-1 bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="p-4 border-b border-[#e2e8f0]">
          <h2 className="text-lg font-bold text-gray-900">Reports Recebidos</h2>
          <p className="text-xs text-gray-500">{reports.length} reports</p>
        </div>
        <div className="max-h-[60vh] overflow-y-auto">
          {reports.length === 0 ? (
            <p className="p-6 text-center text-gray-400 text-sm">Nenhum report recebido.</p>
          ) : reports.map(r => (
            <div key={r.id} onClick={() => handleSelect(r)}
              className={`px-4 py-3 border-t border-gray-50 cursor-pointer hover:bg-gray-50/50 transition-colors ${selected?.id === r.id ? 'bg-blue-50 border-l-2 border-l-[#3b82f6]' : ''}`}>
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-gray-900 truncate max-w-[300px]">{r.title}</p>
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
        <div className="w-80 shrink-0 bg-white rounded-xl border border-[#e2e8f0] p-4 flex flex-col gap-3 h-fit sticky top-4">
          <h3 className="font-bold text-gray-900">{selected.title}</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{selected.description}</p>
          <div className="text-xs text-gray-400 space-y-0.5">
            <p>Tipo: {selected.type}</p>
            <p>Módulo: {selected.module || 'N/A'}</p>
            <p>Severidade: {selected.severity || 'N/A'}</p>
            <p>Por: {selected.reporterEmail}</p>
            <p>Em: {new Date(selected.createdAt).toLocaleString('pt-BR')}</p>
          </div>

          <label className="text-xs font-medium text-gray-500">Status</label>
          <select value={newStatus} onChange={e => setNewStatus(e.target.value)}
            className="px-3 py-1.5 border border-gray-200 rounded text-sm outline-none cursor-pointer">
            <option value="open">Aberto</option>
            <option value="in_progress">Em Progresso</option>
            <option value="resolved">Resolvido</option>
            <option value="closed">Fechado</option>
          </select>

          <label className="text-xs font-medium text-gray-500">Notas internas</label>
          <textarea value={adminNotes} onChange={e => setAdminNotes(e.target.value)} rows={2}
            className="px-3 py-1.5 border border-gray-200 rounded text-sm outline-none resize-y" />

          <button onClick={handleUpdate}
            className="bg-[#3b82f6] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#2563eb] cursor-pointer transition-colors">
            Atualizar
          </button>
        </div>
      )}
    </div>
  );
}
