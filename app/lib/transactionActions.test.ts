import { describe, expect, it } from "vitest";
import { isRecurringTransaction, prepareMoveTransaction } from "./transactionActions";
import type { Transaction } from "../types";

describe("isRecurringTransaction", () => {
  it("identifies a grouped fixed transaction for future deletion", () => {
    expect(isRecurringTransaction({ groupId: "monthly-1", isFixed: true })).toBe(true);
  });

  it("does not treat a standalone or non-fixed transaction as a recurrence", () => {
    expect(isRecurringTransaction({ groupId: undefined, isFixed: true })).toBe(false);
    expect(isRecurringTransaction({ groupId: "group-1", isFixed: false })).toBe(false);
  });
});

describe("prepareMoveTransaction", () => {
  const base: Transaction = {
    id: "tx-1",
    userId: "user-1",
    context: "PERSONAL",
    type: "EXPENSE",
    title: "Aluguel",
    amount: 1900,
    date: "2026-10-03",
    status: "PAID",
    categoryId: "cat-1",
    tagIds: ["tag-1"],
    isFixed: true,
    groupId: "group-1",
    installmentInfo: "1/12",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
  };

  it("switches context and date while detaching the occurrence from its recurrence group", () => {
    const moved = prepareMoveTransaction(base, "BUSINESS", "2026-11-05");

    expect(moved.context).toBe("BUSINESS");
    expect(moved.date).toBe("2026-11-05");
    expect("groupId" in moved).toBe(false);
    expect("installmentInfo" in moved).toBe(false);
    expect(moved.title).toBe("Aluguel");
    expect(moved.amount).toBe(1900);
    expect(moved.categoryId).toBe("cat-1");
    expect(moved).not.toHaveProperty("id");
  });
});
