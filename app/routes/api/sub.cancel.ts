import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/api-helpers.server";
import { getSubscriptionByEmail, setSubscriptionByEmail } from "~/services/subscription-store.server";
import { cancelSubscription } from "~/services/abacate.server";

export async function action({ request }: ActionFunctionArgs) {
  const authUser = await requireAuth(request);
  const userEmail = authUser.email.trim().toLowerCase();
  const sub = await getSubscriptionByEmail(userEmail);

  if (!sub) {
    return Response.json({ error: "assinatura nao encontrada" }, { status: 404 });
  }

  if (sub.abacateSubscriptionId && sub.paymentMethod === "CARD") {
    try { await cancelSubscription(sub.abacateSubscriptionId as string); } catch (e) {
      console.error("[cancel] Erro:", (e as Error).message);
    }
  }

  await setSubscriptionByEmail(userEmail, {
    ...sub,
    status: "cancelled",
    canceledAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  return Response.json({ success: true });
}
