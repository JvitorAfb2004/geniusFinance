const PLUGGY_BASE = process.env.PLUGGY_API_URL || "https://api.pluggy.ai";
const PLUGGY_CLIENT_ID = process.env.PLUGGY_CLIENT_ID || "";
const PLUGGY_CLIENT_SECRET = process.env.PLUGGY_CLIENT_SECRET || "";
const PLUGGY_WEBHOOK_URL = process.env.PLUGGY_WEBHOOK_URL || "";
const PLUGGY_WEBHOOK_SECRET = process.env.PLUGGY_WEBHOOK_SECRET || "";

let cachedApiKey: string | null = null;
let cachedApiKeyExpiresAt = 0;

export async function getApiKey(force = false): Promise<string> {
  if (!force && cachedApiKey && Date.now() < cachedApiKeyExpiresAt) return cachedApiKey;
  if (!PLUGGY_CLIENT_ID || !PLUGGY_CLIENT_SECRET) throw new Error("PLUGGY_CLIENT_ID/SECRET nao configurados");
  const res = await fetch(`${PLUGGY_BASE}/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ clientId: PLUGGY_CLIENT_ID, clientSecret: PLUGGY_CLIENT_SECRET }),
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok || !payload.apiKey) throw new Error(`Pluggy auth falhou: ${payload.message || res.statusText}`);
  cachedApiKey = payload.apiKey;
  cachedApiKeyExpiresAt = Date.now() + 2 * 3600 * 1000 - 5 * 60 * 1000; // API key dura 2h; renova 5min antes
  return cachedApiKey as string;
}

async function pluggyRequest(path: string, options: { method?: string; body?: unknown } = {}) {
  const apiKey = await getApiKey();
  const res = await fetch(`${PLUGGY_BASE}${path}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", "X-API-KEY": apiKey },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`Pluggy erro em ${path}: ${payload.message || res.statusText}`);
  return payload;
}

export async function createConnectToken(uid: string): Promise<string> {
  const payload = await pluggyRequest("/connect_token", {
    method: "POST",
    body: {
      options: {
        clientUserId: uid,
        webhookUrl: PLUGGY_WEBHOOK_URL ? `${PLUGGY_WEBHOOK_URL}?secret=${PLUGGY_WEBHOOK_SECRET}` : undefined,
        avoidDuplicates: true,
      },
    },
  });
  return payload.accessToken;
}

export async function getItem(itemId: string) {
  return pluggyRequest(`/items/${itemId}`);
}

export async function deleteItem(itemId: string) {
  return pluggyRequest(`/items/${itemId}`, { method: "DELETE" });
}

export async function triggerItemSync(itemId: string) {
  return pluggyRequest(`/items/${itemId}`, { method: "POST" });
}

export async function fetchTransactionsByLink(link: string, apiKey: string): Promise<Record<string, unknown>[]> {
  const results: Record<string, unknown>[] = [];
  let next: string | null = link;
  let pages = 0;
  while (next && pages < 20) {
    // ponytail: 20 paginas (10k transacoes) e limite de seguranca contra cursor infinito
    const url = next.startsWith("http") ? next : next.startsWith("?") ? `${PLUGGY_BASE}/v2/transactions${next}` : `${PLUGGY_BASE}${next}`;
    const res = await fetch(url, { headers: { "X-API-KEY": apiKey } });
    const payload: any = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Pluggy erro em transactions: ${payload.message || res.statusText}`);
    if (Array.isArray(payload.results)) results.push(...payload.results);
    next = payload.next ? String(payload.next) : null;
    pages++;
  }
  return results;
}

export async function fetchTransactionsByIds(accountId: string, ids: string[], apiKey: string) {
  const all = await fetchTransactionsByLink(`/v2/transactions?accountId=${accountId}`, apiKey);
  const set = new Set(ids);
  return all.filter((t) => set.has(String(t.id)));
}
