import type { LoaderFunctionArgs, ActionFunctionArgs } from "react-router";
import { requireAuth, isSuperadmin } from "~/lib/api-helpers.server";
import { getSubscriptionByEmail, getAllSubscriptions, setSubscriptionByEmail } from "~/services/subscription-store.server";
import { getAdminFirestore } from "~/services/firebase-admin.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const u = await requireAuth(request);
  if (!isSuperadmin(u)) {
    return Response.json({ error: "restrito" }, { status: 403 });
  }
  const subs = await getAllSubscriptions();
  return Response.json({ success: true, data: subs });
}

export async function action({ request }: ActionFunctionArgs) {
  const u = await requireAuth(request);
  if (!isSuperadmin(u)) {
    return Response.json({ error: "restrito" }, { status: 403 });
  }
  const body = await request.json();

  if (request.method === "POST" && body.action === "assign") {
    const targetEmail = String(body.targetEmail || "").trim().toLowerCase();
    const planId = String(body.planId || "").trim();
    if (!targetEmail || !planId) {
      return Response.json({ error: "targetEmail e planId obrigatorios" }, { status: 400 });
    }
    const db = getAdminFirestore();
    const planDoc = await db.collection("plans").doc(planId).get();
    if (!planDoc.exists) {
      return Response.json({ error: "plano nao encontrado" }, { status: 404 });
    }
    const plan = planDoc.data()!;
    let periodEnd: string;
    if (body.indefinite) {
      periodEnd = new Date(Date.now() + 100 * 365 * 86400000).toISOString();
    } else if (body.endDate) {
      periodEnd = new Date(body.endDate).toISOString();
    } else if (body.durationMonths > 0) {
      periodEnd = new Date(Date.now() + body.durationMonths * 30 * 86400000).toISOString();
    } else {
      periodEnd = new Date(Date.now() + 30 * 86400000).toISOString();
    }
    const now = new Date().toISOString();
    await setSubscriptionByEmail(targetEmail, {
      status: "active",
      paymentMethod: null,
      items: [{ planId, quantity: 1, unitPrice: plan.basePrice }],
      totalAmount: plan.basePrice,
      currentPeriodStart: now,
      currentPeriodEnd: periodEnd,
      updatedAt: now,
    });
    return Response.json({ success: true });
  }

  if (request.method === "POST" && body.action === "revoke") {
    const targetEmail = String(body.targetEmail || "").trim().toLowerCase();
    const sub = await getSubscriptionByEmail(targetEmail);
    if (!sub) {
      return Response.json({ error: "assinatura nao encontrada" }, { status: 404 });
    }
    await setSubscriptionByEmail(targetEmail, {
      ...sub,
      status: "cancelled",
      canceledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return Response.json({ success: true });
  }

  return Response.json({ error: "acao invalida" }, { status: 400 });
}
