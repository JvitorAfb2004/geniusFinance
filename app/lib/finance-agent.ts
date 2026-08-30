import { createHmac, randomUUID, timingSafeEqual } from "node:crypto";
import type {
  AgentProposal,
  ProposalInput,
  ValidatedAgentScope,
} from "./finance-agent-types";

const PROPOSAL_TTL_MS = 10 * 60 * 1000;

export function buildScopedReadContext(entries: Array<{ label: string; data: unknown }>) {
  return entries.map(({ label, data }) => `## ${label}\n${JSON.stringify(data, null, 2)}`).join("\n\n");
}


function agentSecret() {
  return process.env.AI_AGENT_SECRET || "development-only-agent-secret";
}

function scopeFingerprint(scope: ValidatedAgentScope) {
  return JSON.stringify({
    type: scope.type,
    userId: scope.userId,
    accountId: scope.accountId || null,
  });
}

function signatureFor(proposal: Omit<AgentProposal, "signature">) {
  return createHmac("sha256", agentSecret())
    .update(JSON.stringify(proposal))
    .digest("hex");
}

export function validateAgentScope(request: Request, uid: string): ValidatedAgentScope {
  const raw = request.headers.get("X-Active-Scope");
  if (!raw) return { type: "PERSONAL", userId: uid };

  let scope: Partial<ValidatedAgentScope>;
  try {
    scope = JSON.parse(raw) as Partial<ValidatedAgentScope>;
  } catch {
    throw new Error("escopo invalido");
  }

  if (scope.type === "PERSONAL") {
    if (scope.userId !== uid) throw new Error("escopo pessoal invalido");
    return { type: "PERSONAL", userId: uid };
  }

  if (scope.type !== "ACCOUNT" || !scope.accountId) throw new Error("escopo invalido");
  return {
    type: "ACCOUNT",
    userId: uid,
    accountId: scope.accountId,
    accountName: scope.accountName,
    role: scope.role,
  };
}

export function createProposal(input: ProposalInput): AgentProposal {
  const unsigned = {
    ...input,
    id: randomUUID(),
    scopeFingerprint: scopeFingerprint(input.scope),
    expiresAt: Date.now() + PROPOSAL_TTL_MS,
  };
  return { ...unsigned, signature: signatureFor(unsigned) };
}

export function verifyProposal(
  proposal: AgentProposal,
  uid: string,
  scope: ValidatedAgentScope,
) {
  if (proposal.expiresAt <= Date.now()) throw new Error("proposta expirada");
  if (proposal.uid !== uid) throw new Error("usuario da proposta invalido");
  if (proposal.scopeFingerprint !== scopeFingerprint(scope)) {
    throw new Error("escopo da proposta invalido");
  }

  const { signature, ...unsigned } = proposal;
  const expected = signatureFor(unsigned);
  if (!timingSafeEqual(Buffer.from(signature), Buffer.from(expected))) {
    throw new Error("assinatura da proposta invalida");
  }
}
