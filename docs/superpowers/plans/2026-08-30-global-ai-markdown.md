# Global AI Markdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let the financial agent read every authorized personal/company account with separated answers and render concise Markdown tables correctly.

**Architecture:** Keep mutations on the active scope. Add a server-side read aggregation context built from the authenticated user’s personal data and verified account memberships. Render assistant output in the existing panel with GFM Markdown, while user messages remain plain text.

**Tech Stack:** React 19, TypeScript, React Router 7, Firebase Admin, `react-markdown`, `remark-gfm`, Vitest, Tailwind CSS.

## Global Constraints

- Leituras podem consultar todos os escopos autorizados do usuário.
- Cada resultado deve identificar a conta com um título Markdown próprio.
- Nunca misturar totais de Pessoal e Empresas no mesmo cálculo sem separar os subtotais.
- Criações, edições, exclusões, fechamentos e reaberturas continuam limitados ao escopo ativo e exigem confirmação.
- A mensagem da IA deve ser objetiva, sem repetir dados desnecessariamente.
- O cliente deve renderizar títulos, negrito, listas, citações e tabelas; não deve exibir a sintaxe Markdown crua.
- HTML arbitrário não será permitido na resposta renderizada.
- Não alterar `app/components/TransactionModal.tsx` nem `app/hooks/useFinance.tsx`.

---

### Task 1: Aggregate Authorized Read Scopes

**Files:**
- Modify: `app/services/finance-agent.server.ts`
- Modify: `app/lib/finance-agent-types.ts`
- Test: `app/lib/finance-agent.test.ts`

**Interfaces:**

```ts
export interface ReadScope {
  label: string;
  scope: ValidatedAgentScope;
}

export async function resolveFinanceReadScopes(uid: string): Promise<ReadScope[]>;
export async function runFinanceAgent(messages: AgentMessage[], context: AgentContext): Promise<AgentResponse>;
```

- [ ] **Step 1: Write failing aggregation tests**

Test that personal plus two verified memberships become three labeled scopes, and a membership whose account member document is absent is excluded. Test that a mutation proposal still contains only the active scope.

- [ ] **Step 2: Run the focused tests**

Run `npx.cmd vitest run app/lib/finance-agent.test.ts`. Expected: the new aggregation tests fail because the read-scope resolver does not exist.

- [ ] **Step 3: Implement verified scope discovery**

Load `user-accounts/${uid}/memberships`, then verify each account with `accounts/${accountId}/members/${uid}` using Admin Firestore. Return `Pessoal` plus verified company labels. Do not trust account names, roles, or IDs supplied by the browser.

- [ ] **Step 4: Aggregate read tools without mixing totals**

Run existing read tools once per authorized read scope and return an object keyed by the account label. Make `get_financial_summary`, `get_dre`, `get_cash_flow`, transaction lists, and collection lists preserve the account label. Keep proposal tools bound to `context.scope` only.

- [ ] **Step 5: Make the prompt concise and account-aware**

Require short answers, no generic introduction, one section per account, separate subtotals, Markdown headings/tables when useful, and no cross-account total unless the user explicitly requests it.

- [ ] **Step 6: Run tests and commit**

Run `npm test` and `npm.cmd run lint`. Expected: all tests and TypeScript pass.

```bash
git add app/services/finance-agent.server.ts app/lib/finance-agent-types.ts app/lib/finance-agent.test.ts
git commit -m "feat: aggregate authorized finance scopes"
```

---

### Task 2: Render Safe Markdown and GFM Tables

**Files:**
- Modify: `app/components/FinanceAIAssistant.tsx`
- Modify: `package.json`, `package-lock.json`
- Test: `app/components/FinanceAIAssistant.test.tsx` or a pure renderer helper test if the project test environment cannot render React.

**Interfaces:**

```tsx
function AssistantMarkdown({ content }: { content: string }): React.ReactElement;
```

- [ ] **Step 1: Add the existing standard Markdown dependencies**

Run `npm.cmd install react-markdown remark-gfm`. Do not add a second Markdown parser.

- [ ] **Step 2: Write the failing renderer test**

Assert that `### Título`, `**forte**`, `- item`, blockquotes, and a GFM table render as heading, strong text, list, blockquote, and table elements. Assert that an HTML script payload is not executed or rendered as an HTML element.

- [ ] **Step 3: Run the focused test**

Run `npx.cmd vitest run app/components/FinanceAIAssistant.test.tsx`. Expected: FAIL because assistant content currently uses plain text.

- [ ] **Step 4: Replace assistant plain text with safe Markdown**

Render assistant messages through `ReactMarkdown` with `remarkPlugins={[remarkGfm]}` and `skipHtml`. Add compact typography classes for headings, paragraphs, lists, blockquotes, code, and responsive tables. Keep user messages as escaped plain text.

- [ ] **Step 5: Render proposals outside Markdown**

Keep confirmation cards as controlled React elements after the assistant Markdown. Never interpolate proposal data into Markdown or HTML.

- [ ] **Step 6: Run focused tests and commit**

Run `npm test` and `npm.cmd run lint`. Expected: all tests pass.

```bash
git add app/components/FinanceAIAssistant.tsx app/components/FinanceAIAssistant.test.tsx package.json package-lock.json
git commit -m "feat: render AI responses as markdown"
```

---

### Task 3: End-to-End Verification

**Files:**
- Modify only files required to correct failures.
- Update `README.md` only if the new dependency or behavior needs documentation.

- [ ] **Step 1: Verify account separation**

Run the focused agent tests and confirm labels and totals are separate for Pessoal and each Empresa.

- [ ] **Step 2: Verify mutation isolation**

Confirm a proposal created while another account is being read still contains the selected active scope and confirmation rejects a different scope.

- [ ] **Step 3: Verify Markdown output**

Run the renderer tests with a table containing Portuguese currency, status, headings, bold text, lists, and a blockquote.

- [ ] **Step 4: Run the project checks**

Run `npm.cmd run lint`, `npm test`, and `npm.cmd run build`. Expected: all commands pass.

- [ ] **Step 5: Inspect worktree**

Run `git status --short`; confirm the pre-existing changes in `TransactionModal.tsx` and `useFinance.tsx` remain untouched.

## Plan Self-Review

- Spec coverage: global verified reads, account-separated responses, active-scope-only mutations, concise prompt, GFM tables, HTML suppression, tests, and build are covered by Tasks 1-3.
- No incomplete markers or vague implementation steps remain.
- `ReadScope`, `resolveFinanceReadScopes`, and `AssistantMarkdown` are defined before later tasks consume them.
