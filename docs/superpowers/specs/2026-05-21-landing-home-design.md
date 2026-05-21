# Landing page em `/` + login em `/login` (Genius Finance)

Data: 2026-05-21

## Objetivo

Criar uma landing page pública na rota `/` com estrutura inspirada na AbacatePay (referência visual), mas seguindo o design system atual do projeto (Tailwind + tokens em `app/styles/index.css`).

Mover a tela de login atual (hoje em `/`) para a rota `/login`.

## Escopo

### Em escopo

- Rota `/`:
  - Landing pública **mesmo para usuário logado** (sem redirect automático).
  - Header com CTA no topo:
    - deslogado: **Entrar** → `/login`
    - logado: **Abrir app** → `/dashboard`
  - Hero no layout **C**:
    - 2 colunas: texto + CTA à esquerda; “print grande” à direita (placeholder por enquanto).
  - Sessão de “prints” da plataforma:
    - placeholders inicialmente (arquivos futuros em `public/prints/*`).
  - Sessão de features (grid) baseada nos pilares do `MARKETING_GUIDE.md`.
  - FAQ curta.
  - CTA final + footer.

- Rota `/login`:
  - Reutilizar o layout/fluxo do login atual:
    - termos/política (chave `gh_terms_accepted`)
    - login com email e Google
    - `useFinance()` e redirecionamento pós-login para `/dashboard` (apenas dentro do login).

- Rotas autenticadas existentes (`/dashboard`, etc.) continuam iguais.

### Fora de escopo

- Copys finais de marketing pixel-perfect.
- Depoimentos, pricing completo, integrações reais (apenas placeholders/sessões estáticas).
- Qualquer mudança de regras de negócio, autenticação ou backend.

## Flow map (navegação)

- Visitante deslogado:
  - `/` (landing) → CTA “Entrar” → `/login` → login → `/dashboard`
- Usuário logado:
  - `/` mostra landing (sem redirect) → CTA “Abrir app” → `/dashboard`

## Implementação (alto nível)

1. Criar `app/routes/login.tsx` (ou equivalente ao padrão do repo) com o conteúdo atual de `app/routes/_index.tsx`.
2. Reescrever `app/routes/_index.tsx` para a landing.
3. Atualizar `app/routes.ts` para adicionar a rota `/login`.
4. Ajustar redirects que hoje mandam para `/` quando deslogado (ex.: `app/routes/_app.tsx`) para mandarem para `/login`.
5. Garantir `.superpowers/` no `.gitignore`.

## Placeholders de prints

- A landing deve esperar por imagens em:
  - `public/prints/hero.png` (print grande do hero)
  - `public/prints/feature-1.png`, `feature-2.png`, etc. (grid)
- Enquanto não existir, exibir placeholders (div com borda/gradiente e texto “Print em breve”).

## Critérios de aceite

- `/` exibe landing em desktop e mobile, sem depender de autenticação.
- `/login` exibe o login atual (comportamento idêntico ao de antes).
- Se deslogado tentar acessar `/dashboard`, é redirecionado para `/login` (não para `/`).
- Se logado acessar `/`, não é redirecionado automaticamente.

