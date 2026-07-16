import type { ActionFunctionArgs } from "react-router";
import crypto from "node:crypto";
import { createTransparentPix } from "~/services/abacate.server";
import { getSubscriptionByEmail, setSubscriptionByEmail, addBillingHistory, markWebhookEventProcessed } from "~/services/subscription-store.server";

const ABACATE_PUBLIC_HMAC_KEY = process.env.ABACATE_PUBLIC_HMAC_KEY || "";
const ABACATE_WEBHOOK_SECRET = process.env.ABACATE_WEBHOOK_SECRET || "";

function verifyAbacateSignature(rawBody: string, sig: string) {
  if (!sig) return false;
  const expected = crypto.createHmac("sha256", ABACATE_PUBLIC_HMAC_KEY).update(Buffer.from(rawBody, "utf8")).digest("base64");
  const A = Buffer.from(expected);
  const B = Buffer.from(sig);
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}

export async function action({ request }: ActionFunctionArgs) {
  const rawBody = await request.text();

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody || "{}");
  } catch {
    return Response.json({ error: "JSON invalido" }, { status: 400 });
  }

  if (!event?.id || !event?.event) {
    return Response.json({ error: "payload invalido" }, { status: 400 });
  }

  // Validate webhook secret
  const url = new URL(request.url);
  const webhookSecret = url.searchParams.get("webhookSecret") || "";
  if (ABACATE_WEBHOOK_SECRET && webhookSecret !== ABACATE_WEBHOOK_SECRET) {
    return Response.json({ error: "webhookSecret invalido" }, { status: 401 });
  }

  // Validate signature
  const sigHeader = request.headers.get("x-webhook-signature") || request.headers.get("x-abacate-signature") || "";
  if (!verifyAbacateSignature(rawBody, sigHeader)) {
    return Response.json({ error: "assinatura invalida" }, { status: 401 });
  }

  // Deduplicate
  const isNew = await markWebhookEventProcessed(event.id as string);
  if (!isNew) {
    return Response.json({ success: true, deduplicated: true });
  }

  const eventData = (event.data as Record<string, unknown>) || {};
  const eventMetadata = (eventData.metadata as Record<string, unknown>) || {};
  const eventCustomer = (eventData.customer as Record<string, unknown>) || {};
  const eventEmail = String(eventMetadata.userEmail || eventCustomer.email || "").trim().toLowerCase();

  if (!eventEmail) {
    return Response.json({ success: true, ignored: true });
  }

  const previous = await getSubscriptionByEmail(eventEmail);
  if (!previous) {
    return Response.json({ success: true, ignored: true });
  }

  const now = new Date().toISOString();
  const eventType = event.event as string;
  const previousData = previous as unknown as Record<string, unknown>;

  if (eventType === "subscription.completed" || eventType === "transparent.completed") {
    await setSubscriptionByEmail(eventEmail, {
      ...previousData,
      status: "active",
      pendingPix: null,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      updatedAt: now,
    });
    await addBillingHistory({
      eventId: event.id,
      userEmail: eventEmail,
      type: "payment_paid",
      amount: eventData.amount || previousData.totalAmount || 0,
      status: "PAID",
      createdAt: now,
    });
  } else if (eventType === "subscription.renewed") {
    let newPendingPix = previousData.pendingPix || null;
    if (previousData.paymentMethod === "PIX" && previousData.totalAmount) {
      try {
        const pix = await createTransparentPix({
          amount: previousData.totalAmount,
          description: "GeniusHub - Renovação",
          customer: { email: eventEmail },
          expiresIn: 3600,
          metadata: { userEmail: eventEmail },
        });
        newPendingPix = { id: pix.id, brCode: pix.brCode, brCodeBase64: pix.brCodeBase64, expiresAt: pix.expiresAt };
      } catch (e) {
        console.error("[webhook/renewed] Erro PIX:", (e as Error).message);
      }
    }
    await setSubscriptionByEmail(eventEmail, {
      ...previousData,
      status: "active",
      pendingPix: newPendingPix,
      currentPeriodStart: now,
      currentPeriodEnd: new Date(Date.now() + 30 * 86400000).toISOString(),
      updatedAt: now,
    });
    await addBillingHistory({
      eventId: event.id,
      userEmail: eventEmail,
      type: "payment_paid",
      amount: eventData.amount || previousData.totalAmount || 0,
      status: "PAID",
      createdAt: now,
    });
  } else if (eventType === "subscription.cancelled") {
    await setSubscriptionByEmail(eventEmail, {
      ...previousData,
      status: "cancelled",
      canceledAt: now,
      updatedAt: now,
    });
    await addBillingHistory({
      eventId: event.id,
      userEmail: eventEmail,
      type: "subscription_cancelled",
      amount: previousData.totalAmount || 0,
      status: "CANCELLED",
      createdAt: now,
    });
  } else if (eventType === "subscription.past_due") {
    await setSubscriptionByEmail(eventEmail, {
      ...previousData,
      status: "past_due",
      updatedAt: now,
    });
    await addBillingHistory({
      eventId: event.id,
      userEmail: eventEmail,
      type: "payment_failed",
      amount: previousData.totalAmount || 0,
      status: "FAILED",
      createdAt: now,
    });
  }

  return Response.json({ success: true });
}
