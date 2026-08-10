import { getAdminFirestore } from "./firebase-admin.server";

const CONNECTIONS_COL = "pluggy_connections";
const PROVISIONS_COL = "pluggy_provisions";

export async function getConnectionByItemId(itemId: string) {
  if (!itemId) return null;
  const db = getAdminFirestore();
  const snap = await db.collection(CONNECTIONS_COL).where("pluggyItemId", "==", itemId).limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Record<string, unknown> & { id: string };
}

export async function getActiveConnectionByUser(userId: string) {
  if (!userId) return null;
  const db = getAdminFirestore();
  const snap = await db.collection(CONNECTIONS_COL).where("userId", "==", userId).where("status", "==", "ACTIVE").limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Record<string, unknown> & { id: string };
}

export async function upsertConnection(conn: Record<string, unknown>) {
  const db = getAdminFirestore();
  const ref = await db.collection(CONNECTIONS_COL).add(conn);
  return ref.id;
}

export async function markConnectionDeleted(id: string) {
  const db = getAdminFirestore();
  await db.collection(CONNECTIONS_COL).doc(id).update({ status: "DELETED", updatedAt: new Date().toISOString() });
}

export async function upsertProvision(data: Record<string, unknown>) {
  const db = getAdminFirestore();
  const existing = await db.collection(PROVISIONS_COL)
    .where("userId", "==", data.userId)
    .where("pluggyTransactionId", "==", data.pluggyTransactionId)
    .limit(1)
    .get();
  const now = new Date().toISOString();
  if (!existing.empty) {
    await db.collection(PROVISIONS_COL).doc(existing.docs[0].id).set({ ...data, updatedAt: now }, { merge: true });
    return existing.docs[0].id;
  }
  const ref = await db.collection(PROVISIONS_COL).add({ ...data, createdAt: now, updatedAt: now });
  return ref.id;
}

export async function getProvisionsByTransactionIds(ids: string[]) {
  if (!ids.length) return [];
  const db = getAdminFirestore();
  const snap = await db.collection(PROVISIONS_COL).where("pluggyTransactionId", "in", ids).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>));
}

export async function updateProvision(id: string, data: Record<string, unknown>) {
  const db = getAdminFirestore();
  await db.collection(PROVISIONS_COL).doc(id).update({ ...data, updatedAt: new Date().toISOString() });
}

export async function deleteProvision(id: string) {
  const db = getAdminFirestore();
  await db.collection(PROVISIONS_COL).doc(id).delete();
}
