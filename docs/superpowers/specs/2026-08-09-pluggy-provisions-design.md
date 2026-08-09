# Design: Integração Pluggy — Provisões

Data: 2026-08-09
Status: Aprovado

## Objetivo

Permitir que o usuário conecte **um banco** (escopo Pessoal ou Empresa) via Pluggy e receba
transações do banco como **provisões** — registros de entrada/saída ainda não vinculados a uma
`Transaction` do GeniusHub. O usuário revisa as provisões em uma página `/provisoes` e as
**converte** em Transactions reais (escolhendo categoria, tags, status), com rastro 1-para-1
da provisão para a transação.

## Decisões de produto

- **Vínculo provisão → transação:** 1-para-1 com rastro. A provisão guarda `convertedToTransactionId`.
- **Escopo:** uma única conexão por usuário. No momento de conectar, o usuário escolhe se a
  conexão pertence ao escopo `PERSONAL` ou a uma `ACCOUNT` específica. A conexão e as provisões
  são lidas/convertidas no escopo ativo.
- **Conexão mobile:** widget `PluggyConnect` embedded no GeniusHub (web + mobile). Sem fluxo QR/deep link.
- **Onde as provisões aparecem:** nova página `/provisoes` (rota `_app.provisoes.tsx`).
- **Desconexão:** disponível na aba Integrações; chama `DELETE /items/{id}` no Pluggy e marca a
  conexão como `DELETED`. Provisões já convertidas permanecem.

## Arquitetura

```
[Widget PluggyConnect]  →  [POST /api/pluggy/connect-token]  →  { connectToken }
        ↓ onSuccess: itemId
[POST /api/pluggy/connect-record]  →  Firestore: pluggy_connections/{connId}
        ↓ (webhookUrl configurado no connect token)
[Pluggy auto-sync → webhook]
        ↓
[POST /api/webhooks/pluggy]  →  fetch /v2/transactions (API Pluggy)
        ↓ Admin SDK
[Firestore: pluggy_provisions/{provId}]
        ↓ onSnapshot listener (cliente)
[/provisoes]  →  "Converter"
        ↓
[TransactionModal pré-preenchido] → addTransaction() + updateProvision(provisionStatus: CONVERTED)
```

### Resolução de usuário no webhook

O webhook da Pluggy não conhece o `uid` do Firestore. Ao criar o `connectToken`, setamos
`clientUserId: <uid>`. No webhook, o `pluggyItemId` resolve a `pluggy_connections` para obter
`userId`, `scopeType` e `scopeId` (onde gravar as provisões).

## Coleções Firestore novas

### `pluggy_connections/{connId}`

Server-only write (Admin SDK). Client-only read.

| Campo | Tipo | Descrição |
|---|---|---|
| `userId` | string | uid do Firestore |
| `scopeType` | `'PERSONAL' \| 'ACCOUNT'` | escopo escolhido ao conectar |
| `scopeId` | string \| null | `null` p/ PERSONAL; `accountId` p/ ACCOUNT |
| `pluggyItemId` | string | UUID do item Pluggy |
| `pluggyConnectorId` | string | id do conector Pluggy |
| `institutionName` | string | nome da instituição |
| `status` | `'ACTIVE' \| 'DELETED'` | estado da conexão |
| `createdAt` / `updatedAt` | string | ISO |

### `pluggy_provisions/{provId}`

Server-only write (Admin SDK). Client-only read, com exceção de update restrito a
`provisionStatus` + `convertedToTransactionId` (ver Rules).

| Campo | Tipo | Descrição |
|---|---|---|
| `userId` | string | uid do Firestore |
| `scopeType` | `'PERSONAL' \| 'ACCOUNT'` | espelha a connection |
| `scopeId` | string \| null | espelha a connection |
| `pluggyTransactionId` | string | id da transação no Pluggy (dedupe) |
| `pluggyItemId` | string | item de origem |
| `pluggyAccountId` | string | conta bancária de origem |
| `amount` | number | valor absoluto positivo |
| `date` | string | ISO `YYYY-MM-DD` |
| `description` | string | descrição vinda do banco |
| `type` | `'INCOME' \| 'EXPENSE'` | já mapeado de `CREDIT`/`DEBIT` |
| `status` | `'PENDING' \| 'POSTED'` | status original do Pluggy |
| `provisionStatus` | `'PROVISION' \| 'CONVERTED' \| 'IGNORED'` | estado da provisão |
| `convertedToTransactionId` | string \| null | id da Transaction criada |
| `createdAt` / `updatedAt` | string | ISO |

Mapeamento `CREDIT → INCOME`, `DEBIT → EXPENSE` acontece no servidor no momento da importação,
para que o `TransactionModal` já abra com o tipo correto.

## Endpoints da API

| Método/rota | Auth | Descrição |
|---|---|---|
| `POST /api/pluggy/connect-token` | `requireAuth` | Cria `connectToken` na Pluggy com `clientUserId: uid` e `webhookUrl`; retorna `{ connectToken }` |
| `POST /api/pluggy/connect-record` | `requireAuth` | Grava `pluggy_connections`; valida membro do `accountId` se `scopeType === 'ACCOUNT'` |
| `DELETE /api/pluggy/connect-record` | `requireAuth` | Chama `DELETE /items/{id}` no Pluggy; marca `status: 'DELETED'` |
| `POST /api/webhooks/pluggy` | Header secret + dedupe | Trata eventos do Pluggy (ver abaixo) |

### Webhook `POST /api/webhooks/pluggy`

Validação: header `X-PLUGGY-API-KEY` (ou webhook secret) + dedupe via
`processed_webhook_events/{eventId}` (padrão do webhook AbacatePay). Eventos:

- `item/created` / `item/updated`: busca item no Pluggy para confirmar status; opcionalmente dispara sync.
- `transactions/created`: usa `createdTransactionsLinkV2` (cursor) para paginar `/v2/transactions`
  e grava cada transação em `pluggy_provisions` (upsert por `pluggyTransactionId` + scope).
- `transactions/updated`: refaz fetch pelos `transactionIds` e atualiza a provision; se já
  `CONVERTED`, propaga atualização de `amount`/`date` para a Transaction linkada.
- `transactions/deleted`: marca provisions `IGNORED` (ou apaga se ainda `PROVISION`).
- `item/deleted`: marca a connection como `DELETED`.

Resposta 2XX imediata; processamento depois de responder (retries do Pluggy até 9x).

## Servidor

- `app/services/pluggy.server.ts` — client Pluggy: auth (API key com cache de 2h),
  `createConnectToken`, `getItem`, `getTransactions` (v2 cursor), `deleteItem`,
  `createWebhook` (registrar `event: all` com header secret).
- `app/services/pluggy-store.server.ts` — helpers Admin SDK: `getConnectionByItemId`,
  `upsertConnection`, `upsertProvision`, `markWebhookProcessed`, `getProvisionsByItem`.

### Env vars (`.env`)

- `PLUGGY_CLIENT_ID`
- `PLUGGY_CLIENT_SECRET`
- `PLUGGY_API_KEY`
- `PLUGGY_WEBHOOK_SECRET`
- `PLUGGY_API_URL=https://api.pluggy.ai`

## Cliente

- `app/lib/pluggy.ts` — helpers de mapeamento e hook `usePluggy(user, activeScope)`:
  expõe `{ connection, provisions, convertProvision, ignoreProvision, restoreProvision }`.
  Listeners via `useCollectionListener` nas coleções `pluggy_connections` e
  `pluggy_provisions`, filtrando pelo escopo ativo.
- `app/components/ProvisionsView.tsx` + rota `_app.provisoes.tsx`:
  - Tabela (desktop) / cards (mobile), padrão `TransactionTable`.
  - Colunas: Data | Descrição | Tipo | Valor | Status da provisão | Ações.
  - Filtros: todos / pendentes / convertidos / ignorados; toggle entrada/saída.
  - Ações: Converter (abre `TransactionModal` pré-preenchido com amount/date/title/type →
    `addTransaction()` → `updateProvision({ provisionStatus: 'CONVERTED', convertedToTransactionId })`),
    Ignorar, Restaurar.
  - Estado vazio: CTA para Configurações > Integrações.
- `app/components/SettingsView.tsx` — nova aba `integracao`:
  - Sem conexão: select de escopo (Pessoal / Empresa), botão "Conectar banco" que carrega o
    script CDN `https://connect.pluggy.ai/connect.js` sob demanda e abre o widget com o
    `connectToken`; `onSuccess` grava a connection.
  - Conectado: instituição, badge do escopo, "Sincronizar agora" (`POST /items/{id}`), "Desconectar"
    (confirmação), CTA para `/provisoes` com contagem pendente.

## Firestore Rules

- `pluggy_connections/{connId}`: `read` se `request.auth.uid == resource.data.userId`;
  `create/update/delete` → `false` (somente Admin SDK).
- `pluggy_provisions/{provId}`: `read` se `request.auth.uid == resource.data.userId`;
  `create/delete` → `false`; `update` permitido somente nas keys `provisionStatus` e
  `convertedToTransactionId` (whitelist, padrão das regras de `transactions`), restrito ao dono.

## Testes

- Unit: mapeamento `CREDIT/DEBIT → INCOME/EXPENSE`; sinal/valor absoluto do amount; dedupe por
  `pluggyTransactionId`; parser do payload do webhook → lista de provisions.
- Manual (sandbox Pluggy): conectar banco sandbox → receber webhook → ver provisões → converter →
  ver rastro `convertedToTransactionId`.
