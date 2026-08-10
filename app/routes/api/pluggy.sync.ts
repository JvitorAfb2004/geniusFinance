import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/api-helpers.server";
import { getAdminFirestore } from "~/services/firebase-admin.server";
import { triggerItemSync } from "~/services/pluggy.server";

export async function action({ request }: ActionFunctionArgs) {
  const authUser = await requireAuth(request);
  const url = new URL(request.url);
  const connId = url.searchParams.get("connectionId") || "";
  if (!connId) return Response.json({ error: "connectionId obrigatorio" }, { status: 400 });
  const db = getAdminFirestore();
  const snap = await db.collection("pluggy_connections").doc(connId).get();
  const data = snap.data();
  if (!snap.exists || data?.userId !== authUser.uid || data?.status !== "ACTIVE") {
    return Response.json({ error: "conexao nao encontrada" }, { status: 404 });
  }
  try {
    await triggerItemSync(String(data.pluggyItemId || ""));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
  return Response.json({ success: true });
}
