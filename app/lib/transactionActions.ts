import type { ContextType, Transaction } from "../types";

export function isRecurringTransaction(transaction: {
  groupId?: string;
  isFixed?: boolean;
}) {
  return Boolean(transaction.groupId && transaction.isFixed);
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
