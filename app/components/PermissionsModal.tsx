import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { ModuleName, ModuleAction, MemberPermissions } from '../types';

const MODULES: { id: ModuleName; label: string; actions: ModuleAction[] }[] = [
  { id: 'dashboard', label: 'Dashboard', actions: ['view'] },
  { id: 'transactions', label: 'Transações', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'fixed_monthly', label: 'Fixos Mensais', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'credit_cards', label: 'Cartões de Crédito', actions: ['view', 'create', 'edit', 'delete'] },
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm" onClick={onClose}>
      <div className="bg-white rounded-xl shadow-xl border border-[#e2e8f0] w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[#e2e8f0] sticky top-0 bg-white">
          <h3 className="font-bold text-gray-900">Permissões: {memberEmail}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase border-b border-gray-50">
                <th className="pb-2">Módulo</th>
                {(['view', 'create', 'edit', 'delete'] as ModuleAction[]).map(a => (
                  <th key={a} className="pb-2 text-center">{ACTION_LABELS[a]}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {MODULES.map(mod => (
                <tr key={mod.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="py-2 font-medium text-gray-700 text-xs">{mod.label}</td>
                  {(['view', 'create', 'edit', 'delete'] as ModuleAction[]).map(action => {
                    const available = mod.actions.includes(action);
                    const active = (perms[mod.id] || []).includes(action);
                    return (
                      <td key={action} className="py-2 text-center">
                        {available ? (
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => toggle(mod.id, action)}
                            className="w-4 h-4 rounded border-gray-300 text-[#3b82f6] focus:ring-[#3b82f6] cursor-pointer"
                          />
                        ) : (
                          <span className="text-gray-300 text-xs">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-[#e2e8f0] sticky bottom-0 bg-white">
          <button onClick={onClose}
            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 cursor-pointer">Cancelar</button>
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-[#2563eb] disabled:opacity-50 cursor-pointer transition-colors">
            {saving ? 'Salvando...' : 'Salvar Permissões'}
          </button>
        </div>
      </div>
    </div>
  );
}
