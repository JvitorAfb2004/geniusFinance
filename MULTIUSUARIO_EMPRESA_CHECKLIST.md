# Multiusuário (compartilhar apenas Empresa) — Plano Completo + Checklist

> Objetivo: permitir que um usuário convide outra conta para acessar **apenas dados de Empresa**.  
> O mesmo usuário deve conseguir alternar entre:
> 1) Pessoal (próprio)  
> 2) Empresa (própria)  
> 3) Empresa compartilhada (de outro owner)

---

## 0) Status geral

- [~] Fase A — Fundação (tipos + path adapter + account service)
- [ ] Fase B — Regras de segurança Firestore
- [ ] Fase C — Provider/Hooks refactor (listeners + CRUD)
- [ ] Fase D — UI (seletor de conta + sidebar + Settings)
- [ ] Fase E — Migração de dados legados
- [ ] Fase F — QA funcional + segurança + cálculo

---

## 1) Diagnóstico do estado atual (base real)

### 1.1 Isolamento atual
- Hoje os dados ficam em `users/{uid}/...` e as rules exigem `request.auth.uid == userId`.
- Não existe camada de organização/conta compartilhada.
- `activeContext` atual: `PERSONAL | BUSINESS`.

### 1.2 Coleções atuais no provider (`src/hooks/useFinance.tsx`)
- `transactions`
- `categories`
- `budgets`
- `sales-targets`
- `tags`
- `goals`
- `leads`
- `lead-options`
- `service-types`
- `projects`

### 1.3 Impacto direto
- Qualquer compartilhamento entre usuários exige quebrar a premissa "tudo dentro de `users/{uid}`".
- `firestore.rules` atual bloqueia leitura/escrita cruzada por design (correto para single-tenant).

---

## 2) Regra de negócio (precisa travar antes de codar)

### 2.1 Escopo de compartilhamento
- [~] **DECISÃO**: Todas as 10 coleções são compartilháveis via conta Empresa (CLAUDE)
  - Premissa: dividir módulos entre shareable/não-shareable adiciona complexidade sem ganho claro.
  - Se o usuário discordar, ajustar antes de avançar para Fase C.
- [ ] Confirmar se membro pode editar tudo ou terá permissões por módulo.

### 2.2 Papéis
- [x] Definir papéis iniciais: `owner`, `admin`, `member` (CLAUDE)
- [x] Definir quem pode convidar/remover membros: `owner` e `admin` (CLAUDE)
- [x] Definir se `member` pode excluir registros: não (só create/update) (CLAUDE)

### 2.3 Fluxo de convite
- [x] Definir convite por e-mail (compatível com Firebase Auth Google) (CLAUDE)
- [x] Definir expiração/revogação de convite: expira em 7 dias; owner/admin podem revogar (CLAUDE)

---

## 3) Arquitetura proposta (compatível com app atual)

### 3.1 Entidades novas
- [x] `accounts/{accountId}` — desenho definido (CLAUDE)
  - `name`, `ownerId`, `createdAt`, `updatedAt`, `status`
- [x] `accounts/{accountId}/members/{uid}` — desenho definido (CLAUDE)
  - `uid`, `email`, `role`, `invitedBy`, `createdAt`, `updatedAt`
- [x] `accounts/{accountId}/invites/{inviteId}` — desenho definido (CLAUDE)
  - `accountId`, `email`, `role`, `status`, `expiresAt`, `createdBy`, `createdAt`

### 3.2 Dados de negócio por conta empresarial
- [x] Namespace empresarial definido para as 10 coleções (CLAUDE)
- [ ] Criar coleções em `accounts/{accountId}/` — Fase C (CODEX)

### 3.3 Dados pessoais continuam privados
- [x] Mantidos em `users/{uid}/...` sem compartilhamento (CLAUDE)

---

## 4) Decisão de produto para seletor de conta

### 4.1 Modelo de seleção ativo
- [x] `ActiveScope = { type: 'PERSONAL' } | { type: 'ACCOUNT', accountId, role, accountName }` (CLAUDE)
- [ ] Implementar `activeScope` no provider — Bloco A1 + C2 (CODEX)

### 4.2 UI
- [ ] Sidebar/Header com seletor de conta ativa — Bloco D1 (CODEX)
- [ ] Labels claras — Bloco D1 (CODEX)
- [ ] Badge de papel no seletor — Bloco D2 (CODEX)

---

## 5) Regras Firestore (segurança crítica)

### 5.1 Nova base de autorização
- [ ] Criar função `isAccountMember(accountId)` — Bloco B1 (CLAUDE)
- [ ] Criar função `roleInAccount(accountId)` — Bloco B1 (CLAUDE)

### 5.2 Leitura/escrita em conta compartilhada
- [ ] Permitir read para membros — Bloco B2 (CLAUDE)
- [ ] Permitir write com base no papel — Bloco B2 (CLAUDE)
- [ ] Bloquear qualquer acesso fora da conta ativa — Bloco B2 (CLAUDE)

### 5.3 Convites
- [ ] Criação apenas por `owner/admin` — Bloco B3 (CLAUDE)
- [ ] Aceite somente se e-mail do token combina — Bloco B3 (CLAUDE)
- [ ] Anti-elevação de papel — Bloco B3 (CLAUDE)

### 5.4 Hardening
- [ ] Schema validation para coleções da conta — Bloco B4 (CLAUDE)
- [ ] Imutabilidade de campos críticos — Bloco B4 (CLAUDE)

---

## 6) Provider/Hooks (useFinance) — refactor com adapter

### 6.1 Adapter de path
- [ ] Criar `resolveDataPath(scope, collection)` — Bloco A2 (CODEX)

### 6.2 Leituras (listeners)
- [ ] Extrair padrão de listener em hook reutilizável — Bloco C1 (CODEX)
- [ ] Atualizar listeners para caminho da conta ativa — Bloco C2 (CODEX)
- [ ] Evitar listeners duplicados ao alternar conta — Bloco C2 (CODEX)

### 6.3 Escritas (CRUD)
- [ ] Atualizar todos os CRUDs para usar path adapter — Bloco C3 (CODEX)
- [ ] Remover dependência de `context: BUSINESS` para distinguir empresa — Bloco C3 (CODEX)

### 6.4 Tipos
- [x] Atualizar `types.ts` com `ActiveScope`, `Account`, `AccountMember`, etc. — Bloco A1 (CODEX)

---

## 7) Migração de dados (sem perder histórico)

### 7.1 Estratégia
- [x] Criar "Empresa padrão" para cada usuário existente (CLAUDE)
- [x] Migrar registros `context=BUSINESS` de `users/{uid}` para `accounts/{accountId}` (CLAUDE)
- [x] Manter `context=PERSONAL` onde está (CLAUDE)

### 7.2 Execução
- [ ] Script de migração com idempotência — Bloco E1 (CODEX)
- [ ] Log de progresso por usuário/coleção — Bloco E1 (CODEX)
- [ ] Modo dry-run antes do write real — Bloco E1 (CODEX)

### 7.3 Pós-migração
- [ ] Verificação de contagem (origem vs destino) — Bloco E2 (CODEX)
- [ ] Verificação de totais financeiros por mês/ano — Bloco E2 (CODEX)

---

## 8) Impacto por tela (checklist de revisão)

### 8.1 Financeiro
- [ ] DashboardCards — verificar após C2
- [ ] DashboardAlerts — verificar após C2
- [ ] DashboardCharts — verificar após C2
- [ ] TransactionTable / TransactionModal — verificar após C3
- [ ] DREView — verificar após C2
- [ ] BudgetView — verificar após C3
- [ ] SalesView / SalesTargetModal — verificar após C3
- [ ] ReportsView — verificar após C2
- [ ] FixedMonthlyView — verificar após C2
- [ ] ImportView — verificar após C3
- [ ] CreditCardsView — verificar após C2
- [ ] ChatBot — verificar após C2

### 8.2 Configurações
- [ ] SettingsView: incluir gestão de conta/membros/convites — Bloco D3 (CODEX)
- [ ] Manter configurações locais do usuário separadas (ex.: preferências de UI)

### 8.3 Comercial e Projetos
- [ ] CommercialView / LeadModal / lead-options — verificar após C2
- [ ] ServiceTypesView — verificar após C2
- [ ] ProjectsView / ProjectKanban / ProjectModal — verificar após C2

---

## 9) QA obrigatório (antes de declarar pronto)

### 9.1 Fluxos principais
- [ ] Usuário A cria conta e dados de empresa — Fase F2 (CODEX)
- [ ] Usuário A convida Usuário B — Fase F2 (CODEX)
- [ ] Usuário B aceita convite e enxerga empresa de A — Fase F2 (CODEX)
- [ ] Usuário B não enxerga dados pessoais de A — Fase F2 (CODEX)
- [ ] Usuário B não enxerga empresa de C (sem vínculo) — Fase F2 (CODEX)
- [ ] Alternância de conta ativa não mistura dados — Fase F2 (CODEX)

### 9.2 Segurança
- [ ] Teste de leitura cruzada por path manual — Fase F1 (CLAUDE)
- [ ] Teste de write cruzado fora da conta — Fase F1 (CLAUDE)
- [ ] Teste de elevação de role por payload — Fase F1 (CLAUDE)

### 9.3 Regressão de cálculo
- [ ] Totais Dashboard corretos por conta ativa — Fase F3 (CODEX)
- [ ] DRE mensal/anual correto por conta ativa — Fase F3 (CODEX)
- [ ] Relatórios anuais corretos por conta ativa — Fase F3 (CODEX)
- [ ] IA responde com base da conta ativa — Fase F3 (CODEX)

---

## 10) Ordem de execução (atualizada com blocos)

- [x] A1 — Tipos multitenant (`src/types.ts`) (CODEX)
- [x] A2 — Path adapter (`src/lib/pathAdapter.ts`) (CODEX)
- [ ] A3 — Account service (`src/lib/accountService.ts`) (CODEX)
- [ ] B1 — Regras Firestore: base accounts + members (CLAUDE)
- [ ] B2 — Regras Firestore: coleções empresariais (CLAUDE)
- [ ] B3 — Regras Firestore: invites (CLAUDE)
- [ ] B4 — Regras Firestore: hardening (CLAUDE)
- [ ] C1 — Provider: hook `useCollectionListener` (CODEX)
- [ ] C2 — Provider: listeners com ActiveScope (CODEX)
- [ ] C3 — Provider: CRUD com path adapter (CODEX)
- [ ] C4 — Provider: seed adaptado (CODEX)
- [ ] D1 — UI: ScopeSelector no Header (CODEX)
- [ ] D2 — UI: Sidebar com badge de conta (CODEX)
- [ ] D3 — UI: SettingsView aba Conta (CODEX)
- [ ] E1 — Migração: script de migração (CODEX)
- [ ] E2 — Migração: verificação pós-migração (CODEX)
- [ ] F1 — QA: segurança (CLAUDE)
- [ ] F2 — QA: funcional (CODEX)
- [ ] F3 — QA: cálculo (CODEX)

---

## 11) Riscos conhecidos (acompanhar)

- [ ] Risco de vazamento entre contas por rule incompleta. **Mitigação**: Blocos B1-B4 + F1.
- [ ] Risco de regressão em telas que assumem `activeContext` binário. **Mitigação**: C2 + F2 cobrem todas as telas.
- [ ] Risco de divergência de cálculo pós-migração. **Mitigação**: E2 com verificação de totais.
- [ ] Risco de UX confusa se não ficar explícito "qual conta está ativa". **Mitigação**: D1 + D2.

---

## 12) Definição de pronto

- [ ] Usuário alterna entre Pessoal/Empresa(s) no menu.
- [ ] Compartilhamento de Empresa funciona via convite.
- [ ] Regras impedem acesso indevido entre contas.
- [ ] Cálculos financeiros batem com dados por conta ativa.
- [ ] Nenhuma tela principal quebra no fluxo diário.
- [ ] Rollout com validação e sem perda de dados.
