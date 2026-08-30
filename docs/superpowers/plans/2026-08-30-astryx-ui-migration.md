# Astryx UI Migration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adopt Astryx visual primitives and theme tokens across the existing Genius Finance UI without changing layout, behavior, routes, or data flows.

**Architecture:** Add Astryx's global reset/theme alongside the existing Tailwind layer, then migrate shared primitives before page-specific components. Keep business logic in place and replace only visual markup/classes, validating each migration batch with the existing typecheck, tests, build, and visual checks.

**Tech Stack:** React 19, React Router 7, Tailwind CSS 4, `@astryxdesign/core`, `@stylexjs/stylex`, `@astryxdesign/theme-neutral`, `@astryxdesign/cli`, Vitest.

## Global Constraints

- Preserve the current layout: sidebar, header, cards, tables, modals, FAB, and mobile navigation.
- Do not alter routes, API contracts, Firebase, permissions, financial rules, or navigation structure.
- Maintain desktop and mobile behavior.
- Preserve focus, hover, disabled, error, and loading states.
- Keep Tailwind during migration; remove only styles or dependencies proven unused.
- Do not overwrite existing user changes in `app/components/TransactionModal.tsx` or `app/hooks/useFinance.tsx`.
- Use Astryx imports by category subpath.

---

### Task 1: Install And Configure Astryx

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Modify: `app/styles/index.css`
- Create: `AGENTS.md` only if `astryx init` creates it and it is not already present

**Interfaces:**
- Produces the Astryx theme CSS and package imports consumed by all later tasks.

- [ ] **Step 1: Inspect existing package and CSS configuration**

Run:

```bash
npm ls react react-dom tailwindcss
```

Expected: React 19 and the existing Tailwind setup are present.

- [ ] **Step 2: Install the documented Astryx packages**

Run:

```bash
npm install @astryxdesign/core @stylexjs/stylex @astryxdesign/theme-neutral @astryxdesign/cli
npx astryx init
```

- [ ] **Step 3: Add cascade-safe CSS imports**

At the top of `app/styles/index.css`, add the Astryx reset, base stylesheet, and neutral theme before the existing Tailwind import. Preserve the existing token definitions until migration is complete.

- [ ] **Step 4: Verify the setup**

Run:

```bash
npm run lint
npm run build
```

Expected: TypeScript and production build pass without browser/server import errors.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json app/styles/index.css AGENTS.md
git commit -m "chore: add Astryx design system"
```

### Task 2: Migrate Shared Controls And Containers

**Files:**
- Modify: `app/components/ConfirmModal.tsx`
- Modify: `app/components/Header.tsx`
- Modify: `app/components/MobileBottomNav.tsx`
- Modify: `app/components/ScopeSwitchModal.tsx`
- Modify: `app/components/PermissionsModal.tsx`
- Modify: `app/components/LegalModal.tsx`

**Interfaces:**
- Consumes Astryx theme from Task 1.
- Produces consistent button, dialog, input, surface, and layout usage for later page migrations.

- [ ] **Step 1: Add a focused regression test for modal behavior**

Extend the existing test setup with a test that confirms the confirm and cancel callbacks remain separate and that the supplied labels are rendered. Do not change callback signatures.

- [ ] **Step 2: Run the focused test before implementation**

Run:

```bash
npm test -- app/components/ConfirmModal.test.tsx
```

Expected: the test passes for existing behavior or fails only if the test file does not exist, in which case use the nearest existing component test convention.

- [ ] **Step 3: Replace visual primitives with Astryx components**

Use `Button`, `Card`/surface primitives, `Dialog`/modal primitives, `Input`, and layout primitives from `@astryxdesign/core` by subpath. Keep the current DOM responsibilities, labels, handlers, and responsive classes where Astryx does not provide an equivalent.

- [ ] **Step 4: Verify shared components**

Run:

```bash
npm run lint
npm test
```

Expected: all existing tests pass and no route or interaction types change.

- [ ] **Step 5: Commit**

```bash
git add app/components/ConfirmModal.tsx app/components/Header.tsx app/components/MobileBottomNav.tsx app/components/ScopeSwitchModal.tsx app/components/PermissionsModal.tsx app/components/LegalModal.tsx
git commit -m "refactor: migrate shared controls to Astryx"
```

### Task 3: Migrate Finance Assistant And Dashboard Primitives

**Files:**
- Modify: `app/components/FinanceAIAssistant.tsx`
- Modify: `app/components/DashboardCards.tsx`
- Modify: `app/components/DashboardAlerts.tsx`
- Modify: `app/components/DashboardCharts.tsx`
- Modify: `app/components/TransactionTable.tsx`

**Interfaces:**
- Consumes shared Astryx controls from Task 2.
- Preserves `AgentMessage`, proposal confirmation, Markdown rendering, and finance hook contracts.

- [ ] **Step 1: Add regression coverage for confirmation presentation**

Test the pure confirmation helpers in `app/lib/finance-agent.test.ts`: technical IDs remain hidden, Portuguese labels remain visible, and completion content is exactly `Concluído.`.

- [ ] **Step 2: Run the focused tests and confirm the baseline**

Run:

```bash
npm test -- app/lib/finance-agent.test.ts
```

Expected: the focused tests pass before visual-only changes.

- [ ] **Step 3: Migrate the assistant and dashboard surfaces**

Use Astryx surface, button, input, badge, table, and layout primitives while preserving the current fixed FAB/panel geometry, Markdown table overflow, responsive dashboard grid, and all event handlers. Keep technical IDs hidden in confirmation cards.

- [ ] **Step 4: Verify assistant and dashboard behavior**

Run:

```bash
npm run lint
npm test
npm run build
```

Expected: all tests pass, production build succeeds, and the AI assistant remains usable on desktop and mobile.

- [ ] **Step 5: Commit**

```bash
git add app/components/FinanceAIAssistant.tsx app/components/DashboardCards.tsx app/components/DashboardAlerts.tsx app/components/DashboardCharts.tsx app/components/TransactionTable.tsx app/lib/finance-agent.test.ts
git commit -m "refactor: apply Astryx to finance dashboard"
```

### Task 4: Migrate Feature Pages And Forms

**Files:**
- Modify: `app/components/TransactionModal.tsx` carefully, only if the user changes are preserved
- Modify: `app/components/BudgetView.tsx`
- Modify: `app/components/GoalsView.tsx`
- Modify: `app/components/ReportsView.tsx`
- Modify: `app/components/DREView.tsx`
- Modify: `app/components/CashCalendarView.tsx`
- Modify: `app/components/FixedMonthlyView.tsx`
- Modify: `app/components/MonthlyClosingView.tsx`
- Modify: `app/components/SpendingLimitsView.tsx`
- Modify: `app/components/SalesView.tsx`
- Modify: `app/components/ServiceTypesView.tsx`

**Interfaces:**
- Consumes shared controls and theme from Tasks 1-3.
- Preserves existing hook calls, form payloads, chart data, and mutation confirmation flows.

- [ ] **Step 1: Record the current behavior baseline**

Run:

```bash
npm test
npm run build
```

Save no generated output; use the commands as the baseline for comparison.

- [ ] **Step 2: Migrate one page group at a time**

Replace repeated cards, fields, buttons, tabs, tables, empty states, and loading states with Astryx equivalents. Do not change data transformation or event handler code. Before touching `TransactionModal.tsx`, inspect and preserve all existing unstaged user changes.

- [ ] **Step 3: Verify after each page group**

Run:

```bash
npm run lint
npm test
```

Expected: no regression after each group.

- [ ] **Step 4: Commit the page migration**

```bash
git add app/components
git commit -m "refactor: migrate finance pages to Astryx"
```

### Task 5: Migrate Remaining Administrative And Commercial UI

**Files:**
- Modify: `app/components/CommercialView.tsx`
- Modify: `app/components/ProjectsView.tsx`
- Modify: `app/components/ProjectKanban.tsx`
- Modify: `app/components/ProjectModal.tsx`
- Modify: `app/components/ProjectKanbanColumnsModal.tsx`
- Modify: `app/components/SettingsView.tsx`
- Modify: `app/components/SubscriptionView.tsx`
- Modify: `app/components/AdminPlansView.tsx`
- Modify: `app/components/AdminSubscriptionsView.tsx`
- Modify: `app/components/AdminReportsView.tsx`
- Modify: `app/components/ReportIssueView.tsx`
- Modify: `app/components/LoginEmailForm.tsx`
- Modify: `app/components/TrialModal.tsx`

**Interfaces:**
- Consumes the same Astryx primitives and tokens as Tasks 2-4.
- Preserves admin permissions, subscription behavior, form validation, and project interactions.

- [ ] **Step 1: Identify repeated visual primitives**

Search the group for repeated Tailwind patterns:

```bash
rg "clay|clay-btn|rounded|border|bg-primary|focus:" app/components
```

- [ ] **Step 2: Replace only presentation markup**

Migrate dialogs, forms, buttons, cards, tables, and navigation affordances. Keep all API calls, form state, permission checks, and confirmation labels unchanged.

- [ ] **Step 3: Verify the administrative group**

Run:

```bash
npm run lint
npm test
npm run build
```

- [ ] **Step 4: Commit**

```bash
git add app/components
git commit -m "refactor: migrate remaining UI to Astryx"
```

### Task 6: Remove Only Proven Visual Duplication And Finish Verification

**Files:**
- Modify: `app/styles/index.css`
- Modify: `package.json` only if a dependency is proven unused
- Modify: `package-lock.json` only when package metadata changes

**Interfaces:**
- Produces the final theme cascade and leaves no required component dependent on removed styles.

- [ ] **Step 1: Search for remaining legacy-only classes**

Run:

```bash
rg "clay|clay-btn|clay-input" app
```

Remove a legacy class only after all references have been migrated and its visual behavior is covered by Astryx or retained CSS.

- [ ] **Step 2: Run the complete verification suite**

Run:

```bash
npm run lint
npm test
npm run build
git diff --check
```

Expected: lint passes, all tests pass, production build succeeds, and there are no whitespace errors.

- [ ] **Step 3: Perform visual checks**

Inspect the dashboard, assistant, one form, one table, one modal, mobile navigation, and an admin page at desktop and mobile widths. Confirm no layout shifts, clipped controls, unreadable contrast, or missing focus states.

- [ ] **Step 4: Commit and push**

```bash
git status
git log --oneline -5
git add app package.json package-lock.json
git commit -m "refactor: complete Astryx UI migration"
git push origin main
```
