export type AgentRole = "system" | "user" | "assistant" | "tool";

export const confirmationActionLabels: Record<string, string> = {
  create_transaction: "Criar transação",
  update_transaction: "Atualizar transação",
  delete_transaction: "Excluir transação",
};

export const confirmationFieldLabels: Record<string, string> = {
  amount: "Valor",
  date: "Data",
  title: "Descrição",
  type: "Tipo",
  status: "Status",
  categoryName: "Categoria",
  year: "Ano",
  month: "Mês",
};

export function getConfirmationEntries(arguments_: Record<string, unknown>) {
  return Object.entries(arguments_).filter(([key]) => !/^(id|userId|categoryId|tagId|accountId)$/.test(key));
}

export interface AgentMessage {
  role: AgentRole;
  content: string;
  tool_call_id?: string;
  tool_calls?: unknown[];
}

export interface ValidatedAgentScope {
  type: "PERSONAL" | "ACCOUNT";
  userId: string;
  accountId?: string;
  accountName?: string;
  role?: "owner" | "admin" | "member";
  permissions?: Record<string, string[]>;
}

export interface ProposalInput {
  uid: string;
  scope: ValidatedAgentScope;
  action: string;
  arguments: Record<string, unknown>;
  preview: Record<string, unknown>;
}

export interface AgentProposal extends ProposalInput {
  id: string;
  scopeFingerprint: string;
  expiresAt: number;
  signature: string;
}

export interface AgentResponse {
  content: string;
  proposal?: AgentProposal;
}
