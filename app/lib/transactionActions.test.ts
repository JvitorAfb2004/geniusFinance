import { describe, expect, it } from "vitest";
import {
  getEffectiveStatus,
  getPaidAmount,
  isInstallmentTransaction,
  isRecurringTransaction,
  prepareMoveTransaction,
} from "./transactionActions";
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

describe("isInstallmentTransaction", () => {
  it("identifies grouped non-fixed transactions as installments", () => {
    expect(isInstallmentTransaction({ groupId: "group-1", isFixed: false })).toBe(true);
    expect(isInstallmentTransaction({ groupId: "group-1" })).toBe(true);
  });

  it("does not treat standalone or fixed transactions as installments", () => {
    expect(isInstallmentTransaction({ groupId: undefined, isFixed: false })).toBe(false);
    expect(isInstallmentTransaction({ groupId: "group-1", isFixed: true })).toBe(false);
  });
});

describe("getEffectiveStatus", () => {
  it("returns stored status for grouped transactions (fixed/installments)", () => {
    expect(getEffectiveStatus({ groupId: "g", amount: 100, status: "PAID" })).toBe("PAID");
    expect(getEffectiveStatus({ groupId: "g", amount: 100, status: "PENDING" })).toBe("PENDING");
  });

  it("grouped transactions with partial payments derive PARTIAL/PAID instead of stored status", () => {
    expect(
      getEffectiveStatus({ groupId: "g", amount: 463, status: "PENDING", payments: [{ amount: 200 }] })
    ).toBe("PARTIAL");
    expect(
      getEffectiveStatus({ groupId: "g", amount: 463, status: "PENDING", payments: [{ amount: 463 }] })
    ).toBe("PAID");
    expect(
      getEffectiveStatus({ groupId: "g", amount: 100, status: "PAID", payments: [{ amount: 30 }] })
    ).toBe("PARTIAL");
  });

  it("derives PAID when payments cover the amount", () => {
    expect(
      getEffectiveStatus({
        amount: 100,
        status: "PENDING",
        payments: [{ amount: 60 }, { amount: 40 }],
      })
    ).toBe("PAID");
  });

  it("derives PARTIAL when payments are less than the amount", () => {
    expect(
      getEffectiveStatus({ amount: 100, status: "PENDING", payments: [{ amount: 40 }] })
    ).toBe("PARTIAL");
  });

  it("derives PENDING when there are no payments and stored status is PENDING", () => {
    expect(getEffectiveStatus({ amount: 100, status: "PENDING" })).toBe("PENDING");
    expect(getEffectiveStatus({ amount: 100, status: "PENDING", payments: [] })).toBe("PENDING");
  });

  it("keeps stored PAID for legacy avulso without payments (backward compatible)", () => {
    expect(getEffectiveStatus({ amount: 100, status: "PAID" })).toBe("PAID");
  });
});

describe("getPaidAmount", () => {
  it("sums payment amounts", () => {
    expect(getPaidAmount({ payments: [{ amount: 30 }, { amount: 12 }] })).toBe(42);
    expect(getPaidAmount({})).toBe(0);
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
