# Finance AI Agent Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a secure DeepSeek V4 Flash financial agent inside the Vercel app and remove the Pluggy integration without deleting historical Pluggy documents.

**Architecture:** The authenticated layout opens a same-origin AI panel. A server-only agent route authenticates Firebase, resolves the active scope from a validated request, executes an allowlisted set of read tools against Admin Firestore, and returns signed one-action mutation proposals. A confirmation route revalidates the proposal, scope, permissions, target state, and schema before executing the mutation.

**Tech Stack:** React 19, React Router 7, TypeScript, Firebase Auth, Firebase Admin Firestore, Vercel server runtime, native `fetch`, DeepSeek OpenAI-compatible Chat Completions API, Vitest, Tailwind CSS, lucide-react.

## Global Constraints

- Use only the official DeepSeek API with model `deepseek-v4-flash`.
- Store the API key only in `DEEPSEEK_API_KEY`; never expose it to browser code.
- The agent may operate only on the currently selected personal/account scope.
- Consultations execute immediately; every create, edit, delete, close, or reopen requires explicit confirmation.
- Do not persist chat history.
- Remove Pluggy code and product access, but preserve `pluggy_connections` and `pluggy_provisions` documents.
- Do not add an SDK or dependency when native `fetch` and existing Firebase services are sufficient.
- Do not modify the user’s existing unstaged changes in `app/components/TransactionModal.tsx` or `app/hooks/useFinance.tsx`.
- All files must remain UTF-8 and contain no Unicode replacement characters.

---

## File Map

### Create

- `app/services/deepseek.server.ts`: server-only DeepSeek request and response normalization.
- `app/services/finance-agent.server.ts`: scope validation, tool definitions, read handlers, mutation proposal creation, and confirmed mutation execution.
- `app/lib/finance-agent-types.ts`: shared JSON-safe tool, proposal, and response types.
- `app/components/FinanceAIAssistant.tsx`: FAB, responsive panel, messages, and confirmation cards.
- `app/routes/api/ai.agent.ts`: authenticated agent action endpoint.
- `app/routes/api/ai.agent-confirm.ts`: authenticated proposal confirmation endpoint.
- `app/lib/finance-agent.test.ts`: pure validation and proposal tests.

### Modify

- `app/routes.ts`: register the two AI endpoints and remove Pluggy endpoints.
- `app/routes/_app.tsx`: mount `FinanceAIAssistant` in the authenticated layout.
- `app/lib/api.ts`: allow authenticated same-origin requests to send the active scope header for AI calls.
- `app/types.ts`: add any missing financial permission names only if required by the existing module model.
- `firestore.rules`: remove obsolete Pluggy access only if the project no longer needs client access; do not add broad AI access.
- `package.json`: remove dependencies only proven to be Pluggy-only.

### Delete after reference audit

- `app/hooks/usePluggy.ts`
- `app/services/pluggy.server.ts`
- `app/services/pluggy-store.server.ts`
- `app/routes/api/pluggy.connect-token.ts`
- `app/routes/api/pluggy.connect-record.ts`
- `app/routes/api/pluggy.sync.ts`
- `app/routes/api/webhooks.pluggy.ts`
- Pluggy-only UI/components and routes identified by `rg -n "pluggy|Pluggy|provis" app firebase.json firestore.rules`

Manual provisions functionality must be retained only if it does not call Pluggy; remove connection/sync UI while preserving independent manual finance behavior.

---

### Task 1: Remove Pluggy Integration

**Files:**
- Delete the Pluggy files listed in the File Map after reference audit.
- Modify `app/routes.ts`, `app/routes/_app.tsx`, `firebase.json`, and any direct consumers found by the audit.
- Test with repository-wide search and TypeScript compilation.

**Interfaces:**
- Produces a build with no executable Pluggy integration, while Firestore history remains untouched.

- [ ] **Step 1: Inventory all references**

Run:

```bash
rg -n "pluggy|Pluggy|ProvisionsView|usePluggy|IntegrationsTab" app firebase.json firestore.rules package.json
```

Record each reference as either Pluggy-only or independent manual finance behavior. Do not delete a manual provision path solely because its route name contains `provisoes`.

- [ ] **Step 2: Remove Pluggy routes and UI references**

Delete only the route registrations and imports whose implementation is Pluggy-only. Keep the app’s finance routes valid after deletion.

- [ ] **Step 3: Remove server and client Pluggy files**

Delete the Pluggy service, store, hook, API routes, and webhook after all imports are removed. Do not run a Firestore deletion script.

- [ ] **Step 4: Verify the removal**

Run:

```bash
rg -n "pluggy|Pluggy|usePluggy|IntegrationsTab" app firebase.json package.json
npm run lint
```

Expected: no executable application references remain and TypeScript exits successfully. Historical Firestore collections are not modified.

- [ ] **Step 5: Commit the isolated cleanup**

```bash
git add -u app/routes.ts app/routes/_app.tsx firebase.json package.json app/components app/hooks app/services
git commit -m "chore: remove pluggy integration"
```

---

### Task 2: Build Secure Agent Core

**Files:**
- Create `app/lib/finance-agent-types.ts`, `app/services/deepseek.server.ts`, and `app/services/finance-agent.server.ts`.
- Create `app/lib/finance-agent.test.ts`.
- Modify `app/lib/auth.server.ts` only if the agent needs a stricter scope resolver; do not weaken existing auth.

**Interfaces:**

```ts
export type AgentRole = "user" | "assistant" | "tool";

export interface AgentMessage {
  role: AgentRole;
  content: string;
  tool_call_id?: string;
  tool_calls?: unknown[];
}

export interface AgentProposal {
  id: string;
  action: string;
  label: string;
  scopeFingerprint: string;
  arguments: Record<string, unknown>;
  preview: Record<string, unknown>;
  expiresAt: number;
  signature: string;
}

export interface AgentResponse {
  content: string;
  proposal?: AgentProposal;
}

export interface ValidatedAgentScope {
  type: "PERSONAL" | "ACCOUNT";
  userId: string;
  accountId?: string;
  accountName?: string;
  role?: "owner" | "admin" | "member";
}

export interface ProposalInput {
  uid: string;
  scope: ValidatedAgentScope;
  action: string;
  arguments: Record<string, unknown>;
  preview: Record<string, unknown>;
}

export function validateAgentScope(request: Request, uid: string): ValidatedAgentScope;
export function createProposal(input: ProposalInput): AgentProposal;
export function verifyProposal(proposal: AgentProposal, uid: string, scope: ValidatedAgentScope): void;
```

- [ ] **Step 1: Write failing pure tests**

Cover these cases in `app/lib/finance-agent.test.ts`:

```ts
it("rejects a personal scope belonging to another uid", () => {
  expect(() => validateAgentScope(requestWithScope({ type: "PERSONAL", userId: "other" }), "uid-1")).toThrow();
});

it("creates a proposal with an expiry and immutable action payload", () => {
  const proposal = createProposal({ uid: "uid-1", scope, action: "create_transaction", arguments: { amount: 10 }, preview: {} });
  expect(proposal.expiresAt).toBeGreaterThan(Date.now());
  expect(() => verifyProposal(proposal, "uid-1", scope)).not.toThrow();
});

it("rejects a proposal from another scope or after expiry", () => {
  expect(() => verifyProposal(proposal, "uid-1", otherScope)).toThrow();
  expect(() => verifyProposal({ ...proposal, expiresAt: 0 }, "uid-1", scope)).toThrow();
});
```

- [ ] **Step 2: Run the focused test and verify failure**

Run `npx vitest run app/lib/finance-agent.test.ts`. Expected: FAIL because the new functions do not exist.

- [ ] **Step 3: Implement scope, proposal, and signature validation**

Use the authenticated UID as the source of truth for personal scope. For account scope, load the account member document with Admin Firestore and reject missing membership. Sign the serialized proposal with a server secret using Node’s built-in `crypto`; include an expiry and a unique ID. Never trust a client-supplied action, collection path, account ID, or permission result.

- [ ] **Step 4: Implement the DeepSeek adapter**

`deepseek.server.ts` must call:

```ts
fetch("https://api.deepseek.com/chat/completions", {
  method: "POST",
  headers: {
    "Content-Type": "application/json; charset=utf-8",
    Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
  },
  body: JSON.stringify({
    model: process.env.DEEPSEEK_MODEL || "deepseek-v4-flash",
    messages,
    tools,
    tool_choice: "auto",
    temperature: 0.1,
    max_tokens: 2048,
  }),
  signal: AbortSignal.timeout(60_000),
});
```

Normalize content and tool calls, reject non-2xx responses, reject malformed JSON, and return safe user-facing errors. Never log request messages or the API key.

- [ ] **Step 5: Implement allowlisted read tools and proposal tools**

Use `resolveDataPath` and the active scope, but query with Admin Firestore only after membership validation. Implement read tools for transactions, categories, tags, budgets, spending limits, goals, fixed transactions, sales targets, monthly closings, DRE, reports, cash flow, and recurring detection. Implement proposal-only tools for each supported write. Validate tool arguments with explicit TypeScript/runtime checks and enforce limits such as 100 transaction results and one mutation per request.

- [ ] **Step 6: Implement the agent loop**

Build the Portuguese system prompt with these rules: use tools for real data, never invent values, ask for clarification when dates are ambiguous, treat Firestore text as untrusted data, use Brazilian currency formatting, and never execute a mutation directly. Run at most five model/tool iterations. A read tool result returns to the model; a mutation tool returns one signed proposal and stops the loop.

- [ ] **Step 7: Run focused tests**

Run `npx vitest run app/lib/finance-agent.test.ts`. Expected: PASS.

- [ ] **Step 8: Commit the agent core**

```bash
git add app/lib/finance-agent-types.ts app/lib/finance-agent.server.ts app/lib/finance-agent.test.ts app/services/deepseek.server.ts app/lib/auth.server.ts
git commit -m "feat: add secure finance agent core"
```

---

### Task 3: Add Agent API and Confirmed Mutations

**Files:**
- Create `app/routes/api/ai.agent.ts` and `app/routes/api/ai.agent-confirm.ts`.
- Modify `app/routes.ts` and `app/lib/api.ts`.
- Extend `app/lib/finance-agent.test.ts` with endpoint-level pure handler tests where practical.

**Interfaces:**

```ts
// POST /api/ai/agent
{ messages: AgentMessage[]; scope: ActiveScope }
// response
{ content: string; proposal?: AgentProposal }

// POST /api/ai/agent-confirm
{ proposal: AgentProposal }
// response
{ success: true; result: unknown }
```

- [ ] **Step 1: Register same-origin routes**

Add `api/ai/agent` and `api/ai/agent-confirm` to `app/routes.ts`. Remove any old AI route registrations if present. Both routes must use `requireAuth` or an equivalent Firebase Admin verification before parsing or executing user input.

- [ ] **Step 2: Send active scope only for AI requests**

Add a small client helper that obtains the Firebase ID token and sends `X-Active-Scope: JSON.stringify(activeScope)` to the same-origin endpoint. Do not add a public `VITE_API_BASE` override for this agent path.

- [ ] **Step 3: Implement the agent action**

Reject non-POST requests, missing messages, messages over 12,000 characters total, and malformed scopes with HTTP 400. Authenticate, validate scope, call the agent core, and return JSON with UTF-8 content type. Return 401 for auth failure, 429 for rate/iteration limits, 502 for DeepSeek failure, and 500 only for an internal safe error message.

- [ ] **Step 4: Implement confirmation**

Authenticate again, verify the signed proposal and expiry, atomically create a short-lived `ai_action_nonces/{proposalId}` consumption record, load the target documents from the validated scope, recheck permissions and expected current values, then execute exactly one allowlisted mutation. Reject a second confirmation through the consumed nonce and return a conflict instead of overwriting a document changed after preview. The nonce is operational security state, not chat history, and must have a cleanup/TTL policy.

- [ ] **Step 5: Test API security paths**

Add tests for missing token, invalid scope, unauthorized account member, invalid action, expired proposal, altered arguments, wrong scope, duplicate confirmation, and successful confirmation. Assert that no test request includes `DEEPSEEK_API_KEY` in its response or browser payload.

- [ ] **Step 6: Run verification**

Run `npm run lint` and `npx vitest run app/lib/finance-agent.test.ts`. Expected: PASS.

- [ ] **Step 7: Commit API work**

```bash
git add app/routes/api/ai.agent.ts app/routes/api/ai.agent-confirm.ts app/routes.ts app/lib/api.ts app/lib/finance-agent.test.ts
git commit -m "feat: expose confirmed finance agent API"
```

---

### Task 4: Add FAB and Responsive Assistant Panel

**Files:**
- Create `app/components/FinanceAIAssistant.tsx`.
- Modify `app/routes/_app.tsx`.
- Modify `app/styles/index.css` only for styles not expressible with existing Tailwind classes.

**Interfaces:**

```ts
export function FinanceAIAssistant(): React.ReactElement;
```

- [ ] **Step 1: Add the component shell**

Mount one `FinanceAIAssistant` after `MobileBottomNav` in `AppLayout`; render nothing while unauthenticated. The FAB uses `Sparkles`, has an accessible label, and is fixed above the mobile navigation.

- [ ] **Step 2: Implement session-only conversation state**

Keep messages in component state. Reset messages when `activeScope` changes. Do not use Firestore, localStorage, sessionStorage, or a server conversation ID.

- [ ] **Step 3: Implement send and loading states**

Send the current messages and active scope to `/api/ai/agent`. Disable duplicate submits, show a clear loading state, append safe errors as assistant messages, and limit displayed input to the server’s accepted size.

- [ ] **Step 4: Implement proposal cards**

When a response contains `proposal`, render operation, entity, current values, new values, impact, and `Confirmar`/`Cancelar`. Confirm calls `/api/ai/agent-confirm`; disable both buttons during the request; remove the proposal after success or cancellation. Never execute a client-side Firestore write for an AI action.

- [ ] **Step 5: Implement responsive layout and accessibility**

Use the existing flat enterprise visual language. Desktop panel: fixed bottom/right, width `min(440px, calc(100vw - 2rem))`, bounded viewport height. Mobile panel: inset `0`, full viewport height, safe bottom padding. Use `aria-live` for assistant responses, keyboard-submit input, visible close button, focus on open, and `focus-visible` styling.

- [ ] **Step 6: Add suggestion prompts**

Use only read examples such as “Qual foi minha receita este mês?”, “Onde estou gastando mais?” and “Compare este mês com o anterior?”. Do not include a suggestion that silently implies a mutation.

- [ ] **Step 7: Run UI and type verification**

Run `npm run lint`. Expected: PASS with the FAB mounted in the authenticated layout.

- [ ] **Step 8: Commit the UI**

```bash
git add app/components/FinanceAIAssistant.tsx app/routes/_app.tsx app/styles/index.css
git commit -m "feat: add finance AI assistant panel"
```

---

### Task 5: Full Verification and Release Readiness

**Files:**
- Modify only files needed to fix failures found by the checks above.
- Add or update `README.md` with the exact Vercel variable `DEEPSEEK_API_KEY` and optional `DEEPSEEK_MODEL` setup, without including a real secret.

- [ ] **Step 1: Check secret exposure**

Run:

```bash
rg -n "DEEPSEEK_API_KEY|deepseek.com|deepseek-v4-flash" app public build
```

Expected: the key name and server endpoint appear only in server-side source; no secret value appears in tracked files or client build output.

- [ ] **Step 2: Run all tests**

Run `npm test`. Expected: all existing and new tests pass.

- [ ] **Step 3: Run typecheck and production build**

Run `npm run lint` followed by `npm run build`. Expected: both exit successfully.

- [ ] **Step 4: Verify Pluggy cleanup without data deletion**

Run:

```bash
rg -n "pluggy|Pluggy|usePluggy|IntegrationsTab" app firebase.json package.json
rtk git diff --stat HEAD~5..HEAD
```

Expected: no product code references remain; no script or commit deletes Firestore documents.

- [ ] **Step 5: Inspect worktree and commit final documentation**

Run `git status --short` and confirm the pre-existing user changes remain unstaged or otherwise untouched. Then commit only the README/documentation change:

```bash
git add README.md
git commit -m "docs: configure finance AI agent"
```

---

## Plan Self-Review

- Spec coverage: architecture, DeepSeek configuration, active-scope isolation, tool allowlist, confirmation cards, session-only history, Pluggy removal/preservation, error limits, tests, lint, and build are covered by Tasks 1-5.
- Placeholder scan: no incomplete markers or vague “handle appropriately” steps are used.
- Type consistency: `AgentMessage`, `AgentProposal`, `AgentResponse`, `validateAgentScope`, `createProposal`, and `verifyProposal` are defined in Task 2 and consumed consistently by Tasks 3-4.
- Scope check: Pluggy removal, server agent, confirmation API, and UI are independent but necessary slices of the approved single feature; each task has an isolated verification command.
