import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/api-helpers.server";

export async function action({ request }: ActionFunctionArgs) {
  try {
    if (request.method !== "POST") return Response.json({ error: "método não permitido" }, { status: 405 });
    const user = await requireAuth(request);
    const body = await request.json() as { scope?: { type: string; userId?: string; accountId?: string; accountName?: string } };
    if (!body.scope?.type) return Response.json({ error: "escopo obrigatório" }, { status: 400 });

    if (body.scope.type === "PERSONAL") {
      return Response.json({ success: true, scope: { type: "PERSONAL", userId: user.uid } });
    }

    if (body.scope.type === "ACCOUNT" && body.scope.accountId) {
      return Response.json({
        success: true,
        scope: {
          type: "ACCOUNT",
          userId: user.uid,
          accountId: body.scope.accountId,
          accountName: body.scope.accountName || body.scope.accountId,
        },
      });
    }

    return Response.json({ error: "escopo inválido" }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "falha ao trocar escopo";
    return Response.json({ error: message }, { status: 500 });
  }
}
