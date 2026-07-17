import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { ModuleName, ModuleAction, MemberPermissions } from '../types';

const MODULES: { id: ModuleName; label: string; actions: ModuleAction[] }[] = [
  { id: 'dashboard', label: 'Dashboard', actions: ['view'] },
  { id: 'transactions', label: 'Transações', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'fixed_monthly', label: 'Fixos Mensais', actions: ['view', 'create', 'edit', 'delete'] },

  { id: 'dre', label: 'DRE', actions: ['view'] },
  { id: 'budget', label: 'Orçamento', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'sales', label: 'Vendas', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'goals', label: 'Metas', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'reports', label: 'Relatórios Anuais', actions: ['view'] },
  { id: 'leads', label: 'Leads', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'projects', label: 'Projetos', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'service_types', label: 'Tipos de Serviço', actions: ['view', 'create', 'edit', 'delete'] },
];

const ACTION_LABELS: Record<ModuleAction, string> = {
  view: 'Ver',
  create: 'Criar',
  edit: 'Editar',
  delete: 'Deletar',
};

interface Props {
  memberEmail: string;
  currentPermissions: MemberPermissions;
  onSave: (permissions: MemberPermissions) => Promise<void>;
  onClose: () => void;
}

export function PermissionsModal({ memberEmail, currentPermissions, onSave, onClose }: Props) {
  const [perms, setPerms] = useState<MemberPermissions>(() => {
    const clone: MemberPermissions = {} as MemberPermissions;
    for (const m of MODULES) {
      clone[m.id] = [...(currentPermissions?.[m.id] || [])];
    }
    return clone;
  });
  const [saving, setSaving] = useState(false);

  const toggle = (module: ModuleName, action: ModuleAction) => {
    setPerms(prev => {
      const current = prev[module] || [];
      const next = current.includes(action)
        ? current.filter(a => a !== action)
        : [...current, action];
      return { ...prev, [module]: next };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await onSave(perms);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/35 backdrop-blur-sm" onClick={onClose}>
      <div className="clay shadow-xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-slate-100 sticky top-0 bg-white">
          <h3 className="font-bold text-slate-800 text-sm">Permissões: {memberEmail}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-[0.68rem] font-bold text-slate-500 uppercase tracking-wider border-b border-slate-100">
                <th className="pb-2 font-bold">Módulo</th>
                {(['view', 'create', 'edit', 'delete'] as ModuleAction[]).map(a => (
                  <th key={a} className="pb-2 text-center font-bold">{ACTION_LABELS[a]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map(mod => (
                <tr key={mod.id} className="border-t border-slate-50 hover:bg-slate-50/40">
                  <td className="py-2.5 font-semibold text-slate-600 text-xs">{mod.label}</td>
                  {(['view', 'create', 'edit', 'delete'] as ModuleAction[]).map(action => {
                    const available = mod.actions.includes(action);
                    const active = (perms[mod.id] || []).includes(action);
                    return (
                      <td key={action} className="py-2.5 text-center">
                        {available ? (
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => toggle(mod.id, action)}
                            className="w-4 h-4 rounded border-slate-200 text-slate-800 focus:ring-slate-900/5 focus:outline-none cursor-pointer"
                          />
                        ) : (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-slate-100 sticky bottom-0 bg-white">
          <button onClick={onClose}
            className="px-4 py-2 text-xs text-slate-500 hover:text-slate-800 font-bold transition-colors cursor-pointer">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold hover:bg-slate-800 disabled:opacity-50 cursor-pointer transition-all shadow-[0_1px_2px_rgba(0,0,0,0.05)]">
            {saving ? 'Salvando...' : 'Salvar Permissões'}
          </button>
        </div>
      </div>
    </div>
  );
}
