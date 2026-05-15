const admin = require('firebase-admin');

let initialized = false;

function initialize() {
  if (initialized) return;

  // Tenta service account via arquivo JSON local
  try {
    const serviceAccount = require('../service-account.json');
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch {
    // Fallback: application default credentials (Cloud Run, etc.)
    admin.initializeApp();
  }

  initialized = true;
}

function firestore() {
  initialize();
  return admin.firestore();
}

function auth() {
  initialize();
  return admin.auth();
}

async function verifyIdToken(token) {
  initialize();
  return admin.auth().verifyIdToken(token);
}

async function setSuperadmin(uid, isSuperadmin = true) {
  initialize();
  return admin.auth().setCustomUserClaims(uid, {
    role: isSuperadmin ? 'superadmin' : undefined,
  });
}

module.exports = { firestore, auth, verifyIdToken, setSuperadmin };
