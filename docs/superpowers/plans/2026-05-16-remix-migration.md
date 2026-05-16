# Remix Migration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Migrate Vite+React SPA with separate Express server to Remix SSR monolith, keeping Firestore real-time listeners and adding URL-based routing.

**Architecture:** Remix Vite plugin replaces plain Vite. All pages become file-based routes under `app/routes/`. Sidebar+Header live in a shared `_app` layout. Backend `server/index.cjs` splits into `app/services/*.server.ts` (business logic) + `app/routes/api/*.ts` (resource routes). Firebase Auth stays client-side; Firestore real-time listeners stay in hooks.

**Tech Stack:** Remix 2 + Vite 6 + React 19 + TailwindCSS 4 + Firebase (client + admin) + TypeScript

---

### Task 1: Install Remix dependencies and update config

**Files:**
- Modify: `package.json`
- Modify: `vite.config.ts`
- Modify: `tsconfig.json`
- Create: `app/vite-env.d.ts`

- [ ] **Step 1: Install Remix packages**

Run: `npm install @remix-run/react @remix-run/node @remix-run/serve`
Run: `npm install -D @remix-run/dev`

- [ ] **Step 2: Update package.json scripts**

Replace:
```json
"dev": "vite --port=3000 --host=0.0.0.0",
"build": "vite build",
"preview": "vite preview",
"server": "node server/index.cjs"
```

With:
```json
"dev": "remix vite:dev --port=3000 --host=0.0.0.0",
"build": "remix vite:build",
"start": "remix-serve build/server/index.js",
"preview": "remix-serve build/server/index.js"
```

Remove `"clean": "rm -rf dist"`.

- [ ] **Step 3: Update vite.config.ts**

Replace with Remix Vite plugin:

```ts
import { vitePlugin as remix } from "@remix-run/dev";
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';
import path from 'path';
import { defineConfig, loadEnv } from 'vite';

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, '.', '');
  return {
    plugins: [
      remix(),
      tailwindcss(),
      VitePWA({
        registerType: 'autoUpdate',
        manifest: {
          name: 'Genius Hub',
          short_name: 'GeniusHub',
          description: 'Hub completo para gestão financeira, comercial e de projetos.',
          theme_color: '#1e293b',
          background_color: '#f4f6f8',
          display: 'standalone',
          icons: [
            {
              src: 'icon.svg',
              sizes: '192x192 512x512',
              type: 'image/svg+xml',
              purpose: 'any maskable'
            }
          ]
        }
      })
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      'process.env.VITE_AI_PROXY': JSON.stringify(env.VITE_AI_PROXY || ''),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
```

- [ ] **Step 4: Update tsconfig.json**

Replace with Remix-compatible config:

```json
{
  "include": ["**/*.ts", "**/*.tsx"],
  "compilerOptions": {
    "lib": ["DOM", "DOM.Iterable", "ES2022"],
    "types": ["@remix-run/node", "vite/client"],
    "isolatedModules": true,
    "esModuleInterop": true,
    "jsx": "react-jsx",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "target": "ES2022",
    "strict": true,
    "allowJs": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "baseUrl": ".",
    "paths": {
      "~/*": ["./app/*"]
    },
    "noEmit": true
  }
}
```

- [ ] **Step 5: Create app/env.d.ts**

```ts
/// <reference types="@remix-run/node" />
/// <reference types="vite/client" />
```

- [ ] **Step 6: Commit**

```bash
git add package.json package-lock.json vite.config.ts tsconfig.json app/env.d.ts
git commit -m "chore: add Remix deps and update config"
```

---

### Task 2: Create Remix entry points (root, entry.client, entry.server)

**Files:**
- Create: `app/entry.client.tsx`
- Create: `app/entry.server.tsx`
- Create: `app/root.tsx`
- Create: `app/styles/index.css` (move from src/index.css)

- [ ] **Step 1: Create app/entry.client.tsx**

```tsx
import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";

startTransition(() => {
  hydrateRoot(
    document,
    <StrictMode>
      <RemixBrowser />
    </StrictMode>
  );
});
```

- [ ] **Step 2: Create app/entry.server.tsx**

```tsx
import { PassThrough } from "node:stream";
import type { AppLoadContext, EntryContext } from "@remix-run/node";
import { createReadableStreamFromReadable } from "@remix-run/node";
import { RemixServer } from "@remix-run/react";
import { isbot } from "isbot";
import { renderToPipeableStream } from "react-dom/server";

const ABORT_DELAY = 5_000;

export default function handleRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
  loadContext: AppLoadContext,
) {
  return isbot(request.headers.get("user-agent") || "")
    ? handleBotRequest(request, responseStatusCode, responseHeaders, remixContext)
    : handleBrowserRequest(request, responseStatusCode, responseHeaders, remixContext);
}

function handleBotRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />,
      {
        onAllReady() {
          shellRendered = true;
          const body = new PassThrough();
          responseHeaders.set("Content-Type", "text/html");
          resolve(new Response(createReadableStreamFromReadable(body), { headers: responseHeaders, status: responseStatusCode }));
          pipe(body);
        },
        onShellError(error: unknown) { reject(error); },
        onError(error: unknown) {
          responseStatusCode = 500;
          if (shellRendered) console.error(error);
        },
      },
    );
    setTimeout(abort, ABORT_DELAY);
  });
}

function handleBrowserRequest(
  request: Request,
  responseStatusCode: number,
  responseHeaders: Headers,
  remixContext: EntryContext,
) {
  return new Promise((resolve, reject) => {
    let shellRendered = false;
    const { pipe, abort } = renderToPipeableStream(
      <RemixServer context={remixContext} url={request.url} abortDelay={ABORT_DELAY} />,
      {
        onShellReady() {
          shellRendered = true;
          const body = new PassThrough();
          responseHeaders.set("Content-Type", "text/html");
          resolve(new Response(createReadableStreamFromReadable(body), { headers: responseHeaders, status: responseStatusCode }));
          pipe(body);
        },
        onShellError(error: unknown) { reject(error); },
        onError(error: unknown) {
          responseStatusCode = 500;
          if (shellRendered) console.error(error);
        },
      },
    );
    setTimeout(abort, ABORT_DELAY);
  });
}
```

- [ ] **Step 3: Install isbot**

Run: `npm install isbot`

- [ ] **Step 4: Create app/root.tsx**

Move imports from index.html meta tags into root. Import global CSS here.

```tsx
import type { LinksFunction, MetaFunction } from "@remix-run/node";
import { Links, Meta, Outlet, Scripts, ScrollRestoration } from "@remix-run/react";
import { FinanceProvider } from "./hooks/useFinance";
import styles from "./styles/index.css?url";

export const meta: MetaFunction = () => [
  { charset: "utf-8" },
  { name: "viewport", content: "width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" },
  { name: "theme-color", content: "#1e293b" },
  { name: "description", content: "Hub completo para gestão financeira, comercial e de projetos." },
  { title: "Genius Hub" },
];

export const links: LinksFunction = () => [
  { rel: "icon", type: "image/x-icon", href: "/favicon.ico" },
  { rel: "icon", type: "image/svg+xml", href: "/icon.svg" },
  { rel: "apple-touch-icon", href: "/logo.png" },
  { rel: "stylesheet", href: styles },
];

export default function Root() {
  return (
    <html lang="pt-br">
      <head>
        <Meta />
        <Links />
      </head>
      <body>
        <FinanceProvider>
          <Outlet />
        </FinanceProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}
```

- [ ] **Step 5: Move CSS to app/styles/index.css**

Copy `src/index.css` to `app/styles/index.css`.

- [ ] **Step 6: Update imports in all moved files**

All `@/` imports become `~/` (Remix convention). Run a global search/replace:
- `@/` → `~/` in app/ files

- [ ] **Step 7: Commit**

---

### Task 3: Migrate shared code (components, hooks, lib, types)

**Files:**
- Move: `src/components/*` → `app/components/*`
- Move: `src/hooks/*` → `app/hooks/*`
- Move: `src/lib/*` → `app/lib/*`
- Move: `src/types.ts` → `app/types.ts`

- [ ] **Step 1: Move all files from src/ to app/**

Copy all files preserving structure:
- `src/components/**` → `app/components/**`
- `src/hooks/**` → `app/hooks/**`
- `src/lib/**` → `app/lib/**`
- `src/types.ts` → `app/types.ts`

- [ ] **Step 2: Update imports**

In all moved files, change:
- `'../types'` stays as-is (relative)
- `'@/'` prefix → `'~/'` prefix (if any use the alias)
- `'../../firebase-applet-config.json'` → `'../firebase-applet-config.json'` (since app/ is one level deeper than src/ was)
- In `app/lib/firebase.ts`: `import firebaseConfig from '../../firebase-applet-config.json'` → `import firebaseConfig from '../firebase-applet-config.json'`

- [ ] **Step 3: Update path adapter import path**

In `app/lib/pathAdapter.ts`, update any imports that reference `@/` paths.

- [ ] **Step 4: Commit**

---

### Task 4: Extract backend services from server/index.cjs

**Files:**
- Create: `app/services/abacate.server.ts`
- Create: `app/services/firebase-admin.server.ts`
- Create: `app/services/subscription-store.server.ts`
- Create: `app/services/email.server.ts`
- Create: `app/services/auth.server.ts`

- [ ] **Step 1: Create app/services/firebase-admin.server.ts**

Extract Firebase Admin init and helpers:

```ts
import { getApps, initializeApp, cert } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { getAuth } from "firebase-admin/auth";

let initialized = false;

function initAdmin() {
  if (initialized || getApps().length > 0) return;
  try {
    const rawServiceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (rawServiceAccount) {
      const serviceAccount = JSON.parse(rawServiceAccount);
      initializeApp({ credential: cert(serviceAccount) });
    } else {
      initializeApp();
    }
  } catch (err) {
    console.error("[firebase-admin] falha ao inicializar:", (err as Error)?.message || err);
  }
  initialized = true;
}

export function getAdminFirestore() {
  initAdmin();
  return getFirestore();
}

export function getAdminAuth() {
  initAdmin();
  return getAuth();
}
```

- [ ] **Step 2: Create app/services/abacate.server.ts**

Extract AbacatePay API functions:

```ts
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

export async function createCustomer(data: Record<string, unknown>) { return abacateRequest("/customers/create", { method: "POST", body: data }); }
export async function createSubscriptionCheckout(data: Record<string, unknown>) { return abacateRequest("/subscriptions/create", { method: "POST", body: data }); }
export async function createTransparentPix(data: Record<string, unknown>) { return abacateRequest("/transparents/create", { method: "POST", body: { method: "PIX", data } }); }
export async function cancelSubscription(id: string) { return abacateRequest(`/subscriptions/${id}/cancel`, { method: "POST" }); }
```

- [ ] **Step 3: Create app/services/subscription-store.server.ts**

Extract Firestore subscription operations:

```ts
import { getAdminFirestore } from "./firebase-admin.server";

const SUB_COL = "subscriptions";
const BILLING_COL = "billing_history";
const EVENTS_COL = "processed_webhook_events";

export async function getSubscriptionByEmail(email: string) {
  if (!email) return null;
  const db = getAdminFirestore();
  const snap = await db.collection(SUB_COL).where("userEmail", "==", email.toLowerCase().trim()).limit(1).get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return { id: doc.id, ...doc.data() };
}

export async function setSubscriptionByEmail(email: string, data: Record<string, unknown>) {
  if (!email) throw new Error("email obrigatório");
  const db = getAdminFirestore();
  const normalized = email.toLowerCase().trim();
  const existing = await db.collection(SUB_COL).where("userEmail", "==", normalized).limit(1).get();
  const docData = { ...data, userEmail: normalized, updatedAt: new Date().toISOString() };
  if (!existing.empty) {
    await db.collection(SUB_COL).doc(existing.docs[0].id).set(docData, { merge: true });
    return existing.docs[0].id;
  }
  const ref = await db.collection(SUB_COL).add({ ...docData, createdAt: new Date().toISOString() });
  return ref.id;
}

export async function addBillingHistory(entry: Record<string, unknown>) {
  const db = getAdminFirestore();
  const ref = await db.collection(BILLING_COL).add({ ...entry, createdAt: entry.createdAt || new Date().toISOString() });
  return ref.id;
}

export async function markWebhookEventProcessed(eventId: string) {
  if (!eventId) return false;
  const db = getAdminFirestore();
  try {
    await db.collection(EVENTS_COL).doc(eventId).create({ processedAt: new Date().toISOString() });
    return true;
  } catch (err: unknown) {
    const e = err as { code?: number; message?: string };
    if (e.code === 6 || (e.message && e.message.includes("ALREADY_EXISTS"))) return false;
    throw err;
  }
}

export async function getAllSubscriptions() {
  const db = getAdminFirestore();
  const snap = await db.collection(SUB_COL).orderBy("updatedAt", "desc").get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }));
}
```

- [ ] **Step 4: Create app/services/email.server.ts**

Extract Resend email sending:

```ts
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM = process.env.RESEND_FROM || "GeniusHub <onboarding@geniushub.app>";

export async function sendWelcomeEmail(email: string, displayName: string) {
  if (!RESEND_API_KEY) {
    console.log("[welcome] RESEND_API_KEY not set");
    return { skipped: true };
  }
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from: RESEND_FROM,
      to: [email],
      subject: "Bem-vindo ao GeniusHub!",
      html: `<p>Olá ${displayName || "!"}</p><p>Seu trial de 7 dias começou.</p>`,
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("[welcome] erro:", res.status, err.slice(0, 300));
    throw new Error("falha ao enviar email");
  }
  return { ok: true };
}

export function escapeHtml(str: string) {
  return String(str).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] || c);
}

export async function sendEmail(to: string[], subject: string, html: string) {
  if (!RESEND_API_KEY) throw new Error("RESEND_API_KEY nao configurada");
  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${RESEND_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({ from: RESEND_FROM, to, subject, html }),
  });
  if (!res.ok) {
    const err = await res.text();
    console.error("[email] erro:", res.status, err.slice(0, 300));
    throw new Error("falha ao enviar email");
  }
  return { ok: true };
}
```

- [ ] **Step 5: Create app/services/auth.server.ts**

Extract Firebase token verification:

```ts
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
      role: decoded.role || null,
    };
  } catch {
    // Fallback to REST API
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
```

- [ ] **Step 6: Commit**

---

### Task 5: Create API resource routes

**Files:**
- Create: `app/routes/api/ai.chat.ts`
- Create: `app/routes/api/auth.welcome.ts`
- Create: `app/routes/api/sub.create.ts`
- Create: `app/routes/api/sub.status.ts`
- Create: `app/routes/api/sub.cancel.ts`
- Create: `app/routes/api/sub.pix-pending.ts`
- Create: `app/routes/api/webhooks.abacate.ts`
- Create: `app/routes/api/admin.plans.ts`
- Create: `app/routes/api/admin.subscriptions.ts`
- Create: `app/routes/api/admin.reports.ts`
- Create: `app/routes/api/admin.members.$uid.permissions.ts`
- Create: `app/routes/api/reports.ts`
- Create: `app/lib/api-helpers.server.ts`

- [ ] **Step 1: Create app/lib/api-helpers.server.ts**

Shared helpers for API routes (CORS, auth, JSON parsing):

```ts
import { verifyFirebaseIdToken } from "~/services/auth.server";

export function corsHeaders(origin: string) {
  return {
    "Access-Control-Allow-Origin": origin || "*",
    "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };
}

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
  } catch (err) {
    throw new Response(JSON.stringify({ error: "token invalido" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
}
```

- [ ] **Step 2: Create each API route file**

Each file exports `action` (for POST/PUT/DELETE) or `loader` (for GET). Example for `app/routes/api/sub.status.ts`:

```ts
import type { LoaderFunctionArgs } from "@remix-run/node";
import { requireAuth } from "~/lib/api-helpers.server";
import { getSubscriptionByEmail } from "~/services/subscription-store.server";
import { getAdminFirestore } from "~/services/firebase-admin.server";

export async function loader({ request }: LoaderFunctionArgs) {
  const authUser = await requireAuth(request);
  const userEmail = authUser.email.trim().toLowerCase();
  const sub = await getSubscriptionByEmail(userEmail);

  let trial = null;
  try {
    const db = getAdminFirestore();
    const trialDoc = await db.collection("trials").doc(authUser.uid).get();
    if (trialDoc.exists) {
      const data = trialDoc.data();
      if (data) {
        trial = { id: trialDoc.id, ...serializeFirestoreDoc(data) };
      }
    }
  } catch {}

  return Response.json({ success: true, data: { subscription: sub, trial } });
}

function serializeFirestoreDoc(doc: Record<string, unknown>): Record<string, unknown> {
  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(doc)) {
    if (value && typeof value === "object" && (value as any).constructor?.name === "Timestamp") {
      data[key] = (value as any).toDate().toISOString();
    } else if (value && typeof value === "object" && (value as any)._seconds !== undefined) {
      data[key] = new Date((value as any)._seconds * 1000).toISOString();
    } else if (value && typeof value === "object" && !Array.isArray(value)) {
      data[key] = serializeFirestoreDoc(value as Record<string, unknown>);
    } else {
      data[key] = value;
    }
  }
  return data;
}
```

- [ ] **Step 3: Create remaining API routes** following same pattern

Each route maps the equivalent logic from `server/index.cjs`:
- `sub.create.ts` — POST → `createCustomer`, `createSubscriptionCheckout`, `createTransparentPix`
- `sub.cancel.ts` — POST → `cancelSubscription`, update Firestore
- `sub.pix-pending.ts` — GET → `getSubscriptionByEmail`, return `pendingPix`
- `auth.welcome.ts` — POST → `sendWelcomeEmail`
- `webhooks.abacate.ts` — POST → webhook verification + processing
- `admin.plans.ts` — GET/POST/PUT/DELETE handlers
- `admin.subscriptions.ts` — GET + POST assign/revoke
- `admin.reports.ts` — GET/PUT
- `admin.members.$uid.permissions.ts` — PUT
- `reports.ts` — POST/GET
- `ai.chat.ts` — POST → NVIDIA proxy (stream + non-stream)

- [ ] **Step 4: Commit**

---

### Task 6: Create page routes and shared layout

**Files:**
- Create: `app/routes/_index.tsx` (login/landing page)
- Create: `app/routes/_app.tsx` (authenticated layout with Sidebar + Header)
- Create: `app/routes/_app.dashboard.tsx`
- Create: `app/routes/_app.transactions.tsx`
- Create: `app/routes/_app.fixed-monthly.tsx`
- Create: `app/routes/_app.credit-cards.tsx`
- Create: `app/routes/_app.dre.tsx`
- Create: `app/routes/_app.budget.tsx`
- Create: `app/routes/_app.sales.tsx`
- Create: `app/routes/_app.goals.tsx`
- Create: `app/routes/_app.commercial.tsx`
- Create: `app/routes/_app.projects.tsx`
- Create: `app/routes/_app.service-types.tsx`
- Create: `app/routes/_app.reports.tsx`
- Create: `app/routes/_app.subscription.tsx`
- Create: `app/routes/_app.settings.tsx`
- Create: `app/routes/_app.report-issue.tsx`
- Create: `app/routes/_app.admin.plans.tsx`
- Create: `app/routes/_app.admin.subscriptions.tsx`
- Create: `app/routes/_app.admin.reports.tsx`

- [ ] **Step 1: Create _index.tsx (login page)**

Extract login UI from App.tsx (the `!user` branch):

```tsx
import { useEffect, useState } from "react";
import { useNavigate } from "@remix-run/react";
import { useFinance } from "~/hooks/useFinance";
import { LoginEmailForm } from "~/components/LoginEmailForm";
import LegalModal from "~/components/LegalModal";
import { TERMOS_DE_USO } from "~/lib/termos-de-uso";
import { POLITICA_PRIVACIDADE } from "~/lib/politica-privacidade";

export default function Index() {
  const { user, loading, signInWithGoogle } = useFinance();
  const navigate = useNavigate();
  const [termsAccepted, setTermsAccepted] = useState(() => {
    try { return localStorage.getItem("gh_terms_accepted") === "true"; } catch { return false; }
  });
  const [legalModal, setLegalModal] = useState<"terms" | "privacy" | null>(null);
  const TERMS_KEY = "gh_terms_accepted";

  useEffect(() => {
    if (user) navigate("/dashboard", { replace: true });
  }, [user, navigate]);

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-bg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (user) return null;

  return (
    <div className="flex flex-col h-[100dvh] items-center justify-center bg-gradient-to-br from-bg to-primary/5 px-4 relative overflow-hidden">
      {/* ... same login UI from App.tsx ... */}
    </div>
  );
}
```

- [ ] **Step 2: Create _app.tsx (authenticated layout)**

Extract sidebar + header + outlet from App.tsx. Contains the sidebar nav, header, and `<Outlet />` for child routes.

```tsx
import { useEffect, useState } from "react";
import { Outlet, useNavigate, useLocation } from "@remix-run/react";
import { useFinance } from "~/hooks/useFinance";
import { Header } from "~/components/Header";
import { TrialModal } from "~/components/TrialModal";
import { PieChart, List, CreditCard, Calendar, Settings, FileBarChart, X, Calculator, TrendingUp, Target, Users, Kanban, Layers, ShoppingCart, ShieldCheck, Bug, Clock } from "lucide-react";
import { cn } from "~/lib/utils";
import type { ViewType } from "~/types";

const DASHBOARD_VALUES_KEY = "dashboard_values_visible";

const menuItems = [
  { path: "/dashboard", label: "Dashboard", icon: PieChart },
  { path: "/transactions", label: "Entradas / Saídas", icon: List },
  { path: "/fixed-monthly", label: "Fixos Mensais", icon: Calendar },
  { path: "/credit-cards", label: "Cartões de Crédito", icon: CreditCard },
  { path: "/dre", label: "DRE", icon: Calculator },
  { path: "/budget", label: "Orçamento", icon: TrendingUp },
  { path: "/sales", label: "Vendas", icon: TrendingUp },
  { path: "/goals", label: "Metas", icon: Target },
  { path: "/reports", label: "Relatórios Anuais", icon: FileBarChart },
  { path: "/subscription", label: "Assinatura", icon: ShoppingCart },
  { path: "/report-issue", label: "Reportar Problema", icon: Bug },
  { path: "/commercial", label: "Leads", icon: Users },
  { path: "/projects", label: "Projetos", icon: Kanban },
  { path: "/service-types", label: "Tipos de Serviço", icon: Layers },
];

const adminItems = [
  { path: "/admin/plans", label: "Planos", icon: ShieldCheck },
  { path: "/admin/subscriptions", label: "Assinaturas", icon: Users },
  { path: "/admin/reports", label: "Reports", icon: Bug },
];

export default function AppLayout() {
  const { user, loading, signOut, activeScope, pendingInvites } = useFinance();
  const navigate = useNavigate();
  const location = useLocation();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isSuperadmin, setIsSuperadmin] = useState(false);
  const [dashboardValuesVisible, setDashboardValuesVisible] = useState<boolean>(() => {
    try {
      const raw = localStorage.getItem(DASHBOARD_VALUES_KEY);
      return raw ? JSON.parse(raw) !== false : true;
    } catch { return true; }
  });
  const [showTrialModal, setShowTrialModal] = useState(false);
  const [trialDaysLeft, setTrialDaysLeft] = useState(0);
  const [isTrial, setIsTrial] = useState(false);

  useEffect(() => {
    if (!user) {
      navigate("/", { replace: true });
      return;
    }
    user.getIdTokenResult().then((result) => {
      setIsSuperadmin(result.claims.role === "superadmin");
    }).catch(() => {});
  }, [user, navigate]);

  // ... trial check effect from App.tsx ...

  if (loading) {
    return (
      <div className="flex h-[100dvh] items-center justify-center bg-bg">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="flex h-[100dvh] bg-bg overflow-hidden text-text-primary">
      {/* Mobile overlay */}
      {isSidebarOpen && (
        <div className="fixed inset-0 bg-black/30 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)} />
      )}

      {/* Sidebar — same structure from App.tsx */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-60 bg-text-primary text-surface flex flex-col py-6 transform transition-transform duration-300 ease-in-out lg:relative lg:translate-x-0 shrink-0",
        isSidebarOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        {/* ... sidebar content with nav using navigate(path) ... */}
        {menuItems.map(item => (
          <button key={item.path} onClick={() => { navigate(item.path); setIsSidebarOpen(false); }}
            className={cn("px-6 py-2.5 text-[0.85rem] flex items-center gap-3 cursor-pointer transition-colors text-left border-l-4 w-full",
              location.pathname === item.path ? "text-surface bg-white/5 border-primary" : "text-white/70 hover:text-surface hover:bg-white/5 border-transparent")}>
            <item.icon className="w-4 h-4 opacity-70" /> {item.label}
          </button>
        ))}
        {/* ... admin items if superadmin ... */}
        {/* ... settings, signout ... */}
      </aside>

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Header onOpenMenu={() => setIsSidebarOpen(true)} dashboardValuesVisible={dashboardValuesVisible}
          onToggleDashboardValues={() => {
            const next = !dashboardValuesVisible;
            setDashboardValuesVisible(next);
            localStorage.setItem(DASHBOARD_VALUES_KEY, JSON.stringify(next));
          }} />
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
          <Outlet />
        </main>
      </div>

      {/* Trial modal... */}
    </div>
  );
}
```

- [ ] **Step 3: Create each page route**

Each page route is a thin wrapper that renders the existing component. Example `_app.dashboard.tsx`:

```tsx
import { DashboardCards } from "~/components/DashboardCards";
import { DashboardAlerts } from "~/components/DashboardAlerts";
import { DashboardCharts } from "~/components/DashboardCharts";
import { TransactionTable } from "~/components/TransactionTable";

export default function Dashboard() {
  return (
    <>
      <DashboardCards valuesVisible={true} />
      <DashboardAlerts valuesVisible={true} />
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 flex-1 min-h-[400px]">
        <div className="xl:col-span-2 flex flex-col min-w-0">
          <TransactionTable />
        </div>
        <div className="flex flex-col min-w-0">
          <DashboardCharts />
        </div>
      </div>
    </>
  );
}
```

Other pages follow same pattern:
- `_app.transactions.tsx` → `<TransactionTable hideHeaderTitle />`
- `_app.dre.tsx` → `<DREView />`
- `_app.budget.tsx` → `<BudgetView />`
- etc.

- [ ] **Step 4: Handle dashboardValuesVisible state**

The dashboard values toggle state needs to be shared. Options:
a) Pass it via Remix context or search params
b) Keep it in localStorage + a simple state in the layout

Use option (b) — keep it simple. The `_app.tsx` layout holds the state and passes it to `<Outlet context={{ dashboardValuesVisible }} />`. Dashboard page reads it via `useOutletContext()`.

Update `_app.tsx`:
```tsx
<Outlet context={{ dashboardValuesVisible }} />
```

Update `_app.dashboard.tsx`:
```tsx
import { useOutletContext } from "@remix-run/react";
// ...
export default function Dashboard() {
  const { dashboardValuesVisible } = useOutletContext<{ dashboardValuesVisible: boolean }>();
  // ...
}
```

- [ ] **Step 5: Commit**

---

### Task 7: Update API fetch base URL and Firebase config paths

**Files:**
- Modify: `app/lib/api.ts`
- Modify: `app/lib/firebase.ts`

- [ ] **Step 1: Update api.ts base URL**

Since Remix serves both frontend and API on the same origin, in production the API is at the same origin. Only need the separate base in dev or when using a proxy:

```ts
// No Remix, o backend está no mesmo domínio que o frontend.
// Em dev, Remix serve em localhost:3000 e as APIs estão na mesma origem.
// Para prod com reverse proxy separado, usar VITE_API_BASE.
const BASE = import.meta.env.VITE_API_BASE || '';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : '';

  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  const data = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));

  if (!res.ok || data.error) {
    throw new Error(data.error || `Erro ${res.status}`);
  }

  return data;
}
```

- [ ] **Step 2: Update firebase.ts config import**

Change import path from `../../firebase-applet-config.json` to `../firebase-applet-config.json`:

```ts
import firebaseConfig from '../firebase-applet-config.json';
```

- [ ] **Step 3: Commit**

---

### Task 8: Remove old src/ and server/ directories, update Dockerfile

**Files:**
- Delete: `src/` directory (all code moved to `app/`)
- Delete: `server/` directory (consolidated into `app/services/` + `app/routes/api/`)
- Delete: `index.html` (replaced by `app/root.tsx`)
- Modify: `Dockerfile`

- [ ] **Step 1: Delete old directories and files**

Remove `src/`, `server/`, and `index.html`.

- [ ] **Step 2: Update Dockerfile**

Replace Vite SPA build with Remix build:

```dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

- [ ] **Step 3: Verify build**

Run: `npm run build`
Expected: Build succeeds with Remix output in `build/`.

- [ ] **Step 4: Commit**

---

### Task 9: Smoke test and fix issues

- [ ] **Step 1: Run dev server**

Run: `npm run dev`
Expected: Server starts on port 3000.

- [ ] **Step 2: Test key routes in browser**

Visit each page and verify it renders:
- `/` — login page
- `/dashboard` — dashboard
- `/transactions` — transactions
- others...

- [ ] **Step 3: Test API routes**

Verify the API routes work:
- `GET /api/sub/status` (with auth header)
- etc.

- [ ] **Step 4: Fix any import/type issues**

- [ ] **Step 5: Commit final fixes**
