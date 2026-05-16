import { getAdminFirestore } from "./firebase-admin.server";

const SUB_COL = "subscriptions";
const BILLING_COL = "billing_history";
const EVENTS_COL = "processed_webhook_events";

export async function getSubscriptionByEmail(email: string) {
  if (!email) return null;
  const db = getAdminFirestore();
  const snap = await db.collection(SUB_COL).where("userEmail", "==", email.toLowerCase().trim()).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function setSubscriptionByEmail(email: string, data: Record<string, unknown>) {
  if (!email) throw new Error("email obrigatório");
  const db = getAdminFirestore();
  const normalized = email.toLowerCase().trim();
  const existing = await db.collection(SUB_COL).where("userEmail", "==", normalized).limit(1).get();
  const docData = { ...data, userEmail: normalized, updatedAt: new Date().toISOString() };
  if (!existing.empty) {
    await db.collection(SUB_COL).doc(existing.docs[0].id).set(docData, { merge: true });
    return existing.docs[0].id;
  }
  const ref = await db.collection(SUB_COL).add({ ...docData, createdAt: new Date().toISOString() });
  return ref.id;
}

export async function addBillingHistory(entry: Record<string, unknown>) {
  const db = getAdminFirestore();
  const ref = await db.collection(BILLING_COL).add({
    ...entry,
    createdAt: entry.createdAt || new Date().toISOString(),
  });
  return ref.id;
}

export async function markWebhookEventProcessed(eventId: string) {
  if (!eventId) return false;
  const db = getAdminFirestore();
  try {
    await db.collection(EVENTS_COL).doc(eventId).create({ processedAt: new Date().toISOString() });
    return true;
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string };
    if (e.code === 6 || (e.message && e.message.includes("ALREADY_EXISTS"))) return false;
    throw err;
  }
}

export async function getAllSubscriptions() {
  const db = getAdminFirestore();
  const snap = await db.collection(SUB_COL).orderBy("updatedAt", "desc").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
