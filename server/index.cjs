const http = require("http");
const https = require("https");
const crypto = require("crypto");

// ═══════════════════════════════════════════
// Inline: abacate.cjs
// ═══════════════════════════════════════════
const ABACATE_BASE = "https://api.abacatepay.com/v2";
const ABACATE_API_KEY = process.env.ABACATE_API_KEY;

function assertApiKey() {
  if (!ABACATE_API_KEY) throw new Error("ABACATE_API_KEY nao configurada");
}

async function abacateRequest(path, options = {}) {
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

async function createCustomer(data) { return abacateRequest("/customers/create", { method: "POST", body: data }); }
async function createSubscriptionCheckout(data) { return abacateRequest("/subscriptions/create", { method: "POST", body: data }); }
async function createTransparentPix(data) { return abacateRequest("/transparents/create", { method: "POST", body: { method: "PIX", data } }); }
async function cancelSubscription(id) { return abacateRequest(`/subscriptions/${id}/cancel`, { method: "POST" }); }

// ═══════════════════════════════════════════
// Inline: firebase-admin.cjs
// ═══════════════════════════════════════════
let adminModule = null;
try { adminModule = require('firebase-admin'); } catch {}

let adminInitialized = false;
function initAdmin() {
  if (adminInitialized || !adminModule) return;
  try {
    const serviceAccount = require('./service-account.json');
    adminModule.initializeApp({ credential: adminModule.credential.cert(serviceAccount) });
  } catch {
    try { adminModule.initializeApp(); } catch {}
  }
  adminInitialized = true;
}
function getFirestore() { initAdmin(); return adminModule ? adminModule.firestore() : null; }
function getAdminAuth() { initAdmin(); return adminModule ? adminModule.auth() : null; }

// ═══════════════════════════════════════════
// Inline: firebase-auth.cjs
// ═══════════════════════════════════════════
let firebaseApiKey = process.env.FIREBASE_WEB_API_KEY;
if (!firebaseApiKey) {
  try { firebaseApiKey = require("../firebase-applet-config.json").apiKey; } catch {}
}
if (!firebaseApiKey) {
  try { firebaseApiKey = require("./firebase-applet-config.json").apiKey; } catch {}
}
const FIREBASE_WEB_API_KEY = firebaseApiKey;

async function verifyFirebaseIdToken(idToken) {
  if (!idToken) throw new Error("token ausente");

  // Prefer: Admin SDK (retorna custom claims como role)
  const adminAuth = getAdminAuth();
  if (adminAuth) {
    try {
      const decoded = await adminAuth.verifyIdToken(idToken);
      return { uid: decoded.uid, email: decoded.email || "", displayName: decoded.name || "", role: decoded.role || null };
    } catch {}
  }

  // Fallback: REST API
  if (!FIREBASE_WEB_API_KEY) throw new Error("FIREBASE_WEB_API_KEY nao configurada");
  const response = await fetch(`https://identitytoolkit.googleapis.com/v1/accounts:lookup?key=${FIREBASE_WEB_API_KEY}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ idToken }),
  });
  const payload = await response.json();
  if (!response.ok || payload.error || !payload.users?.length) throw new Error("token invalido");
  const user = payload.users[0];
  return { uid: user.localId, email: user.email || "", displayName: user.displayName || "", role: null };
}

// ═══════════════════════════════════════════
// Inline: subscription-store.cjs
// ═══════════════════════════════════════════
const SUB_COL = 'subscriptions';
const BILLING_COL = 'billing_history';
const EVENTS_COL = 'processed_webhook_events';

async function getSubscriptionByEmail(email) {
  if (!email) return null;
  const db = getFirestore(); if (!db) return null;
  const snap = await db.collection(SUB_COL).where('userEmail', '==', email.toLowerCase().trim()).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

async function setSubscriptionByEmail(email, data) {
  if (!email) throw new Error('email obrigatório');
  const db = getFirestore(); if (!db) throw new Error('Firestore indisponível');
  const normalized = email.toLowerCase().trim();
  const existing = await db.collection(SUB_COL).where('userEmail', '==', normalized).limit(1).get();
  const docData = { ...data, userEmail: normalized, updatedAt: new Date().toISOString() };
  if (!existing.empty) {
    await db.collection(SUB_COL).doc(existing.docs[0].id).set(docData, { merge: true });
    return existing.docs[0].id;
  }
  const ref = await db.collection(SUB_COL).add({ ...docData, createdAt: new Date().toISOString() });
  return ref.id;
}

async function addBillingHistory(entry) {
  const db = getFirestore(); if (!db) return null;
  const ref = await db.collection(BILLING_COL).add({ ...entry, createdAt: entry.createdAt || new Date().toISOString() });
  return ref.id;
}

async function markWebhookEventProcessed(eventId) {
  if (!eventId) return false;
  const db = getFirestore(); if (!db) return false;
  try {
    await db.collection(EVENTS_COL).doc(eventId).create({ processedAt: new Date().toISOString() });
    return true;
  } catch (err) {
    if (err.code === 6 || (err.message && err.message.includes('ALREADY_EXISTS'))) return false;
    throw err;
  }
}

async function getAllSubscriptions() {
  const db = getFirestore(); if (!db) return [];
  const snap = await db.collection(SUB_COL).orderBy('updatedAt', 'desc').get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ═══════════════════════════════════════════
// Server
// ═══════════════════════════════════════════

const PORT = process.env.PORT || 3001;
const NVIDIA_HOST = "integrate.api.nvidia.com";
const MODEL = "google/gemma-3n-e4b-it";
const NVIDIA_API_KEY = process.env.NVIDIA_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || "GeniusHub <onboarding@geniushub.app>";
const ABACATE_WEBHOOK_SECRET = process.env.ABACATE_WEBHOOK_SECRET || "";
const ABACATE_PUBLIC_HMAC_KEY = "t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9";

const CORS_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map(s => s.trim())
  .filter(Boolean);

function getCorsOrigin(req) {
  const origin = req?.headers?.origin || '';
  if (!origin) return '*';
  if (CORS_ORIGINS.length === 0 || CORS_ORIGINS.includes(origin)) return origin;
  return CORS_ORIGINS[0] || '*';
}

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin || '*',
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => { try { resolve(JSON.parse(body || "{}")); } catch (e) { reject(e); } });
    req.on("error", reject);
  });
}

function verifyAbacateSignature(rawBody, sig) {
  if (!sig) return false;
  const expected = crypto.createHmac("sha256", ABACATE_PUBLIC_HMAC_KEY).update(Buffer.from(rawBody, "utf8")).digest("base64");
  const A = Buffer.from(expected), B = Buffer.from(sig);
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}

async function authRequired(req, res) {
  const authHeader = String(req.headers.authorization || "");
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    res.writeHead(401, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "nao autenticado" }));
    return null;
  }
  try { return await verifyFirebaseIdToken(token); } catch {
    res.writeHead(401, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "token invalido" }));
    return null;
  }
}

function serializeFirestoreDoc(doc) {
  const data = {};
  for (const [key, value] of Object.entries(doc)) {
    if (value && typeof value === 'object' && value.constructor && value.constructor.name === 'Timestamp') {
      data[key] = value.toDate().toISOString();
    } else if (value && typeof value === 'object' && value._seconds !== undefined) {
      data[key] = new Date(value._seconds * 1000).toISOString();
    } else if (value && typeof value === 'object' && !Array.isArray(value)) {
      data[key] = serializeFirestoreDoc(value);
    } else {
      data[key] = value;
    }
  }
  return data;
}

// ── AI Proxy helpers ──

function buildPayload(body) {
  if (!NVIDIA_API_KEY) throw new Error("NVIDIA_API_KEY nao configurada");
  return { model: MODEL, messages: body.messages, max_tokens: body.max_tokens || 512, temperature: body.temperature ?? 0.2, top_p: body.top_p ?? 0.7, frequency_penalty: body.frequency_penalty ?? 0, presence_penalty: body.presence_penalty ?? 0, stream: body.stream || false };
}

function proxyNonStream(req, res, body) {
  return new Promise((resolve, reject) => {
    const payload = buildPayload(body);
    const data = JSON.stringify(payload);
    const proxyReq = https.request({
      hostname: NVIDIA_HOST, port: 443, path: "/v1/chat/completions", method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${NVIDIA_API_KEY}`, Accept: "application/json", "Content-Length": Buffer.byteLength(data) },
      timeout: 120000,
    }, (proxyRes) => {
      let responseData = "";
      proxyRes.on("data", (chunk) => { responseData += chunk; });
      proxyRes.on("end", () => {
        if (proxyRes.statusCode >= 400) console.error("[non-stream] NVIDIA erro", proxyRes.statusCode, ":", responseData.slice(0, 500));
        res.writeHead(proxyRes.statusCode, { ...corsHeaders('*'), "Content-Type": "application/json" });
        res.end(responseData);
        resolve();
      });
    });
    proxyReq.on("error", (err) => { res.writeHead(502, corsHeaders('*')); res.end(JSON.stringify({ error: "Erro NVIDIA: " + err.message })); reject(err); });
    proxyReq.on("timeout", () => { proxyReq.destroy(); res.writeHead(504, corsHeaders('*')); res.end(JSON.stringify({ error: "Timeout NVIDIA" })); reject(new Error("timeout")); });
    proxyReq.write(data); proxyReq.end();
  });
}

function proxyStream(req, res, body) {
  return new Promise((resolve, reject) => {
    const payload = buildPayload(body);
    const data = JSON.stringify(payload);
    const proxyReq = https.request({
      hostname: NVIDIA_HOST, port: 443, path: "/v1/chat/completions", method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${NVIDIA_API_KEY}`, Accept: "text/event-stream", "Content-Length": Buffer.byteLength(data) },
      timeout: 120000,
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, { ...corsHeaders('*'), "Content-Type": "text/event-stream", "Cache-Control": "no-cache", "Connection": "keep-alive" });
      proxyRes.on("data", (chunk) => { res.write(chunk); });
      proxyRes.on("end", () => { res.end(); resolve(); });
      proxyRes.on("error", (err) => { console.error("Stream error:", err.message); res.end(); reject(err); });
    });
    proxyReq.on("error", (err) => { res.writeHead(502, corsHeaders('*')); res.end(JSON.stringify({ error: "Erro NVIDIA: " + err.message })); reject(err); });
    proxyReq.on("timeout", () => { proxyReq.destroy(); res.end(); reject(new Error("timeout")); });
    proxyReq.write(data); proxyReq.end();
  });
}

// ── Resend helper ──

async function sendWelcomeEmail(email, displayName) {
  if (!RESEND_API_KEY) { console.log("[welcome] RESEND_API_KEY not set"); return { skipped: true }; }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST", headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM, to: [email], subject: "Bem-vindo ao GeniusHub!", html: `<p>Olá ${displayName || "!"}</p><p>Seu trial de 7 dias começou.</p>` }),
  });
  if (!res.ok) { const err = await res.text(); console.error("[welcome] erro:", res.status, err.slice(0, 300)); throw new Error("falha ao enviar email"); }
  return { ok: true };
}

function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, (c) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]);
}

// ═══════════════════════════════════════════
// HTTP Server
// ═══════════════════════════════════════════

const server = http.createServer(async (req, res) => {
  const corsOrigin = getCorsOrigin(req);

  if (req.method === "OPTIONS") { res.writeHead(204, corsHeaders(corsOrigin)); res.end(); return; }
  if (req.method === "GET" && req.url === "/health") { res.writeHead(200, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ status: "ok" })); return; }

  // ── POST /api/auth/welcome ──
  if (req.method === "POST" && req.url === "/api/auth/welcome") {
    try {
      const body = await readJsonBody(req);
      const email = (body.email || "").trim();
      if (!email) { res.writeHead(400, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "email obrigatorio" })); return; }
      const result = await sendWelcomeEmail(email, (body.displayName || "").trim());
      res.writeHead(result.skipped ? 202 : 200, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch { res.writeHead(400, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "JSON invalido" })); }
    return;
  }

  // ── POST /api/sub/create ──
  if (req.method === "POST" && req.url === "/api/sub/create") {
    try {
      const authUser = await authRequired(req, res); if (!authUser) return;
      const body = await readJsonBody(req);
      const userEmail = String(authUser.email || "").trim().toLowerCase();
      const customerName = String(body.customerName || authUser.displayName || "Cliente GeniusHub").trim();
      const paymentMethod = body.paymentMethod === "PIX" ? "PIX" : "CARD";
      const items = Array.isArray(body.items) ? body.items : [];
      if (!userEmail || !items.length) { res.writeHead(400, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "userEmail e items obrigatorios" })); return; }

      const totalAmount = items.reduce((s, i) => s + (Number(i.unitPrice || 0) * Number(i.quantity || 0)), 0);
      let currentSub = await getSubscriptionByEmail(userEmail);
      if (!currentSub || !currentSub.abacateCustomerId) {
        const customer = await createCustomer({ name: customerName, email: userEmail, cellphone: body.cellphone || undefined, taxId: body.taxId || undefined });
        currentSub = { ...(currentSub || {}), abacateCustomerId: customer.id };
      }

      if (paymentMethod === "CARD") {
        const checkout = await createSubscriptionCheckout({
          customerId: currentSub.abacateCustomerId, methods: ["CARD"], metadata: { userEmail },
          items: items.map(i => ({ id: i.abacateProductId || i.planId, quantity: Number(i.quantity || 1) })),
        });
        await setSubscriptionByEmail(userEmail, { ...currentSub, status: "pending", paymentMethod: "CARD", items, totalAmount, abacateSubscriptionId: checkout.id, updatedAt: new Date().toISOString() });
        res.writeHead(200, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, data: { id: checkout.id, url: checkout.url, paymentMethod: "CARD" } }));
        return;
      }

      const pix = await createTransparentPix({ amount: totalAmount, description: "GeniusHub - Assinatura", customer: { name: customerName, email: userEmail, taxId: body.taxId || undefined }, expiresIn: 3600, metadata: { userEmail } });
      await setSubscriptionByEmail(userEmail, { ...currentSub, status: "pending", paymentMethod: "PIX", items, totalAmount, pendingPix: { id: pix.id, brCode: pix.brCode, brCodeBase64: pix.brCodeBase64, expiresAt: pix.expiresAt }, updatedAt: new Date().toISOString() });
      res.writeHead(200, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true, data: { id: pix.id, brCode: pix.brCode, brCodeBase64: pix.brCodeBase64, expiresAt: pix.expiresAt, paymentMethod: "PIX" } }));
    } catch (err) { res.writeHead(500, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: err.message || "erro" })); }
    return;
  }

  // ── GET /api/sub/status ──
  if (req.method === "GET" && req.url.startsWith("/api/sub/status")) {
    const authUser = await authRequired(req, res); if (!authUser) return;
    const userEmail = String(authUser.email || "").trim().toLowerCase();
    const sub = await getSubscriptionByEmail(userEmail);
    let trial = null;
    try {
      const db = getFirestore(); if (db) {
        const trialDoc = await db.collection("trials").doc(authUser.uid).get();
        if (trialDoc.exists) trial = { id: trialDoc.id, ...serializeFirestoreDoc(trialDoc.data()) };
      }
    } catch {}
    res.writeHead(200, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, data: { subscription: sub, trial } }));
    return;
  }

  // ── POST /api/sub/cancel ──
  if (req.method === "POST" && req.url === "/api/sub/cancel") {
    const authUser = await authRequired(req, res); if (!authUser) return;
    const userEmail = String(authUser.email || "").trim().toLowerCase();
    const sub = await getSubscriptionByEmail(userEmail);
    if (!sub) { res.writeHead(404, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "assinatura nao encontrada" })); return; }
    if (sub.abacateSubscriptionId && sub.paymentMethod === "CARD") { try { await cancelSubscription(sub.abacateSubscriptionId); } catch (e) { console.error("[cancel] Erro:", e.message); } }
    await setSubscriptionByEmail(userEmail, { ...sub, status: "cancelled", canceledAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
    res.writeHead(200, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ success: true }));
    return;
  }

  // ── GET /api/sub/pix-pending ──
  if (req.method === "GET" && req.url.startsWith("/api/sub/pix-pending")) {
    const authUser = await authRequired(req, res); if (!authUser) return;
    const userEmail = String(authUser.email || "").trim().toLowerCase();
    const sub = await getSubscriptionByEmail(userEmail);
    res.writeHead(200, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, data: sub?.pendingPix || null }));
    return;
  }

  // ── POST /api/webhooks/abacate ──
  if (req.method === "POST" && req.url.startsWith("/api/webhooks/abacate")) {
    try {
      let rawBody = "";
      req.on("data", (c) => { rawBody += c; });
      await new Promise((r) => req.on("end", r));
      const event = JSON.parse(rawBody || "{}");
      if (!event?.id || !event?.event) { res.writeHead(400, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "payload invalido" })); return; }

      const requestUrl = new URL(req.url, "http://localhost");
      const webhookSecret = String(requestUrl.searchParams.get("webhookSecret") || "");
      if (ABACATE_WEBHOOK_SECRET && webhookSecret !== ABACATE_WEBHOOK_SECRET) { res.writeHead(401, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "webhookSecret invalido" })); return; }
      const sigHeader = req.headers["x-webhook-signature"] || req.headers["x-abacate-signature"];
      if (!verifyAbacateSignature(rawBody, String(sigHeader || ""))) { res.writeHead(401, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "assinatura invalida" })); return; }

      const isNew = await markWebhookEventProcessed(event.id);
      if (!isNew) { res.writeHead(200, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ success: true, deduplicated: true })); return; }

      const eventEmail = String(event.data?.metadata?.userEmail || event.data?.customer?.email || "").trim().toLowerCase();
      if (eventEmail) {
        const previous = await getSubscriptionByEmail(eventEmail);
        if (!previous) { res.writeHead(200, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ success: true, ignored: true })); return; }
        const now = new Date().toISOString();

        if (event.event === "subscription.completed" || event.event === "transparent.completed") {
          await setSubscriptionByEmail(eventEmail, { ...previous, status: "active", pendingPix: null, currentPeriodStart: now, currentPeriodEnd: new Date(Date.now() + 30*86400000).toISOString(), updatedAt: now });
          await addBillingHistory({ eventId: event.id, userEmail: eventEmail, type: "payment_paid", amount: event.data?.amount || previous.totalAmount || 0, status: "PAID", createdAt: now });
        } else if (event.event === "subscription.renewed") {
          let newPendingPix = previous.pendingPix || null;
          if (previous.paymentMethod === "PIX" && previous.totalAmount) {
            try {
              const pix = await createTransparentPix({ amount: previous.totalAmount, description: "GeniusHub - Renovação", customer: { email: eventEmail }, expiresIn: 3600, metadata: { userEmail: eventEmail } });
              newPendingPix = { id: pix.id, brCode: pix.brCode, brCodeBase64: pix.brCodeBase64, expiresAt: pix.expiresAt };
            } catch (e) { console.error("[webhook/renewed] Erro PIX:", e.message); }
          }
          await setSubscriptionByEmail(eventEmail, { ...previous, status: "active", pendingPix: newPendingPix, currentPeriodStart: now, currentPeriodEnd: new Date(Date.now() + 30*86400000).toISOString(), updatedAt: now });
          await addBillingHistory({ eventId: event.id, userEmail: eventEmail, type: "payment_paid", amount: event.data?.amount || previous.totalAmount || 0, status: "PAID", createdAt: now });
        } else if (event.event === "subscription.cancelled") {
          await setSubscriptionByEmail(eventEmail, { ...previous, status: "cancelled", canceledAt: now, updatedAt: now });
          await addBillingHistory({ eventId: event.id, userEmail: eventEmail, type: "subscription_cancelled", amount: previous.totalAmount || 0, status: "CANCELLED", createdAt: now });
        } else if (event.event === "subscription.past_due") {
          await setSubscriptionByEmail(eventEmail, { ...previous, status: "past_due", updatedAt: now });
          await addBillingHistory({ eventId: event.id, userEmail: eventEmail, type: "payment_failed", amount: previous.totalAmount || 0, status: "FAILED", createdAt: now });
        }
      }
      res.writeHead(200, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ success: true }));
    } catch { res.writeHead(400, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "JSON invalido" })); }
    return;
  }

  // ── Admin: Plans ──

  function isSuperadmin(u) { return u && u.role === 'superadmin'; }

  // GET /api/admin/plans
  if (req.method === "GET" && req.url === "/api/admin/plans") {
    const u = await authRequired(req, res); if (!u) return;
    if (!isSuperadmin(u)) { res.writeHead(403, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "restrito" })); return; }
    try {
      const db = getFirestore(); const snap = await db.collection("plans").orderBy("createdAt", "desc").get();
      res.writeHead(200, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
    } catch (e) { res.writeHead(500, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // POST /api/admin/plans
  if (req.method === "POST" && req.url === "/api/admin/plans") {
    const u = await authRequired(req, res); if (!u) return;
    if (!isSuperadmin(u)) { res.writeHead(403, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "restrito" })); return; }
    try {
      const body = await readJsonBody(req); const db = getFirestore();
      const ref = await db.collection("plans").add({ name: body.name, basePrice: Number(body.basePrice || 0), type: body.type || 'PERSONAL', abacateProductId: body.abacateProductId || '', isPublic: body.isPublic !== false, assignedTo: body.assignedTo || null, createdBy: u.uid, createdAt: new Date().toISOString() });
      res.writeHead(201, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ success: true, data: { id: ref.id } }));
    } catch (e) { res.writeHead(500, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // PUT /api/admin/plans/:id
  if (req.method === "PUT" && req.url.startsWith("/api/admin/plans/")) {
    const u = await authRequired(req, res); if (!u) return;
    if (!isSuperadmin(u)) { res.writeHead(403, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "restrito" })); return; }
    try {
      const planId = req.url.split("/api/admin/plans/")[1]; const body = await readJsonBody(req); const db = getFirestore();
      const update = {}; if (body.name !== undefined) update.name = body.name; if (body.basePrice !== undefined) update.basePrice = Number(body.basePrice); if (body.type !== undefined) update.type = body.type; if (body.abacateProductId !== undefined) update.abacateProductId = body.abacateProductId; if (body.isPublic !== undefined) update.isPublic = body.isPublic; if (body.assignedTo !== undefined) update.assignedTo = body.assignedTo;
      await db.collection("plans").doc(planId).update(update);
      res.writeHead(200, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ success: true }));
    } catch (e) { res.writeHead(500, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // DELETE /api/admin/plans/:id
  if (req.method === "DELETE" && req.url.startsWith("/api/admin/plans/")) {
    const u = await authRequired(req, res); if (!u) return;
    if (!isSuperadmin(u)) { res.writeHead(403, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "restrito" })); return; }
    try { const db = getFirestore(); await db.collection("plans").doc(req.url.split("/api/admin/plans/")[1]).delete(); res.writeHead(200, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ success: true })); } catch (e) { res.writeHead(500, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // ── Admin: Subscriptions ──

  // GET /api/admin/subscriptions
  if (req.method === "GET" && req.url === "/api/admin/subscriptions") {
    const u = await authRequired(req, res); if (!u) return;
    if (!isSuperadmin(u)) { res.writeHead(403, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "restrito" })); return; }
    try { const subs = await getAllSubscriptions(); res.writeHead(200, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ success: true, data: subs })); } catch (e) { res.writeHead(500, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // POST /api/admin/subscriptions/assign
  if (req.method === "POST" && req.url === "/api/admin/subscriptions/assign") {
    const u = await authRequired(req, res); if (!u) return;
    if (!isSuperadmin(u)) { res.writeHead(403, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "restrito" })); return; }
    try {
      const body = await readJsonBody(req); const targetEmail = String(body.targetEmail || "").trim().toLowerCase(); const planId = String(body.planId || "").trim();
      if (!targetEmail || !planId) { res.writeHead(400, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "targetEmail e planId obrigatorios" })); return; }
      const db = getFirestore(); const planDoc = await db.collection("plans").doc(planId).get();
      if (!planDoc.exists) { res.writeHead(404, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "plano nao encontrado" })); return; }
      const plan = planDoc.data();
      let periodEnd;
      if (body.indefinite) periodEnd = new Date(Date.now() + 100*365*86400000).toISOString();
      else if (body.endDate) periodEnd = new Date(body.endDate).toISOString();
      else if (body.durationMonths > 0) periodEnd = new Date(Date.now() + body.durationMonths*30*86400000).toISOString();
      else periodEnd = new Date(Date.now() + 30*86400000).toISOString();
      const now = new Date().toISOString();
      await setSubscriptionByEmail(targetEmail, { status: "active", paymentMethod: null, items: [{ planId, quantity: 1, unitPrice: plan.basePrice }], totalAmount: plan.basePrice, currentPeriodStart: now, currentPeriodEnd: periodEnd, updatedAt: now });
      res.writeHead(200, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ success: true }));
    } catch (e) { res.writeHead(500, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // POST /api/admin/subscriptions/revoke
  if (req.method === "POST" && req.url === "/api/admin/subscriptions/revoke") {
    const u = await authRequired(req, res); if (!u) return;
    if (!isSuperadmin(u)) { res.writeHead(403, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "restrito" })); return; }
    try {
      const body = await readJsonBody(req); const targetEmail = String(body.targetEmail || "").trim().toLowerCase();
      const sub = await getSubscriptionByEmail(targetEmail);
      if (!sub) { res.writeHead(404, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "assinatura nao encontrada" })); return; }
      await setSubscriptionByEmail(targetEmail, { ...sub, status: "cancelled", canceledAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      res.writeHead(200, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ success: true }));
    } catch (e) { res.writeHead(500, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // ── PUT /api/admin/members/:uid/permissions ──
  if (req.method === "PUT" && req.url.startsWith("/api/admin/members/") && req.url.endsWith("/permissions")) {
    const u = await authRequired(req, res); if (!u) return;
    try {
      const urlPath = req.url.split("/api/admin/members/")[1]; const memberUid = urlPath.split("/")[0];
      const body = await readJsonBody(req); const { accountId, permissions } = body;
      if (!accountId || !permissions) { res.writeHead(400, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "accountId e permissions obrigatorios" })); return; }
      const db = getFirestore();
      const memberRef = db.collection("accounts").doc(accountId).collection("members").doc(memberUid);
      const memberDoc = await memberRef.get();
      if (!memberDoc.exists) { res.writeHead(404, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "membro nao encontrado" })); return; }
      const callerDoc = await db.collection("accounts").doc(accountId).collection("members").doc(u.uid).get();
      if (!callerDoc.exists || !['owner', 'admin'].includes(callerDoc.data().role)) { res.writeHead(403, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "sem permissao" })); return; }
      await memberRef.update({ permissions, updatedAt: new Date().toISOString() });
      res.writeHead(200, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ success: true }));
    } catch (e) { res.writeHead(500, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // ── Reports ──

  // POST /api/reports
  if (req.method === "POST" && req.url === "/api/reports") {
    const u = await authRequired(req, res); if (!u) return;
    try {
      const body = await readJsonBody(req); const db = getFirestore();
      const ref = await db.collection("reports").add({ type: body.type || 'bug', title: body.title || '', description: body.description || '', severity: body.type === 'bug' ? (body.severity || 'medium') : null, screenshot: body.screenshot || null, module: body.module || null, reporterId: u.uid, reporterEmail: u.email, reporterName: u.displayName || u.email, status: 'open', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() });
      const superadminEmail = process.env.SUPERADMIN_EMAIL;
      if (superadminEmail && RESEND_API_KEY) {
        fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: RESEND_FROM, to: [superadminEmail], subject: `Novo Report: ${escapeHtml(body.title || 'Sem título')}`, html: `<p><strong>Tipo:</strong> ${escapeHtml(body.type || 'bug')}</p><p><strong>Título:</strong> ${escapeHtml(body.title || '')}</p><p>${escapeHtml(body.description || '')}</p><p>Por: ${u.email}</p>` }) }).catch(() => {});
      }
      res.writeHead(201, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ success: true, data: { id: ref.id } }));
    } catch (e) { res.writeHead(500, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // GET /api/reports
  if (req.method === "GET" && req.url === "/api/reports") {
    const u = await authRequired(req, res); if (!u) return;
    try {
      const db = getFirestore(); const snap = await db.collection("reports").where("reporterId", "==", u.uid).orderBy("createdAt", "desc").get();
      res.writeHead(200, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() })) }));
    } catch (e) { res.writeHead(500, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // GET /api/admin/reports
  if (req.method === "GET" && req.url === "/api/admin/reports") {
    const u = await authRequired(req, res); if (!u) return;
    if (!isSuperadmin(u)) { res.writeHead(403, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "restrito" })); return; }
    try { const db = getFirestore(); const snap = await db.collection("reports").orderBy("createdAt", "desc").get(); res.writeHead(200, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ success: true, data: snap.docs.map(d => ({ id: d.id, ...d.data() })) })); } catch (e) { res.writeHead(500, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // PUT /api/admin/reports/:id
  if (req.method === "PUT" && req.url.startsWith("/api/admin/reports/")) {
    const u = await authRequired(req, res); if (!u) return;
    if (!isSuperadmin(u)) { res.writeHead(403, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: "restrito" })); return; }
    try {
      const reportId = req.url.split("/api/admin/reports/")[1]; const body = await readJsonBody(req); const db = getFirestore();
      const update = { updatedAt: new Date().toISOString() }; if (body.status) update.status = body.status; if (body.adminNotes !== undefined) update.adminNotes = body.adminNotes;
      await db.collection("reports").doc(reportId).update(update);
      if (body.status) {
        const snap = await db.collection("reports").doc(reportId).get();
        if (snap.exists && RESEND_API_KEY) {
          const report = snap.data();
          fetch("https://api.resend.com/emails", { method: "POST", headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ from: RESEND_FROM, to: [report.reporterEmail], subject: `Report atualizado: ${escapeHtml(body.status)}`, html: `<p>Seu report <strong>"${escapeHtml(report.title || '')}"</strong> foi atualizado para: <strong>${escapeHtml(body.status)}</strong></p>` }) }).catch(() => {});
        }
      }
      res.writeHead(200, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ success: true }));
    } catch (e) { res.writeHead(500, { ...corsHeaders(corsOrigin), "Content-Type": "application/json" }); res.end(JSON.stringify({ error: e.message })); }
    return;
  }

  // ── AI Proxy ──
  if (req.method === "POST" && req.url === "/api/ai/chat") {
    try { const parsed = await readJsonBody(req); parsed.stream ? await proxyStream(req, res, parsed) : await proxyNonStream(req, res, parsed); } catch { res.writeHead(400, corsHeaders(corsOrigin)); res.end(JSON.stringify({ error: "JSON invalido" })); }
    return;
  }

  res.writeHead(404, corsHeaders(corsOrigin)); res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`GeniusHub API rodando em http://localhost:${PORT}`);
  if (!NVIDIA_API_KEY) console.warn("NVIDIA_API_KEY nao configurada.");
  if (!RESEND_API_KEY) console.warn("RESEND_API_KEY nao configurada.");
});
