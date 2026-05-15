const BASE_URL = "https://api.abacatepay.com/v2";
const ABACATE_API_KEY = process.env.ABACATE_API_KEY;

function assertApiKey() {
  if (!ABACATE_API_KEY) {
    throw new Error("ABACATE_API_KEY nao configurada");
  }
}

async function abacateRequest(path, options = {}) {
  assertApiKey();
  const response = await fetch(`${BASE_URL}${path}`, {
    method: options.method || "GET",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${ABACATE_API_KEY}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json();
  if (!response.ok || payload.success === false) {
    throw new Error(`AbacatePay erro em ${path}: ${payload.error || response.statusText}`);
  }

  return payload.data;
}

async function createCustomer({ name, email, cellphone, taxId }) {
  return abacateRequest("/customers/create", {
    method: "POST",
    body: { name, email, cellphone, taxId },
  });
}

async function createSubscriptionCheckout({ items, customerId, methods = ["CARD"], metadata }) {
  return abacateRequest("/subscriptions/create", {
    method: "POST",
    body: { items, customerId, methods, metadata },
  });
}

async function createTransparentPix({ amount, description, customer, expiresIn = 3600, metadata }) {
  return abacateRequest("/transparents/create", {
    method: "POST",
    body: {
      method: "PIX",
      data: { amount, description, customer, expiresIn, metadata },
    },
  });
}

async function cancelSubscription(subscriptionId) {
  return abacateRequest(`/subscriptions/${subscriptionId}/cancel`, {
    method: "POST",
  });
}

module.exports = {
  createCustomer,
  createSubscriptionCheckout,
  createTransparentPix,
  cancelSubscription,
};
