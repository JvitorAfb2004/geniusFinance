# Integração Pluggy — Provisões Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Conectar um banco por usuário via Pluggy, importar transações do banco como provisões (`pluggy_provisions`) e permitir que o usuário as converta em Transactions reais (1-para-1 com rastro) numa página `/provisoes`, com aba de integração em Configurações.

**Architecture:** React Router v7 full-stack. Servidor: Pluggy API client (`pluggy.server.ts`) + helpers Admin SDK (`pluggy-store.server.ts`) + webhook (`api/webhooks.pluggy`) que grava provisões via Admin SDK. Cliente: hook `usePluggy` (listener top-level `pluggy_provisions`/`pluggy_connections` filtrado por `userId`), `ProvisionsView` (página `/provisoes`), aba `integracao` no `SettingsView` com o widget `PluggyConnect` embedded. Provisões são coleções **top-level** (não sob `users/{uid}`), scoped por `scopeType`/`scopeId`; conversão reusa o `addTransaction` existente e faz um `update` restrito na provisão.

**Tech Stack:** React Router v7, Firebase (Auth + Firestore), Firebase Admin SDK, Vitest, Pluggy API (`https://api.pluggy.ai`), Pluggy Connect widget (`https://connect.pluggy.ai/connect.js`).

## Global Constraints

- Não adicionar dependências npm novas (widget Pluggy carregado via script CDN dinâmico).
- Seguir o padrão de webhook existente: raw body → validação → dedupe via `markWebhookEventProcessed`.
- Provisões e conexões são coleções top-level; escrever só via Admin SDK; cliente lê com `where('userId', '==', uid)`.
- Conversão da provisão: `addTransaction` (fluxo normal, regras valem) + update restrito na provisão via whitelist `affectedKeys` (padrão do projeto).
- `amount` sempre positivo (valor absoluto); `type` mapeado `CREDIT→INCOME`, `DEBIT→EXPENSE`.
- Rodar `npm test` e `npm run lint` (tsc) após cada task.
- Commit após cada task. Não fazer push.

---

### Task 1: Variáveis de ambiente + lib de mapeamento puro (TDD)

**Files:**
- Create: `app/lib/pluggyMapping.ts`
- Create: `app/lib/pluggyMapping.test.ts`
- Modify: `.env`

**Interfaces:**
- Produces: `pluggyTypeToAppType(type: string): 'INCOME' | 'EXPENSE'`, `pluggyStatusToAppStatus(status?: string): 'PENDING' | 'POSTED'`, `pluggyDateToLocalDate(iso: string): string` (retorna `YYYY-MM-DD` em BRT UTC-3), `pluggyTxToProvision(tx: PluggyTransaction, itemId: string, accountId: string): ProvisionInput`.
- Produces: tipo `PluggyTransaction` (`{ id, description?, amount, date, type: 'CREDIT'|'DEBIT', status? }`).

- [ ] **Step 1: Adicionar env vars ao `.env`**

Acrescente ao final de `.env` (`.env` é gitignorado — não commit este arquivo):

```
PLUGGY_CLIENT_ID=6e85b7cd-8420-4723-b1ad-c08c226a75c5
PLUGGY_CLIENT_SECRET=9l_5K4SiK74hiwhVrfG-cP1Cj2ab-mLRbzM2z8j2CNU
PLUGGY_API_URL=https://api.pluggy.ai
PLUGGY_WEBHOOK_URL=https://geniushub.app/api/webhooks/pluggy
PLUGGY_WEBHOOK_SECRET=<gere um secret aleatorio, ex: node -e "console.log(require('crypto').randomBytes(24).toString('hex'))">
```

> Nota: em dev, `PLUGGY_WEBHOOK_URL` precisa de URL HTTPS pública (ngrok).

- [ ] **Step 2: Escrever o teste que falha**

`app/lib/pluggyMapping.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pluggyTxToProvision, pluggyTypeToAppType, pluggyDateToLocalDate } from './pluggyMapping';

describe('pluggyTxToProvision', () => {
  it('maps CREDIT to INCOME with positive absolute amount', () => {
    const p = pluggyTxToProvision({ id: 't1', description: 'TED', amount: -1500, date: '2024-04-12T00:00:00.000Z', type: 'CREDIT' }, 'item1', 'acc1');
    expect(p).toMatchObject({ pluggyTransactionId: 't1', type: 'INCOME', amount: 1500, pluggyItemId: 'item1', pluggyAccountId: 'acc1' });
  });

  it('maps DEBIT to EXPENSE and keeps status', () => {
    const p = pluggyTxToProvision({ id: 't2', amount: 200, date: '2024-04-12T12:00:00.000Z', type: 'DEBIT', status: 'POSTED' }, 'item1', 'acc1');
    expect(p.type).toBe('EXPENSE');
    expect(p.amount).toBe(200);
    expect(p.status).toBe('POSTED');
  });

  it('defaults status to POSTED when missing', () => {
    const p = pluggyTxToProvision({ id: 't3', amount: 50, date: '2024-04-12T12:00:00.000Z', type: 'CREDIT' }, 'item1', 'acc1');
    expect(p.status).toBe('POSTED');
  });

  it('converts ISO UTC to BRT (UTC-3) YYYY-MM-DD', () => {
    expect(pluggyDateToLocalDate('2024-04-12T00:00:00.000Z')).toBe('2024-04-11');
    expect(pluggyDateToLocalDate('2024-04-12T12:00:00.000Z')).toBe('2024-04-12');
    expect(pluggyDateToLocalDate('garbage')).toBe('garbage');
  });

  it('pluggyTypeToAppType falls back to EXPENSE', () => {
    expect(pluggyTypeToAppType('CREDIT')).toBe('INCOME');
    expect(pluggyTypeToAppType('DEBIT')).toBe('EXPENSE');
    expect(pluggyTypeToAppType('X')).toBe('EXPENSE');
  });
});
```

- [ ] **Step 3: Rodar o teste para ver falhar**

Run: `npx vitest run app/lib/pluggyMapping.test.ts`
Expected: FAIL — module not found / functions not exported.

- [ ] **Step 4: Implementar a lib**

`app/lib/pluggyMapping.ts`:

```ts
export type PluggyTransaction = {
  id: string;
  description?: string;
  amount: number;
  date: string;
  type: 'CREDIT' | 'DEBIT' | string;
  status?: 'PENDING' | 'POSTED' | string;
};

export interface ProvisionInput {
  pluggyTransactionId: string;
  pluggyItemId: string;
  pluggyAccountId: string;
  amount: number;
  date: string;
  description: string;
  type: 'INCOME' | 'EXPENSE';
  status: 'PENDING' | 'POSTED';
}

export function pluggyTypeToAppType(type: string): 'INCOME' | 'EXPENSE' {
  return type === 'CREDIT' ? 'INCOME' : 'EXPENSE';
}

export function pluggyStatusToAppStatus(status?: string): 'PENDING' | 'POSTED' {
  return status === 'PENDING' ? 'PENDING' : 'POSTED';
}

export function pluggyDateToLocalDate(iso: string): string {
  const d = new Date(iso);
  if (isNaN(d.getTime())) return iso;
  // interpreta a data como local (America/Sao_Paulo, UTC-3) e retorna YYYY-MM-DD
  return new Date(d.getTime() - 3 * 3600 * 1000).toISOString().slice(0, 10);
}

export function pluggyTxToProvision(tx: PluggyTransaction, itemId: string, accountId: string): ProvisionInput {
  return {
    pluggyTransactionId: tx.id,
    pluggyItemId: itemId,
    pluggyAccountId: accountId,
    amount: Math.abs(tx.amount),
    date: pluggyDateToLocalDate(tx.date),
    description: tx.description || 'Movimentação bancária',
    type: pluggyTypeToAppType(tx.type),
    status: pluggyStatusToAppStatus(tx.status),
  };
}
```

- [ ] **Step 5: Rodar o teste para ver passar**

Run: `npx vitest run app/lib/pluggyMapping.test.ts`
Expected: PASS (5 tests).

- [ ] **Step 6: Commit**

```bash
git add .env app/lib/pluggyMapping.ts app/lib/pluggyMapping.test.ts
git commit -m "feat(pluggy): mapeamento de transacoes do banco para provisoes + env vars"
```

---

### Task 2: Tipos + Firestore Rules para pluggy_connections e pluggy_provisions

**Files:**
- Modify: `app/types.ts`
- Modify: `firestore.rules`

**Interfaces:**
- Produces: interfaces `PluggyConnection` e `PluggyProvision` (campos exatos, usados pelo hook e views).

- [ ] **Step 1: Adicionar os tipos em `app/types.ts`**

Adicione ao final do arquivo `app/types.ts`:

```ts
export interface PluggyConnection {
  id: string;
  userId: string;
  scopeType: 'PERSONAL' | 'ACCOUNT';
  scopeId: string | null;
  pluggyItemId: string;
  pluggyConnectorId: string;
  institutionName: string;
  status: 'ACTIVE' | 'DELETED';
  createdAt: string;
  updatedAt: string;
}

export interface PluggyProvision {
  id: string;
  userId: string;
  scopeType: 'PERSONAL' | 'ACCOUNT';
  scopeId: string | null;
  pluggyTransactionId: string;
  pluggyItemId: string;
  pluggyAccountId: string;
  amount: number;
  date: string;
  description: string;
  type: 'INCOME' | 'EXPENSE';
  status: 'PENDING' | 'POSTED';
  provisionStatus: 'PROVISION' | 'CONVERTED' | 'IGNORED';
  convertedToTransactionId: string | null;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **Step 2: Adicionar regras no `firestore.rules`**

Após o bloco `match /test/{docId}` (linha ~19, dentro de `match /databases/{database}/documents`), insira:

```
    // ── Pluggy (integracao bancaria): server-only write, user-only read ──
    match /pluggy_connections/{connId} {
      allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow write: if false;
    }

    match /pluggy_provisions/{provId} {
      allow read: if isSignedIn() && resource.data.userId == request.auth.uid;
      allow create, delete: if false;
      allow update: if isSignedIn() &&
        resource.data.userId == request.auth.uid &&
        incoming().userId == existing().userId &&
        incoming().diff(existing()).affectedKeys().hasOnly([
          'provisionStatus', 'convertedToTransactionId', 'updatedAt'
        ]);
    }
```

- [ ] **Step 3: Verificar**

Run: `npm run lint`
Expected: PASS (tsc sem erros).

- [ ] **Step 4: Commit**

```bash
git add app/types.ts firestore.rules
git commit -m "feat(pluggy): tipos e firestore rules para conexoes e provisoes"
```

---

### Task 3: `pluggy.server.ts` — cliente da API Pluggy

**Files:**
- Create: `app/services/pluggy.server.ts`

**Interfaces:**
- Consumes: env vars `PLUGGY_CLIENT_ID`, `PLUGGY_CLIENT_SECRET`, `PLUGGY_API_URL`, `PLUGGY_WEBHOOK_URL`, `PLUGGY_WEBHOOK_SECRET`.
- Produces:
  - `getApiKey(force?: boolean): Promise<string>` — autentica em `/auth`, cacheia por ~115 min.
  - `createConnectToken(uid: string): Promise<string>` — retorna `accessToken` do `POST /connect_token` com `options.clientUserId` e `options.webhookUrl` (com `?secret=`).
  - `getItem(itemId: string): Promise<Record<string, unknown>>` — `GET /items/{id}`.
  - `deleteItem(itemId: string): Promise<unknown>` — `DELETE /items/{id}`.
  - `triggerItemSync(itemId: string): Promise<unknown>` — `POST /items/{id}`.
  - `fetchTransactionsByLink(link: string, apiKey: string): Promise<Record<string, unknown>[]>` — pagina cursor V2.
  - `fetchTransactionsByIds(accountId: string, ids: string[], apiKey: string): Promise<Record<string, unknown>[]>` — pagina `v2/transactions?accountId=...` e filtra por ids.

- [ ] **Step 1: Criar o arquivo**

`app/services/pluggy.server.ts`:

```ts
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
  return cachedApiKey;
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
    const payload = await res.json().catch(() => ({}));
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
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/services/pluggy.server.ts
git commit -m "feat(pluggy): cliente da API Pluggy (auth, connect token, items, transactions)"
```

---

### Task 4: `pluggy-store.server.ts` — helpers Admin SDK

**Files:**
- Create: `app/services/pluggy-store.server.ts`

**Interfaces:**
- Consumes: `getAdminFirestore` de `~/services/firebase-admin.server`.
- Produces:
  - `getConnectionByItemId(itemId: string): Promise<(Record<string, unknown> & { id: string }) | null>`
  - `getActiveConnectionByUser(userId: string): Promise<(Record<string, unknown> & { id: string }) | null>`
  - `upsertConnection(conn: Record<string, unknown>): Promise<string>` (auto-id)
  - `markConnectionDeleted(id: string): Promise<void>`
  - `upsertProvision(data: Record<string, unknown>): Promise<string>` — dedupe por `userId` + `pluggyTransactionId`; merge se existir.
  - `getProvisionsByTransactionIds(ids: string[]): Promise<Record<string, unknown>[]>` (com `id` incluído)
  - `updateProvision(id: string, data: Record<string, unknown>): Promise<void>`
  - `deleteProvision(id: string): Promise<void>`

- [ ] **Step 1: Criar o arquivo**

`app/services/pluggy-store.server.ts`:

```ts
import { getAdminFirestore } from "./firebase-admin.server";

const CONNECTIONS_COL = "pluggy_connections";
const PROVISIONS_COL = "pluggy_provisions";

export async function getConnectionByItemId(itemId: string) {
  if (!itemId) return null;
  const db = getAdminFirestore();
  const snap = await db.collection(CONNECTIONS_COL).where("pluggyItemId", "==", itemId).limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Record<string, unknown> & { id: string };
}

export async function getActiveConnectionByUser(userId: string) {
  if (!userId) return null;
  const db = getAdminFirestore();
  const snap = await db.collection(CONNECTIONS_COL).where("userId", "==", userId).where("status", "==", "ACTIVE").limit(1).get();
  if (snap.empty) return null;
  return { id: snap.docs[0].id, ...snap.docs[0].data() } as Record<string, unknown> & { id: string };
}

export async function upsertConnection(conn: Record<string, unknown>) {
  const db = getAdminFirestore();
  const ref = await db.collection(CONNECTIONS_COL).add(conn);
  return ref.id;
}

export async function markConnectionDeleted(id: string) {
  const db = getAdminFirestore();
  await db.collection(CONNECTIONS_COL).doc(id).update({ status: "DELETED", updatedAt: new Date().toISOString() });
}

export async function upsertProvision(data: Record<string, unknown>) {
  const db = getAdminFirestore();
  const existing = await db.collection(PROVISIONS_COL)
    .where("userId", "==", data.userId)
    .where("pluggyTransactionId", "==", data.pluggyTransactionId)
    .limit(1)
    .get();
  const now = new Date().toISOString();
  if (!existing.empty) {
    await db.collection(PROVISIONS_COL).doc(existing.docs[0].id).set({ ...data, updatedAt: now }, { merge: true });
    return existing.docs[0].id;
  }
  const ref = await db.collection(PROVISIONS_COL).add({ ...data, createdAt: now, updatedAt: now });
  return ref.id;
}

export async function getProvisionsByTransactionIds(ids: string[]) {
  if (!ids.length) return [];
  const db = getAdminFirestore();
  const snap = await db.collection(PROVISIONS_COL).where("pluggyTransactionId", "in", ids).get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as Record<string, unknown>));
}

export async function updateProvision(id: string, data: Record<string, unknown>) {
  const db = getAdminFirestore();
  await db.collection(PROVISIONS_COL).doc(id).update({ ...data, updatedAt: new Date().toISOString() });
}

export async function deleteProvision(id: string) {
  const db = getAdminFirestore();
  await db.collection(PROVISIONS_COL).doc(id).delete();
}
```

- [ ] **Step 2: Verificar typecheck**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/services/pluggy-store.server.ts
git commit -m "feat(pluggy): helpers de store Admin SDK para conexoes e provisoes"
```

---

### Task 5: Rotas de API — connect-token, connect-record, sync

**Files:**
- Create: `app/routes/api/pluggy.connect-token.ts`
- Create: `app/routes/api/pluggy.connect-record.ts`
- Create: `app/routes/api/pluggy.sync.ts`
- Modify: `app/routes.ts` (registrar as 3 rotas + webhook e /provisoes serão adicionados nas tasks seguintes)

**Interfaces:**
- Consumes: `requireAuth` (`~/lib/api-helpers.server`), `createConnectToken`/`deleteItem`/`triggerItemSync` (`~/services/pluggy.server`), `getActiveConnectionByUser`/`upsertConnection`/`markConnectionDeleted` (`~/services/pluggy-store.server`), `getAdminFirestore`.
- Produces:
  - `POST /api/pluggy/connect-token` → `{ success, data: { connectToken } }`
  - `POST /api/pluggy/connect-record` (body `{ pluggyItemId, pluggyConnectorId, institutionName, scopeType, scopeId }`) → `{ success, data: { connectionId } }`; valida membro se ACCOUNT; 409 se já há conexão ativa.
  - `DELETE /api/pluggy/connect-record?connectionId=...` → `{ success }`; chama `deleteItem` no Pluggy + marca `DELETED`.
  - `POST /api/pluggy/sync?connectionId=...` → `{ success }`; dispara `triggerItemSync`.

- [ ] **Step 1: Criar `app/routes/api/pluggy.connect-token.ts`**

```ts
import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/api-helpers.server";
import { createConnectToken } from "~/services/pluggy.server";

export async function action({ request }: ActionFunctionArgs) {
  const authUser = await requireAuth(request);
  const connectToken = await createConnectToken(authUser.uid);
  return Response.json({ success: true, data: { connectToken } });
}
```

- [ ] **Step 2: Criar `app/routes/api/pluggy.connect-record.ts`**

```ts
import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/api-helpers.server";
import { getAdminFirestore } from "~/services/firebase-admin.server";
import { deleteItem } from "~/services/pluggy.server";
import { getActiveConnectionByUser, upsertConnection, markConnectionDeleted } from "~/services/pluggy-store.server";

export async function action({ request }: ActionFunctionArgs) {
  const authUser = await requireAuth(request);
  const method = request.method.toUpperCase();

  if (method === "DELETE") {
    const url = new URL(request.url);
    const connId = url.searchParams.get("connectionId") || "";
    if (!connId) return Response.json({ error: "connectionId obrigatorio" }, { status: 400 });
    const db = getAdminFirestore();
    const snap = await db.collection("pluggy_connections").doc(connId).get();
    const data = snap.data();
    if (!snap.exists || data?.userId !== authUser.uid) {
      return Response.json({ error: "conexao nao encontrada" }, { status: 404 });
    }
    const itemId = String(data.pluggyItemId || "");
    if (itemId) {
      try { await deleteItem(itemId); } catch (e) { console.error("[pluggy/delete]", (e as Error).message); }
    }
    await markConnectionDeleted(connId);
    return Response.json({ success: true });
  }

  const body = await request.json().catch(() => ({}));
  const pluggyItemId = String(body.pluggyItemId || "").trim();
  const pluggyConnectorId = String(body.pluggyConnectorId || "").trim();
  const institutionName = String(body.institutionName || "Banco").trim();
  const scopeType = body.scopeType === "ACCOUNT" ? "ACCOUNT" : "PERSONAL";
  const scopeId = scopeType === "ACCOUNT" ? String(body.scopeId || "") : null;

  if (!pluggyItemId) return Response.json({ error: "pluggyItemId obrigatorio" }, { status: 400 });
  if (scopeType === "ACCOUNT" && !scopeId) return Response.json({ error: "scopeId obrigatorio" }, { status: 400 });

  if (scopeType === "ACCOUNT") {
    const db = getAdminFirestore();
    const member = await db.collection("accounts").doc(scopeId).collection("members").doc(authUser.uid).get();
    if (!member.exists) return Response.json({ error: "voce nao e membro dessa conta" }, { status: 403 });
  }

  const existing = await getActiveConnectionByUser(authUser.uid);
  if (existing) return Response.json({ error: "ja existe uma conexao ativa. Desconecte antes de conectar outro banco." }, { status: 409 });

  const now = new Date().toISOString();
  const connectionId = await upsertConnection({
    userId: authUser.uid,
    scopeType,
    scopeId,
    pluggyItemId,
    pluggyConnectorId,
    institutionName,
    status: "ACTIVE",
    createdAt: now,
    updatedAt: now,
  });
  return Response.json({ success: true, data: { connectionId } });
}
```

- [ ] **Step 3: Criar `app/routes/api/pluggy.sync.ts`**

```ts
import type { ActionFunctionArgs } from "react-router";
import { requireAuth } from "~/lib/api-helpers.server";
import { getAdminFirestore } from "~/services/firebase-admin.server";
import { triggerItemSync } from "~/services/pluggy.server";

export async function action({ request }: ActionFunctionArgs) {
  const authUser = await requireAuth(request);
  const url = new URL(request.url);
  const connId = url.searchParams.get("connectionId") || "";
  if (!connId) return Response.json({ error: "connectionId obrigatorio" }, { status: 400 });
  const db = getAdminFirestore();
  const snap = await db.collection("pluggy_connections").doc(connId).get();
  const data = snap.data();
  if (!snap.exists || data?.userId !== authUser.uid || data?.status !== "ACTIVE") {
    return Response.json({ error: "conexao nao encontrada" }, { status: 404 });
  }
  try {
    await triggerItemSync(String(data.pluggyItemId || ""));
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 500 });
  }
  return Response.json({ success: true });
}
```

- [ ] **Step 4: Registrar as rotas em `app/routes.ts`**

Em `app/routes.ts`, adicione após a linha de `api/sub/cancel`:

```ts
  { file: "routes/api/pluggy.connect-token.ts", path: "api/pluggy/connect-token" },
  { file: "routes/api/pluggy.connect-record.ts", path: "api/pluggy/connect-record" },
  { file: "routes/api/pluggy.sync.ts", path: "api/pluggy/sync" },
```

(Webhook e /provisoes serão adicionados nas tasks 6 e 9.)

- [ ] **Step 5: Verificar**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/routes/api/pluggy.connect-token.ts app/routes/api/pluggy.connect-record.ts app/routes/api/pluggy.sync.ts app/routes.ts
git commit -m "feat(pluggy): rotas de API connect-token, connect-record e sync"
```

---

### Task 6: Webhook `POST /api/webhooks/pluggy`

**Files:**
- Create: `app/routes/api/webhooks.pluggy.ts`
- Modify: `app/routes.ts` (registrar rota)

**Interfaces:**
- Consumes: `markWebhookEventProcessed` (`~/services/subscription-store.server`), `pluggyTxToProvision` (`~/lib/pluggyMapping`), `getApiKey`/`fetchTransactionsByLink`/`fetchTransactionsByIds` (`~/services/pluggy.server`), `getConnectionByItemId`/`upsertProvision`/`getProvisionsByTransactionIds`/`updateProvision`/`deleteProvision`/`markConnectionDeleted` (`~/services/pluggy-store.server`), `getAdminFirestore`.
- Produces: handler para eventos `item/created|updated|deleted`, `transactions/created|updated|deleted`.

- [ ] **Step 1: Criar `app/routes/api/webhooks.pluggy.ts`**

```ts
import type { ActionFunctionArgs } from "react-router";
import { getAdminFirestore } from "~/services/firebase-admin.server";
import { markWebhookEventProcessed } from "~/services/subscription-store.server";
import { pluggyTxToProvision, type PluggyTransaction } from "~/lib/pluggyMapping";
import { getApiKey, fetchTransactionsByLink, fetchTransactionsByIds } from "~/services/pluggy.server";
import {
  getConnectionByItemId,
  upsertProvision,
  getProvisionsByTransactionIds,
  updateProvision,
  deleteProvision,
  markConnectionDeleted,
} from "~/services/pluggy-store.server";

const PLUGGY_WEBHOOK_SECRET = process.env.PLUGGY_WEBHOOK_SECRET || "";

async function handleEvent(eventName: string, event: Record<string, unknown>) {
  const itemId = String(event.itemId || "");
  const accountId = String(event.accountId || "");

  if (eventName === "item/deleted") {
    const conn = await getConnectionByItemId(itemId);
    if (conn) await markConnectionDeleted(String(conn.id));
    return;
  }
  if (eventName === "item/created" || eventName === "item/updated" || eventName === "item/login_succeeded" || eventName === "item/error") {
    // estados de item nao geram provisoes; auto-sync dispara transactions/created depois
    return;
  }

  if (eventName === "transactions/created") {
    const conn = await getConnectionByItemId(itemId);
    if (!conn) return; // conexao ainda nao gravada; proxima sync cobre
    const link = String(event.createdTransactionsLinkV2 || event.createdTransactionsLink || "");
    if (!link) return;
    const apiKey = await getApiKey();
    const txs = (await fetchTransactionsByLink(link, apiKey)) as PluggyTransaction[];
    for (const tx of txs) {
      await upsertProvision({
        userId: conn.userId,
        scopeType: conn.scopeType,
        scopeId: conn.scopeId ?? null,
        provisionStatus: "PROVISION",
        convertedToTransactionId: null,
        ...pluggyTxToProvision(tx, itemId, accountId),
      });
    }
    return;
  }

  if (eventName === "transactions/updated") {
    const conn = await getConnectionByItemId(itemId);
    if (!conn) return;
    const ids = Array.isArray(event.transactionIds) ? event.transactionIds.map(String) : [];
    if (!ids.length || !accountId) return;
    const apiKey = await getApiKey();
    const txs = (await fetchTransactionsByIds(accountId, ids, apiKey)) as PluggyTransaction[];
    const existing = await getProvisionsByTransactionIds(ids);
    const byId = new Map(existing.map((p) => [String(p.pluggyTransactionId), p]));
    for (const tx of txs) {
      const mapped = pluggyTxToProvision(tx, itemId, accountId);
      const doc = byId.get(tx.id);
      if (!doc) {
        await upsertProvision({
          userId: conn.userId,
          scopeType: conn.scopeType,
          scopeId: conn.scopeId ?? null,
          provisionStatus: "PROVISION",
          convertedToTransactionId: null,
          ...mapped,
        });
        continue;
      }
      if (doc.provisionStatus === "CONVERTED" && doc.convertedToTransactionId) {
        // provisao ja convertida: propaga amount/date para a transaction linkada
        const db = getAdminFirestore();
        const targetPath = conn.scopeType === "ACCOUNT"
          ? `accounts/${conn.scopeId}/transactions/${doc.convertedToTransactionId}`
          : `users/${conn.userId}/transactions/${doc.convertedToTransactionId}`;
        await db.doc(targetPath).update({ amount: mapped.amount, date: mapped.date, updatedAt: new Date().toISOString() });
      } else {
        await updateProvision(String(doc.id), {
          amount: mapped.amount,
          date: mapped.date,
          description: mapped.description,
          status: mapped.status,
        });
      }
    }
    return;
  }

  if (eventName === "transactions/deleted") {
    const ids = Array.isArray(event.transactionIds) ? event.transactionIds.map(String) : [];
    const existing = await getProvisionsByTransactionIds(ids);
    for (const doc of existing) {
      if (doc.provisionStatus === "PROVISION") {
        await deleteProvision(String(doc.id));
      } else {
        await updateProvision(String(doc.id), { provisionStatus: "IGNORED" });
      }
    }
  }
}

export async function action({ request }: ActionFunctionArgs) {
  const url = new URL(request.url);
  if (PLUGGY_WEBHOOK_SECRET && url.searchParams.get("secret") !== PLUGGY_WEBHOOK_SECRET) {
    return Response.json({ error: "secret invalido" }, { status: 401 });
  }

  const event = await request.json().catch(() => null);
  if (!event || !event.eventId || !event.event) {
    return Response.json({ error: "payload invalido" }, { status: 400 });
  }

  const isNew = await markWebhookEventProcessed(String(event.eventId));
  if (!isNew) return Response.json({ success: true, deduplicated: true });

  try {
    await handleEvent(String(event.event), event);
  } catch (e) {
    // ponytail: sem retry aqui; Pluggy reenvia ate 9x e dedupe previne duplicatas
    console.error("[webhook/pluggy]", (e as Error).message);
  }
  return Response.json({ success: true });
}
```

- [ ] **Step 2: Registrar rota em `app/routes.ts`**

```ts
  { file: "routes/api/webhooks.pluggy.ts", path: "api/webhooks/pluggy" },
```

Adicione logo após a linha `api/webhooks/abacate`.

- [ ] **Step 3: Verificar**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/routes/api/webhooks.pluggy.ts app/routes.ts
git commit -m "feat(pluggy): webhook de transacoes cria provisoes via Admin SDK"
```

---

### Task 7: `addTransaction` retorna o id + callback `onSaved` no TransactionModal

**Files:**
- Modify: `app/hooks/useFinance.tsx` (função `addTransaction`, linhas ~251-321)
- Modify: `app/components/TransactionModal.tsx`

**Interfaces:**
- Consumes: nada novo.
- Produces: `addTransaction(...)` passa a retornar `Promise<string | undefined>` (id criado no modo ONE_TIME); `TransactionModal` aceita prop opcional `onSaved?: (newId: string) => void`.

- [ ] **Step 1: Alterar `addTransaction` em `useFinance.tsx`**

Troque a assinatura de `const addTransaction = async (...): Promise<void>` para `Promise<string | undefined>` e retorne o `docRef.id` no ramo ONE_TIME.

Assinatura (linha 251):

```ts
  const addTransaction = async (
    txData: Omit<Transaction, 'id' | 'userId' | 'createdAt' | 'updatedAt'>,
    generateMultiple?: 'INSTALLMENTS' | 'FIXED',
    count: number = 1
  ): Promise<string | undefined> => {
    if (!user) return;
```

Declare `let newId: string | undefined;` logo após `const collectionRef = collection(db, colPath);`:

```ts
      const collectionRef = collection(db, colPath);
      let newId: string | undefined;
```

No ramo `else` (ONE_TIME, linhas 307-315), capture o id ANTES do batch:

```ts
      } else {
        const docRef = doc(collectionRef);
        newId = docRef.id;
        batch.set(docRef, {
          ...txData,
          userId: user.uid,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        });
      }
```

No commit final (linha 317), retorne o id:

```ts
      await batch.commit();
      return newId;
```

O restante da função (catch) permanece igual.

- [ ] **Step 2: Adicionar prop `onSaved` no `TransactionModal.tsx`**

Na assinatura (linha 19):

```ts
export function TransactionModal({
  onClose,
  initialData,
  onSaved,
}: {
  onClose: () => void;
  initialData?: Transaction;
  onSaved?: (newId: string) => void;
}) {
```

No `handleSubmit`, troque o branch de edição/criação: a criação deve ser decidida por `initialData?.id` (e não `initialData`), para permitir abrir o modal com dados pré-preenchidos mas ainda em modo criação (caso da provisão). Linha 284 e 286-294:

```ts
      if (initialData?.id) {
        await updateTransaction(initialData.id, baseTx, applyToFuture);
      } else {
        if (recurrenceConfig === 'ONE_TIME') {
          const newId = await addTransaction(baseTx);
          if (newId) onSaved?.(newId);
        } else if (recurrenceConfig === 'FIXED') {
          await addTransaction(baseTx, 'FIXED');
        } else if (recurrenceConfig === 'INSTALLMENTS') {
          await addTransaction(baseTx, 'INSTALLMENTS', installmentsCount);
        }
      }
```

> Isso preserva o modo edição da `TransactionTable` (que passa `editingTx` com `id` real) e permite modo criação com prefill quando `initialData.id` é vazio. Se houver outros usos de `initialData` sem `id` (ex: `ImportView`), a pré-seleção de `initialData` nos `useState` (title/amount/date/type) continua valendo.

- [ ] **Step 3: Verificar**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/hooks/useFinance.tsx app/components/TransactionModal.tsx
git commit -m "feat(transactions): addTransaction retorna id criado e TransactionModal expoe onSaved"
```

---

### Task 8: Hook `usePluggy`

**Files:**
- Create: `app/hooks/usePluggy.ts`

**Interfaces:**
- Consumes: `useFinance` (para `user`, `activeScope`), `PluggyConnection`/`PluggyProvision` de `~/types`, `db`/`handleFirestoreError`.
- Produces:
  - `connection: PluggyConnection | null` (ACTIVE)
  - `provisions: PluggyProvision[]` (já filtradas pelo escopo ativo)
  - `pendingCount: number` (provisionStatus === 'PROVISION' no escopo)
  - `loaded: boolean`
  - `updateProvision(provisionId, updates: Partial<PluggyProvision>): Promise<void>` (chama `updateDoc` com whitelist)
  - `ignoreProvision(id): Promise<void>`, `restoreProvision(id): Promise<void>`

- [ ] **Step 1: Criar `app/hooks/usePluggy.ts`**

```ts
import { useEffect, useMemo, useState } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { handleFirestoreError } from '../lib/handleFirestoreError';
import { useFinance } from './useFinance';
import type { PluggyConnection, PluggyProvision } from '../types';

export function usePluggy() {
  const { user, activeScope } = useFinance();
  const [connections, setConnections] = useState<PluggyConnection[]>([]);
  const [allProvisions, setAllProvisions] = useState<PluggyProvision[]>([]);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'pluggy_connections'), where('userId', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => setConnections(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PluggyConnection)),
      (err) => handleFirestoreError(err, 'list', 'pluggy_connections', user),
    );
    return unsub;
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const q = query(collection(db, 'pluggy_provisions'), where('userId', '==', user.uid));
    const unsub = onSnapshot(
      q,
      (snap) => {
        setAllProvisions(snap.docs.map((d) => ({ id: d.id, ...d.data() }) as PluggyProvision));
        setLoaded(true);
      },
      (err) => handleFirestoreError(err, 'list', 'pluggy_provisions', user),
    );
    return unsub;
  }, [user]);

  const connection = useMemo(() => connections.find((c) => c.status === 'ACTIVE') || null, [connections]);

  const provisions = useMemo(() => {
    return allProvisions.filter((p) => {
      if (activeScope.type === 'PERSONAL') return p.scopeType === 'PERSONAL';
      return p.scopeType === 'ACCOUNT' && p.scopeId === activeScope.accountId;
    });
  }, [allProvisions, activeScope]);

  const pendingCount = useMemo(
    () => provisions.filter((p) => p.provisionStatus === 'PROVISION').length,
    [provisions],
  );

  const updateProvision = async (provisionId: string, updates: Partial<PluggyProvision>) => {
    if (!user) return;
    try {
      await updateDoc(doc(db, 'pluggy_provisions', provisionId), {
        ...updates,
        updatedAt: new Date().toISOString(),
      });
    } catch (error) {
      handleFirestoreError(error, 'update', `pluggy_provisions/${provisionId}`, user);
    }
  };

  const ignoreProvision = (id: string) => updateProvision(id, { provisionStatus: 'IGNORED' });
  const restoreProvision = (id: string) => updateProvision(id, { provisionStatus: 'PROVISION', convertedToTransactionId: null });

  return { connection, provisions, pendingCount, loaded, updateProvision, ignoreProvision, restoreProvision };
}
```

- [ ] **Step 2: Verificar**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Commit**

```bash
git add app/hooks/usePluggy.ts
git commit -m "feat(pluggy): hook usePluggy com listener de conexoes e provisoes"
```

---

### Task 9: Página `/provisoes` — `ProvisionsView`

**Files:**
- Create: `app/components/ProvisionsView.tsx`
- Create: `app/routes/_app.provisoes.tsx`
- Modify: `app/routes.ts`
- Modify: `app/routes/_app.tsx` (menu lateral)

**Interfaces:**
- Consumes: `usePluggy` (connection, provisions, pendingCount, ignoreProvision, restoreProvision), `useFinance` (user, activeScope, accounts para label do escopo), `TransactionModal` (com `initialData` pré-preenchida e `onSaved`), `apiFetch`.
- Produces: view com tabela/cards de provisões + ações Converter/Ignorar/Restaurar.

- [ ] **Step 1: Criar `app/components/ProvisionsView.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { usePluggy } from '../hooks/usePluggy';
import { useFinance } from '../hooks/useFinance';
import { TransactionModal } from './TransactionModal';
import { ConfirmModal } from './ConfirmModal';
import { ArrowUpCircle, ArrowDownCircle, RefreshCw, CheckCircle, Ban, Undo2, Building2, User, Landmark } from 'lucide-react';
import type { PluggyProvision } from '../types';

type Filter = 'ALL' | 'PROVISION' | 'CONVERTED' | 'IGNORED';
type TypeFilter = 'ALL' | 'INCOME' | 'EXPENSE';

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

export function ProvisionsView() {
  const { connection, provisions, pendingCount, ignoreProvision, restoreProvision, updateProvision } = usePluggy();
  const { activeScope, accounts } = useFinance();
  const navigate = useNavigate();

  const [filter, setFilter] = useState<Filter>('ALL');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('ALL');
  const [converting, setConverting] = useState<PluggyProvision | null>(null);
  const [confirmIgnore, setConfirmIgnore] = useState<PluggyProvision | null>(null);

  const scopeLabel = activeScope.type === 'PERSONAL'
    ? 'Pessoal'
    : accounts.find((a) => a.id === activeScope.accountId)?.name || 'Empresa';

  const visible = provisions.filter((p) => {
    if (filter !== 'ALL' && p.provisionStatus !== filter) return false;
    if (typeFilter !== 'ALL' && p.type !== typeFilter) return false;
    return true;
  });

  if (!connection) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-24 text-center">
        <Landmark className="w-12 h-12 text-slate-400" />
        <h2 className="text-lg font-semibold text-slate-200">Nenhum banco conectado</h2>
        <p className="text-sm text-slate-400 max-w-md">
          Conecte seu banco em Configurações &gt; Integrações para importar suas movimentações automaticamente.
        </p>
        <button
          onClick={() => navigate('/settings')}
          className="px-4 py-2 rounded-md bg-primary text-white font-medium text-sm cursor-pointer border-none hover:opacity-90"
        >
          Ir para Integrações
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold text-slate-100 flex items-center gap-2">
            <Landmark className="w-5 h-5 text-primary" /> Provisões
          </h1>
          <p className="text-sm text-slate-400">
            {connection.institutionName} · {activeScope.type === 'PERSONAL' ? <User className="inline w-3.5 h-3.5" /> : <Building2 className="inline w-3.5 h-3.5" />} {scopeLabel} ·{' '}
            <span className="text-amber-400">{pendingCount} pendente(s)</span>
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)}
            className="px-2 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-sm text-slate-200">
            <option value="ALL">Todas</option>
            <option value="PROVISION">Pendentes</option>
            <option value="CONVERTED">Convertidas</option>
            <option value="IGNORED">Ignoradas</option>
          </select>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
            className="px-2 py-1.5 rounded-md bg-slate-800 border border-slate-700 text-sm text-slate-200">
            <option value="ALL">Entrada e saída</option>
            <option value="INCOME">Entradas</option>
            <option value="EXPENSE">Saídas</option>
          </select>
        </div>
      </div>

      {visible.length === 0 ? (
        <div className="py-16 text-center text-sm text-slate-400 bg-slate-900/50 rounded-xl border border-slate-800">
          Nenhuma provisão aqui.
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {visible.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center gap-3 p-3 rounded-xl bg-slate-900/60 border border-slate-800">
              {p.type === 'INCOME' ? (
                <ArrowUpCircle className="w-6 h-6 text-emerald-400 shrink-0" />
              ) : (
                <ArrowDownCircle className="w-6 h-6 text-red-400 shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-slate-100 truncate">{p.description}</p>
                <p className="text-xs text-slate-500">
                  {p.date} · {p.status === 'PENDING' ? 'Pendente' : 'Confirmada'}
                </p>
              </div>
              <span className={`text-sm font-semibold ${p.type === 'INCOME' ? 'text-emerald-400' : 'text-red-400'}`}>
                {p.type === 'INCOME' ? '+' : '-'}{brl.format(p.amount)}
              </span>
              {p.provisionStatus === 'PROVISION' && (
                <div className="flex gap-2">
                  <button
                    onClick={() => setConverting(p)}
                    className="px-3 py-1.5 rounded-md bg-primary text-white text-xs font-semibold cursor-pointer border-none hover:opacity-90 flex items-center gap-1.5"
                  >
                    <CheckCircle className="w-3.5 h-3.5" /> Converter
                  </button>
                  <button
                    onClick={() => setConfirmIgnore(p)}
                    className="px-3 py-1.5 rounded-md bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer border border-slate-700 hover:bg-slate-700"
                  >
                    <Ban className="w-3.5 h-3.5" /> Ignorar
                  </button>
                </div>
              )}
              {p.provisionStatus === 'CONVERTED' && (
                <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold flex items-center gap-1">
                  <CheckCircle className="w-3.5 h-3.5" /> Convertida
                </span>
              )}
              {p.provisionStatus === 'IGNORED' && (
                <button
                  onClick={() => restoreProvision(p.id)}
                  className="px-3 py-1.5 rounded-md bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer border border-slate-700 hover:bg-slate-700 flex items-center gap-1.5"
                >
                  <Undo2 className="w-3.5 h-3.5" /> Restaurar
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {converting && (
        <TransactionModal
          initialData={{
            id: '',
            title: converting.description,
            amount: converting.amount,
            date: converting.date,
            type: converting.type,
            status: converting.status === 'PENDING' ? 'PENDING' : 'PAID',
            context: activeScope.type === 'ACCOUNT' ? 'BUSINESS' : 'PERSONAL',
            userId: '',
            createdAt: '',
            updatedAt: '',
            categoryId: '',
            tagIds: [],
          }}
          onSaved={(newId) => {
            if (newId) updateProvision(converting.id, { provisionStatus: 'CONVERTED', convertedToTransactionId: newId });
            setConverting(null);
          }}
          onClose={() => setConverting(null)}
        />
      )}

      {confirmIgnore && (
        <ConfirmModal
          title="Ignorar provisão?"
          message={`A provisão "${confirmIgnore.description}" será ocultada da lista de pendências. Você pode restaurar depois.`}
          confirmLabel="Ignorar"
          variant="warning"
          onConfirm={() => { ignoreProvision(confirmIgnore.id); setConfirmIgnore(null); }}
          onCancel={() => setConfirmIgnore(null)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Criar `app/routes/_app.provisoes.tsx`**

```tsx
import { ProvisionsView } from "~/components/ProvisionsView";
export default function Provisoes() { return <ProvisionsView />; }
```

- [ ] **Step 3: Registrar rota em `app/routes.ts`**

Dentro do array de filhos de `_app.tsx` (após `_app.dashboard`):

```ts
      { file: "routes/_app.provisoes.tsx", path: "provisoes" },
```

- [ ] **Step 4: Adicionar item no menu em `app/routes/_app.tsx`**

No array `menuItems` (após `/transactions`), adicione:

```ts
    { path: "/provisoes", label: "Provisões", icon: Landmark },
```

E adicione `Landmark` aos imports de `lucide-react` (linha 8-12). Se `Landmark` não estiver na lista atual, use `Inbox` como alternativa. Adicione `/provisoes` também à lista de filtro da seção Financeiro (linha 244, no array de paths incluídos).

- [ ] **Step 5: Verificar**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add app/components/ProvisionsView.tsx app/routes/_app.provisoes.tsx app/routes.ts app/routes/_app.tsx
git commit -m "feat(pluggy): pagina /provisoes com conversao em transacao"
```

---

### Task 10: Aba Integrações em Configurações + widget Pluggy Connect

**Files:**
- Modify: `app/components/SettingsView.tsx` (adicionar tab `integracao` + render)
- Create: `app/components/IntegrationsTab.tsx`

**Interfaces:**
- Consumes: `usePluggy` (connection, pendingCount), `useFinance` (accounts, user), `apiFetch`, script CDN `https://connect.pluggy.ai/connect.js`.
- Produces: aba com estado conectado/desconectado, botão conectar (widget), sincronizar, desconectar, CTA para `/provisoes`.

- [ ] **Step 1: Criar `app/components/IntegrationsTab.tsx`**

```tsx
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { usePluggy } from '../hooks/usePluggy';
import { useFinance } from '../hooks/useFinance';
import { apiFetch } from '../lib/api';
import { Landmark, RefreshCw, Unplug, User, Building2 } from 'lucide-react';
import ConfirmModal from './ConfirmModal';

declare global {
  interface Window { PluggyConnect?: any; }
}

function loadPluggyScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.PluggyConnect) return resolve();
    const s = document.createElement('script');
    s.src = 'https://connect.pluggy.ai/connect.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('falha ao carregar o widget do Pluggy'));
    document.head.appendChild(s);
  });
}

export function IntegrationsTab() {
  const { connection, pendingCount } = usePluggy();
  const { accounts } = useFinance();
  const navigate = useNavigate();

  const [scope, setScope] = useState<'PERSONAL' | string>('PERSONAL');
  const [connecting, setConnecting] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [confirmDisconnect, setConfirmDisconnect] = useState(false);

  const scopeLabel = connection
    ? connection.scopeType === 'PERSONAL' ? 'Pessoal' : accounts.find((a) => a.id === connection.scopeId)?.name || 'Empresa'
    : scope === 'PERSONAL' ? 'Pessoal' : accounts.find((a) => a.id === scope)?.name || 'Empresa';

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const res = await apiFetch('/api/pluggy/connect-token');
      const token = res.data?.connectToken;
      if (!token) throw new Error('token nao obtido');
      await loadPluggyScript();
      const scopeType = scope === 'PERSONAL' ? 'PERSONAL' : 'ACCOUNT';
      const scopeId = scopeType === 'ACCOUNT' ? scope : null;
      const widget = new window.PluggyConnect({
        connectToken: token,
        onSuccess: async ({ itemId, connector }: { itemId: string; connector?: { id?: string; name?: string } }) => {
          await apiFetch('/api/pluggy/connect-record', {
            method: 'POST',
            body: {
              pluggyItemId: itemId,
              pluggyConnectorId: connector?.id || '',
              institutionName: connector?.name || 'Banco',
              scopeType,
              scopeId,
            },
          });
          alert('Banco conectado com sucesso!');
        },
        onClose: () => {},
        onError: (err: unknown) => alert('Erro ao conectar: ' + String((err as Error)?.message || err)),
      });
      widget.open();
    } catch (e) {
      alert(String((e as Error).message));
    } finally {
      setConnecting(false);
    }
  };

  const handleSync = async () => {
    if (!connection) return;
    setSyncing(true);
    try {
      await apiFetch(`/api/pluggy/sync?connectionId=${connection.id}`, { method: 'POST' });
      alert('Sincronização disparada. As provisões aparecem em alguns minutos.');
    } catch (e) {
      alert(String((e as Error).message));
    } finally {
      setSyncing(false);
    }
  };

  const handleDisconnect = async () => {
    if (!connection) return;
    try {
      await apiFetch(`/api/pluggy/connect-record?connectionId=${connection.id}`, { method: 'DELETE' });
      setConfirmDisconnect(false);
    } catch (e) {
      alert(String((e as Error).message));
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {connection ? (
        <div className="flex flex-col gap-3 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <Landmark className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-100">{connection.institutionName}</p>
              <p className="text-xs text-slate-500 flex items-center gap-1">
                {connection.scopeType === 'PERSONAL' ? <User className="w-3 h-3" /> : <Building2 className="w-3 h-3" />}
                {scopeLabel}
              </p>
            </div>
            <span className="px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 text-xs font-semibold">Conectado</span>
          </div>

          <div className="flex flex-wrap gap-2">
            <button onClick={() => navigate('/provisoes')}
              className="px-3 py-2 rounded-md bg-primary text-white text-xs font-semibold cursor-pointer border-none hover:opacity-90">
              Ver provisões ({pendingCount} pendente{pendingCount === 1 ? '' : 's'})
            </button>
            <button onClick={handleSync} disabled={syncing}
              className="px-3 py-2 rounded-md bg-slate-800 text-slate-200 text-xs font-semibold cursor-pointer border border-slate-700 hover:bg-slate-700 flex items-center gap-1.5 disabled:opacity-50">
              <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin' : ''}`} /> Sincronizar agora
            </button>
            <button onClick={() => setConfirmDisconnect(true)}
              className="px-3 py-2 rounded-md bg-red-500/10 text-red-400 text-xs font-semibold cursor-pointer border border-red-500/30 hover:bg-red-500/20 flex items-center gap-1.5">
              <Unplug className="w-3.5 h-3.5" /> Desconectar
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-4 rounded-xl bg-slate-900/60 border border-slate-800">
          <p className="text-sm text-slate-300">
            Conecte seu banco para importar suas movimentações automaticamente. Elas chegam como <strong>provisões</strong> que você revisa e converte em transações.
          </p>
          <div className="flex flex-col gap-2 max-w-sm">
            <label className="text-xs font-semibold text-slate-400">A conexão será vinculada a:</label>
            <select value={scope} onChange={(e) => setScope(e.target.value)}
              className="px-2 py-2 rounded-md bg-slate-800 border border-slate-700 text-sm text-slate-200">
              <option value="PERSONAL">Pessoal</option>
              {accounts.filter((a) => a.status === 'ACTIVE').map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
            <button onClick={handleConnect} disabled={connecting}
              className="px-4 py-2.5 rounded-md bg-primary text-white text-sm font-semibold cursor-pointer border-none hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
              <Landmark className="w-4 h-4" /> {connecting ? 'Conectando...' : 'Conectar banco'}
            </button>
          </div>
        </div>
      )}

      {confirmDisconnect && connection && (
        <ConfirmModal
          title="Desconectar banco?"
          message={`A conexão com ${connection.institutionName} será removida. As provisões já convertidas em transações são mantidas.`}
          confirmLabel="Desconectar"
          variant="danger"
          onConfirm={handleDisconnect}
          onCancel={() => setConfirmDisconnect(false)}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 2: Integrar a aba em `SettingsView.tsx`**

1. Altere o tipo (linha 10):

```ts
type SettingsTab = 'geral' | 'conta' | 'comercial' | 'categorias' | 'tags' | 'integracao';
```

2. Importe o componente:

```ts
import { IntegrationsTab } from './IntegrationsTab';
```

3. Adicione o botão da aba na barra de abas (encontre onde os botões `categorias`/`tags` são renderizados e adicione ao lado):

```tsx
<button onClick={() => setActiveTab('integracao')} className={...}>
  <Landmark className="w-4 h-4" /> Integrações
</button>
```

Copie a classe exata usada pelos botões de aba vizinhos e adicione `Landmark` aos imports de `lucide-react` (linha 3).

4. Renderize o conteúdo quando `activeTab === 'integracao'`:

```tsx
{activeTab === 'integracao' && <IntegrationsTab />}
```

- [ ] **Step 3: Verificar**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add app/components/IntegrationsTab.tsx app/components/SettingsView.tsx
git commit -m "feat(pluggy): aba de integracoes com widget Pluggy Connect"
```

---

### Task 11: Verificação final

**Files:**
- Modify: nenhum (apenas checagens)

- [ ] **Step 1: Rodar testes**

Run: `npm test`
Expected: todos os testes passam (incluindo `pluggyMapping.test.ts`).

- [ ] **Step 2: Rodar lint/typecheck**

Run: `npm run lint`
Expected: PASS.

- [ ] **Step 3: Rodar build**

Run: `npm run build`
Expected: build completo sem erros.

- [ ] **Step 4: Checklist manual (sandbox Pluggy)**

- [ ] Em Configurações > Integrações, conectar um banco (sandbox) → widget abre, autentica, onSuccess grava a conexão.
- [ ] Webhook `transactions/created` chega e cria provisões (`pluggy_provisions`).
- [ ] Página `/provisoes` lista as provisões do escopo ativo.
- [ ] "Converter" abre o modal pré-preenchido, cria a Transaction e marca a provisão `CONVERTED` com `convertedToTransactionId`.
- [ ] A transação convertida aparece no Dashboard/Entradas e Saídas.
- [ ] "Ignorar" marca `IGNORED`; "Restaurar" volta para `PROVISION`.
- [ ] "Desconectar" chama `DELETE /items/{id}` e marca `DELETED`; a aba volta ao estado "sem conexão".
- [ ] Testar em dev com `PLUGGY_WEBHOOK_URL` apontando para ngrok HTTPS.

- [ ] **Step 5: Commit final (se houver ajustes)**

```bash
git add -A
git commit -m "chore(pluggy): ajustes finais da integracao"
```

---

## Notas de execução

- **Vínculo pós-conversão:** o `TransactionModal` precisa ser aberto com `initialData` SEM `id` para entrar em modo criação; o `onSaved` devolve o id criado. A provisão é atualizada em `onSaved` via `updateProvision`.
- **Escopo de leitura:** o listener do `usePluggy` lê `pluggy_provisions`/`pluggy_connections` top-level com `where('userId','==',uid)`; o filtro por escopo ativo é client-side.
- **Webhook em dev:** Pluggy exige URL HTTPS; usar ngrok. A secret vai no query param (`?secret=`) embutida na `webhookUrl` do connect token.
- **Race inicial:** se `transactions/created` chegar antes do `connect-record`, a conexão não é encontrada e o evento é ignorado; o auto-sync diário cobre depois.
