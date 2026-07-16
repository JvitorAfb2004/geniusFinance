import { verifyFirebaseIdToken } from "~/services/auth.server";

export function isSuperadmin(user: { uid: string; email: string; role: string | null }) {
  if (!user) return false;
  if (user.role === "superadmin") return true;
  const configuredSuperadminEmail = (process.env.SUPERADMIN_EMAIL || "").trim().toLowerCase();
  const userEmail = (user.email || "").trim().toLowerCase();
  return Boolean(configuredSuperadminEmail && userEmail && configuredSuperadminEmail === userEmail);
}

export async function requireAuth(request: Request) {
  const authHeader = request.headers.get("Authorization") || "";
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    throw new Response(JSON.stringify({ error: "nao autenticado" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    return await verifyFirebaseIdToken(token);
  } catch {
    throw new Response(JSON.stringify({ error: "token invalido" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}

export function serializeFirestoreDoc(doc: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc)) {
    if (value && typeof value === "object" && (value as Record<string, unknown>).constructor?.name === "Timestamp") {
      data[key] = (value as { toDate: () => Date }).toDate().toISOString();
    } else if (value && typeof value === "object" && (value as Record<string, unknown>)._seconds !== undefined) {
      data[key] = new Date((value as Record<string, number>)._seconds * 1000).toISOString();
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      data[key] = serializeFirestoreDoc(value as Record<string, unknown>);
    } else {
      data[key] = value;
    }
  }
  return data;
}
