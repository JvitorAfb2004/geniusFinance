import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/api-helpers.server";
import { getSubscriptionByEmail, setSubscriptionByEmail } from "~/services/subscription-store.server";
import { createCustomer, createSubscriptionCheckout, createTransparentPix } from "~/services/abacate.server";

export async function action({ request }: ActionFunctionArgs) {
  const authUser = await requireAuth(request);
  const body = await request.json();
  const userEmail = String(authUser.email || "").trim().toLowerCase();
  const customerName = String(body.customerName || authUser.displayName || "Cliente GeniusHub").trim();
  const paymentMethod = body.paymentMethod === "PIX" ? "PIX" : "CARD";
  const items = Array.isArray(body.items) ? body.items : [];

  if (!userEmail || !items.length) {
    return Response.json({ error: "userEmail e items obrigatorios" }, { status: 400 });
  }

  const totalAmount = items.reduce((s: number, i: { unitPrice?: number; quantity?: number }) => s + (Number(i.unitPrice || 0) * Number(i.quantity || 0)), 0);
  let currentSub = await getSubscriptionByEmail(userEmail);
  let abacateCustomerId = currentSub?.abacateCustomerId;

  if (!abacateCustomerId) {
    const customer = await createCustomer({
      name: customerName,
      email: userEmail,
      cellphone: body.cellphone || undefined,
      taxId: body.taxId || undefined,
    });
    abacateCustomerId = customer.id;
  }

  if (paymentMethod === "CARD") {
    const checkout = await createSubscriptionCheckout({
      customerId: abacateCustomerId,
      methods: ["CARD"],
      metadata: { userEmail },
      items: items.map((i: { abacateProductId?: string; planId?: string; quantity?: number }) => ({
        id: i.abacateProductId || i.planId,
        quantity: Number(i.quantity || 1),
      })),
    });
    await setSubscriptionByEmail(userEmail, {
      ...currentSub,
      abacateCustomerId,
      status: "pending",
      paymentMethod: "CARD",
      items,
      totalAmount,
      abacateSubscriptionId: checkout.id,
      updatedAt: new Date().toISOString(),
    });
    return Response.json({ success: true, data: { id: checkout.id, url: checkout.url, paymentMethod: "CARD" } });
  }

  const pix = await createTransparentPix({
    amount: totalAmount,
    description: "GeniusHub - Assinatura",
    customer: { name: customerName, email: userEmail, taxId: body.taxId || undefined },
    expiresIn: 3600,
    metadata: { userEmail },
  });

  await setSubscriptionByEmail(userEmail, {
    ...currentSub,
    abacateCustomerId,
    status: "pending",
    paymentMethod: "PIX",
    items,
    totalAmount,
    pendingPix: { id: pix.id, brCode: pix.brCode, brCodeBase64: pix.brCodeBase64, expiresAt: pix.expiresAt },
    updatedAt: new Date().toISOString(),
  });

  return Response.json({
    success: true,
    data: { id: pix.id, brCode: pix.brCode, brCodeBase64: pix.brCodeBase64, expiresAt: pix.expiresAt, paymentMethod: "PIX" },
  });
}
