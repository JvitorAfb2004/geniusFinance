# Spec: Auth, Assinaturas, Permissões e Reports

**Data:** 2026-05-15
**Status:** Design aprovado — aguardando plano de implementação

---

## 0. Visão Geral

5 subsistemas integrados ao GeniusHub (React 19 + Vite + Firebase + Express + Tailwind):

1. **Auth Email/Senha** — login com email/senha mantendo Google Sign-In
2. **Assinaturas + Pagamentos** — Abacate Pay v2 (cartão recorrente + PIX com QR Code), trial 7 dias
3. **Permissões Granulares** — controle por módulo e ação (view/create/edit/delete)
4. **Superadmin: Planos + Assinaturas** — criar/gerenciar planos e atribuir assinaturas
5. **Página de Report** — usuários reportam bugs/sugestões/denúncias

---

## 1. Arquitetura

```
┌──────────────┐     ┌──────────────────┐     ┌─────────────┐
│  React SPA   │────▶│  Express Server  │────▶│  Firestore  │
│  (Vite)      │     │  :3001           │     │             │
└──────────────┘     │                  │     └─────────────┘
                     │ /api/auth/*      │
                     │ /api/sub/*       │     ┌─────────────┐
                     │ /api/webhooks/*  │────▶│  Resend     │
                     │ /api/reports/*   │     │  (emails)   │
                     │ /api/admin/*     │     └─────────────┘
                     └──────────────────┘
                            │
                            │ webhook
                     ┌──────▼──────┐
                     │ Abacate Pay │
                     │    v2       │
                     └─────────────┘
```

**Decisão:** Ampliar o Express server existente (atualmente só proxy AI) com as novas rotas de negócio. Firebase Functions rejeitado por cold start em webhooks.

---

## 2. Subsistema 1 — Auth Email/Senha

### 2.1 Requisitos

- Manter Google Sign-In existente
- Adicionar cadastro/login com email + senha (Firebase Auth)
- Cadastro → trial 7 dias automático
- "Esqueci minha senha" com `sendPasswordResetEmail`
- Emails transacionais via Resend

### 2.2 Firebase Auth

Habilitar provider `Email/Password` no Firebase Console.
Tanto `signInWithEmailAndPassword` quanto `createUserWithEmailAndPassword` já estão disponíveis na SDK v12.

### 2.3 UI — Tela de Login

A tela atual (Google apenas) ganha tabs/modo:

- **Tab Google:** botão "Entrar com Google" existente
- **Tab Email:** formulário email + senha + botão "Entrar"
- **Link:** "Criar conta" → formulário nome + email + senha
- **Link:** "Esqueci minha senha?" → fluxo Firebase reset

### 2.4 Cadastro — Novas coleções

```
users/{uid}/profile
  email: string
  displayName: string
  authProvider: 'google' | 'email'
  createdAt: timestamp

trials/{uid}
  status: 'active' | 'grace_period' | 'expired' | 'converted'
  startedAt: timestamp
  expiresAt: timestamp          // startedAt + 7d
  gracePeriodUntil?: timestamp  // expiresAt + 3d
```

### 2.5 Fluxo de Validação de Acesso

```
[Login] → verifica trials/{uid} e subscriptions/{uid}
  → trial.active ou subscription.active → acesso normal
  → trial.grace_period → banner "regularize", acesso mantido
  → trial.expired sem subscription → bloqueia acesso
```

### 2.6 Rotas Server

| Rota                     | Descrição                                           |
| ------------------------ | --------------------------------------------------- |
| `POST /api/auth/welcome` | Dispara email de boas-vindas (Resend) após cadastro |

### 2.7 Emails (Resend)

| Evento      | Template                                        |
| ----------- | ----------------------------------------------- |
| Cadastro    | "Bem-vindo! Seu trial de 7 dias começou."       |
| Reset senha | Firebase cuida (ou template customizado Resend) |

---

## 3. Subsistema 2 — Assinaturas + Pagamentos

### 3.1 Modelo de Preços

| Plano                            | Preço Base       | Ciclo   |
| -------------------------------- | ---------------- | ------- |
| Pessoal                          | R$19,90/mês      | MONTHLY |
| Empresa                          | R$29,90/mês      | MONTHLY |
| Empresa Adicional                | +R$19,90/mês     | MONTHLY |
| Membro Extra (além do 1º grátis) | +R$4,90/mês cada | MONTHLY |

**Regras:**

- Assinar Empresa dá Pessoal grátis
- Cada empresa tem 1 membro extra grátis
- Membros adicionais cobrados por membro excedente
- Empresas adicionais têm o mesmo limite de membros que a primeira
- Superadmin pode criar planos customizados por usuário

### 3.2 Produtos Abacate Pay

Criar via dashboard Abacate Pay:

| externalId            | Nome              | Valor | Ciclo   |
| --------------------- | ----------------- | ----- | ------- |
| `plan_personal`       | GeniusHub Pessoal | 1990  | MONTHLY |
| `plan_business`       | GeniusHub Empresa | 2990  | MONTHLY |
| `plan_extra_business` | Empresa Adicional | 1990  | MONTHLY |
| `plan_extra_member`   | Membro Extra      | 490   | MONTHLY |

### 3.3 Coleções Firestore

```
plans/{planId}
  name: string
  basePrice: number              // centavos
  type: 'PERSONAL' | 'BUSINESS' | 'EXTRA_BUSINESS' | 'EXTRA_MEMBER'
  abacateProductId: string
  isPublic: boolean
  createdBy: string              // uid do superadmin
  createdAt: timestamp

subscriptions/{userId}
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired'
  trialStartedAt?: timestamp
  trialExpiresAt?: timestamp
  gracePeriodUntil?: timestamp
  currentPeriodStart?: timestamp
  currentPeriodEnd?: timestamp
  abacateSubscriptionId?: string
  abacateCustomerId?: string
  paymentMethod: 'CARD' | 'PIX' | null
  items: { planId: string, quantity: number, unitPrice: number }[]
  totalAmount: number            // centavos
  canceledAt?: timestamp
  pendingPix?: {
    brCode: string
    brCodeBase64: string
    transparentId: string
    amount: number
    expiresAt: string
    generatedAt: timestamp
  }
  createdAt: timestamp
  updatedAt: timestamp

billing_history/{id}
  userId: string
  subscriptionId: string
  type: 'trial_start' | 'payment_created' | 'payment_paid' | 'payment_failed' | 'subscription_cancelled'
  abacateCheckoutId?: string
  abacatePaymentId?: string
  amount: number
  status: string
  metadata?: object
  createdAt: timestamp
```

### 3.4 Fluxo — Cartão de Crédito

```
[Usuário] → escolhe plano → POST /api/sub/create
  → servidor calcula total com empresas + membros
  → cria/recupera customer no Abacate Pay (POST /v2/customers)
  → cria subscription checkout via Abacate Pay:
      POST /v2/subscriptions/create
      { items: [{ id: productId, quantity }], customerId, methods: ["CARD"] }
  → retorna { url, subscriptionId } para o frontend
  → usuário redirecionado ao checkout Abacate Pay
  → preenche dados do cartão na página Abacate Pay
  → pagamento aprovado
  → webhook subscription.completed → servidor:
      - atualiza subscriptions/{userId} status = 'active'
      - registra billing_history
      - envia email "Assinatura ativada" (Resend)
  → renovações automáticas:
      webhook subscription.renewed → atualiza período + billing_history
```

### 3.5 Fluxo — PIX

```
[Usuário] → escolhe plano → POST /api/sub/create
  → servidor calcula total
  → cria customer no Abacate Pay
  → gera checkout transparente PIX:
      POST /v2/transparents/create
      { method: "PIX", data: { amount, description, expiresIn: 3600,
        customer: { name, email, taxId } } }
  → retorna { brCode, brCodeBase64, id, expiresAt }
  → frontend exibe QR Code + código copia e cola
  → usuário paga via app do banco
  → webhook transparent.completed → servidor:
      - ativa subscription (status = 'active')
      - registra billing_history
      - envia email confirmação

[A cada renovação] → webhook subscription.renewed
  → servidor gera novo transparent checkout PIX
  → armazena em subscriptions/{userId}.pendingPix = { brCode, brCodeBase64, expiresAt }
  → frontend busca GET /api/sub/pix-pending e exibe QR Code
  → usuário paga → transparent.completed → renova
```

### 3.6 Fluxo — Trial

```
[Cadastro] → cria trials/{uid} e subscriptions/{uid} status = 'trial'
  trialStartedAt = now, trialExpiresAt = now + 7d
  → email "Bem-vindo! Trial 7 dias"

[3 dias antes do fim] → cron/scheduler:
  → banner no dashboard: "Seu trial termina em X dias"
  → email "Trial expirando"

[Trial expira] → status = 'grace_period', gracePeriodUntil = now + 3d
  → banner "Regularize seu pagamento — acesso será bloqueado em X dias"

[Grace period expira sem pagamento] → status = 'expired'
  → bloqueia acesso
```

### 3.7 Webhook Handler

Rota: `POST /api/webhooks/abacate`

```
1. Verificar HMAC-SHA256 (X-Webhook-Signature)
2. Verificar idempotência (event.id já processado?)
3. Switch event.type:
   - subscription.completed  → ativar subscription
   - subscription.renewed    → renovar período; se PIX, gerar QR code
   - subscription.cancelled  → cancelar, notificar
   - transparent.completed   → confirmar pagamento PIX, notificar
4. Responder 200 OK
```

### 3.8 Rotas Server

| Rota                       | Auth | Descrição                              |
| -------------------------- | ---- | -------------------------------------- |
| `GET /api/sub/status`      | user | Status trial + subscription do usuário |
| `POST /api/sub/create`     | user | Criar subscription (cartão ou PIX)     |
| `POST /api/sub/cancel`     | user | Cancelar subscription                  |
| `GET /api/sub/pix-pending` | user | QR Code PIX pendente do ciclo atual    |

### 3.9 Emails Transacionais (Resend)

| Evento               | Template                                                |
| -------------------- | ------------------------------------------------------- |
| Trial iniciado       | "Bem-vindo! Seu trial de 7 dias começou."               |
| Trial expirando      | "Seu trial termina em X dias. Assine para continuar."   |
| Pagamento confirmado | "Assinatura ativada com sucesso!"                       |
| Renovação            | "Sua assinatura foi renovada."                          |
| PIX gerado           | "Novo QR Code PIX disponível para pagamento."           |
| Pagamento falhou     | "Não foi possível processar seu pagamento. Regularize." |
| Cancelamento         | "Sua assinatura foi cancelada."                         |

---

## 4. Subsistema 3 — Permissões Granulares

### 4.1 Modelo

```typescript
type ModuleAction = "view" | "create" | "edit" | "delete";

type ModuleName =
  | "dashboard"
  | "transactions"
  | "fixed_monthly"
  | "credit_cards"
  | "dre"
  | "budget"
  | "sales"
  | "goals"
  | "reports"
  | "leads"
  | "projects"
  | "service_types";

type MemberPermissions = Record<ModuleName, ModuleAction[]>;
```

### 4.2 Armazenamento

Campo `permissions` em `accounts/{accountId}/members/{uid}`:

```json
{
  "uid": "...",
  "email": "...",
  "role": "member",
  "permissions": {
    "dashboard": ["view"],
    "transactions": ["view", "create", "edit"],
    "fixed_monthly": ["view"],
    "credit_cards": ["view"],
    "dre": ["view"],
    "budget": ["view", "create", "edit", "delete"],
    "sales": [],
    "goals": ["view", "edit"],
    "reports": ["view"],
    "leads": ["view", "create", "edit", "delete"],
    "projects": ["view", "create", "edit"],
    "service_types": []
  }
}
```

### 4.3 Templates por Papel

| Papel                | Template                                                                    |
| -------------------- | --------------------------------------------------------------------------- |
| **owner**            | Todas ações em todos módulos                                                |
| **admin**            | Todas ações em todos módulos                                                |
| **member** (default) | view em todos; create+edit em transactions, budgets, leads, projects, goals |

### 4.4 Verificação

**Firestore Rules:**

```
match /accounts/{accountId}/{collection}/{docId} {
  allow read: if memberHasPermission(accountId, collection, 'view');
  allow create: if memberHasPermission(accountId, collection, 'create');
  allow update: if memberHasPermission(accountId, collection, 'edit');
  allow delete: if memberHasPermission(accountId, collection, 'delete');
}
```

**UI — Sidebar:**

- Esconde módulos sem `view`

**UI — Componentes:**

- Botões Criar/Editar/Deletar renderizam condicionalmente
- `usePermission(module, action): boolean` hook

### 4.5 UI — Modal de Permissões

SettingsView → aba "Conta" → lista de membros → botão "Permissões" abre modal:

```
┌──────────────────────────────────────────┐
│  Permissões: email@exemplo.com           │
│                                          │
│  Módulo          Ver  Criar  Editar  Del │
│  ────────────    ───  ─────  ──────  ─── │
│  Dashboard        ☑     -      -      -  │
│  Transações       ☑     ☑      ☑      ☐  │
│  Fixos Mensais    ☑     ☐      ☐      ☐  │
│  Cartões          ☑     ☐      ☐      ☐  │
│  DRE              ☑     -      -      -  │
│  Orçamento        ☑     ☑      ☑      ☑  │
│  Vendas           ☐     ☐      ☐      ☐  │
│  Metas            ☑     ☐      ☑      ☐  │
│  Relatórios        ☑     -      -      -  │
│  Leads            ☑     ☑      ☑      ☑  │
│  Projetos         ☑     ☑      ☑      ☐  │
│  Serviços         ☐     ☐      ☐      ☐  │
│                                          │
│  [Restaurar Padrão]  [Salvar] [Cancelar] │
└──────────────────────────────────────────┘
```

### 4.6 Rotas Server

| Rota                                             | Auth        | Descrição           |
| ------------------------------------------------ | ----------- | ------------------- |
| `PUT /api/accounts/:id/members/:uid/permissions` | owner/admin | Atualiza permissões |

---

## 5. Subsistema 4 — Superadmin: Planos + Assinaturas

### 5.1 Superadmin

Identificado por claim customizada no Firebase Auth: `{ role: 'superadmin' }`. Setada manualmente via Firebase Admin SDK.

### 5.2 Páginas Superadmin

Acesso via sidebar (só visível para superadmin):

**Gestão de Planos:**

```
┌──────────────────────────────────────────┐
│  Planos                                  │
│  [+ Novo Plano]                          │
│                                          │
│  ┌──────────┬────────┬────────┬───────┐  │
│  │ Nome     │ Tipo   │ Preço  │ Ações │  │
│  ├──────────┼────────┼────────┼───────┤  │
│  │ Pessoal  │PERSONAL│ 19,90  │ Editar│  │
│  │ Empresa  │BUSINESS│ 29,90  │ Editar│  │
│  │ VIP      │PERSONAL│ 49,90  │ Editar│  │
│  └──────────┴────────┴────────┴───────┘  │
└──────────────────────────────────────────┘
```

**Criar/Editar Plano:**

```
┌──────────────────────────────────────────┐
│  Novo Plano / Editar Plano               │
│                                          │
│  Nome: ___________________________       │
│  Tipo: [Pessoal ▼]                       │
│  Preço (R$): [____,__]                   │
│  ID Produto Abacate: _______________     │
│  Público: ☑                              │
│  Disponível para:                        │
│    ○ Todos                               │
│    ○ Usuário específico: [email]          │
│                                          │
│  [Salvar]                                │
└──────────────────────────────────────────┘
```

**Gestão de Assinaturas:**

```
┌──────────────────────────────────────────────┐
│  Assinaturas                                 │
│  [Buscar usuário...]                         │
│                                              │
│  ┌────────┬──────────┬────────┬────────────┐ │
│  │ User   │ Status   │ Plano  │ Expira     │ │
│  ├────────┼──────────┼────────┼────────────┤ │
│  │ a@b.co │ active   │ Empres │ 15/06/26   │ │
│  │ c@d.co │ trial    │ -      │ 22/05/26   │ │
│  │ e@f.co │ expired  │ -      │ 08/05/26   │ │
│  └────────┴──────────┴────────┴────────────┘ │
│                                              │
│  ┌──────────────────────────────────────┐    │
│  │ Ações: [Atribuir Plano] [Remover]    │    │
│  │        [Adicionar dias] [Estender]   │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

**Atribuir Plano (modal):**

```
┌──────────────────────────────────────────┐
│  Atribuir Assinatura para: user@email    │
│                                          │
│  Plano: [Plano ▼]                        │
│  Duração:                                │
│    ○ Dias: [___]                         │
│    ○ Meses: [___]                        │
│    ○ Até data: [__/__/____]              │
│    ○ Indeterminado (recorrente)          │
│                                          │
│  [Atribuir]                              │
└──────────────────────────────────────────┘
```

### 5.3 Rotas Server

| Rota                                   | Auth       | Descrição                    |
| -------------------------------------- | ---------- | ---------------------------- |
| `GET /api/admin/plans`                 | superadmin | Lista todos planos           |
| `POST /api/admin/plans`                | superadmin | Cria plano                   |
| `PUT /api/admin/plans/:id`             | superadmin | Edita plano                  |
| `DELETE /api/admin/plans/:id`          | superadmin | Remove plano                 |
| `GET /api/admin/subscriptions`         | superadmin | Lista todas subscriptions    |
| `POST /api/admin/subscriptions/assign` | superadmin | Atribui assinatura a usuário |
| `POST /api/admin/subscriptions/revoke` | superadmin | Remove assinatura de usuário |
| `POST /api/admin/subscriptions/extend` | superadmin | Estende/ajusta período       |

---

## 6. Subsistema 5 — Página de Report

### 6.1 Coleção

```
reports/{reportId}
  type: 'bug' | 'suggestion' | 'abuse'
  reporterId: string
  reporterEmail: string
  reporterName: string
  title: string
  description: string
  severity?: 'low' | 'medium' | 'high' | 'critical'
  screenshot?: string            // Storage URL
  status: 'open' | 'in_progress' | 'resolved' | 'closed'
  adminNotes?: string
  module?: ModuleName
  createdAt: timestamp
  updatedAt: timestamp
```

### 6.2 UI — Usuário

Sidebar ganha item "Reportar Problema" (ícone `Bug`):

```
┌─────────────────────────────────────────┐
│  Reportar Problema                      │
│                                         │
│  Tipo:  ○ Bug  ○ Sugestão  ○ Denúncia  │
│                                         │
│  Título: ___________________________    │
│                                         │
│  Descrição:                             │
│  ┌─────────────────────────────────┐    │
│  │                                 │    │
│  └─────────────────────────────────┘    │
│                                         │
│  Módulo: [Selecione ▼]                  │
│                                         │
│  Severidade (se bug):                   │
│    ○ Baixa  ○ Média  ○ Alta  ○ Crítica │
│                                         │
│  Screenshot: [Upload]                    │
│                                         │
│  [Enviar Report]                        │
└─────────────────────────────────────────┘
```

Lista de reports do usuário abaixo do formulário (mini tabela com status).

### 6.3 UI — Superadmin

Nova view "Reports" no painel superadmin:

```
┌──────────────────────────────────────────────┐
│  Reports Recebidos                           │
│                                              │
│  Filtros: [Status ▼] [Tipo ▼] [Módulo ▼]    │
│                                              │
│  ┌────┬────────┬────────┬────────┬───────┐   │
│  │ ID │ Título │ Tipo   │ Status │ Data  │   │
│  ├────┼────────┼────────┼────────┼───────┤   │
│  │ #1 │ Bug..  │ bug    │ open   │ 15/05 │   │
│  └────┴────────┴────────┴────────┴───────┘   │
│                                              │
│  Detalhe do report selecionado:              │
│  ┌──────────────────────────────────────┐    │
│  │ Título, descrição, screenshot         │    │
│  │ Notas internas (admin): ___________   │    │
│  │ Status: [Em Progresso ▼]              │    │
│  │ [Atualizar]                           │    │
│  └──────────────────────────────────────┘    │
└──────────────────────────────────────────────┘
```

### 6.4 Rotas Server

| Rota                         | Auth       | Descrição                |
| ---------------------------- | ---------- | ------------------------ |
| `POST /api/reports`          | user       | Cria report              |
| `GET /api/reports`           | user       | Lista reports do usuário |
| `GET /api/admin/reports`     | superadmin | Lista todos reports      |
| `PUT /api/admin/reports/:id` | superadmin | Atualiza status/notas    |

### 6.5 Emails (Resend)

| Evento            | Destino                                |
| ----------------- | -------------------------------------- |
| Report criado     | Superadmin: "Novo report #X: [título]" |
| Status atualizado | Reporter: "Seu report #X foi [status]" |

---

## 7. Ampliação do Express Server

O `server/index.cjs` atual vira `server/index.cjs` com estrutura modular:

```
server/
  index.cjs              # entry point, monta rotas
  middleware/
    auth.cjs             # verifica Firebase token
  routes/
    auth.cjs             # /api/auth/*
    subscriptions.cjs    # /api/sub/*
    webhooks.cjs         # /api/webhooks/*
    reports.cjs          # /api/reports/*
    admin.cjs            # /api/admin/*
  services/
    abacate.cjs          # cliente Abacate Pay v2
    resend.cjs           # cliente Resend
    firebase-admin.cjs   # Firebase Admin SDK
```

**Middleware de auth:**

```javascript
// Verifica Authorization: Bearer <firebase-id-token>
// Injeta req.user = { uid, email, role }
// role='superadmin' vem de custom claim
```

---

## 8. Resumo — Todas as Coleções Firestore

| Coleção                | Path            | Descrição             |
| ---------------------- | --------------- | --------------------- |
| users/{uid}/profile    | users           | Perfil do usuário     |
| trials/{uid}           | trials          | Status do trial       |
| plans/{planId}         | plans           | Planos (superadmin)   |
| subscriptions/{userId} | subscriptions   | Assinatura ativa      |
| billing_history/{id}   | billing_history | Histórico de cobrança |
| reports/{reportId}     | reports         | Reports dos usuários  |

**Coleções existentes mantidas:**
| Coleção | Path | Status |
|---------|------|--------|
| transactions | users/{uid}/... ou accounts/{id}/... | Mantido |
| categories | (idem) | Mantido |
| budgets | (idem) | Mantido |
| sales-targets | (idem) | Mantido |
| tags | (idem) | Mantido |
| goals | (idem) | Mantido |
| leads | (idem) | Mantido |
| lead-options | (idem) | Mantido |
| service-types | (idem) | Mantido |
| projects | (idem) | Mantido |
| accounts | accounts | Mantido |
| accounts/{id}/members | accounts | **+campo permissions** |
| accounts/{id}/invites | accounts | Mantido |

---

## 9. Ordem de Implementação

| Fase  | Subsistema                              | Depende de      |
| ----- | --------------------------------------- | --------------- |
| **1** | Auth Email/Senha + Resend               | Nada            |
| **2** | Assinaturas + Abacate Pay + Webhooks    | Auth (1)        |
| **3** | Superadmin: Planos + Gestão Assinaturas | Assinaturas (2) |
| **4** | Permissões Granulares                   | Auth (1)        |
| **5** | Página de Report                        | Auth (1)        |

---

## 10. Riscos e Mitigações

| Risco                                   | Mitigação                                                     |
| --------------------------------------- | ------------------------------------------------------------- |
| Abacate Pay mudar API                   | Webhook com idempotência; versionamento nos headers           |
| Webhook não entregue                    | Retry com backoff pelo Abacate Pay; idempotência por event ID |
| HMAC verification falhar                | Log e alerta; chave pública hardcoded do Abacate Pay          |
| Trial expirar mas usuário ainda acessar | Verificação no client (App.tsx) + server (middleware)         |
| Permissão granular muito complexa na UI | Template por papel reduz configuração inicial                 |
| Superadmin não identificado             | Custom claim via Firebase Admin; cache local                  |
| PIX QR code expirado sem pagamento      | Regerar automaticamente no próximo ciclo                      |

---

## 11. Definição de Pronto

- [ ] Usuário cadastra com email/senha e recebe trial 7 dias
- [ ] Usuário assina com cartão (recorrente) ou PIX (QR code por ciclo)
- [ ] Trial expira → 3d tolerância → bloqueio
- [ ] Superadmin cria/edita planos e atribui/remove assinaturas
- [ ] Owner/admin configura permissões granulares por membro
- [ ] Membro sem permissão não vê módulo/ação na UI e tem acesso negado nas rules
- [ ] Usuário reporta bug/sugestão/denúncia
- [ ] Superadmin visualiza e gerencia reports
- [ ] Emails transacionais enviados via Resend em todos os eventos
