const { firestore } = require('./firebase-admin.cjs');

const SUBSCRIPTIONS_COL = 'subscriptions';
const BILLING_HISTORY_COL = 'billing_history';
const PROCESSED_EVENTS_COL = 'processed_webhook_events';

async function getSubscriptionByEmail(email) {
  if (!email) return null;
  const db = firestore();
  const snap = await db.collection(SUBSCRIPTIONS_COL)
    .where('userEmail', '==', email.toLowerCase().trim())
    .limit(1)
    .get();

  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

async function setSubscriptionByEmail(email, data) {
  if (!email) throw new Error('email é obrigatório');
  const db = firestore();
  const normalizedEmail = email.toLowerCase().trim();

  // Busca documento existente pelo email
  const existing = await db.collection(SUBSCRIPTIONS_COL)
    .where('userEmail', '==', normalizedEmail)
    .limit(1)
    .get();

  const docData = {
    ...data,
    userEmail: normalizedEmail,
    updatedAt: new Date().toISOString(),
  };

  if (!existing.empty) {
    const docId = existing.docs[0].id;
    await db.collection(SUBSCRIPTIONS_COL).doc(docId).set(docData, { merge: true });
    return docId;
  }

  const newRef = await db.collection(SUBSCRIPTIONS_COL).add({
    ...docData,
    createdAt: new Date().toISOString(),
  });
  return newRef.id;
}

async function addBillingHistory(entry) {
  const db = firestore();
  const docRef = await db.collection(BILLING_HISTORY_COL).add({
    ...entry,
    createdAt: entry.createdAt || new Date().toISOString(),
  });
  return docRef.id;
}

async function hasProcessedWebhookEvent(eventId) {
  if (!eventId) return false;
  const db = firestore();
  const doc = await db.collection(PROCESSED_EVENTS_COL).doc(eventId).get();
  return doc.exists;
}

async function markWebhookEventProcessed(eventId) {
  if (!eventId) return;
  const db = firestore();
  await db.collection(PROCESSED_EVENTS_COL).doc(eventId).set({
    processedAt: new Date().toISOString(),
  });
}

async function getAllSubscriptions() {
  const db = firestore();
  const snap = await db.collection(SUBSCRIPTIONS_COL).orderBy('updatedAt', 'desc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

async function getSubscriptionByUserId(userId) {
  if (!userId) return null;
  const db = firestore();
  const doc = await db.collection(SUBSCRIPTIONS_COL).doc(userId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}

async function setSubscriptionByUserId(userId, data) {
  if (!userId) throw new Error('userId é obrigatório');
  const db = firestore();
  await db.collection(SUBSCRIPTIONS_COL).doc(userId).set({
    ...data,
    updatedAt: new Date().toISOString(),
  }, { merge: true });
}

module.exports = {
  getSubscriptionByEmail,
  setSubscriptionByEmail,
  addBillingHistory,
  hasProcessedWebhookEvent,
  markWebhookEventProcessed,
  getAllSubscriptions,
  getSubscriptionByUserId,
  setSubscriptionByUserId,
};
