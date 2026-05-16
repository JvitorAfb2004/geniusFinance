import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { requireAuth, isSuperadmin } from "~/lib/api-helpers.server";
import { getAdminFirestore } from "~/services/firebase-admin.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const u = await requireAuth(request);
  if (!isSuperadmin(u)) {
    return Response.json({ error: "restrito" }, { status: 403 });
  }
  const db = getAdminFirestore();
  const snap = await db.collection("plans").orderBy("createdAt", "desc").get();
  return Response.json({ success: true, data: snap.docs.map((d) => ({ id: d.id, ...d.data() })) });
}

export async function action({ request }: ActionFunctionArgs) {
  const u = await requireAuth(request);
  if (!isSuperadmin(u)) {
    return Response.json({ error: "restrito" }, { status: 403 });
  }
  const body = await request.json();
  const db = getAdminFirestore();

  if (request.method === "POST") {
    const ref = await db.collection("plans").add({
      name: body.name,
      basePrice: Number(body.basePrice || 0),
      type: body.type || "PERSONAL",
      abacateProductId: body.abacateProductId || "",
      isPublic: body.isPublic !== false,
      assignedTo: body.assignedTo || null,
      createdBy: u.uid,
      createdAt: new Date().toISOString(),
    });
    return Response.json({ success: true, data: { id: ref.id } }, { status: 201 });
  }

  if (request.method === "PUT") {
    const planId = body.id;
    if (!planId) return Response.json({ error: "id obrigatorio" }, { status: 400 });
    const update: Record<string, unknown> = {};
    if (body.name !== undefined) update.name = body.name;
    if (body.basePrice !== undefined) update.basePrice = Number(body.basePrice);
    if (body.type !== undefined) update.type = body.type;
    if (body.abacateProductId !== undefined) update.abacateProductId = body.abacateProductId;
    if (body.isPublic !== undefined) update.isPublic = body.isPublic;
    if (body.assignedTo !== undefined) update.assignedTo = body.assignedTo;
    await db.collection("plans").doc(planId).update(update);
    return Response.json({ success: true });
  }

  if (request.method === "DELETE") {
    const planId = body.id;
    if (!planId) return Response.json({ error: "id obrigatorio" }, { status: 400 });
    await db.collection("plans").doc(planId).delete();
    return Response.json({ success: true });
  }

  return Response.json({ error: "metodo nao suportado" }, { status: 405 });
}
