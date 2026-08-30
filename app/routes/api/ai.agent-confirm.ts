import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/api-helpers.server";
import { canUseAction, executeFinanceProposal, resolveFinanceScope } from "~/services/finance-agent.server";
import { verifyProposal } from "~/lib/finance-agent";
import type { AgentProposal } from "~/lib/finance-agent-types";

const consumed = new Set<string>();

export async function action({ request }: ActionFunctionArgs) {
  try {
    if (request.method !== "POST") return Response.json({ error: "método não permitido" }, { status: 405 });
    const user = await requireAuth(request);
    const body = await request.json() as { proposal?: AgentProposal };
    if (!body.proposal?.id) return Response.json({ error: "proposta obrigatória" }, { status: 400 });
    const context = await resolveFinanceScope(request, user.uid);
    verifyProposal(body.proposal, user.uid, context.scope);
    if (consumed.has(body.proposal.id)) return Response.json({ error: "proposta já utilizada" }, { status: 409 });
    const operation = body.proposal.action.startsWith("create_") ? "create" : body.proposal.action.startsWith("delete_") ? "delete" : "edit";
    if (!canUseAction(context.scope, body.proposal.action, operation)) return Response.json({ error: "sem permissão para esta operação" }, { status: 403 });
    consumed.add(body.proposal.id);
    return Response.json({ success: true, result: await executeFinanceProposal(body.proposal, context) });
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : "falha interna ao confirmar";
    const status = /proposta|assinatura|expirada|escopo/i.test(message) ? 409 : /autentic|token/i.test(message) ? 401 : 500;
    return Response.json({ error: message }, { status });
  }
}
