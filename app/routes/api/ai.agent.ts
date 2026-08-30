import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/api-helpers.server";
import { runFinanceAgent, resolveFinanceScope } from "~/services/finance-agent.server";
import type { AgentMessage } from "~/lib/finance-agent-types";

export async function action({ request }: ActionFunctionArgs) {
  try {
    if (request.method !== "POST") return Response.json({ error: "método não permitido" }, { status: 405 });
    const user = await requireAuth(request);
    const body = await request.json() as { messages?: AgentMessage[] };
    if (!Array.isArray(body.messages) || body.messages.length === 0) return Response.json({ error: "mensagens obrigatórias" }, { status: 400 });
    const messages = body.messages.filter((message) => message?.role === "user" || message?.role === "assistant");
    if (messages.length === 0 || JSON.stringify(messages).length > 12_000) return Response.json({ error: "mensagem muito longa" }, { status: 400 });
    const context = await resolveFinanceScope(request, user.uid);
    return Response.json(await runFinanceAgent(messages, context));
  } catch (error) {
    if (error instanceof Response) return error;
    const message = error instanceof Error ? error.message : "falha interna do agente";
    const status = /autentic|token|usuário não pertence|escopo/i.test(message) ? 401 : /limite/i.test(message) ? 429 : /DeepSeek|IA/i.test(message) ? 502 : 500;
    return Response.json({ error: message }, { status });
  }
}
