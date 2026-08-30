import { describe, expect, it } from "vitest";
import { getConfirmationEntries, type ValidatedAgentScope } from "./finance-agent-types";
import { buildScopedReadContext, createProposal, validateAgentScope, verifyProposal } from "./finance-agent";

const personalScope: ValidatedAgentScope = { type: "PERSONAL", userId: "uid-1" };
const accountScope: ValidatedAgentScope = {
  type: "ACCOUNT",
  userId: "uid-1",
  accountId: "account-1",
  accountName: "Empresa",
  role: "owner",
};

function requestWithScope(scope: unknown) {
  return new Request("https://app.test/api/ai/agent", {
    headers: { "X-Active-Scope": JSON.stringify(scope) },
  });
}

describe("finance agent security primitives", () => {
  it("labels every account separately in the read context", () => {
    const context = buildScopedReadContext([
      { label: "Pessoal", data: { income: 100 } },
      { label: "Empresa Alpha", data: { income: 900 } },
    ]);

    expect(context).toContain("## Pessoal");
    expect(context).toContain("## Empresa Alpha");
    expect(context.indexOf("Pessoal")).toBeLessThan(context.indexOf("Empresa Alpha"));
  });

  it("omits technical ids from confirmation details", () => {
    expect(getConfirmationEntries({ id: "tx-1", userId: "uid-1", amount: 80, date: "2026-08-31" }))
      .toEqual([["amount", 80], ["date", "2026-08-31"]]);
  });

  it("rejects a personal scope belonging to another uid", () => {
    expect(() => validateAgentScope(requestWithScope({ type: "PERSONAL", userId: "other" }), "uid-1"))
      .toThrow("escopo pessoal invalido");
  });

  it("creates and verifies a signed proposal for the same user and scope", () => {
    const proposal = createProposal({
      uid: "uid-1",
      scope: personalScope,
      action: "create_transaction",
      arguments: { title: "Internet", amount: 120 },
      preview: { label: "Criar transação" },
    });

    expect(proposal.expiresAt).toBeGreaterThan(Date.now());
    expect(proposal.signature).toBeTruthy();
    expect(() => verifyProposal(proposal, "uid-1", personalScope)).not.toThrow();
  });

  it("rejects altered, expired, or cross-scope proposals", () => {
    const proposal = createProposal({
      uid: "uid-1",
      scope: accountScope,
      action: "delete_transaction",
      arguments: { id: "tx-1" },
      preview: { label: "Excluir transação" },
    });

    expect(() => verifyProposal({ ...proposal, arguments: { id: "tx-2" } }, "uid-1", accountScope)).toThrow();
    expect(() => verifyProposal({ ...proposal, expiresAt: 0 }, "uid-1", accountScope)).toThrow("proposta expirada");
    expect(() => verifyProposal(proposal, "uid-1", personalScope)).toThrow("escopo da proposta invalido");
  });
});
