export type PluggyTransaction = {
  id: string;
  description?: string;
  amount: number;
  date: string;
  type: 'CREDIT' | 'DEBIT' | string;
  status?: 'PENDING' | 'POSTED' | string;
};

export interface ProvisionInput {
  pluggyTransactionId: string;
  pluggyItemId: string;
  pluggyAccountId: string;
  amount: number;
  date: string;
  description: string;
  type: 'INCOME' | 'EXPENSE';
  status: 'PENDING' | 'POSTED';
}

export function pluggyTypeToAppType(type: string): 'INCOME' | 'EXPENSE' {
  return type === 'CREDIT' ? 'INCOME' : 'EXPENSE';
}

export function pluggyStatusToAppStatus(status?: string): 'PENDING' | 'POSTED' {
  return status === 'PENDING' ? 'PENDING' : 'POSTED';
}

export function pluggyDateToLocalDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  // interpreta a data como local (America/Sao_Paulo, UTC-3) e retorna YYYY-MM-DD
  return new Date(d.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

export function pluggyTxToProvision(tx: PluggyTransaction, itemId: string, accountId: string): ProvisionInput {
  return {
    pluggyTransactionId: tx.id,
    pluggyItemId: itemId,
    pluggyAccountId: accountId,
    amount: Math.abs(tx.amount),
    date: pluggyDateToLocalDate(tx.date),
    description: tx.description || 'Movimentação bancária',
    type: pluggyTypeToAppType(tx.type),
    status: pluggyStatusToAppStatus(tx.status),
  };
}
