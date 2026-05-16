import { cert, getApp, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore } from "firebase-admin/firestore";

type FirebaseCredentials = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function readCredentials(): FirebaseCredentials {
  const projectId = String(process.env.FIREBASE_PROJECT_ID || "").trim();
  const clientEmail = String(process.env.FIREBASE_CLIENT_EMAIL || "").trim();
  const privateKey = String(process.env.FIREBASE_PRIVATE_KEY || "")
    .trim()
    .replace(/\\n/g, "\n");

  if (!projectId || !clientEmail || !privateKey) {
    throw new Error("Firebase admin credentials are not configured (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY).");
  }

  return { projectId, clientEmail, privateKey };
}

function getOrInitializeApp() {
  if (getApps().length === 0) {
    const credentials = readCredentials();
    return initializeApp({
      credential: cert({
        projectId: credentials.projectId,
        clientEmail: credentials.clientEmail,
        privateKey: credentials.privateKey,
      }),
    });
  }
  return getApp();
}

export function getAdminFirestore() {
  const app = getOrInitializeApp();
  const databaseId = (process.env.FIREBASE_DATABASE_ID || "").trim();
  const db = getFirestore(app);
  if (databaseId) {
    return (db as any).database(databaseId);
  }
  return db;
}

export function getAdminAuth() {
  return getAuth(getOrInitializeApp());
}
