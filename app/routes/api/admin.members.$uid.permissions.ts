import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/api-helpers.server";
import { getAdminFirestore } from "~/services/firebase-admin.server";

export async function action({ request, params }: ActionFunctionArgs) {
  const u = await requireAuth(request);
  const memberUid = params.uid;
  if (!memberUid) return Response.json({ error: "uid obrigatorio" }, { status: 400 });

  const body = await request.json();
  const { accountId, permissions } = body;
  if (!accountId || !permissions) {
    return Response.json({ error: "accountId e permissions obrigatorios" }, { status: 400 });
  }

  const db = getAdminFirestore();
  const memberRef = db.collection("accounts").doc(accountId).collection("members").doc(memberUid);
  const memberDoc = await memberRef.get();
  if (!memberDoc.exists) {
    return Response.json({ error: "membro nao encontrado" }, { status: 404 });
  }

  const callerDoc = await db.collection("accounts").doc(accountId).collection("members").doc(u.uid).get();
  if (!callerDoc.exists || !["owner", "admin"].includes(callerDoc.data()!.role as string)) {
    return Response.json({ error: "sem permissao" }, { status: 403 });
  }

  await memberRef.update({ permissions, updatedAt: new Date().toISOString() });
  return Response.json({ success: true });
}
