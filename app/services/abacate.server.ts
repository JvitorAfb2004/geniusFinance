const ABACATE_BASE = "https://api.abacatepay.com/v2";
const ABACATE_API_KEY = process.env.ABACATE_API_KEY;

function assertApiKey() {
  if (!ABACATE_API_KEY) throw new Error("ABACATE_API_KEY nao configurada");
}

async function abacateRequest(path: string, options: { method?: string; body?: unknown } = {}) {
  assertApiKey();
  const response = await fetch(`${ABACATE_BASE}${path}`, {
    method: options.method || "GET",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${ABACATE_API_KEY}` },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });
  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    throw new Error(`AbacatePay erro em ${path}: ${payload.error || response.statusText}`);
  }
  return payload.data;
}

export async function createCustomer(data: Record<string, unknown>) {
  return abacateRequest("/customers/create", { method: "POST", body: data });
}

export async function createSubscriptionCheckout(data: Record<string, unknown>) {
  return abacateRequest("/subscriptions/create", { method: "POST", body: data });
}

export async function createTransparentPix(data: Record<string, unknown>) {
  return abacateRequest("/transparents/create", { method: "POST", body: { method: "PIX", data } });
}

export async function cancelSubscription(id: string) {
  return abacateRequest(`/subscriptions/${id}/cancel`, { method: "POST" });
}
