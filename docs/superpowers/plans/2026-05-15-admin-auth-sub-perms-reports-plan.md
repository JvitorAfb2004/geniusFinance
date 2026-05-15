# Plano de Implementação: Auth, Assinaturas, Permissões e Reports

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Implementar 5 subsistemas no GeniusHub: auth email/senha, assinaturas com Abacate Pay v2, permissões granulares, painel superadmin e página de report.

**Architecture:** Ampliar o Express server existente como backend de negócio (webhooks, assinaturas, emails), mantendo Firebase Auth + Firestore como banco. React 19 SPA com Vite + Tailwind CSS.

**Tech Stack:** React 19, TypeScript 5.8, Vite 6, Firebase 12 (Auth + Firestore), Express 4, Abacate Pay v2 REST API, Resend (emails transacionais), Tailwind CSS 4, Lucide React

**Spec de referência:** `docs/superpowers/specs/2026-05-15-admin-auth-sub-perms-reports-design.md`

---

## Estrutura de Arquivos

### Arquivos Novos
```
server/
  middleware/
    auth.cjs                    # Verifica Firebase ID token, injeta req.user
  services/
    firebase-admin.cjs          # Inicializa Firebase Admin SDK
    abacate.cjs                 # Cliente HTTP Abacate Pay v2
    resend.cjs                  # Cliente Resend (emails)
  routes/
    auth.cjs                    # /api/auth/*
    subscriptions.cjs           # /api/sub/*
    webhooks.cjs                # /api/webhooks/*
    reports.cjs                 # /api/reports/*
    admin.cjs                   # /api/admin/*

src/
  components/
    LoginEmailForm.tsx           # Formulário email/senha + cadastro
    SubscriptionView.tsx         # Página de assinatura/planos
    PixQRCode.tsx                # Exibe QR Code PIX
    ReportsView.tsx              # Página de report (usuário)
    AdminPlansView.tsx           # Superadmin: gestão de planos
    AdminSubscriptionsView.tsx   # Superadmin: gestão de assinaturas
    AdminReportsView.tsx         # Superadmin: gestão de reports
    PermissionsModal.tsx         # Modal de permissões por membro
  hooks/
    useSubscription.tsx          # Hook de subscription + trial
    usePermissions.tsx           # Hook de permissões granulares
  lib/
    api.ts                       # Fetch wrapper com Firebase token
    subscriptionService.ts       # Lógica de precificação
```

### Arquivos Modificados
```
server/index.cjs                 # Reestruturado com rotas modulares
src/App.tsx                      # + Login email/senha, + acesso condicional subscription
src/types.ts                     # + tipos Plan, Subscription, Report, MemberPermissions
src/lib/firebase.ts              # + signInWithEmail, signUpWithEmail, resetPassword
src/hooks/useFinance.tsx         # + subscription state, + superadmin check
src/components/Header.tsx        # + item "Reportar" na sidebar (ou App.tsx)
src/components/SettingsView.tsx  # + botão Permissões na lista de membros
firestore.rules                  # + permissões granulares + novas coleções
.env.example                     # + ABACATE_API_KEY, RESEND_API_KEY
```

---

## FASE 1: Auth Email/Senha + Resend

### Task 1.1: Firebase Auth — funções email/senha

**Files:**
- Modify: `src/lib/firebase.ts`

- [ ] **Step 1: Adicionar funções de auth email/senha**

```typescript
// Adicionar no final de src/lib/firebase.ts, após as funções existentes:
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile 
} from 'firebase/auth';

export const signInWithEmail = async (email: string, password: string) => {
  return signInWithEmailAndPassword(auth, email, password);
};

export const signUpWithEmail = async (displayName: string, email: string, password: string) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(cred.user, { displayName });
  return cred;
};

export const resetPassword = async (email: string) => {
  return sendPasswordResetEmail(auth, email);
};
```

- [ ] **Step 2: Commit**

```bash
git add src/lib/firebase.ts
git commit -m "feat: add email/password auth functions to firebase lib"
```

---

### Task 1.2: Tela de Login com Email/Senha

**Files:**
- Create: `src/components/LoginEmailForm.tsx`
- Modify: `src/App.tsx` (linhas 117-192, seção `if (!user)`)

- [ ] **Step 1: Criar componente LoginEmailForm**

```tsx
// src/components/LoginEmailForm.tsx
import React, { useState } from 'react';
import { signInWithEmail, signUpWithEmail, resetPassword } from '../lib/firebase';
import { Mail, Lock, User, ArrowRight, Eye, EyeOff } from 'lucide-react';

interface Props {
  onSuccess: () => void;
}

export function LoginEmailForm({ onSuccess }: Props) {
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (mode === 'login') {
        await signInWithEmail(email, password);
        onSuccess();
      } else if (mode === 'register') {
        await signUpWithEmail(name, email, password);
        // Dispara email de boas-vindas
        const token = await (await import('../lib/firebase')).auth.currentUser?.getIdToken();
        fetch('/api/auth/welcome', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ displayName: name }),
        }).catch(() => {});
        onSuccess();
      } else if (mode === 'forgot') {
        await resetPassword(email);
        setResetSent(true);
      }
    } catch (err: any) {
      const msg = err?.code === 'auth/user-not-found' ? 'Email não cadastrado.'
        : err?.code === 'auth/wrong-password' ? 'Senha incorreta.'
        : err?.code === 'auth/email-already-in-use' ? 'Este email já está em uso.'
        : err?.code === 'auth/weak-password' ? 'Senha deve ter pelo menos 6 caracteres.'
        : err?.code === 'auth/invalid-email' ? 'Email inválido.'
        : 'Erro ao processar. Tente novamente.';
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (resetSent) {
    return (
      <div className="text-center">
        <div className="w-12 h-12 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
          <Mail className="w-6 h-6" />
        </div>
        <p className="text-sm text-text-primary font-medium">Email enviado!</p>
        <p className="text-xs text-text-secondary mt-1 mb-4">Verifique sua caixa de entrada.</p>
        <button onClick={() => { setMode('login'); setResetSent(false); }}
          className="text-xs text-[#3b82f6] hover:underline font-medium cursor-pointer">
          Voltar ao login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-3">
      {mode === 'register' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
          <User className="w-4 h-4 text-white/50 shrink-0" />
          <input
            type="text" placeholder="Nome completo" value={name}
            onChange={(e) => setName(e.target.value)}
            className="bg-transparent outline-none text-sm text-white placeholder:text-white/30 flex-1"
            required={mode === 'register'}
          />
        </div>
      )}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
        <Mail className="w-4 h-4 text-white/50 shrink-0" />
        <input
          type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="bg-transparent outline-none text-sm text-white placeholder:text-white/30 flex-1"
          required
        />
      </div>
      {mode !== 'forgot' && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 border border-white/10">
          <Lock className="w-4 h-4 text-white/50 shrink-0" />
          <input
            type={showPw ? 'text' : 'password'} placeholder="Senha" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-transparent outline-none text-sm text-white placeholder:text-white/30 flex-1"
            required minLength={6}
          />
          <button type="button" onClick={() => setShowPw(!showPw)}
            className="text-white/40 hover:text-white/70 cursor-pointer">
            {showPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
          </button>
        </div>
      )}
      {error && <p className="text-red-400 text-xs">{error}</p>}
      <button type="submit" disabled={loading}
        className="w-full bg-[#3b82f6] hover:bg-[#2563eb] text-white font-medium py-2.5 rounded-xl transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50">
        {loading ? '...' : mode === 'login' ? 'Entrar' : mode === 'register' ? 'Criar Conta' : 'Enviar Email'}
        {!loading && <ArrowRight className="w-4 h-4" />}
      </button>
      <div className="flex justify-between text-xs">
        {mode === 'login' ? (
          <>
            <button type="button" onClick={() => setMode('register')}
              className="text-[#60a5fa] hover:underline cursor-pointer font-medium">
              Criar conta
            </button>
            <button type="button" onClick={() => setMode('forgot')}
              className="text-white/50 hover:text-white/80 cursor-pointer">
              Esqueci minha senha?
            </button>
          </>
        ) : (
          <button type="button" onClick={() => { setMode('login'); setError(''); }}
            className="text-[#60a5fa] hover:underline cursor-pointer font-medium">
            Já tenho conta
          </button>
        )}
      </div>
    </form>
  );
}
```

- [ ] **Step 2: Modificar App.tsx — tela de login**

Na seção `if (!user)` (linha 117), substituir o bloco inteiro. O novo bloco mantém o Google Sign-In e adiciona o formulário email/senha:

```tsx
// Substituir o conteúdo dentro de if (!user) { return (...) }
// Mantém o mesmo container, gradiente, e logo. Substitui o conteúdo do card:

if (!user) {
  const [authMode, setAuthMode] = useState<'google' | 'email'>('google');

  return (
    <div className="flex flex-col h-[100dvh] items-center justify-center bg-gradient-to-br from-bg to-primary/5 px-4 relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
      <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-success/5 rounded-full blur-3xl" />
      <div className="bg-surface p-8 rounded-2xl shadow-lg border border-border text-center max-w-md w-full relative z-10">
        <div className="w-16 h-16 bg-gradient-to-br from-primary to-blue-400 text-surface rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-md">
          <PieChart className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-extrabold text-text-primary mb-2 font-sans tracking-tight">GeniusHub<span className="text-primary">.</span></h1>
        <p className="text-text-secondary mb-6">Faça login para acessar seus dados.</p>

        {/* Tabs */}
        <div className="flex mb-4 bg-white/5 rounded-lg p-0.5">
          <button
            onClick={() => setAuthMode('google')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all cursor-pointer ${authMode === 'google' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
          >
            Google
          </button>
          <button
            onClick={() => setAuthMode('email')}
            className={`flex-1 py-2 text-sm font-medium rounded-md transition-all cursor-pointer ${authMode === 'email' ? 'bg-white/10 text-white' : 'text-white/40 hover:text-white/70'}`}
          >
            Email
          </button>
        </div>

        {/* Terms checkbox */}
        <label className="flex items-start gap-2 mb-4 cursor-pointer">
          <input
            type="checkbox"
            checked={termsAccepted}
            onChange={() => setTermsAccepted(!termsAccepted)}
            className="mt-0.5 w-4 h-4 rounded border-gray-300 text-[#3b82f6] focus:ring-[#3b82f6] cursor-pointer shrink-0"
          />
          <span className="text-xs text-text-secondary leading-relaxed select-none">
            Li e concordo com os{' '}
            <button type="button" onClick={() => setLegalModal('terms')}
              className="text-[#3b82f6] hover:underline font-medium cursor-pointer">Termos de Uso</button>
            {' '}e a{' '}
            <button type="button" onClick={() => setLegalModal('privacy')}
              className="text-[#3b82f6] hover:underline font-medium cursor-pointer">Política de Privacidade</button>
          </span>
        </label>

        {authMode === 'google' ? (
          <button
            onClick={() => { localStorage.setItem(TERMS_KEY, 'true'); signInWithGoogle(); }}
            disabled={!termsAccepted}
            className="w-full bg-text-primary hover:bg-[#0f172a] text-surface font-medium py-3 px-4 rounded-xl transition-all flex items-center justify-center gap-3 shadow-sm hover:shadow-md disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5" fill="currentColor">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 15.02 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Entrar com Google
          </button>
        ) : (
          <LoginEmailForm onSuccess={() => { localStorage.setItem(TERMS_KEY, 'true'); }} />
        )}

        <div className="mt-8 pt-6 border-t border-border">
          <p className="text-xs text-text-muted font-medium tracking-wide">
            Desenvolvido por <a href="https://geniusweb.online" target="_blank" rel="noopener noreferrer" className="text-[#3b82f6] hover:underline">geniusweb.online</a>
          </p>
        </div>
      </div>

      {legalModal === 'terms' && (
        <LegalModal title="Termos de Uso" content={TERMOS_DE_USO} onClose={() => setLegalModal(null)} />
      )}
      {legalModal === 'privacy' && (
        <LegalModal title="Política de Privacidade" content={POLITICA_PRIVACIDADE} onClose={() => setLegalModal(null)} />
      )}
    </div>
  );
}
```

**Nota:** Adicionar `import { LoginEmailForm } from './components/LoginEmailForm';` no topo de App.tsx. E adicionar `useState` na importação de React se ainda não estiver.

- [ ] **Step 3: Rodar build para verificar**

```bash
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add src/components/LoginEmailForm.tsx src/App.tsx
git commit -m "feat: add email/password login and registration UI"
```

---

### Task 1.3: Firebase Admin SDK no servidor

**Files:**
- Create: `server/services/firebase-admin.cjs`
- Modify: `server/index.cjs`
- Modify: `.env.example`

- [ ] **Step 1: Instalar firebase-admin**

```bash
npm install firebase-admin
```

- [ ] **Step 2: Criar firebase-admin.cjs**

```javascript
// server/services/firebase-admin.cjs
const admin = require('firebase-admin');

// Inicializa com credenciais de service account
// O arquivo JSON da service account deve estar em server/service-account.json
// (NÃO comitar — adicionar ao .gitignore)
let initialized = false;

function initialize() {
  if (initialized) return;
  
  const serviceAccount = require('../service-account.json');
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
  initialized = true;
}

function auth() {
  initialize();
  return admin.auth();
}

async function verifyIdToken(token) {
  initialize();
  return admin.auth().verifyIdToken(token);
}

async function setSuperadmin(uid, isSuperadmin = true) {
  initialize();
  return admin.auth().setCustomUserClaims(uid, { role: isSuperadmin ? 'superadmin' : undefined });
}

function firestore() {
  initialize();
  return admin.firestore();
}

module.exports = { verifyIdToken, setSuperadmin, auth, firestore };
```

- [ ] **Step 3: Atualizar .env.example**

```
# Adicionar ao .env.example:
# ABACATE_API_KEY: Chave da API Abacate Pay v2 (obter em app.abacatepay.com)
ABACATE_API_KEY=""
# ABACATE_WEBHOOK_SECRET: Secret configurado nos webhooks do Abacate Pay
ABACATE_WEBHOOK_SECRET=""
# RESEND_API_KEY: Chave da API Resend (obter em resend.com)
RESEND_API_KEY=""
# SUPERADMIN_EMAIL: Email do superadmin para receber reports
SUPERADMIN_EMAIL=""
```

- [ ] **Step 4: Atualizar .gitignore**

Adicionar linha: `server/service-account.json`

- [ ] **Step 5: Commit**

```bash
npm install firebase-admin
git add server/services/firebase-admin.cjs .env.example .gitignore package.json package-lock.json
git commit -m "feat: add Firebase Admin SDK and env vars for server"
```

---

### Task 1.4: Middleware de Auth no Express

**Files:**
- Create: `server/middleware/auth.cjs`

- [ ] **Step 1: Criar middleware de auth**

```javascript
// server/middleware/auth.cjs
const { verifyIdToken } = require('../services/firebase-admin.cjs');

async function authRequired(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Token não fornecido' }));
    return;
  }

  try {
    const token = header.split('Bearer ')[1];
    const decoded = await verifyIdToken(token);
    req.user = {
      uid: decoded.uid,
      email: decoded.email || '',
      role: decoded.role || null,
    };
    next();
  } catch (err) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Token inválido ou expirado' }));
  }
}

function superadminRequired(req, res, next) {
  if (!req.user || req.user.role !== 'superadmin') {
    res.writeHead(403, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ error: 'Acesso restrito a superadmins' }));
    return;
  }
  next();
}

module.exports = { authRequired, superadminRequired };
```

- [ ] **Step 2: Commit**

```bash
git add server/middleware/auth.cjs
git commit -m "feat: add auth and superadmin middleware for Express"
```

---

### Task 1.5: Resend Service + Rota Welcome

**Files:**
- Create: `server/services/resend.cjs`
- Create: `server/routes/auth.cjs`
- Modify: `server/index.cjs`

- [ ] **Step 1: Criar service Resend**

```javascript
// server/services/resend.cjs
const API_KEY = process.env.RESEND_API_KEY;
const BASE = 'https://api.resend.com';

async function sendEmail({ to, subject, html }) {
  if (!API_KEY) {
    console.warn('[Resend] RESEND_API_KEY not set — skipping email to', to);
    return { skipped: true };
  }

  const res = await fetch(`${BASE}/emails`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${API_KEY}`,
    },
    body: JSON.stringify({
      from: 'GeniusHub <no-reply@geniushub.app>',
      to,
      subject,
      html,
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    console.error('[Resend] Failed:', res.status, err);
    throw new Error(`Resend error: ${res.status}`);
  }

  return res.json();
}

module.exports = { sendEmail };
```

- [ ] **Step 2: Criar rota auth**

```javascript
// server/routes/auth.cjs
const { authRequired } = require('../middleware/auth.cjs');
const { sendEmail } = require('../services/resend.cjs');

function mount(router) {
  router.post('/api/auth/welcome', authRequired, async (req, res) => {
    const { displayName } = req.body;
    const email = req.user.email;

    try {
      await sendEmail({
        to: email,
        subject: 'Bem-vindo ao GeniusHub!',
        html: `
          <h2>Bem-vindo ao GeniusHub, ${displayName || 'usuário'}!</h2>
          <p>Seu trial de <strong>7 dias</strong> começou. Aproveite todos os recursos gratuitamente.</p>
          <p>Acesse: <a href="https://geniushub.app">geniushub.app</a></p>
          <hr/>
          <p style="color:#666;font-size:12px">GeniusHub by geniusweb.online</p>
        `,
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      console.error('[auth] Welcome email failed:', err.message);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Falha ao enviar email' }));
    }
  });
}

module.exports = { mount };
```

- [ ] **Step 3: Reestruturar server/index.cjs com rotas modulares**

Substituir o conteúdo de `server/index.cjs`:

```javascript
// server/index.cjs — GeniusHub API Server ampliado
const http = require('http');

// Carrega .env manualmente (dotenv já está no projeto via dependência)
try { require('dotenv').config(); } catch {}

const PORT = process.env.PORT || 3001;

// Simple router
const routes = [];

function corsHeaders() {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };
}

const router = {
  get(path, handler) { routes.push({ method: 'GET', path, handler }); },
  post(path, handler) { routes.push({ method: 'POST', path, handler }); },
  put(path, handler) { routes.push({ method: 'PUT', path, handler }); },
  delete(path, handler) { routes.push({ method: 'DELETE', path, handler }); },
};

// Carrega rotas modulares
require('./routes/auth.cjs').mount(router);
// Demais rotas serão adicionadas nas fases seguintes

// Middleware stack para requisições POST/PUT (body parsing)
function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      try { resolve(JSON.parse(body)); } catch { resolve({}); }
    });
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'OPTIONS') {
    res.writeHead(204, corsHeaders());
    res.end();
    return;
  }

  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { ...corsHeaders(), 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok' }));
    return;
  }

  // Match routes (suporta :param em paths como /api/admin/plans/:id)
  const url = new URL(req.url, `http://localhost:${PORT}`);
  let matchedRoute = null;
  let routeParams = {};
  
  for (const r of routes) {
    if (r.method !== req.method) continue;
    const routeParts = r.path.split('/');
    const urlParts = url.pathname.split('/');
    if (routeParts.length !== urlParts.length) continue;
    
    let match = true;
    const params = {};
    for (let i = 0; i < routeParts.length; i++) {
      if (routeParts[i].startsWith(':')) {
        params[routeParts[i].slice(1)] = urlParts[i];
      } else if (routeParts[i] !== urlParts[i]) {
        match = false;
        break;
      }
    }
    if (match) {
      matchedRoute = r;
      routeParams = params;
      break;
    }
  }

  if (matchedRoute) {
    req.body = req.method === 'POST' || req.method === 'PUT' ? await parseBody(req) : {};
    req.query = Object.fromEntries(url.searchParams);
    req.params = routeParams;
    matchedRoute.handler(req, res);
    return;
  }

  // Keep AI proxy route (legacy)
  if (req.method === 'POST' && url.pathname === '/api/ai/chat') {
    // ... mantém o código do proxy AI existente (não mexer)
    return;
  }

  res.writeHead(404, corsHeaders());
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, () => {
  console.log(`GeniusHub API rodando em http://localhost:${PORT}`);
});
```

**Nota:** O proxy AI (`/api/ai/chat`) permanece no `index.cjs`. O código original dele deve ser preservado. Extraia para uma função `handleAiProxy(req, res)` se quiser limpar o index.

- [ ] **Step 4: Testar servidor**

```bash
node server/index.cjs
# Deve mostrar "GeniusHub API rodando em http://localhost:3001"
# Ctrl+C para parar
```

- [ ] **Step 5: Commit**

```bash
git add server/services/resend.cjs server/routes/auth.cjs server/index.cjs
git commit -m "feat: add Resend service, welcome email route, modular Express server"
```

---

### Task 1.6: Trial automático ao cadastrar

**Files:**
- Modify: `src/hooks/useFinance.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Adicionar listener de trial no useFinance.tsx**

Adicionar ao `FinanceProvider`, após o listener de auth (linha 107):

```typescript
// Dentro do FinanceProvider, adicionar novos estados:
const [subscription, setSubscription] = useState<Subscription | null>(null);

// ... após o useEffect de auth listener, adicionar:

// Subscription/Trial listener
useEffect(() => {
  if (!user) return;
  const unsub = onSnapshot(doc(db, 'subscriptions', user.uid), (snap) => {
    if (snap.exists()) {
      setSubscription(snap.data() as Subscription);
    } else {
      setSubscription(null);
    }
  });
  return () => unsub();
}, [user]);
```

- [ ] **Step 2: Criar trial ao detectar usuário novo**

Adicionar no mesmo `useEffect` de auth (onde `setUser(u)` é chamado quando `u` não é null):

```typescript
// Dentro do onAuthStateChanged, após setUser(u) e setActiveScope(...),
// adicionar verificação de trial para usuários novos:

// Criar doc de profile se não existe
const profileRef = doc(db, 'users', u.uid, 'profile');
getDoc(profileRef).then((snap) => {
  if (!snap.exists()) {
    // Usuário novo — cria perfil e trial
    const batch = writeBatch(db);
    batch.set(profileRef, {
      email: u.email || '',
      displayName: u.displayName || '',
      authProvider: u.providerData?.[0]?.providerId === 'google.com' ? 'google' : 'email',
      createdAt: serverTimestamp(),
    });
    batch.set(doc(db, 'trials', u.uid), {
      status: 'active',
      startedAt: serverTimestamp(),
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    });
    batch.commit();
  }
}).catch(() => {});
```

- [ ] **Step 3: Modificar App.tsx — bloquear acesso sem trial/subscription**

No `MainApp`, antes do return principal (após o `if (!user)` e antes do JSX da sidebar), adicionar verificação:

```tsx
// Dentro de MainApp, após o if (!user) return (...)
// E antes do return principal com sidebar

// Acesso condicional baseado em trial/subscription
const { subscription } = useFinance();
const canAccess = useMemo(() => {
  if (!subscription) return true; // loading
  if (subscription.status === 'active' || subscription.status === 'trial') return true;
  if (subscription.status === 'past_due' && subscription.gracePeriodUntil) {
    const now = new Date();
    return now < new Date(subscription.gracePeriodUntil);
  }
  return false;
}, [subscription]);

// Banner de trial/grace
const trialBanner = useMemo(() => {
  if (!subscription) return null;
  if (subscription.status === 'trial') {
    const days = Math.ceil((new Date(subscription.trialExpiresAt!).getTime() - Date.now()) / 86400000);
    if (days <= 3 && days > 0) return `Seu trial termina em ${days} dia(s). Assine para continuar.`;
    return null;
  }
  if (subscription.status === 'past_due' && subscription.gracePeriodUntil) {
    const days = Math.ceil((new Date(subscription.gracePeriodUntil).getTime() - Date.now()) / 86400000);
    return `Pagamento pendente. Regularize em até ${days} dia(s) para não perder o acesso.`;
  }
  return null;
}, [subscription]);
```

Adicionar antes do `<main>` um banner condicional:
```tsx
{trialBanner && (
  <div className="bg-amber-500 text-white text-sm font-medium px-4 py-2 text-center">
    {trialBanner}
    <button onClick={() => setCurrentView('SUBSCRIPTION' as ViewType)}
      className="ml-2 underline font-bold cursor-pointer">
      Ver planos
    </button>
  </div>
)}
```

E envolver o conteúdo em verificação:
```tsx
{!canAccess ? (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center">
      <h2 className="text-xl font-bold text-text-primary mb-2">Acesso Bloqueado</h2>
      <p className="text-text-secondary mb-4">Sua assinatura expirou. Renove para continuar.</p>
    </div>
  </div>
) : (
  <main className="flex-1 overflow-y-auto p-4 sm:p-6 flex flex-col gap-5">
    {/* conteúdo existente */}
  </main>
)}
```

- [ ] **Step 4: Adicionar tipo Subscription**

Em `src/types.ts`, adicionar após os tipos existentes:

```typescript
export interface Plan {
  id: string;
  name: string;
  basePrice: number; // centavos
  type: 'PERSONAL' | 'BUSINESS' | 'EXTRA_BUSINESS' | 'EXTRA_MEMBER';
  abacateProductId: string;
  isPublic: boolean;
  assignedTo?: string; // uid do usuário (se plano customizado)
  createdBy: string;
  createdAt: string;
}

export interface Subscription {
  id: string;
  userId: string;
  status: 'trial' | 'active' | 'past_due' | 'cancelled' | 'expired';
  trialStartedAt?: string;
  trialExpiresAt?: string;
  gracePeriodUntil?: string;
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  abacateSubscriptionId?: string;
  abacateCustomerId?: string;
  paymentMethod: 'CARD' | 'PIX' | null;
  items: { planId: string; quantity: number; unitPrice: number }[];
  totalAmount: number;
  canceledAt?: string;
  pendingPix?: {
    brCode: string;
    brCodeBase64: string;
    transparentId: string;
    amount: number;
    expiresAt: string;
    generatedAt: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Report {
  id: string;
  type: 'bug' | 'suggestion' | 'abuse';
  reporterId: string;
  reporterEmail: string;
  reporterName: string;
  title: string;
  description: string;
  severity?: 'low' | 'medium' | 'high' | 'critical';
  screenshot?: string;
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  adminNotes?: string;
  module?: ModuleName;
  createdAt: string;
  updatedAt: string;
}

export type ModuleAction = 'view' | 'create' | 'edit' | 'delete';

export type ModuleName =
  | 'dashboard' | 'transactions' | 'fixed_monthly' | 'credit_cards'
  | 'dre' | 'budget' | 'sales' | 'goals' | 'reports'
  | 'leads' | 'projects' | 'service_types';

export type MemberPermissions = Record<ModuleName, ModuleAction[]>;
```

- [ ] **Step 5: Commit**

```bash
git add src/types.ts src/hooks/useFinance.tsx src/App.tsx
git commit -m "feat: add trial auto-creation, subscription types, access gating"
```

---

## FASE 2: Assinaturas + Abacate Pay v2

### Task 2.1: Cliente Abacate Pay

**Files:**
- Create: `server/services/abacate.cjs`

- [ ] **Step 1: Criar cliente Abacate Pay**

```javascript
// server/services/abacate.cjs
const crypto = require('crypto');

const BASE = 'https://api.abacatepay.com/v2';
const API_KEY = process.env.ABACATE_API_KEY;
const WEBHOOK_SECRET = process.env.ABACATE_WEBHOOK_SECRET;
const ABACATE_PUBLIC_KEY = 't9dXRhHHo3yDEj5p...'; // Chave pública do Abacate Pay para HMAC

function headers() {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_KEY}`,
  };
}

async function request(method, path, body = null) {
  const opts = { method, headers: headers() };
  if (body) opts.body = JSON.stringify(body);

  const res = await fetch(`${BASE}${path}`, opts);
  const json = await res.json();

  if (!json.success) {
    throw new Error(`AbacatePay ${path}: ${json.error || 'Unknown error'}`);
  }

  return json.data;
}

// Customers
function createCustomer(data) {
  return request('POST', '/customers', data);
}

function getCustomer(id) {
  return request('GET', `/customers/${id}`);
}

// Subscriptions
function createSubscription(data) {
  return request('POST', '/subscriptions/create', data);
}

function cancelSubscription(id) {
  return request('POST', `/subscriptions/${id}/cancel`);
}

// Transparent Checkout (PIX)
function createTransparentPix(data) {
  return request('POST', '/transparents/create', {
    method: 'PIX',
    data,
  });
}

// Webhook signature verification
function verifyWebhookSignature(rawBody, signature) {
  if (!WEBHOOK_SECRET) {
    console.warn('[AbacatePay] Webhook secret not configured');
    return false;
  }

  const hmac = crypto.createHmac('sha256', ABACATE_PUBLIC_KEY);
  hmac.update(rawBody);
  const expected = hmac.digest('base64');

  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(expected)
    );
  } catch {
    return false;
  }
}

module.exports = {
  createCustomer,
  getCustomer,
  createSubscription,
  cancelSubscription,
  createTransparentPix,
  verifyWebhookSignature,
};
```

- [ ] **Step 2: Commit**

```bash
git add server/services/abacate.cjs
git commit -m "feat: add Abacate Pay v2 client service"
```

---

### Task 2.2: Rotas de Subscription

**Files:**
- Create: `server/routes/subscriptions.cjs`

- [ ] **Step 1: Criar rotas de subscription**

```javascript
// server/routes/subscriptions.cjs
const { authRequired } = require('../middleware/auth.cjs');
const abacate = require('../services/abacate.cjs');
const { sendEmail } = require('../services/resend.cjs');
const admin = require('../services/firebase-admin.cjs');

const COLLECTION = 'subscriptions';

// Helper: calcula preço total com base em empresas e membros
function calculateTotal(userId, plans) {
  // plans: array de { planId, quantity, unitPrice }
  return plans.reduce((sum, p) => sum + p.quantity * p.unitPrice, 0);
}

async function getSubscriptionDoc(userId) {
  const db = admin.firestore();
  return db.collection(COLLECTION).doc(userId).get();
}

function mount(router) {
  // GET /api/sub/status — status da subscription + trial
  router.get('/api/sub/status', authRequired, async (req, res) => {
    try {
      const db = admin.firestore();

      const [subSnap, trialSnap] = await Promise.all([
        db.collection(COLLECTION).doc(req.user.uid).get(),
        db.collection('trials').doc(req.user.uid).get(),
      ]);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: {
          subscription: subSnap.exists ? { id: subSnap.id, ...subSnap.data() } : null,
          trial: trialSnap.exists ? { id: trialSnap.id, ...trialSnap.data() } : null,
        },
      }));
    } catch (err) {
      console.error('[sub/status]', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Erro ao buscar status' }));
    }
  });

  // POST /api/sub/create — criar subscription
  router.post('/api/sub/create', authRequired, async (req, res) => {
    try {
      const { items, paymentMethod } = req.body; // items: [{planId, quantity, unitPrice}], paymentMethod: 'CARD' | 'PIX'
      const db = admin.firestore();
      const userId = req.user.uid;
      const email = req.user.email;

      const total = calculateTotal(userId, items);

      // Criar/recuperar customer no Abacate Pay
      let customerId;
      const subSnap = await db.collection(COLLECTION).doc(userId).get();
      if (subSnap.exists && subSnap.data().abacateCustomerId) {
        customerId = subSnap.data().abacateCustomerId;
      } else {
        const customer = await abacate.createCustomer({
          name: req.user.email,
          email: req.user.email,
        });
        customerId = customer.id;
      }

      if (paymentMethod === 'CARD') {
        // Mapear items para products do Abacate Pay
        // Precisa buscar o abacateProductId de cada plano
        const plansSnap = await db.collection('plans').get();
        const plansMap = {};
        plansSnap.docs.forEach(d => { plansMap[d.id] = d.data(); });

        const abacateItems = items.map(item => ({
          id: plansMap[item.planId]?.abacateProductId || item.planId,
          quantity: item.quantity,
        }));

        const checkout = await abacate.createSubscription({
          items: abacateItems,
          customerId,
          methods: ['CARD'],
        });

        // Atualiza ou cria doc de subscription
        await db.collection(COLLECTION).doc(userId).set({
          status: 'trial', // muda para active via webhook
          paymentMethod: 'CARD',
          abacateSubscriptionId: checkout.id,
          abacateCustomerId: customerId,
          items,
          totalAmount: total,
          updatedAt: new Date().toISOString(),
          createdAt: subSnap.exists ? subSnap.data().createdAt : new Date().toISOString(),
        }, { merge: true });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: { url: checkout.url, id: checkout.id, paymentMethod: 'CARD' },
        }));
      } else {
        // PIX — transparent checkout
        const pixCheckout = await abacate.createTransparentPix({
          amount: total,
          description: 'GeniusHub — Assinatura',
          expiresIn: 3600,
          customer: { email },
        });

        await db.collection(COLLECTION).doc(userId).set({
          status: 'trial',
          paymentMethod: 'PIX',
          abacateCustomerId: customerId,
          items,
          totalAmount: total,
          pendingPix: {
            brCode: pixCheckout.brCode,
            brCodeBase64: pixCheckout.brCodeBase64,
            transparentId: pixCheckout.id,
            amount: total,
            expiresAt: pixCheckout.expiresAt,
            generatedAt: new Date().toISOString(),
          },
          updatedAt: new Date().toISOString(),
          createdAt: subSnap.exists ? subSnap.data().createdAt : new Date().toISOString(),
        }, { merge: true });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          data: {
            paymentMethod: 'PIX',
            qrCodeBase64: pixCheckout.brCodeBase64,
            brCode: pixCheckout.brCode,
            expiresAt: pixCheckout.expiresAt,
            id: pixCheckout.id,
          },
        }));
      }
    } catch (err) {
      console.error('[sub/create]', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });

  // POST /api/sub/cancel
  router.post('/api/sub/cancel', authRequired, async (req, res) => {
    try {
      const db = admin.firestore();
      const subSnap = await db.collection(COLLECTION).doc(req.user.uid).get();
      if (!subSnap.exists) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Assinatura não encontrada' }));
        return;
      }

      const sub = subSnap.data();
      if (sub.abacateSubscriptionId && sub.paymentMethod === 'CARD') {
        await abacate.cancelSubscription(sub.abacateSubscriptionId);
      }

      await db.collection(COLLECTION).doc(req.user.uid).update({
        status: 'cancelled',
        canceledAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      console.error('[sub/cancel]', err);
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });

  // GET /api/sub/pix-pending — QR code PIX pendente
  router.get('/api/sub/pix-pending', authRequired, async (req, res) => {
    try {
      const db = admin.firestore();
      const subSnap = await db.collection(COLLECTION).doc(req.user.uid).get();
      if (!subSnap.exists) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, data: null }));
        return;
      }

      const sub = subSnap.data();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({
        success: true,
        data: sub.pendingPix || null,
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: err.message }));
    }
  });
}

module.exports = { mount };
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/subscriptions.cjs
git commit -m "feat: add subscription routes (create, status, cancel, pix-pending)"
```

---

### Task 2.3: Webhooks do Abacate Pay

**Files:**
- Create: `server/routes/webhooks.cjs`
- Modify: `server/index.cjs`

- [ ] **Step 1: Criar handler de webhook**

```javascript
// server/routes/webhooks.cjs
const abacate = require('../services/abacate.cjs');
const { sendEmail } = require('../services/resend.cjs');
const admin = require('../services/firebase-admin.cjs');

// Eventos já processados (idempotência — em memória; usar Firestore em produção)
const processedEvents = new Set();

function mount(router) {
  router.post('/api/webhooks/abacate', async (req, res) => {
    // 1. Verificar assinatura HMAC
    const signature = req.headers['x-webhook-signature'];
    const rawBody = JSON.stringify(req.body);

    if (signature && !abacate.verifyWebhookSignature(rawBody, signature)) {
      console.warn('[webhook] Invalid HMAC signature');
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid signature' }));
      return;
    }

    const event = req.body;
    if (!event || !event.id || !event.event) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid event payload' }));
      return;
    }

    // 2. Idempotência
    if (processedEvents.has(event.id)) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, deduplicated: true }));
      return;
    }
    processedEvents.add(event.id);

    // 3. Processar evento
    try {
      const db = admin.firestore();
      const now = new Date().toISOString();

      switch (event.event) {
        case 'subscription.completed': {
          const customerEmail = event.data?.customer?.email;
          if (!customerEmail) break;

          // Buscar usuário pelo email
          const userSnap = await db.collection('users')
            .where('email', '==', customerEmail).limit(1).get();
          if (userSnap.empty) break;

          const userId = userSnap.docs[0].id;
          await db.collection('subscriptions').doc(userId).update({
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            updatedAt: now,
          });

          // Registrar billing_history
          await db.collection('billing_history').add({
            userId,
            subscriptionId: event.data.subscription?.id,
            type: 'payment_paid',
            abacateCheckoutId: event.data.checkout?.id,
            amount: event.data.payment?.amount,
            status: 'PAID',
            createdAt: now,
          });

          // Email confirmação
          await sendEmail({
            to: customerEmail,
            subject: 'Assinatura GeniusHub ativada!',
            html: `<h2>Pagamento confirmado!</h2><p>Sua assinatura GeniusHub está ativa.</p>`,
          }).catch(() => {});
          break;
        }

        case 'subscription.renewed': {
          const customerEmail = event.data?.customer?.email;
          if (!customerEmail) break;

          const userSnap = await db.collection('users')
            .where('email', '==', customerEmail).limit(1).get();
          if (userSnap.empty) break;

          const userId = userSnap.docs[0].id;
          const subSnap = await db.collection('subscriptions').doc(userId).get();
          const sub = subSnap.data() || {};

          // Registrar histórico
          await db.collection('billing_history').add({
            userId,
            subscriptionId: event.data.subscription?.id,
            type: 'payment_paid',
            abacateCheckoutId: event.data.checkout?.id,
            amount: event.data.payment?.amount,
            status: 'PAID',
            createdAt: now,
          });

          // Se PIX, gerar novo QR code para próximo ciclo
          if (sub.paymentMethod === 'PIX' && sub.totalAmount) {
            const pixCheckout = await abacate.createTransparentPix({
              amount: sub.totalAmount,
              description: 'GeniusHub — Renovação mensal',
              expiresIn: 3600,
              customer: { email: customerEmail },
            });

            await db.collection('subscriptions').doc(userId).update({
              currentPeriodStart: now,
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              pendingPix: {
                brCode: pixCheckout.brCode,
                brCodeBase64: pixCheckout.brCodeBase64,
                transparentId: pixCheckout.id,
                amount: sub.totalAmount,
                expiresAt: pixCheckout.expiresAt,
                generatedAt: now,
              },
              updatedAt: now,
            });

            // Notificar usuário
            await sendEmail({
              to: customerEmail,
              subject: 'Novo QR Code PIX — GeniusHub',
              html: `<h2>Renovação GeniusHub</h2><p>Um novo QR Code PIX está disponível no seu painel.</p>`,
            }).catch(() => {});
          } else {
            // Cartão — renovação automática
            await db.collection('subscriptions').doc(userId).update({
              status: 'active',
              currentPeriodStart: now,
              currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
              updatedAt: now,
            });
          }
          break;
        }

        case 'subscription.cancelled': {
          const customerEmail = event.data?.customer?.email;
          if (!customerEmail) break;

          const userSnap = await db.collection('users')
            .where('email', '==', customerEmail).limit(1).get();
          if (userSnap.empty) break;

          const userId = userSnap.docs[0].id;
          await db.collection('subscriptions').doc(userId).update({
            status: 'cancelled',
            canceledAt: now,
            updatedAt: now,
          });
          break;
        }

        case 'transparent.completed': {
          const customerEmail = event.data?.customer?.email;
          if (!customerEmail) break;

          const userSnap = await db.collection('users')
            .where('email', '==', customerEmail).limit(1).get();
          if (userSnap.empty) break;

          const userId = userSnap.docs[0].id;
          await db.collection('subscriptions').doc(userId).update({
            status: 'active',
            currentPeriodStart: now,
            currentPeriodEnd: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
            pendingPix: null,
            updatedAt: now,
          });

          await db.collection('billing_history').add({
            userId,
            subscriptionId: event.data.transparent?.id,
            type: 'payment_paid',
            abacatePaymentId: event.data.transparent?.id,
            amount: event.data.transparent?.amount,
            status: 'PAID',
            createdAt: now,
          });

          await sendEmail({
            to: customerEmail,
            subject: 'Pagamento PIX confirmado — GeniusHub',
            html: `<h2>Pagamento confirmado!</h2><p>Seu pagamento PIX foi processado e sua assinatura está ativa.</p>`,
          }).catch(() => {});
          break;
        }
      }

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true }));
    } catch (err) {
      console.error('[webhook] Processing error:', err);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, error: 'Internal processing error' }));
      // Sempre retorna 200 para evitar retry infinito
    }
  });
}

module.exports = { mount };
```

- [ ] **Step 2: Registrar rotas no server/index.cjs**

Adicionar após a linha `require('./routes/auth.cjs').mount(router);`:
```javascript
require('./routes/subscriptions.cjs').mount(router);
require('./routes/webhooks.cjs').mount(router);
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/webhooks.cjs server/index.cjs
git commit -m "feat: add Abacate Pay webhook handler with idempotency"
```

---

### Task 2.4: Página de Assinatura (Frontend)

**Files:**
- Create: `src/components/SubscriptionView.tsx`
- Create: `src/components/PixQRCode.tsx`
- Create: `src/lib/subscriptionService.ts`
- Create: `src/lib/api.ts`
- Modify: `src/App.tsx`

- [ ] **Step 1: Criar fetch wrapper com auth**

```typescript
// src/lib/api.ts
import { auth } from './firebase';

export async function apiFetch(path: string, options: RequestInit = {}) {
  const user = auth.currentUser;
  const token = user ? await user.getIdToken() : '';

  const res = await fetch(path, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Erro de rede' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }

  return res.json();
}
```

- [ ] **Step 2: Criar lógica de precificação**

```typescript
// src/lib/subscriptionService.ts

export function calculateSubscriptionPrice(
  planTypes: ('PERSONAL' | 'BUSINESS')[],
  extraBusinesses: number,
  totalMembers: number
): { items: { planId: string; quantity: number; unitPrice: number }[]; total: number } {
  const items: { planId: string; quantity: number; unitPrice: number }[] = [];
  
  // Pessoal (grátis se tiver empresa)
  if (!planTypes.includes('BUSINESS') && planTypes.includes('PERSONAL')) {
    items.push({ planId: 'plan_personal', quantity: 1, unitPrice: 1990 });
  }

  // Empresa (principal)
  if (planTypes.includes('BUSINESS')) {
    items.push({ planId: 'plan_business', quantity: 1, unitPrice: 2990 });
  }

  // Empresas adicionais
  if (extraBusinesses > 0) {
    items.push({ planId: 'plan_extra_business', quantity: extraBusinesses, unitPrice: 1990 });
  }

  // Membros extras (além do 1 grátis por empresa)
  const totalCompanies = (planTypes.includes('BUSINESS') ? 1 : 0) + extraBusinesses;
  const freeMembers = totalCompanies; // 1 grátis por empresa
  const extraMembers = Math.max(0, totalMembers - freeMembers);
  if (extraMembers > 0) {
    items.push({ planId: 'plan_extra_member', quantity: extraMembers, unitPrice: 490 });
  }

  const total = items.reduce((sum, i) => sum + i.quantity * i.unitPrice, 0);
  return { items, total };
}

export function formatPrice(cents: number): string {
  return `R$ ${(cents / 100).toFixed(2).replace('.', ',')}`;
}
```

- [ ] **Step 3: Criar PixQRCode component**

```tsx
// src/components/PixQRCode.tsx
import React from 'react';
import { Copy, Check } from 'lucide-react';

interface Props {
  brCode: string;
  brCodeBase64: string;
  expiresAt: string;
  onCopy: () => void;
  copied: boolean;
}

export function PixQRCode({ brCode, brCodeBase64, expiresAt, onCopy, copied }: Props) {
  const expiresDate = new Date(expiresAt);
  const isExpired = expiresDate < new Date();

  return (
    <div className="flex flex-col items-center gap-4 p-6 bg-white rounded-xl border border-[#e2e8f0]">
      <h3 className="text-lg font-bold text-gray-900">Pague com PIX</h3>
      {isExpired ? (
        <div className="text-center">
          <p className="text-red-500 font-medium">QR Code expirado</p>
          <p className="text-sm text-gray-500">Solicite um novo QR code no próximo ciclo.</p>
        </div>
      ) : (
        <>
          <img
            src={brCodeBase64}
            alt="QR Code PIX"
            className="w-48 h-48 rounded-lg border border-gray-100"
          />
          <p className="text-xs text-gray-500">
            Expira em {expiresDate.toLocaleTimeString('pt-BR')}
          </p>
          <div className="flex items-center gap-2 w-full">
            <input
              type="text"
              readOnly
              value={brCode}
              className="flex-1 px-3 py-2 text-xs border border-gray-200 rounded-lg bg-gray-50 text-gray-600 outline-none select-all"
            />
            <button
              onClick={onCopy}
              className="px-3 py-2 bg-blue-600 text-white rounded-lg text-xs font-medium hover:bg-blue-700 cursor-pointer flex items-center gap-1"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {copied ? 'Copiado' : 'Copiar'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Criar SubscriptionView**

```tsx
// src/components/SubscriptionView.tsx
import React, { useState, useEffect } from 'react';
import { useFinance } from '../hooks/useFinance';
import { apiFetch } from '../lib/api';
import { calculateSubscriptionPrice, formatPrice } from '../lib/subscriptionService';
import { PixQRCode } from './PixQRCode';
import { CreditCard, QrCode, Check, Loader2 } from 'lucide-react';
import type { Subscription } from '../types';

export function SubscriptionView() {
  const { activeScope, accounts } = useFinance();
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [pixData, setPixData] = useState<any>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    apiFetch('/api/sub/status')
      .then((res) => {
        setSubscription(res.data.subscription);
        if (res.data.subscription?.pendingPix) {
          setPixData(res.data.subscription.pendingPix);
        }
      })
      .catch(() => setError('Erro ao carregar assinatura'))
      .finally(() => setLoading(false));
  }, []);

  const handleSubscribe = async (method: 'CARD' | 'PIX') => {
    setError('');
    const prices = calculateSubscriptionPrice(
      ['BUSINESS'],
      accounts.length > 0 ? accounts.length - 1 : 0,
      0
    );

    try {
      const res = await apiFetch('/api/sub/create', {
        method: 'POST',
        body: JSON.stringify({
          items: prices.items,
          paymentMethod: method,
        }),
      });

      if (method === 'CARD') {
        window.location.href = res.data.url;
      } else {
        setPixData(res.data);
      }
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCancel = async () => {
    if (!confirm('Cancelar sua assinatura?')) return;
    try {
      await apiFetch('/api/sub/cancel', { method: 'POST' });
      setSubscription((prev) => prev ? { ...prev, status: 'cancelled' } : null);
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-[#3b82f6]" />
      </div>
    );
  }

  const isActive = subscription?.status === 'active';
  const isTrial = subscription?.status === 'trial';
  const isPastDue = subscription?.status === 'past_due';

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
        <h2 className="text-xl font-bold text-gray-900 mb-1">Sua Assinatura</h2>
        <p className="text-sm text-gray-500">Gerencie seu plano GeniusHub</p>

        <div className="mt-4 p-4 rounded-lg border"
          style={{ borderColor: isActive ? '#10b981' : isTrial ? '#f59e0b' : '#e2e8f0' }}>
          <div className="flex items-center justify-between">
            <div>
              <p className="font-semibold text-gray-900">
                {isActive ? 'Plano Ativo' : isTrial ? 'Trial (7 dias grátis)' : isPastDue ? 'Pagamento Pendente' : subscription?.status === 'cancelled' ? 'Cancelada' : 'Sem assinatura'}
              </p>
              {subscription?.totalAmount && (
                <p className="text-sm text-gray-500">{formatPrice(subscription.totalAmount)}/mês</p>
              )}
              {isTrial && subscription?.trialExpiresAt && (
                <p className="text-xs text-amber-600 mt-1">
                  Expira em {new Date(subscription.trialExpiresAt).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
            {isActive || isTrial ? (
              <button onClick={handleCancel}
                className="text-xs font-medium text-red-600 hover:text-red-700 border border-red-200 px-3 py-1.5 rounded-lg cursor-pointer">
                Cancelar
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {!isActive && !isTrial && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
          <h3 className="text-lg font-bold text-gray-900 mb-4">Escolha o método de pagamento</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Cartão */}
            <button onClick={() => handleSubscribe('CARD')}
              className="p-6 border-2 border-gray-200 rounded-xl hover:border-[#3b82f6] transition-colors cursor-pointer text-left">
              <CreditCard className="w-8 h-8 text-[#3b82f6] mb-3" />
              <p className="font-semibold text-gray-900">Cartão de Crédito</p>
              <p className="text-xs text-gray-500 mt-1">Assinatura recorrente automática</p>
            </button>

            {/* PIX */}
            <button onClick={() => handleSubscribe('PIX')}
              className="p-6 border-2 border-gray-200 rounded-xl hover:border-[#3b82f6] transition-colors cursor-pointer text-left">
              <QrCode className="w-8 h-8 text-[#3b82f6] mb-3" />
              <p className="font-semibold text-gray-900">PIX</p>
              <p className="text-xs text-gray-500 mt-1">QR Code gerado a cada vencimento</p>
            </button>
          </div>

          {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
        </div>
      )}

      {/* QR Code PIX pendente */}
      {pixData && !isActive && (
        <PixQRCode
          brCode={pixData.brCode}
          brCodeBase64={pixData.qrCodeBase64}
          expiresAt={pixData.expiresAt}
          onCopy={() => {
            navigator.clipboard.writeText(pixData.brCode);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
          copied={copied}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 5: Adicionar ao App.tsx — nova view**

No array `menuSections`, adicionar uma nova seção ou item:
```tsx
// Adicionar ao menu (antes de Settings):
// Na seção Financeiro, adicionar:
{ id: 'SUBSCRIPTION' as ViewType, label: 'Assinatura', icon: CreditCard },
```

E no switch do `<main>`:
```tsx
{currentView === 'SUBSCRIPTION' && <SubscriptionView />}
```

Adicionar `'SUBSCRIPTION'` ao tipo `ViewType` em `types.ts`.

- [ ] **Step 6: Build e commit**

```bash
npm run build
git add src/lib/api.ts src/lib/subscriptionService.ts src/components/SubscriptionView.tsx src/components/PixQRCode.tsx src/App.tsx src/types.ts
git commit -m "feat: add subscription page with card and PIX payment flows"
```

---

## FASE 3: Superadmin — Planos + Assinaturas

### Task 3.1: Rotas Admin

**Files:**
- Create: `server/routes/admin.cjs`

- [ ] **Step 1: Criar rotas admin**

```javascript
// server/routes/admin.cjs
const { authRequired, superadminRequired } = require('../middleware/auth.cjs');
const admin = require('../services/firebase-admin.cjs');
const { setSuperadmin } = require('../services/firebase-admin.cjs');

function mount(router) {
  // === Planos ===

  router.get('/api/admin/plans', authRequired, superadminRequired, async (req, res) => {
    const db = admin.firestore();
    const snap = await db.collection('plans').orderBy('createdAt', 'desc').get();
    const plans = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: plans }));
  });

  router.post('/api/admin/plans', authRequired, superadminRequired, async (req, res) => {
    const db = admin.firestore();
    const { name, basePrice, type, abacateProductId, isPublic, assignedTo } = req.body;
    const docRef = await db.collection('plans').add({
      name,
      basePrice,
      type,
      abacateProductId,
      isPublic: isPublic ?? true,
      assignedTo: assignedTo || null,
      createdBy: req.user.uid,
      createdAt: new Date().toISOString(),
    });
    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: { id: docRef.id } }));
  });

  router.put('/api/admin/plans/:id', authRequired, superadminRequired, async (req, res) => {
    const db = admin.firestore();
    const { name, basePrice, type, abacateProductId, isPublic, assignedTo } = req.body;
    const planId = req.params.id;
    await db.collection('plans').doc(planId).update({
      ...(name && { name }),
      ...(basePrice !== undefined && { basePrice }),
      ...(type && { type }),
      ...(abacateProductId && { abacateProductId }),
      ...(isPublic !== undefined && { isPublic }),
      ...(assignedTo !== undefined && { assignedTo }),
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  });

  router.delete('/api/admin/plans/:id', authRequired, superadminRequired, async (req, res) => {
    const db = admin.firestore();
    const planId = req.params.id;
    await db.collection('plans').doc(planId).delete();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  });

  // === Subscriptions ===

  router.get('/api/admin/subscriptions', authRequired, superadminRequired, async (req, res) => {
    const db = admin.firestore();
    const snap = await db.collection('subscriptions').orderBy('updatedAt', 'desc').get();
    const subs = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: subs }));
  });

  router.post('/api/admin/subscriptions/assign', authRequired, superadminRequired, async (req, res) => {
    const db = admin.firestore();
    const { targetEmail, planId, durationDays, durationMonths, endDate, indefinite } = req.body;

    // Encontrar o usuário pelo email
    const userSnap = await db.collection('users').where('email', '==', targetEmail).limit(1).get();
    if (userSnap.empty) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Usuário não encontrado' }));
      return;
    }
    const userId = userSnap.docs[0].id;

    // Buscar plano
    const planSnap = await db.collection('plans').doc(planId).get();
    if (!planSnap.exists) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Plano não encontrado' }));
      return;
    }
    const plan = planSnap.data();

    let periodEnd;
    if (indefinite) {
      periodEnd = new Date(Date.now() + 100 * 365 * 24 * 60 * 60 * 1000).toISOString(); // 100 anos
    } else if (endDate) {
      periodEnd = new Date(endDate).toISOString();
    } else if (durationMonths) {
      periodEnd = new Date(Date.now() + durationMonths * 30 * 24 * 60 * 60 * 1000).toISOString();
    } else if (durationDays) {
      periodEnd = new Date(Date.now() + durationDays * 24 * 60 * 60 * 1000).toISOString();
    } else {
      periodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // default 1 mês
    }

    await db.collection('subscriptions').doc(userId).set({
      status: 'active',
      paymentMethod: null, // admin-assigned, no payment
      items: [{ planId, quantity: 1, unitPrice: plan.basePrice }],
      totalAmount: plan.basePrice,
      currentPeriodStart: new Date().toISOString(),
      currentPeriodEnd: periodEnd,
      updatedAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
    }, { merge: true });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  });

  router.post('/api/admin/subscriptions/revoke', authRequired, superadminRequired, async (req, res) => {
    const db = admin.firestore();
    const { targetEmail } = req.body;
    const userSnap = await db.collection('users').where('email', '==', targetEmail).limit(1).get();
    if (userSnap.empty) {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Usuário não encontrado' }));
      return;
    }
    const userId = userSnap.docs[0].id;
    await db.collection('subscriptions').doc(userId).update({
      status: 'cancelled',
      canceledAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  });
}

module.exports = { mount };
```

- [ ] **Step 2: Commit**

```bash
git add server/routes/admin.cjs
git commit -m "feat: add superadmin routes for plans and subscriptions"
```

---

### Task 3.2: UI Superadmin (Frontend)

**Files:**
- Create: `src/components/AdminPlansView.tsx`
- Create: `src/components/AdminSubscriptionsView.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Criar AdminPlansView**

```tsx
// src/components/AdminPlansView.tsx
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { Plus, Pencil, Trash2, Check, X } from 'lucide-react';
import type { Plan } from '../types';

export function AdminPlansView() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', basePrice: 0, type: 'PERSONAL' as Plan['type'], abacateProductId: '', isPublic: true });
  const [showNew, setShowNew] = useState(false);

  const load = () => {
    apiFetch('/api/admin/plans')
      .then(r => setPlans(r.data))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleSave = async () => {
    if (editingId) {
      await apiFetch(`/api/admin/plans/${editingId}`, { method: 'PUT', body: JSON.stringify(form) });
      setEditingId(null);
    } else {
      await apiFetch('/api/admin/plans', { method: 'POST', body: JSON.stringify(form) });
      setShowNew(false);
    }
    setForm({ name: '', basePrice: 0, type: 'PERSONAL', abacateProductId: '', isPublic: true });
    load();
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Remover este plano?')) return;
    await apiFetch(`/api/admin/plans/${id}`, { method: 'DELETE' });
    load();
  };

  if (loading) return <div className="p-6 text-text-secondary">Carregando...</div>;

  return (
    <div className="max-w-4xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Gestão de Planos</h2>
        <button onClick={() => setShowNew(true)}
          className="flex items-center gap-1 text-sm font-medium bg-[#3b82f6] text-white px-4 py-2 rounded-lg hover:bg-[#2563eb] cursor-pointer">
          <Plus className="w-4 h-4" /> Novo Plano
        </button>
      </div>

      {(showNew || editingId) && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 flex flex-col gap-3">
          <input type="text" placeholder="Nome" value={form.name}
            onChange={e => setForm({ ...form, name: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm outline-none" />
          <div className="flex gap-3">
            <input type="number" placeholder="Preço (centavos)" value={form.basePrice || ''}
              onChange={e => setForm({ ...form, basePrice: Number(e.target.value) })}
              className="flex-1 px-3 py-2 border rounded-lg text-sm outline-none" />
            <select value={form.type}
              onChange={e => setForm({ ...form, type: e.target.value as Plan['type'] })}
              className="px-3 py-2 border rounded-lg text-sm outline-none cursor-pointer">
              <option value="PERSONAL">Pessoal</option>
              <option value="BUSINESS">Empresa</option>
              <option value="EXTRA_BUSINESS">Empresa Adicional</option>
              <option value="EXTRA_MEMBER">Membro Extra</option>
            </select>
          </div>
          <input type="text" placeholder="ID Produto Abacate Pay" value={form.abacateProductId}
            onChange={e => setForm({ ...form, abacateProductId: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm outline-none" />
          <div className="flex gap-3">
            <button onClick={handleSave}
              className="flex items-center gap-1 text-sm bg-emerald-600 text-white px-4 py-2 rounded-lg cursor-pointer">
              <Check className="w-4 h-4" /> Salvar
            </button>
            <button onClick={() => { setEditingId(null); setShowNew(false); }}
              className="text-sm text-gray-500 cursor-pointer">
              Cancelar
            </button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Nome</th>
              <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
              <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Preço</th>
              <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody>
            {plans.map(p => (
              <tr key={p.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2.5 font-medium text-gray-900">{p.name}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{p.type}</td>
                <td className="px-4 py-2.5 text-gray-700">R$ {(p.basePrice / 100).toFixed(2)}</td>
                <td className="px-4 py-2.5 flex gap-2">
                  <button onClick={() => { setEditingId(p.id); setForm({ name: p.name, basePrice: p.basePrice, type: p.type, abacateProductId: p.abacateProductId, isPublic: p.isPublic }); }}
                    className="text-gray-400 hover:text-blue-600 cursor-pointer">
                    <Pencil className="w-3.5 h-3.5" />
                  </button>
                  <button onClick={() => handleDelete(p.id)}
                    className="text-gray-400 hover:text-red-500 cursor-pointer">
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Criar AdminSubscriptionsView**

```tsx
// src/components/AdminSubscriptionsView.tsx
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import { Search, Plus, X } from 'lucide-react';
import type { Subscription, Plan } from '../types';

export function AdminSubscriptionsView() {
  const [subs, setSubs] = useState<(Subscription & { userId: string })[]>([]);
  const [plans, setPlans] = useState<Plan[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAssign, setShowAssign] = useState(false);
  const [form, setForm] = useState({ targetEmail: '', planId: '', durationMonths: 1, indefinite: false });

  const load = async () => {
    const [subsRes, plansRes] = await Promise.all([
      apiFetch('/api/admin/subscriptions'),
      apiFetch('/api/admin/plans'),
    ]);
    setSubs(subsRes.data || []);
    setPlans(plansRes.data || []);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const handleAssign = async () => {
    await apiFetch('/api/admin/subscriptions/assign', {
      method: 'POST',
      body: JSON.stringify(form),
    });
    setShowAssign(false);
    setForm({ targetEmail: '', planId: '', durationMonths: 1, indefinite: false });
    load();
  };

  const handleRevoke = async (email: string) => {
    if (!confirm(`Revogar assinatura de ${email}?`)) return;
    await apiFetch('/api/admin/subscriptions/revoke', {
      method: 'POST',
      body: JSON.stringify({ targetEmail: email }),
    });
    load();
  };

  if (loading) return <div className="p-6 text-text-secondary">Carregando...</div>;

  return (
    <div className="max-w-5xl mx-auto flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold text-gray-900">Gestão de Assinaturas</h2>
        <button onClick={() => setShowAssign(true)}
          className="flex items-center gap-1 text-sm font-medium bg-[#3b82f6] text-white px-4 py-2 rounded-lg hover:bg-[#2563eb] cursor-pointer">
          <Plus className="w-4 h-4" /> Atribuir Plano
        </button>
      </div>

      {showAssign && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-4 flex flex-col gap-3">
          <input type="email" placeholder="Email do usuário" value={form.targetEmail}
            onChange={e => setForm({ ...form, targetEmail: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm outline-none" />
          <select value={form.planId}
            onChange={e => setForm({ ...form, planId: e.target.value })}
            className="px-3 py-2 border rounded-lg text-sm outline-none cursor-pointer">
            <option value="">Selecione um plano</option>
            {plans.map(p => (
              <option key={p.id} value={p.id}>{p.name} — R$ {(p.basePrice / 100).toFixed(2)}</option>
            ))}
          </select>
          <div className="flex items-center gap-3">
            <input type="number" min={1} placeholder="Meses" value={form.durationMonths}
              onChange={e => setForm({ ...form, durationMonths: Number(e.target.value) })}
              className="w-24 px-3 py-2 border rounded-lg text-sm outline-none" />
            <label className="flex items-center gap-2 text-sm cursor-pointer">
              <input type="checkbox" checked={form.indefinite}
                onChange={e => setForm({ ...form, indefinite: e.target.checked })}
                className="cursor-pointer" />
              Indeterminado
            </label>
          </div>
          <div className="flex gap-3">
            <button onClick={handleAssign} disabled={!form.targetEmail || !form.planId}
              className="text-sm bg-emerald-600 text-white px-4 py-2 rounded-lg disabled:opacity-50 cursor-pointer">
              Atribuir
            </button>
            <button onClick={() => setShowAssign(false)}
              className="text-sm text-gray-500 cursor-pointer">Cancelar</button>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Usuário</th>
              <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Método</th>
              <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Valor</th>
              <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Expira</th>
              <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Ações</th>
            </tr>
          </thead>
          <tbody>
            {subs.map(s => (
              <tr key={s.userId} className="border-t border-gray-50 hover:bg-gray-50/50">
                <td className="px-4 py-2.5 text-gray-700">{s.userId}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                    s.status === 'active' ? 'bg-green-100 text-green-700' :
                    s.status === 'trial' ? 'bg-amber-100 text-amber-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>{s.status}</span>
                </td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{s.paymentMethod || 'manual'}</td>
                <td className="px-4 py-2.5 text-gray-700">R$ {((s.totalAmount || 0) / 100).toFixed(2)}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">
                  {s.currentPeriodEnd ? new Date(s.currentPeriodEnd).toLocaleDateString('pt-BR') : '-'}
                </td>
                <td className="px-4 py-2.5">
                  {s.status !== 'cancelled' && (
                    <button onClick={() => handleRevoke(s.userId)}
                      className="text-red-500 hover:text-red-700 text-xs font-medium cursor-pointer">
                      Revogar
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Adicionar views superadmin ao App.tsx**

```tsx
// No menuSections, adicionar seção Admin (visível só se user.role === 'superadmin'):
{
  label: 'Admin',
  items: [
    { id: 'ADMIN_PLANS' as ViewType, label: 'Planos', icon: CreditCard },
    { id: 'ADMIN_SUBS' as ViewType, label: 'Assinaturas', icon: Users },
    { id: 'ADMIN_REPORTS' as ViewType, label: 'Reports', icon: Bug },
  ],
},
```

Adicionar `'ADMIN_PLANS' | 'ADMIN_SUBS' | 'ADMIN_REPORTS'` ao `ViewType`.

E no `<main>`:
```tsx
{currentView === 'ADMIN_PLANS' && <AdminPlansView />}
{currentView === 'ADMIN_SUBS' && <AdminSubscriptionsView />}
```

- [ ] **Step 4: Commit**

```bash
git add src/components/AdminPlansView.tsx src/components/AdminSubscriptionsView.tsx src/App.tsx src/types.ts
git commit -m "feat: add superadmin UI for plans and subscriptions management"
```

---

## FASE 4: Permissões Granulares

### Task 4.1: Hook usePermissions

**Files:**
- Create: `src/hooks/usePermissions.tsx`
- Modify: `src/types.ts` (adicionar `permissions?: MemberPermissions` ao `AccountMember`, além de ModuleName, ModuleAction, MemberPermissions)

- [ ] **Step 1: Criar hook de permissões**

```typescript
// src/hooks/usePermissions.tsx
import { useMemo } from 'react';
import { useFinance } from './useFinance';
import type { ModuleName, ModuleAction, MemberPermissions } from '../types';

const MODULES: ModuleName[] = [
  'dashboard', 'transactions', 'fixed_monthly', 'credit_cards',
  'dre', 'budget', 'sales', 'goals', 'reports',
  'leads', 'projects', 'service_types',
];

const OWNER_ADMIN_PERMISSIONS: MemberPermissions = Object.freeze(
  MODULES.reduce((acc, m) => ({
    ...acc,
    [m]: m === 'dashboard' || m === 'dre' || m === 'reports'
      ? ['view'] as ModuleAction[]
      : ['view', 'create', 'edit', 'delete'] as ModuleAction[],
  }), {} as MemberPermissions)
);

const DEFAULT_MEMBER_PERMISSIONS: MemberPermissions = Object.freeze(
  MODULES.reduce((acc, m) => ({
    ...acc,
    [m]: m === 'dashboard' || m === 'dre' || m === 'reports' || m === 'fixed_monthly' || m === 'credit_cards'
      ? ['view'] as ModuleAction[]
      : ['view', 'create', 'edit'] as ModuleAction[],
  }), {} as MemberPermissions)
);

export function usePermissions() {
  const { activeScope, accountMembers, user } = useFinance();

  const permissions = useMemo((): MemberPermissions => {
    if (activeScope.type !== 'ACCOUNT') return OWNER_ADMIN_PERMISSIONS;

    // Encontrar o member doc do usuário atual
    const currentMember = accountMembers.find(m => m.uid === user?.uid);

    if (!currentMember) return DEFAULT_MEMBER_PERMISSIONS;

    // owner e admin têm todas as permissões
    if (currentMember.role === 'owner' || currentMember.role === 'admin') {
      return OWNER_ADMIN_PERMISSIONS;
    }

    // member: retorna permissions salvas ou template default
    return (currentMember.permissions || DEFAULT_MEMBER_PERMISSIONS) as MemberPermissions;
  }, [activeScope, accountMembers, user]);

  const can = (module: ModuleName, action: ModuleAction): boolean => {
    return (permissions[module] || []).includes(action);
  };

  return { permissions, can };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/usePermissions.tsx
git commit -m "feat: add granular permissions hook"
```

---

### Task 4.2: PermissionsModal

**Files:**
- Create: `src/components/PermissionsModal.tsx`
- Modify: `src/components/SettingsView.tsx`

- [ ] **Step 1: Criar modal de permissões**

```tsx
// src/components/PermissionsModal.tsx
import React, { useState } from 'react';
import { X } from 'lucide-react';
import type { ModuleName, ModuleAction, MemberPermissions } from '../types';

const MODULES: { id: ModuleName; label: string; actions: ModuleAction[] }[] = [
  { id: 'dashboard', label: 'Dashboard', actions: ['view'] },
  { id: 'transactions', label: 'Transações', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'fixed_monthly', label: 'Fixos Mensais', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'credit_cards', label: 'Cartões', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'dre', label: 'DRE', actions: ['view'] },
  { id: 'budget', label: 'Orçamento', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'sales', label: 'Vendas', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'goals', label: 'Metas', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'reports', label: 'Relatórios', actions: ['view'] },
  { id: 'leads', label: 'Leads', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'projects', label: 'Projetos', actions: ['view', 'create', 'edit', 'delete'] },
  { id: 'service_types', label: 'Tipos de Serviço', actions: ['view', 'create', 'edit', 'delete'] },
];

interface Props {
  memberEmail: string;
  currentPermissions: MemberPermissions;
  onSave: (permissions: MemberPermissions) => Promise<void>;
  onClose: () => void;
}

export function PermissionsModal({ memberEmail, currentPermissions, onSave, onClose }: Props) {
  const [perms, setPerms] = useState<MemberPermissions>(
    JSON.parse(JSON.stringify(currentPermissions || {}))
  );
  const [saving, setSaving] = useState(false);

  const toggle = (module: ModuleName, action: ModuleAction) => {
    setPerms(prev => {
      const current = prev[module] || [];
      const next = current.includes(action)
        ? current.filter(a => a !== action)
        : [...current, action];
      return { ...prev, [module]: next };
    });
  };

  const handleSave = async () => {
    setSaving(true);
    await onSave(perms);
    setSaving(false);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl border border-[#e2e8f0] w-full max-w-lg max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between p-4 border-b border-[#e2e8f0]">
          <h3 className="font-bold text-gray-900">Permissões: {memberEmail}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs font-semibold text-gray-500 uppercase">
                <th className="pb-2">Módulo</th>
                <th className="pb-2 text-center">Ver</th>
                <th className="pb-2 text-center">Criar</th>
                <th className="pb-2 text-center">Editar</th>
                <th className="pb-2 text-center">Deletar</th>
              </tr>
            </thead>
            <tbody>
              {MODULES.map(mod => (
                <tr key={mod.id} className="border-t border-gray-50">
                  <td className="py-2 font-medium text-gray-700">{mod.label}</td>
                  {(['view', 'create', 'edit', 'delete'] as ModuleAction[]).map(action => {
                    const available = mod.actions.includes(action);
                    const active = (perms[mod.id] || []).includes(action);
                    return (
                      <td key={action} className="py-2 text-center">
                        {available ? (
                          <input
                            type="checkbox"
                            checked={active}
                            onChange={() => toggle(mod.id, action)}
                            className="w-4 h-4 rounded border-gray-300 text-[#3b82f6] focus:ring-[#3b82f6] cursor-pointer"
                          />
                        ) : (
                          <span className="text-gray-300">—</span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="flex justify-end gap-3 p-4 border-t border-[#e2e8f0]">
          <button onClick={handleSave} disabled={saving}
            className="px-4 py-2 bg-[#3b82f6] text-white rounded-lg text-sm font-medium hover:bg-[#2563eb] disabled:opacity-50 cursor-pointer">
            {saving ? 'Salvando...' : 'Salvar'}
          </button>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Modificar SettingsView — adicionar botão Permissões**

Em `SettingsView.tsx`, na seção de lista de membros (account tab, linha ~432), adicionar botão "Permissões" ao lado de cada membro:

```tsx
// Dentro da div de cada membro, após o badge de role, adicionar:
{(activeScope.role === 'owner' || activeScope.role === 'admin') && m.role !== 'owner' && (
  <button
    onClick={() => setPermissionTarget(m)}
    className="text-xs font-medium text-[#3b82f6] hover:text-[#2563eb] cursor-pointer ml-auto"
  >
    Permissões
  </button>
)}
```

Adicionar estado:
```tsx
const [permissionTarget, setPermissionTarget] = useState<AccountMember | null>(null);
```

E renderizar o modal:
```tsx
{permissionTarget && (
  <PermissionsModal
    memberEmail={permissionTarget.email}
    currentPermissions={permissionTarget.permissions || DEFAULT_MEMBER_PERMISSIONS}
    onSave={async (newPerms) => {
      const token = await (await import('../lib/firebase')).auth.currentUser?.getIdToken();
      await fetch(`/api/admin/members/${permissionTarget.uid}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ accountId: activeScope.accountId, permissions: newPerms }),
      });
    }}
    onClose={() => setPermissionTarget(null)}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/PermissionsModal.tsx src/components/SettingsView.tsx
git commit -m "feat: add permissions modal for granular member access control"
```

---

### Task 4.3: Atualizar Firestore Rules com Permissões

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Adicionar função de permissão**

Adicionar no bloco `firestore.rules`, logo após as funções existentes de account (antes de `match /accounts/{accountId}/transactions`):

```
function memberHasPermission(accountId, module, action) {
  let memberData = accountMemberData(accountId);
  // owner e admin têm todas as permissões
  if (memberData.role in ['owner', 'admin']) return true;
  // Verifica permissions map
  let perms = memberData.permissions;
  if (perms == null) return false;
  let modulePerms = perms[module];
  if (modulePerms == null) return false;
  return module in perms && action in modulePerms;
}
```

- [ ] **Step 2: Atualizar cada match de coleção de account**

Para cada `match /accounts/{accountId}/transactions`, `/categories`, etc., substituir:

```
allow read: if isAccountMember(accountId);
```
Por:
```
allow read: if memberHasPermission(accountId, 'transactions', 'view');
allow create: if memberHasPermission(accountId, 'transactions', 'create');
allow update: if memberHasPermission(accountId, 'transactions', 'edit');
allow delete: if memberHasPermission(accountId, 'transactions', 'delete');
```

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat: add permission-based access control to Firestore rules"
```

---

## FASE 5: Página de Report

### Task 5.1: Rotas de Report

**Files:**
- Create: `server/routes/reports.cjs`
- Modify: `server/index.cjs`

- [ ] **Step 1: Criar rotas de report**

```javascript
// server/routes/reports.cjs
const { authRequired, superadminRequired } = require('../middleware/auth.cjs');
const admin = require('../services/firebase-admin.cjs');
const { sendEmail } = require('../services/resend.cjs');
const SUPERADMIN_EMAIL = process.env.SUPERADMIN_EMAIL;

function mount(router) {
  router.post('/api/reports', authRequired, async (req, res) => {
    const db = admin.firestore();
    const { type, title, description, severity, screenshot, module: mod } = req.body;

    const docRef = await db.collection('reports').add({
      type,
      title,
      description,
      severity: type === 'bug' ? severity : null,
      screenshot: screenshot || null,
      module: mod || null,
      reporterId: req.user.uid,
      reporterEmail: req.user.email,
      reporterName: req.user.email,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    // Notificar superadmin
    if (SUPERADMIN_EMAIL) {
      await sendEmail({
        to: SUPERADMIN_EMAIL,
        subject: `Novo Report #${docRef.id}: ${title}`,
        html: `<h2>Novo Report</h2>
          <p><strong>Tipo:</strong> ${type}</p>
          <p><strong>Título:</strong> ${title}</p>
          <p><strong>Descrição:</strong> ${description}</p>
          <p><strong>Módulo:</strong> ${mod || 'N/A'}</p>
          <p><strong>Reportado por:</strong> ${req.user.email}</p>`,
      }).catch(() => {});
    }

    res.writeHead(201, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: { id: docRef.id } }));
  });

  router.get('/api/reports', authRequired, async (req, res) => {
    const db = admin.firestore();
    const snap = await db.collection('reports')
      .where('reporterId', '==', req.user.uid)
      .orderBy('createdAt', 'desc')
      .get();
    const reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: reports }));
  });

  router.get('/api/admin/reports', authRequired, superadminRequired, async (req, res) => {
    const db = admin.firestore();
    const snap = await db.collection('reports').orderBy('createdAt', 'desc').get();
    const reports = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true, data: reports }));
  });

  router.put('/api/admin/reports/:id', authRequired, superadminRequired, async (req, res) => {
    const db = admin.firestore();
    const reportId = req.params.id;
    const { status, adminNotes } = req.body;

    await db.collection('reports').doc(reportId).update({
      ...(status && { status }),
      ...(adminNotes !== undefined && { adminNotes }),
      updatedAt: new Date().toISOString(),
    });

    // Notificar reporter sobre atualização
    const snap = await db.collection('reports').doc(reportId).get();
    if (snap.exists && status) {
      const report = snap.data();
      await sendEmail({
        to: report.reporterEmail,
        subject: `Report #${reportId} atualizado: ${status}`,
        html: `<p>Seu report <strong>"${report.title}"</strong> foi atualizado para: <strong>${status}</strong></p>`,
      }).catch(() => {});
    }

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ success: true }));
  });
}

module.exports = { mount };
```

- [ ] **Step 2: Registrar no index.cjs**

```javascript
require('./routes/reports.cjs').mount(router);
```

- [ ] **Step 3: Commit**

```bash
git add server/routes/reports.cjs server/index.cjs
git commit -m "feat: add report routes with email notifications"
```

---

### Task 5.2: UI Reports (Usuário + Superadmin)

**Files:**
- Create: `src/components/ReportsView.tsx` (já existe ReportsView, renomear a atual ou criar nova)
- Create: `src/components/AdminReportsView.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Criar ReportIssueView (usuário — página de report)**

Criar `src/components/ReportIssueView.tsx`:

```tsx
// src/components/ReportIssueView.tsx
import React, { useState } from 'react';
import { apiFetch } from '../lib/api';
import { Bug, Lightbulb, AlertTriangle, Send, Check } from 'lucide-react';
import type { Report, ModuleName } from '../types';

const MODULES: { id: ModuleName | ''; label: string }[] = [
  { id: '', label: 'Não específico' },
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'transactions', label: 'Transações' },
  { id: 'fixed_monthly', label: 'Fixos Mensais' },
  { id: 'credit_cards', label: 'Cartões' },
  { id: 'dre', label: 'DRE' },
  { id: 'budget', label: 'Orçamento' },
  { id: 'sales', label: 'Vendas' },
  { id: 'goals', label: 'Metas' },
  { id: 'reports', label: 'Relatórios' },
  { id: 'leads', label: 'Leads' },
  { id: 'projects', label: 'Projetos' },
  { id: 'service_types', label: 'Tipos de Serviço' },
];

export function ReportIssueView() {
  const [type, setType] = useState<Report['type']>('bug');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [severity, setSeverity] = useState<Report['severity']>('medium');
  const [module, setModule] = useState<ModuleName | ''>('');
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;
    setError('');
    setSending(true);

    try {
      await apiFetch('/api/reports', {
        method: 'POST',
        body: JSON.stringify({
          type,
          title: title.trim(),
          description: description.trim(),
          severity: type === 'bug' ? severity : undefined,
          module: module || undefined,
        }),
      });
      setSubmitted(true);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSending(false);
    }
  };

  // Lista de reports anteriores
  const [myReports, setMyReports] = useState<Report[]>([]);
  const [reportsLoaded, setReportsLoaded] = useState(false);
  React.useEffect(() => {
    apiFetch('/api/reports')
      .then(r => setMyReports(r.data || []))
      .finally(() => setReportsLoaded(true));
  }, [submitted]);

  if (submitted) {
    return (
      <div className="max-w-lg mx-auto flex flex-col items-center py-20 text-center">
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mb-4">
          <Check className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-gray-900">Report Enviado!</h2>
        <p className="text-sm text-gray-500 mt-2">Obrigado. Sua contribuição ajuda a melhorar o GeniusHub.</p>
        <button onClick={() => setSubmitted(false)}
          className="mt-6 text-sm font-medium text-[#3b82f6] hover:underline cursor-pointer">
          Enviar outro report
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto flex flex-col gap-6">
      <form onSubmit={handleSubmit} className="bg-white rounded-xl border border-[#e2e8f0] p-6 flex flex-col gap-4">
        <h2 className="text-xl font-bold text-gray-900">Reportar Problema</h2>
        <p className="text-sm text-gray-500 -mt-2">Encontrou um bug? Tem uma sugestão? Conte pra gente.</p>

        <div className="flex gap-2">
          {([
            { value: 'bug' as const, icon: Bug, label: 'Bug' },
            { value: 'suggestion' as const, icon: Lightbulb, label: 'Sugestão' },
            { value: 'abuse' as const, icon: AlertTriangle, label: 'Denúncia' },
          ]).map(opt => (
            <button key={opt.value} type="button"
              onClick={() => setType(opt.value)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium border transition-colors cursor-pointer ${
                type === opt.value
                  ? 'bg-[#3b82f6] text-white border-[#3b82f6]'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
              }`}>
              <opt.icon className="w-4 h-4" />
              {opt.label}
            </button>
          ))}
        </div>

        <input type="text" placeholder="Título do report" value={title}
          onChange={e => setTitle(e.target.value)}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#3b82f6]" required />

        <textarea placeholder="Descreva o problema em detalhes..." value={description}
          onChange={e => setDescription(e.target.value)}
          rows={4}
          className="px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none focus:border-[#3b82f6] resize-y" required />

        <div className="flex gap-3">
          <select value={module} onChange={e => setModule(e.target.value as ModuleName | '')}
            className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none cursor-pointer">
            {MODULES.map(m => <option key={m.id} value={m.id}>{m.label}</option>)}
          </select>

          {type === 'bug' && (
            <select value={severity} onChange={e => setSeverity(e.target.value as Report['severity'])}
              className="flex-1 px-3 py-2 border border-gray-200 rounded-lg text-sm outline-none cursor-pointer">
              <option value="low">Baixa</option>
              <option value="medium">Média</option>
              <option value="high">Alta</option>
              <option value="critical">Crítica</option>
            </select>
          )}
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}

        <button type="submit" disabled={sending || !title.trim() || !description.trim()}
          className="flex items-center justify-center gap-2 bg-[#3b82f6] text-white py-2.5 rounded-lg text-sm font-medium hover:bg-[#2563eb] disabled:opacity-50 cursor-pointer">
          <Send className="w-4 h-4" />
          {sending ? 'Enviando...' : 'Enviar Report'}
        </button>
      </form>

      {/* Lista de reports anteriores */}
      {reportsLoaded && myReports.length > 0 && (
        <div className="bg-white rounded-xl border border-[#e2e8f0] p-6">
          <h3 className="font-bold text-gray-900 mb-3">Seus Reports Anteriores</h3>
          <div className="flex flex-col gap-2">
            {myReports.map(r => (
              <div key={r.id} className="flex items-center justify-between py-2 border-t border-gray-50">
                <div>
                  <p className="text-sm font-medium text-gray-700">{r.title}</p>
                  <p className="text-xs text-gray-400">{r.type} — {new Date(r.createdAt).toLocaleDateString('pt-BR')}</p>
                </div>
                <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                  r.status === 'open' ? 'bg-amber-100 text-amber-700' :
                  r.status === 'resolved' ? 'bg-green-100 text-green-700' :
                  'bg-gray-100 text-gray-500'
                }`}>{r.status}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Criar AdminReportsView**

```tsx
// src/components/AdminReportsView.tsx
import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/api';
import type { Report } from '../types';

export function AdminReportsView() {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Report | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [newStatus, setNewStatus] = useState<Report['status']>('open');

  const load = () => {
    apiFetch('/api/admin/reports')
      .then(r => setReports(r.data || []))
      .finally(() => setLoading(false));
  };
  useEffect(() => { load(); }, []);

  const handleUpdate = async () => {
    if (!selected) return;
    await apiFetch(`/api/admin/reports/${selected.id}`, {
      method: 'PUT',
      body: JSON.stringify({ status: newStatus, adminNotes }),
    });
    load();
    setSelected(null);
    setAdminNotes('');
  };

  if (loading) return <div className="p-6 text-text-secondary">Carregando...</div>;

  return (
    <div className="max-w-5xl mx-auto flex gap-6">
      {/* Lista */}
      <div className="flex-1 bg-white rounded-xl border border-[#e2e8f0] overflow-hidden">
        <div className="p-4 border-b border-[#e2e8f0]">
          <h2 className="text-lg font-bold text-gray-900">Reports Recebidos</h2>
        </div>
        <table className="w-full text-sm">
          <thead className="bg-gray-50 text-left">
            <tr>
              <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Título</th>
              <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Tipo</th>
              <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Status</th>
              <th className="px-4 py-2 text-xs font-semibold text-gray-500 uppercase">Data</th>
            </tr>
          </thead>
          <tbody>
            {reports.map(r => (
              <tr key={r.id}
                onClick={() => { setSelected(r); setNewStatus(r.status); setAdminNotes(r.adminNotes || ''); }}
                className={`border-t border-gray-50 hover:bg-gray-50/50 cursor-pointer ${selected?.id === r.id ? 'bg-blue-50' : ''}`}>
                <td className="px-4 py-2.5 font-medium text-gray-900 max-w-[200px] truncate">{r.title}</td>
                <td className="px-4 py-2.5 text-xs text-gray-500">{r.type}</td>
                <td className="px-4 py-2.5">
                  <span className={`text-xs font-semibold uppercase px-2 py-0.5 rounded ${
                    r.status === 'open' ? 'bg-amber-100 text-amber-700' :
                    r.status === 'in_progress' ? 'bg-blue-100 text-blue-700' :
                    r.status === 'resolved' ? 'bg-green-100 text-green-700' :
                    'bg-gray-100 text-gray-500'
                  }`}>{r.status}</span>
                </td>
                <td className="px-4 py-2.5 text-xs text-gray-500">
                  {new Date(r.createdAt).toLocaleDateString('pt-BR')}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Detalhe */}
      {selected && (
        <div className="w-80 shrink-0 bg-white rounded-xl border border-[#e2e8f0] p-4 flex flex-col gap-3">
          <h3 className="font-bold text-gray-900">{selected.title}</h3>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{selected.description}</p>
          <div className="text-xs text-gray-400 space-y-0.5">
            <p>Tipo: {selected.type}</p>
            <p>Módulo: {selected.module || 'N/A'}</p>
            <p>Severidade: {selected.severity || 'N/A'}</p>
            <p>Por: {selected.reporterEmail}</p>
            <p>Em: {new Date(selected.createdAt).toLocaleString('pt-BR')}</p>
          </div>

          <select value={newStatus}
            onChange={e => setNewStatus(e.target.value as Report['status'])}
            className="px-3 py-1.5 border border-gray-200 rounded text-sm outline-none cursor-pointer">
            <option value="open">Aberto</option>
            <option value="in_progress">Em Progresso</option>
            <option value="resolved">Resolvido</option>
            <option value="closed">Fechado</option>
          </select>

          <textarea placeholder="Notas internas..."
            value={adminNotes}
            onChange={e => setAdminNotes(e.target.value)}
            rows={2}
            className="px-3 py-1.5 border border-gray-200 rounded text-sm outline-none resize-y" />

          <button onClick={handleUpdate}
            className="bg-[#3b82f6] text-white py-2 rounded-lg text-sm font-medium hover:bg-[#2563eb] cursor-pointer">
            Atualizar
          </button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Adicionar ao App.tsx**

Adicionar item ao menu sidebar (antes de Configurações):
```tsx
// No array de menuSections, adicionar uma nova seção:
{
  label: 'Suporte',
  items: [
    { id: 'REPORT_ISSUE' as ViewType, label: 'Reportar Problema', icon: Bug },
  ],
},
```

Adicionar `'REPORT_ISSUE'` ao `ViewType`.

No `<main>`:
```tsx
{currentView === 'REPORT_ISSUE' && <ReportIssueView />}
{currentView === 'ADMIN_REPORTS' && <AdminReportsView />}
```

- [ ] **Step 4: Build final e commit**

```bash
npm run build
git add src/components/ReportIssueView.tsx src/components/AdminReportsView.tsx src/App.tsx src/types.ts
git commit -m "feat: add report issue page and admin reports management"
```

---

## Verificação Final

Ao final de todas as fases, rodar:

```bash
npm run lint          # typecheck
npm run build         # build de produção
node server/index.cjs # testar servidor (Ctrl+C para parar)
```

### Checklist de Validação Manual

- [ ] Cadastro novo usuário com email/senha → trial criado automaticamente
- [ ] Login com email/senha funciona
- [ ] Login com Google continua funcionando
- [ ] "Esqueci minha senha" envia email (Firebase)
- [ ] Trial expira após 7 dias → entra em período de tolerância
- [ ] Assinatura via cartão redireciona ao checkout Abacate Pay
- [ ] Assinatura via PIX exibe QR Code
- [ ] Webhook subscription.completed ativa assinatura
- [ ] Webhook subscription.renewed renova período
- [ ] PIX renewal gera novo QR Code automaticamente
- [ ] Superadmin visualiza/edita/cria/remove planos
- [ ] Superadmin atribui assinatura a usuário
- [ ] Permissões de membro são editáveis e persistem
- [ ] Membro sem permissão não vê módulo na sidebar
- [ ] Membro sem permissão tem acesso negado pelo Firestore
- [ ] Usuário envia report e superadmin recebe
- [ ] Superadmin atualiza status do report e reporter recebe email
