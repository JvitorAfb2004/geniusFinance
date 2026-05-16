import { doc, getDoc, serverTimestamp, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from './firebase';

const TRIAL_DAYS = 7;

export async function createUserOnboardingDocs(params: {
  uid: string;
  email: string;
  displayName: string;
  authProvider: 'google' | 'email';
}) {
  const now = Timestamp.now();
  const expiresAt = Timestamp.fromMillis(now.toMillis() + TRIAL_DAYS * 24 * 60 * 60 * 1000);

  const profileRef = doc(db, `users/${params.uid}/profile`, 'main');
  const trialRef = doc(db, 'trials', params.uid);

  const batch = writeBatch(db);
  batch.set(profileRef, {
    email: params.email,
    displayName: params.displayName,
    authProvider: params.authProvider,
    createdAt: serverTimestamp(),
  }, { merge: true });
  batch.set(trialRef, {
    status: 'active',
    startedAt: now,
    expiresAt,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  }, { merge: true });

  await batch.commit();
}

export async function ensureUserOnboardingDocs(params: {
  uid: string;
  email: string;
  displayName: string;
  authProvider: 'google' | 'email';
}) {
  const profileRef = doc(db, `users/${params.uid}/profile`, 'main');
  const trialRef = doc(db, 'trials', params.uid);

  const [profileSnap, trialSnap] = await Promise.all([
    getDoc(profileRef),
    getDoc(trialRef),
  ]);

  if (profileSnap.exists() && trialSnap.exists()) {
    return;
  }

  await createUserOnboardingDocs(params);
}
