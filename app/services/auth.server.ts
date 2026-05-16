import { getAdminAuth } from "./firebase-admin.server";

const FIREBASE_WEB_API_KEY = process.env.FIREBASE_WEB_API_KEY;

export async function verifyFirebaseIdToken(idToken: string) {
  if (!idToken) throw new Error("token ausente");

  const adminAuth = getAdminAuth();
  try {
    const decoded = await adminAuth.verifyIdToken(idToken);
    return {
      uid: decoded.uid,
      email: decoded.email || "",
      displayName: decoded.name || "",
      role: (decoded.role as string) || null,
    };
  } catch {
    // fallback to REST API
  }

  if (!FIREBASE_WEB_API_KEY) throw new Error("FIREBASE_WEB_API_KEY nao configurada");
  const response = await fetch(
    `https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken }),
    },
  );
  const payload = await response.json();
  if (!response.ok || payload.error || !payload.users?.length) throw new Error("token invalido");
  const user = payload.users[0];
  return {
    uid: user.localId,
    email: user.email || "",
    displayName: user.displayName || "",
    role: null as string | null,
  };
}
