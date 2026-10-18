import type { ContextType, Transaction } from "../types";

export function isRecurringTransaction(transaction: {
  groupId?: string;
  isFixed?: boolean;
}) {
  return Boolean(transaction.groupId && transaction.isFixed);
}

export function isInstallmentTransaction(transaction: {
  groupId?: string;
  isFixed?: boolean;
}) {
  return Boolean(transaction.groupId && !transaction.isFixed);
}

export type EffectiveStatus = 'PAID' | 'PARTIAL' | 'PENDING';

/**
 * Status calculado. Lançamentos com grupo (fixas/parcelas) SEM pagamentos usam
 * o status salvo; avulsos derivam dos pagamentos registrados (sum >= valor => PAID).
 * Grupo COM pagamentos (pagamento parcial em parcelada/recorrente) também deriva:
 * sum >= valor => PAID, sum parcial => PARTIAL.
 * Avulso sem pagamento algum mantém o status salvo — lança antigo marcado
 * como Pago continua Pago. (compatibilidade com lançamentos anteriores)
 * Ex.: getEffectiveStatus({ groupId: undefined, amount: 100, payments: [{ id: 'p', amount: 40, date: '2026-10-16' }], status: 'PENDING' }) => 'PARTIAL'
 */
export function getEffectiveStatus(transaction: {
  groupId?: string;
  isFixed?: boolean;
  amount: number;
  status: 'PAID' | 'PENDING';
  payments?: { amount: number }[];
}): EffectiveStatus {
  if (transaction.groupId && !(transaction.payments && transaction.payments.length > 0)) {
    return transaction.status;
  }
  const payments = transaction.payments || [];
  if (payments.length === 0) {
    return transaction.status;
  }
  const paid = payments.reduce((sum, p) => sum + p.amount, 0);
  if (paid >= transaction.amount && transaction.amount > 0) return 'PAID';
  if (paid > 0) return 'PARTIAL';
  return 'PENDING';
}

/** Soma paga de um lançamento avulso a partir dos pagamentos. */
export function getPaidAmount(transaction: { payments?: { amount: number }[] }) {
  return (transaction.payments || []).reduce((sum, p) => sum + p.amount, 0);
}

export function prepareMoveTransaction(
  transaction: Transaction,
  targetContext: ContextType,
  date: string,
) {
  const { id, userId, createdAt, updatedAt, groupId, installmentInfo, ...rest } = transaction;
  void id;
  void userId;
  void createdAt;
  void updatedAt;
  void groupId;
  void installmentInfo;
  return {
    ...rest,
    context: targetContext,
    date,
  };
}
