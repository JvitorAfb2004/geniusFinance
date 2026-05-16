import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore, type Firestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let initialized = false;

function initAdmin() {
  if (initialized || getApps().length > 0) return;
  try {
    const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (rawServiceAccount) {
      const serviceAccount = JSON.parse(rawServiceAccount);
      initializeApp({ credential: cert(serviceAccount) });
    } else {
      initializeApp();
    }
  } catch (err) {
    console.error("[firebase-admin] falha ao inicializar:", (err as Error)?.message || err);
  }
  initialized = true;
}

export function getAdminFirestore(): Firestore {
  initAdmin();
  const db = getFirestore();
  const databaseId = process.env.FIREBASE_DATABASE_ID;
  if (databaseId) {
    return (db as any).database(databaseId) as Firestore;
  }
  return db;
}

export function getAdminAuth() {
  initAdmin();
  return getAuth();
}
