import { describe, it, expect } from 'vitest';
import { resolveDataPath, type FinanceCollectionName } from './pathAdapter';
import type { ActiveScope } from '../types';

describe('resolveDataPath', () => {
  const uid = 'user123';
  const accountId = 'acc456';

  const personalScope: ActiveScope = { type: 'PERSONAL', userId: uid };
  const accountScope: ActiveScope = { type: 'ACCOUNT', accountId, accountName: 'My Company', role: 'owner' };

  const collections: FinanceCollectionName[] = [
    'transactions',
    'categories',
    'budgets',
    'sales-targets',
    'tags',
    'goals',
    'leads',
    'lead-options',
    'service-types',
    'projects',
    'project-kanban-settings',
    'spending-limits',
  ];

  it('returns users/{uid}/{collection} for PERSONAL scope', () => {
    for (const col of collections) {
      const path = resolveDataPath(personalScope, uid, col);
      expect(path).toBe(`users/${uid}/${col}`);
    }
  });

  it('returns accounts/{accountId}/{collection} for ACCOUNT scope', () => {
    for (const col of collections) {
      const path = resolveDataPath(accountScope, uid, col);
      expect(path).toBe(`accounts/${accountId}/${col}`);
    }
  });

  it('ignores uid for ACCOUNT scope (uses accountId)', () => {
    const path = resolveDataPath(accountScope, 'different-uid', 'transactions');
    expect(path).toBe(`accounts/${accountId}/transactions`);
  });

  it('handles all collection names correctly', () => {
    expect(resolveDataPath(personalScope, uid, 'transactions')).toBe('users/user123/transactions');
    expect(resolveDataPath(personalScope, uid, 'categories')).toBe('users/user123/categories');
    expect(resolveDataPath(personalScope, uid, 'budgets')).toBe('users/user123/budgets');
    expect(resolveDataPath(personalScope, uid, 'sales-targets')).toBe('users/user123/sales-targets');
    expect(resolveDataPath(personalScope, uid, 'tags')).toBe('users/user123/tags');
    expect(resolveDataPath(personalScope, uid, 'goals')).toBe('users/user123/goals');
    expect(resolveDataPath(personalScope, uid, 'leads')).toBe('users/user123/leads');
    expect(resolveDataPath(personalScope, uid, 'lead-options')).toBe('users/user123/lead-options');
    expect(resolveDataPath(personalScope, uid, 'service-types')).toBe('users/user123/service-types');
    expect(resolveDataPath(personalScope, uid, 'projects')).toBe('users/user123/projects');
    expect(resolveDataPath(personalScope, uid, 'project-kanban-settings')).toBe('users/user123/project-kanban-settings');
    expect(resolveDataPath(personalScope, uid, 'spending-limits')).toBe('users/user123/spending-limits');
  });
});