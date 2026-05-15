const http = require("http");
const https = require("https");
const crypto = require("crypto");
const {
  createCustomer,
  createSubscriptionCheckout,
  createTransparentPix,
  cancelSubscription,
} = require("./services/abacate.cjs");
const {
  getSubscriptionByEmail,
  setSubscriptionByEmail,
  addBillingHistory,
  hasProcessedWebhookEvent,
  markWebhookEventProcessed,
  getAllSubscriptions,
  getSubscriptionByUserId,
  setSubscriptionByUserId,
} = require("./services/subscription-store.cjs");
const { verifyFirebaseIdToken } = require("./services/firebase-auth.cjs");

const PORT = process.env.PORT || 3001;
const NVIDIA_HOST = "integrate.api.nvidia.com";
const MODEL = "google/gemma-3n-e4b-it";

const API_KEY = process.env.NVIDIA_API_KEY;
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || "GeniusHub <onboarding@geniushub.app>";
const ABACATE_WEBHOOK_SECRET = process.env.ABACATE_WEBHOOK_SECRET || "";
const ABACATE_PUBLIC_HMAC_KEY = "t9dXRhHHo3yDEj5pVDYz0frf7q6bMKyMRmxxCPIPp3RCplBfXRxqlC6ZpiWmOqj4L63qEaeUOtrCI8P0VMUgo6iIga2ri9ogaHFs0WIIywSMg0q7RmBfybe1E5XJcfC4IW3alNqym0tXoAKkzvfEjZxV6bE0oG2zJrNNYmUCKZyV0KZ3JS8Votf9EAWWYdiDkMkpbMdPggfh1EqHlVkMiTady6jOR3hyzGEHrIz2Ret0xHKMbiqkr9HS1JhNHDX9";

function corsHeaders() {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => { body += chunk; });
    req.on("end", () => {
      try {
        resolve(JSON.parse(body || "{}"));
      } catch (error) {
        reject(error);
      }
    });
    req.on("error", reject);
  });
}

function verifyAbacateSignature(rawBody, signatureFromHeader) {
  if (!signatureFromHeader) return false;
  const expected = crypto
    .createHmac("sha256", ABACATE_PUBLIC_HMAC_KEY)
    .update(Buffer.from(rawBody, "utf8"))
    .digest("base64");

  const A = Buffer.from(expected);
  const B = Buffer.from(signatureFromHeader);
  return A.length === B.length && crypto.timingSafeEqual(A, B);
}

async function authRequired(req, res) {
  const authHeader = String(req.headers.authorization || "");
  const [scheme, token] = authHeader.split(" ");
  if (scheme !== "Bearer" || !token) {
    res.writeHead(401, { ...corsHeaders(), "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "nao autenticado" }));
    return null;
  }

  try {
    return await verifyFirebaseIdToken(token);
  } catch {
    res.writeHead(401, { ...corsHeaders(), "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "token invalido" }));
    return null;
  }
}

// ── AI Proxy helpers ──

function buildPayload(body) {
  if (!API_KEY) {
    throw new Error("NVIDIA_API_KEY nao configurada");
  }
  return {
    model: MODEL,
    messages: body.messages,
    max_tokens: body.max_tokens || 512,
    temperature: body.temperature ?? 0.2,
    top_p: body.top_p ?? 0.7,
    frequency_penalty: body.frequency_penalty ?? 0,
    presence_penalty: body.presence_penalty ?? 0,
    stream: body.stream || false,
  };
}

function proxyNonStream(req, res, body) {
  return new Promise((resolve, reject) => {
    const payload = buildPayload(body);
    const data = JSON.stringify(payload);

    const options = {
      hostname: NVIDIA_HOST,
      port: 443,
      path: "/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
        "Accept": "application/json",
        "Content-Length": Buffer.byteLength(data),
      },
      timeout: 120000,
    };

    const proxyReq = https.request(options, (proxyRes) => {
      let responseData = "";
      proxyRes.on("data", (chunk) => { responseData += chunk; });
      proxyRes.on("end", () => {
        if (proxyRes.statusCode >= 400) {
          console.error("[non-stream] NVIDIA erro", proxyRes.statusCode, ":", responseData.slice(0, 500));
        }
        res.writeHead(proxyRes.statusCode, {
          ...corsHeaders(),
          "Content-Type": "application/json",
        });
        res.end(responseData);
        resolve();
      });
    });

    proxyReq.on("error", (err) => {
      console.error("[non-stream] Erro proxy NVIDIA:", err.message);
      res.writeHead(502, corsHeaders());
      res.end(JSON.stringify({ error: "Erro ao conectar com NVIDIA API: " + err.message }));
      reject(err);
    });

    proxyReq.on("timeout", () => {
      proxyReq.destroy();
      res.writeHead(504, corsHeaders());
      res.end(JSON.stringify({ error: "Timeout ao conectar com NVIDIA API" }));
      reject(new Error("timeout"));
    });

    proxyReq.write(data);
    proxyReq.end();
  });
}

function proxyStream(req, res, body) {
  return new Promise((resolve, reject) => {
    const payload = buildPayload(body);
    const data = JSON.stringify(payload);

    const options = {
      hostname: NVIDIA_HOST,
      port: 443,
      path: "/v1/chat/completions",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${API_KEY}`,
        "Accept": "text/event-stream",
        "Content-Length": Buffer.byteLength(data),
      },
      timeout: 120000,
    };

    const proxyReq = https.request(options, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, {
        ...corsHeaders(),
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        "Connection": "keep-alive",
      });

      proxyRes.on("data", (chunk) => {
        res.write(chunk);
      });

      proxyRes.on("end", () => {
        res.end();
        resolve();
      });

      proxyRes.on("error", (err) => {
        console.error("Stream error:", err.message);
        res.end();
        reject(err);
      });
    });

    proxyReq.on("error", (err) => {
      console.error("Erro proxy NVIDIA (stream):", err.message);
      res.writeHead(502, corsHeaders());
      res.end(JSON.stringify({ error: "Erro ao conectar com NVIDIA API: " + err.message }));
      reject(err);
    });

    proxyReq.on("timeout", () => {
      proxyReq.destroy();
      res.end();
      reject(new Error("timeout"));
    });

    proxyReq.write(data);
    proxyReq.end();
  });
}

// ── Resend helper ──

async function sendWelcomeEmail(email, displayName) {
  if (!RESEND_API_KEY) {
    console.log("[welcome-email] RESEND_API_KEY not set — skipping");
    return { skipped: true };
  }
  const resendResponse = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [email],
      subject: "Bem-vindo ao GeniusHub!",
      html: `<p>Olá ${displayName || "!"}</p><p>Seu trial de 7 dias no GeniusHub começou.</p>`,
    }),
  });
  if (!resendResponse.ok) {
    const errorBody = await resendResponse.text();
    console.error("[welcome-email] erro resend:", resendResponse.status, errorBody.slice(0, 300));
    throw new Error("falha ao enviar email");
  }
  return { ok: true };
}

// ── HTTP Server ──

const server = http.createServer(async (req, res) => {
  if (req.method === "OPTIONS") {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { ...corsHeaders(), "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok", model: MODEL }));
    return;
  }

  // ── POST /api/auth/welcome ──
  if (req.method === "POST" && req.url === "/api/auth/welcome") {
    try {
      const body = await readJsonBody(req);
      const email = (body.email || "").trim();
      const displayName = (body.displayName || "").trim();
      if (!email) {
        res.writeHead(400, { ...corsHeaders(), "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "email obrigatorio" }));
        return;
      }
      const result = await sendWelcomeEmail(email, displayName);
      res.writeHead(result.skipped ? 202 : 200, { ...corsHeaders(), "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (error) {
      res.writeHead(400, { ...corsHeaders(), "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "JSON invalido" }));
    }
    return;
  }

  // ── POST /api/sub/create ──
  if (req.method === "POST" && req.url === "/api/sub/create") {
    try {
      const authUser = await authRequired(req, res);
      if (!authUser) return;

      const body = await readJsonBody(req);
      const userEmail = String(authUser.email || "").trim().toLowerCase();
      const customerName = String(body.customerName || authUser.displayName || "Cliente GeniusHub").trim();
      const paymentMethod = body.paymentMethod === "PIX" ? "PIX" : "CARD";
      const items = Array.isArray(body.items) ? body.items : [];

      if (!userEmail || !items.length) {
        res.writeHead(400, { ...corsHeaders(), "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "userEmail e items sao obrigatorios" }));
        return;
      }

      const totalAmount = items.reduce((sum, item) => {
        const price = Number(item.unitPrice || 0);
        const quantity = Number(item.quantity || 0);
        return sum + (price * quantity);
      }, 0);

      let currentSub = await getSubscriptionByEmail(userEmail);
      if (!currentSub || !currentSub.abacateCustomerId) {
        const customer = await createCustomer({
          name: customerName,
          email: userEmail,
          cellphone: body.cellphone || undefined,
          taxId: body.taxId || undefined,
        });
        currentSub = {
          ...(currentSub || {}),
          abacateCustomerId: customer.id,
        };
      }

      if (paymentMethod === "CARD") {
        const checkout = await createSubscriptionCheckout({
          customerId: currentSub.abacateCustomerId,
          methods: ["CARD"],
          metadata: { userEmail },
          items: items.map((item) => ({
            id: item.abacateProductId || item.planId,
            quantity: Number(item.quantity || 1),
          })),
        });

        await setSubscriptionByEmail(userEmail, {
          ...currentSub,
          status: "pending",
          paymentMethod: "CARD",
          items,
          totalAmount,
          abacateSubscriptionId: checkout.id,
          updatedAt: new Date().toISOString(),
        });

        res.writeHead(200, { ...corsHeaders(), "Content-Type": "application/json" });
        res.end(JSON.stringify({
          success: true,
          data: { id: checkout.id, url: checkout.url, paymentMethod: "CARD" },
        }));
        return;
      }

      // PIX
      const pix = await createTransparentPix({
        amount: totalAmount,
        description: "GeniusHub - Assinatura",
        customer: { name: customerName, email: userEmail, taxId: body.taxId || undefined },
        expiresIn: 3600,
        metadata: { userEmail },
      });

      await setSubscriptionByEmail(userEmail, {
        ...currentSub,
        status: "pending",
        paymentMethod: "PIX",
        items,
        totalAmount,
        pendingPix: {
          id: pix.id,
          brCode: pix.brCode,
          brCodeBase64: pix.brCodeBase64,
          expiresAt: pix.expiresAt,
        },
        updatedAt: new Date().toISOString(),
      });

      res.writeHead(200, { ...corsHeaders(), "Content-Type": "application/json" });
      res.end(JSON.stringify({
        success: true,
        data: {
          id: pix.id,
          brCode: pix.brCode,
          brCodeBase64: pix.brCodeBase64,
          expiresAt: pix.expiresAt,
          paymentMethod: "PIX",
        },
      }));
    } catch (error) {
      res.writeHead(500, { ...corsHeaders(), "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: error.message || "erro ao criar assinatura" }));
    }
    return;
  }

  // ── GET /api/sub/status ──
  if (req.method === "GET" && req.url.startsWith("/api/sub/status")) {
    const authUser = await authRequired(req, res);
    if (!authUser) return;
    const userEmail = String(authUser.email || "").trim().toLowerCase();
    const sub = await getSubscriptionByEmail(userEmail);

    // Busca também o trial do Firestore
    let trial = null;
    try {
      const { firestore } = require("./services/firebase-admin.cjs");
      const trialDoc = await firestore().collection("trials").doc(authUser.uid).get();
      if (trialDoc.exists) {
        trial = { id: trialDoc.id, ...trialDoc.data() };
      }
    } catch {} // trial lookup is best-effort

    res.writeHead(200, { ...corsHeaders(), "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true, data: { subscription: sub, trial } }));
    return;
  }

  // ── POST /api/sub/cancel ──
  if (req.method === "POST" && req.url === "/api/sub/cancel") {
    const authUser = await authRequired(req, res);
    if (!authUser) return;
    const userEmail = String(authUser.email || "").trim().toLowerCase();
    const sub = await getSubscriptionByEmail(userEmail);

    if (!sub) {
      res.writeHead(404, { ...corsHeaders(), "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "assinatura nao encontrada" }));
      return;
    }

    if (sub.abacateSubscriptionId && sub.paymentMethod === "CARD") {
      try { await cancelSubscription(sub.abacateSubscriptionId); } catch (e) {
        console.error("[sub/cancel] Erro AbacatePay:", e.message);
      }
    }

    await setSubscriptionByEmail(userEmail, {
      ...sub,
      status: "cancelled",
      canceledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    res.writeHead(200, { ...corsHeaders(), "Content-Type": "application/json" });
    res.end(JSON.stringify({ success: true }));
    return;
  }

  // ── GET /api/sub/pix-pending ──
  if (req.method === "GET" && req.url.startsWith("/api/sub/pix-pending")) {
    const authUser = await authRequired(req, res);
    if (!authUser) return;
    const userEmail = String(authUser.email || "").trim().toLowerCase();
    const sub = await getSubscriptionByEmail(userEmail);

    res.writeHead(200, { ...corsHeaders(), "Content-Type": "application/json" });
    res.end(JSON.stringify({
      success: true,
      data: sub?.pendingPix || null,
    }));
    return;
  }

  // ── POST /api/webhooks/abacate ──
  if (req.method === "POST" && req.url.startsWith("/api/webhooks/abacate")) {
    try {
      let rawBody = "";
      req.on("data", (chunk) => { rawBody += chunk; });
      await new Promise((resolve) => req.on("end", resolve));
      const event = JSON.parse(rawBody || "{}");
      if (!event?.id || !event?.event) {
        res.writeHead(400, { ...corsHeaders(), "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "payload invalido" }));
        return;
      }

      const requestUrl = new URL(req.url, "http://localhost");
      const webhookSecret = String(requestUrl.searchParams.get("webhookSecret") || "");
      if (ABACATE_WEBHOOK_SECRET && webhookSecret !== ABACATE_WEBHOOK_SECRET) {
        res.writeHead(401, { ...corsHeaders(), "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "webhookSecret invalido" }));
        return;
      }

      const signatureHeader = req.headers["x-webhook-signature"] || req.headers["x-abacate-signature"];
      if (!verifyAbacateSignature(rawBody, String(signatureHeader || ""))) {
        res.writeHead(401, { ...corsHeaders(), "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "assinatura invalida" }));
        return;
      }

      const alreadyProcessed = await hasProcessedWebhookEvent(event.id);
      if (alreadyProcessed) {
        res.writeHead(200, { ...corsHeaders(), "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true, deduplicated: true }));
        return;
      }
      await markWebhookEventProcessed(event.id);

      const eventEmail = String(
        event.data?.metadata?.userEmail || event.data?.customer?.email || ""
      ).trim().toLowerCase();

      if (eventEmail) {
        const previous = await getSubscriptionByEmail(eventEmail);
        if (!previous) {
          res.writeHead(200, { ...corsHeaders(), "Content-Type": "application/json" });
          res.end(JSON.stringify({ success: true, ignored: true }));
          return;
        }

        const now = new Date().toISOString();

        if (event.event === "subscription.completed" || event.event === "transparent.completed") {
          const currentPeriodStart = now;
          const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

          await setSubscriptionByEmail(eventEmail, {
            ...previous,
            status: "active",
            pendingPix: null,
            currentPeriodStart,
            currentPeriodEnd,
            updatedAt: now,
          });

          await addBillingHistory({
            eventId: event.id,
            userEmail: eventEmail,
            type: "payment_paid",
            amount: event.data?.amount || previous.totalAmount || 0,
            status: "PAID",
            createdAt: now,
          });
        } else if (event.event === "subscription.renewed") {
          const currentPeriodStart = now;
          const currentPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

          // Se PIX, gera novo QR code para o próximo ciclo
          let newPendingPix = previous.pendingPix || null;
          if (previous.paymentMethod === "PIX" && previous.totalAmount) {
            try {
              const pix = await createTransparentPix({
                amount: previous.totalAmount,
                description: "GeniusHub - Renovação mensal",
                customer: { email: eventEmail },
                expiresIn: 3600,
                metadata: { userEmail: eventEmail },
              });
              newPendingPix = {
                id: pix.id,
                brCode: pix.brCode,
                brCodeBase64: pix.brCodeBase64,
                expiresAt: pix.expiresAt,
              };
            } catch (e) {
              console.error("[webhook/renewed] Erro ao gerar PIX:", e.message);
            }
          }

          await setSubscriptionByEmail(eventEmail, {
            ...previous,
            status: "active",
            pendingPix: newPendingPix,
            currentPeriodStart,
            currentPeriodEnd,
            updatedAt: now,
          });

          await addBillingHistory({
            eventId: event.id,
            userEmail: eventEmail,
            type: "payment_paid",
            amount: event.data?.amount || previous.totalAmount || 0,
            status: "PAID",
            createdAt: now,
          });
        } else if (event.event === "subscription.cancelled") {
          await setSubscriptionByEmail(eventEmail, {
            ...previous,
            status: "cancelled",
            canceledAt: now,
            updatedAt: now,
          });

          await addBillingHistory({
            eventId: event.id,
            userEmail: eventEmail,
            type: "subscription_cancelled",
            amount: previous.totalAmount || 0,
            status: "CANCELLED",
            createdAt: now,
          });
        } else if (event.event === "subscription.past_due") {
          await setSubscriptionByEmail(eventEmail, {
            ...previous,
            status: "past_due",
            updatedAt: now,
          });

          await addBillingHistory({
            eventId: event.id,
            userEmail: eventEmail,
            type: "payment_failed",
            amount: previous.totalAmount || 0,
            status: "FAILED",
            createdAt: now,
          });
        }
      }

      res.writeHead(200, { ...corsHeaders(), "Content-Type": "application/json" });
      res.end(JSON.stringify({ success: true }));
    } catch {
      res.writeHead(400, { ...corsHeaders(), "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "JSON invalido" }));
    }
    return;
  }

  // ── POST /api/ai/chat ──
  if (req.method === "POST" && req.url === "/api/ai/chat") {
    try {
      const parsed = await readJsonBody(req);
      if (parsed.stream) {
        await proxyStream(req, res, parsed);
      } else {
        await proxyNonStream(req, res, parsed);
      }
    } catch (e) {
      res.writeHead(400, corsHeaders());
      res.end(JSON.stringify({ error: "JSON invalido" }));
    }
    return;
  }

  res.writeHead(404, corsHeaders());
  res.end(JSON.stringify({ error: "Not found" }));
});

server.listen(PORT, () => {
  console.log(`GeniusHub API rodando em http://localhost:${PORT}`);
  console.log(`Modelo AI: ${MODEL}`);
  if (!API_KEY) {
    console.warn("Aviso: NVIDIA_API_KEY nao configurada. /api/ai/chat ficara indisponivel.");
  }
  if (!RESEND_API_KEY) {
    console.warn("Aviso: RESEND_API_KEY nao configurada. Emails transacionais desabilitados.");
  }
});
