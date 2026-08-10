import { useState } from 'react';
import { useNavigate } from 'react-router';
import { usePluggy } from '../hooks/usePluggy';
import { useFinance } from '../hooks/useFinance';
import { apiFetch } from '../lib/api';
import { Landmark, RefreshCw, Unplug, User, Building2 } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

declare global {
  interface Window { PluggyConnect?: any; }
}

function loadPluggyScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.PluggyConnect) return resolve();
    const s = document.createElement('script');
    s.src = 'https://connect.pluggy.ai/connect.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('falha ao carregar o widget do Pluggy'));
    document.head.appendChild(s);
  });
}

export function IntegrationsTab() {
  const { connection, pendingCount } = usePluggy();
  const { accounts } = useFinance();
  const navigate = useNavigate();

  const [scope, setScope] = useState<'PERSONAL' | string>('PERSONAL');
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const scopeLabel = connection
    ? connection.scopeType === 'PERSONAL' ? 'Pessoal' : accounts.find((a) => a.id === connection.scopeId)?.name || 'Empresa'
    : scope === 'PERSONAL' ? 'Pessoal' : accounts.find((a) => a.id === scope)?.name || 'Empresa';

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await apiFetch('/api/pluggy/connect-token');
      const token = res.data?.connectToken;
      if (!token) throw new Error('token nao obtido');
      await loadPluggyScript();
      const scopeType = scope === 'PERSONAL' ? 'PERSONAL' : 'ACCOUNT';
      const scopeId = scopeType === 'ACCOUNT' ? scope : null;
      const widget = new window.PluggyConnect({
        connectToken: token,
        onSuccess: async ({ itemId, connector }: { itemId: string; connector?: { id?: string; name?: string } }) => {
          try {
            await apiFetch('/api/pluggy/connect-record', {
              method: 'POST',
              body: JSON.stringify({
                pluggyItemId: itemId,
                pluggyConnectorId: connector?.id || '',
                institutionName: connector?.name || 'Banco',
                scopeType,
                scopeId,
              }),
            });
            alert('Banco conectado com sucesso!');
          } catch (e) {
            alert('Erro ao conectar: ' + String((e as Error)?.message || e));
          }
        },
        onClose: () => {},
        onError: (err: unknown) => alert('Erro ao conectar: ' + String((err as Error)?.message || err)),
      });
      widget.open();
    } catch (e) {
      alert(String((e as Error).message));
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    if (!connection) return;
    setSyncing(true);
    try {
      await apiFetch(`/api/pluggy/sync?connectionId=${connection.id}`, { method: 'POST' });
      alert('Sincronização disparada. As provisões aparecem em alguns minutos.');
    } catch (e) {
      alert(String((e as Error).message));
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;
    try {
      await apiFetch(`/api/pluggy/connect-record?connectionId=${connection.id}`, { method: 'DELETE' });
      setConfirmDisconnect(false);
    } catch (e) {
      alert(String((e as Error).message));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {connection ? (
        <div className="flex flex-col gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Landmark className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100">{connection.institutionName}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                {connection.scopeType === 'PERSONAL' ? <User className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                {scopeLabel}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">Conectado</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate('/provisoes')}
              className="px-3 py-2 rounded-md bg-primary text-white text-xs font-semibold cursor-pointer border-none hover:opacity-90">
              Ver provisões ({pendingCount} pendente{pendingCount === 1 ? '' : 's'})
            </button>
            <button onClick={handleSync} disabled={syncing}
              className="px-3 py-2 rounded-md bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700 hover:bg-slate-700 flex items-center gap-1.5 disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} /> Sincronizar agora
            </button>
            <button onClick={() => setConfirmDisconnect(true)}
              className="px-3 py-2 rounded-md bg-red-500/10 text-red-400 text-xs font-semibold cursor-pointer border border-red-500/30 hover:bg-red-500/20 flex items-center gap-1.5">
              <Unplug className="w-3.5 h-3.5" /> Desconectar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <p className="text-sm text-slate-300">
            Conecte seu banco para importar suas movimentações automaticamente. Elas chegam como <strong>provisões</strong> que você revisa e converte em transações.
          </p>
          <div className="flex flex-col gap-2 max-w-sm">
            <label className="text-xs font-semibold text-slate-400">A conexão será vinculada a:</label>
            <select value={scope} onChange={(e) => setScope(e.target.value)}
              className="px-2 py-2 rounded-md bg-slate-800 border border-slate-700 text-sm text-slate-200">
              <option value="PERSONAL">Pessoal</option>
              {accounts.filter((a) => a.status === 'ACTIVE').map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <button onClick={handleConnect} disabled={connecting}
              className="px-4 py-2.5 rounded-md bg-primary text-white text-sm font-semibold cursor-pointer border-none hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
              <Landmark className="w-4 h-4" /> {connecting ? 'Conectando...' : 'Conectar banco'}
            </button>
          </div>
        </div>
      )}

      {confirmDisconnect && connection && (
        <ConfirmModal
          title="Desconectar banco?"
          message={`A conexão com ${connection.institutionName} será removida. As provisões já convertidas em transações são mantidas.`}
          confirmLabel="Desconectar"
          variant="danger"
          onConfirm={handleDisconnect}
          onCancel={() => setConfirmDisconnect(false)}
        />
      )}
    </div>
  );
}
