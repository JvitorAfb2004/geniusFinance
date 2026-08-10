import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/api-helpers.server";
import { getAdminFirestore } from "~/services/firebase-admin.server";
import { deleteItem } from "~/services/pluggy.server";
import { getActiveConnectionByUser, upsertConnection, markConnectionDeleted } from "~/services/pluggy-store.server";

export async function action({ request }: ActionFunctionArgs) {
  const authUser = await requireAuth(request);
  const method = request.method.toUpperCase();

  if (method === "DELETE") {
    const url = new URL(request.url);
    const connId = url.searchParams.get("connectionId") || "";
    if (!connId) return Response.json({ error: "connectionId obrigatorio" }, { status: 400 });
    const db = getAdminFirestore();
    const snap = await db.collection("pluggy_connections").doc(connId).get();
    const data = snap.data();
    if (!snap.exists || !data || data.userId !== authUser.uid) {
      return Response.json({ error: "conexao nao encontrada" }, { status: 404 });
    }
    const itemId = String(data.pluggyItemId || "");
    if (itemId) {
      try { await deleteItem(itemId); } catch (e) { console.error("[pluggy/delete]", (e as Error).message); }
    }
    await markConnectionDeleted(connId);
    return Response.json({ success: true });
  }

  const body = await request.json().catch(() => ({}));
  const pluggyItemId = String(body.pluggyItemId || "").trim();
  const pluggyConnectorId = String(body.pluggyConnectorId || "").trim();
  const institutionName = String(body.institutionName || "Banco").trim();
  const scopeType = body.scopeType === "ACCOUNT" ? "ACCOUNT" : "PERSONAL";
  const scopeId = scopeType === "ACCOUNT" ? String(body.scopeId || "") : null;

  if (!pluggyItemId) return Response.json({ error: "pluggyItemId obrigatorio" }, { status: 400 });
  if (scopeType === "ACCOUNT" && !scopeId) return Response.json({ error: "scopeId obrigatorio" }, { status: 400 });

  if (scopeType === "ACCOUNT") {
    const db = getAdminFirestore();
    const member = await db.collection("accounts").doc(scopeId as string).collection("members").doc(authUser.uid).get();
    if (!member.exists) return Response.json({ error: "voce nao e membro dessa conta" }, { status: 403 });
  }

  const existing = await getActiveConnectionByUser(authUser.uid);
  if (existing) return Response.json({ error: "ja existe uma conexao ativa. Desconecte antes de conectar outro banco." }, { status: 409 });

  const now = new Date().toISOString();
  const connectionId = await upsertConnection({
    userId: authUser.uid,
    scopeType,
    scopeId,
    pluggyItemId,
    pluggyConnectorId,
    institutionName,
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  });
  return Response.json({ success: true, data: { connectionId } });
}
