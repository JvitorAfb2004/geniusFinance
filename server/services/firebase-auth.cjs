const firebaseConfig = require("../../firebase-applet-config.json");

const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY || firebaseConfig.apiKey;

// Tenta usar Firebase Admin SDK (preferível, retorna custom claims)
// Cai para REST API se Admin SDK não estiver disponível
let adminAuth = null;
try {
  const { auth } = require("./firebase-admin.cjs");
  adminAuth = auth();
} catch {
  // Firebase Admin SDK não configurado — fallback para REST
}

async function verifyFirebaseIdToken(idToken) {
  if (!idToken) {
    throw new Error("token ausente");
  }

  // Prefer: Admin SDK (retorna custom claims como role)
  if (adminAuth) {
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      return {
        uid: decoded.uid,
        email: decoded.email || "",
        displayName: decoded.name || "",
        role: decoded.role || null,
      };
    } catch {
      // Fallback para REST
    }
  }

  // Fallback: REST API
  if (!FIREBASE_WEB_API_KEY) {
    throw new Error("FIREBASE_WEB_API_KEY nao configurada");
  }

  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    }
  );

  const payload = await response.json();
  if (!response.ok || payload.error || !payload.users?.length) {
    throw new Error("token invalido");
  }

  const user = payload.users[0];
  return {
    uid: user.localId,
    email: user.email || "",
    displayName: user.displayName || "",
    role: null, // REST API não retorna custom claims
  };
}

module.exports = {
  verifyFirebaseIdToken,
};
