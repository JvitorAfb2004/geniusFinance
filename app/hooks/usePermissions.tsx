import { useMemo } from 'react';
import { useFinance } from './useFinance';
import type { ModuleName, ModuleAction, MemberPermissions } from '../types';

const MODULES: ModuleName[] = [
  'dashboard', 'transactions', 'fixed_monthly', 'credit_cards',
  'dre', 'budget', 'sales', 'goals', 'reports',
  'leads', 'projects', 'service_types',
];

const FULL_PERMISSIONS: MemberPermissions = Object.freeze(
  MODULES.reduce((acc, m) => ({
    ...acc,
    [m]: (m === 'dashboard' || m === 'dre' || m === 'reports' || m === 'fixed_monthly' || m === 'credit_cards'
      ? ['view']
      : ['view', 'create', 'edit', 'delete']) as ModuleAction[],
  }), {} as MemberPermissions)
);

const DEFAULT_MEMBER: MemberPermissions = Object.freeze(
  MODULES.reduce((acc, m) => ({
    ...acc,
    [m]: (['view'] as ModuleAction[]),
  }), {} as MemberPermissions)
);

export function usePermissions() {
  const { activeScope, accountMembers, user } = useFinance();

  const permissions = useMemo((): MemberPermissions => {
    if (activeScope.type !== 'ACCOUNT') return FULL_PERMISSIONS;

    const currentMember = accountMembers.find(m => m.uid === user?.uid);
    if (!currentMember) return DEFAULT_MEMBER;

    // Owner e admin têm acesso total
    if (currentMember.role === 'owner' || currentMember.role === 'admin') {
      return FULL_PERMISSIONS;
    }

    // Member: usa permissões salvas ou default
    return (currentMember.permissions as MemberPermissions) || DEFAULT_MEMBER;
  }, [activeScope, accountMembers, user]);

  const can = (module: ModuleName, action: ModuleAction): boolean => {
    const modulePerms = permissions[module];
    if (!modulePerms) return false;
    return modulePerms.includes(action);
  };

  return { permissions, can };
}
