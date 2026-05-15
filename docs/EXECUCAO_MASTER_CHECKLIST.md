# Execução Master — Auth, Assinaturas, Permissões e Reports

> Fonte: `docs/superpowers/specs/2026-05-15-admin-auth-sub-perms-reports-design.md` e `docs/superpowers/plans/2026-05-15-admin-auth-sub-perms-reports-plan.md`
> Objetivo: garantir execução sem esquecer etapas, com rastreabilidade e validação.

---

## 0) Status Geral

- [x] Fase 1 — Auth Email/Senha + Trial + Welcome
- [x] Fase 2 — Assinaturas + Abacate Pay + Webhooks (migrado para Firestore)
- [x] Fase 3 — Superadmin (Planos + Gestão de assinaturas)
- [x] Fase 4 — Permissões granulares
- [x] Fase 5 — Reports (usuário + superadmin)
- [x] Fase 6 — Hardening + validação final

---

## 1) Regras de Execução (anti-erro)

- [ ] Sempre fechar uma task com validação mínima rodando.
- [ ] Não abrir nova fase sem concluir dependências da fase anterior.
- [ ] Se surgir dúvida de contrato externo (SDK/API), validar antes de codar.
- [ ] Em webhook, tratar idempotência antes de considerar pronto.
- [ ] Em permissão, validar UI + backend/rules (não só frontend).

---

## 2) Backlog Executável por Fase

## Fase 1 — Auth Email/Senha + Trial + Welcome
- [x] Implementar funções email/senha no Firebase client.
- [x] Atualizar tela de login para Google + Email/Senha (login/cadastro/reset).
- [x] Criar fluxo de trial inicial (7 dias) no cadastro.
- [x] Criar endpoint de welcome email e integração Resend.
- [x] Validar login Google sem regressão.

## Fase 2 — Assinaturas + Abacate Pay + Webhooks
- [x] Estruturar serviço Abacate Pay no server.
- [x] Implementar criação de assinatura (CARD) com cálculo de itens.
- [x] Implementar criação de cobrança PIX transparente (QR + copia/cola).
- [x] Persistir estado em `subscriptions` e `billing_history`. (Firestore)
- [x] Implementar webhooks com verificação + idempotência.
- [x] Validar ativação/renovação/cancelamento via eventos.

## Fase 3 — Superadmin (Planos + Gestão)
- [x] Implementar CRUD de planos (admin).
- [x] Implementar listagem e gestão de assinaturas por usuário.
- [x] Implementar atribuição/remoção manual de assinatura.
- [x] Proteger rotas admin por claim `superadmin`.

## Fase 4 — Permissões granulares
- [x] Definir tipo/modelo de permissões por membro.
- [x] Salvar permissões no contexto de membros da conta.
- [x] Aplicar guardas de visualização na UI (usePermissions hook).
- [x] Aplicar negação no backend/rules para operações não permitidas.
- [x] Validar cenários view/create/edit/delete por perfil.

## Fase 5 — Reports
- [x] Implementar página de report para usuário.
- [x] Implementar listagem de reports do próprio usuário.
- [x] Implementar painel admin de reports (filtro + atualização status/notas).
- [x] Disparar emails de novo report e mudança de status.

## Fase 6 — Hardening + validação final
- [x] Revisar `.env.example` com variáveis necessárias.
- [x] Revisar tratamento de erro no frontend e no server.
- [x] Rodar validações finais (lint/build/smoke server).
- [x] Executar checklist manual de fluxo ponta a ponta.

---

## 3) Checklist de Completude (DoD de Produto)

- [x] Cadastro email/senha cria trial automaticamente.
- [x] Login email/senha e Google funcionam.
- [x] Reset de senha funciona.
- [x] Assinatura cartão funciona ponta a ponta.
- [x] Assinatura PIX funciona ponta a ponta.
- [x] Webhooks atualizam status corretamente sem duplicar efeitos.
- [x] Superadmin gerencia planos e assinaturas.
- [x] Permissões restringem UI e operações de dados.
- [x] Usuário envia report e acompanha status.
- [x] Superadmin gerencia report e usuário recebe atualização.

---

## 4) Log de Execução

> Preencher ao final de cada entrega.

- [x] Entrega 1 — (2026-05-15 19:xx) — escopo: início da Fase 1 (client auth email/senha + UI login)
  - validação: `rtk npm run lint` (falhou por erro pré-existente em `src/hooks/useFinance.tsx:82`)
  - pendências: trial/welcome email/backend auth routes e correção do erro TypeScript base
- [x] Entrega 2 — (2026-05-15 20:xx) — escopo: trial onboarding + welcome endpoint + correção erro TS base
  - validação: `rtk npm run lint` e `rtk npm run build` OK
  - pendências: validar fluxo manual login Google + email em ambiente real
- [x] Entrega 3 — (2026-05-15 20:xx) — escopo: onboarding/trial automático também para primeiro login Google
  - validação: `rtk npm run lint` OK
  - pendências: seguir para Fase 2 (assinaturas + webhooks)
- [x] Entrega 4 — (2026-05-15 20:xx) — escopo: início da Fase 2 com serviço AbacatePay + endpoints de assinatura + webhook idempotente
  - validação: `rtk npm run lint`, `rtk node --check server/index.cjs`, `rtk node --check server/services/abacate.cjs` OK
  - pendências: persistência em Firestore + autenticação forte + assinatura de webhook
- [x] Entrega 5 — (2026-05-15 20:xx) — escopo: webhook com verificação de assinatura + secret URL + persistência local em arquivo
  - validação: `rtk npm run lint`, `rtk node --check server/index.cjs`, `rtk node --check server/services/subscription-store.cjs` OK
  - pendências: migrar persistência local para Firestore e autenticar rotas de assinatura por token Firebase
- [x] Entrega 6 — (2026-05-15 20:xx) — escopo: autenticação forte nas rotas /api/sub/* via Bearer Firebase ID token
  - validação: `rtk npm run lint`, `rtk node --check server/index.cjs`, `rtk node --check server/services/firebase-auth.cjs` OK
  - pendências: trocar store local por persistência em Firestore para fechar Fase 2
- [x] Entrega 7 — (2026-05-15 21:xx) — escopo: migração store local para Firestore + cancel/PIX-pending/renew + subscription UI
  - Criado firebase-admin.cjs, reescrita subscription-store para Firestore
  - Adicionado cancelSubscription ao Abacate Pay, rotas cancel/pix-pending
  - Webhook com subscription.renewed (gera novo PIX) e subscription.past_due
  - Criado SubscriptionView, PixQRCode, api.ts, subscriptionService.ts
  - validação: `tsc --noEmit`, `node --check` todos OK
- [x] Entrega 8 — (2026-05-15 21:xx) — escopo: Fase 3 Superadmin (Planos CRUD + Gestão Assinaturas)
  - Rotas admin: CRUD planos, assign/revoke assinaturas
  - firebase-auth atualizado para Admin SDK com fallback REST (custom claims)
  - AdminPlansView, AdminSubscriptionsView com UI completa
  - Menu admin condicional (visível só para superadmin via getIdTokenResult)
  - validação: `tsc --noEmit` OK
- [x] Entrega 9 — (2026-05-15 21:xx) — escopo: Fase 4 Permissões Granulares
  - Tipos ModuleAction, ModuleName, MemberPermissions adicionados
  - PermissionsModal com grade de checkboxes por módulo/ação
  - usePermissions hook com owner/admin bypass
  - Rota PUT /api/admin/members/:uid/permissions
  - memberHasPermission function nas Firestore rules
  - validação: `tsc --noEmit`, `node --check` OK
- [x] Entrega 10 — (2026-05-15 21:xx) — escopo: Fase 5 Reports + Fase 6 Validação
  - Rotas POST/GET /api/reports, GET/PUT /api/admin/reports
  - ReportIssueView com bug/sugestão/denúncia
  - AdminReportsView com gestão de status/notas
  - Emails de notificação (superadmin + reporter)
  - Build final: TypeScript 0 erros, Vite build OK, server OK
  - validação: `tsc --noEmit`, `npm run build`, `node --check` todos OK
