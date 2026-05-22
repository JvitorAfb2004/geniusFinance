import type { ActiveScope } from '../types';

export type FinanceCollectionName =
  | 'transactions'
  | 'categories'
  | 'budgets'
  | 'sales-targets'
  | 'tags'
  | 'goals'
  | 'leads'
  | 'lead-options'
  | 'service-types'
  | 'projects'
  | 'project-kanban-settings'
  | 'spending-limits';

export function resolveDataPath(
  scope: ActiveScope,
  uid: string,
  collection: FinanceCollectionName
) {
  if (scope.type === 'ACCOUNT') {
    return `accounts/${scope.accountId}/${collection}`;
  }
  return `users/${uid}/${collection}`;
}
