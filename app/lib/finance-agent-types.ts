export type AgentRole = "user" | "assistant" | "tool";

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
