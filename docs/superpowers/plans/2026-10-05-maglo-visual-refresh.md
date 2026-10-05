# Maglo Visual Refresh Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Adapt Genius Finance screens to the Light Maglo visual reference while preserving current routes, finance logic, permissions, and responsive behavior.

**Architecture:** Keep React Router 7, Tailwind, and existing Astryx dependencies. Establish visual tokens and shared-shell patterns first, then migrate representative screens and apply the patterns to remaining route components in small batches. Use Playwright to verify responsive navigation and representative workflows.

**Tech Stack:** React 19, React Router 7, Tailwind CSS 4, Astryx 0.5.1, Vitest, Playwright.

## Global Constraints

- Follow `AGENTS.md`: run `npx astryx build "<idea>"` before UI changes; read `npx astryx docs layout`; no raw `<div>`/`<span>` layout, inline styles, imported CSS, or arbitrary values; use available Astryx components and token-backed utilities.
- Use only the Light references in `TELA/light`; `TELA/black` is out of scope. Keep the Genius Finance blue as the primary brand color; do not use Maglo lime/green as the primary color.
- Preserve existing routes, Firebase behavior, permissions, financial calculations, and user data.
- Keep changes focused; do not redesign unrelated business workflows or introduce speculative abstractions.
- At completion run `npm run lint`, `npm test`, `npm run build`, and Playwright tests.

---

## File Map

- `app/styles/index.css`: shared color/typography/layout tokens and responsive base styles.
- `app/routes/_app.tsx`: authenticated application shell and navigation.
- `app/components/Header.tsx`, `app/components/MobileBottomNav.tsx`: shared header and mobile navigation.
- `app/routes/_app.tsx`: contains `SidebarSection`, `SidebarItem`, and primary navigation; there is no separate Sidebar component.
- `app/components/DashboardCards.tsx`, `app/components/DashboardAlerts.tsx`, `app/components/DashboardCharts.tsx`, `app/components/TransactionTable.tsx`, `app/components/SettingsView.tsx`: representative view content.
- `app/routes/_app.dashboard.tsx`, `app/routes/_app.settings.tsx`, new `app/routes/_app.transactions.tsx`, and `app/routes.ts`: dashboard/settings imports and new transaction-list route.
- `app/components/*View.tsx` and route components under `app/routes/`: remaining screens, update in route batches after shared patterns settle.
- `package.json`, `package-lock.json`, `playwright.config.ts`, `tests/e2e/*`: Playwright test setup and smoke coverage if no existing Playwright setup is present.
- `TELA/light/*.png`: visual comparison references only; never render these screenshots as live app screens.

## Task 1: Baseline and visual-system discovery

**Files:** no app files modified; inspect `AGENTS.md`, `app/styles/index.css`, `_app.tsx`, shared components, route views, and `TELA/light/*.png`.

- [ ] Run `npx astryx build "financial management dashboard inspired by the Light Maglo screens, adapted to Genius Finance routes"` and retain the returned kit for component discovery.
- [ ] Run `npx astryx docs layout` and `npx astryx docs tokens`; query `npx astryx component <Name>` for each Astryx component selected for the shell.
- [ ] Record current route-to-view imports and callers for any shared component/token that will change; note current functionality and existing mobile breakpoints.
- [ ] Run baseline `npm run lint`, `npm test`, and `npm run build`; record existing failures separately rather than attributing them to the redesign.

**Verify:** all baseline commands complete or their pre-existing failures are recorded; component dependencies are mapped before shared changes.

## Task 2: Shared Light visual foundation and shell

**Files:** `app/styles/index.css`, `app/routes/_app.tsx`, `app/components/Header.tsx`, `app/components/MobileBottomNav.tsx`, and the actual sidebar component identified in Task 1.

- [ ] Add or adjust a focused unit test for any extracted pure navigation/title behavior before changing it; do not change public contracts just to add tests.
- [ ] Implement the Light Maglo layout and typography using the project token system while retaining the existing Genius Finance blue primary; keep status colors semantically distinct and text contrast readable.
- [ ] Restyle the authenticated desktop shell (sidebar, page header, content gutters) to match `TELA/light/Dashboard.png`; retain existing route entries, scope switch, selected month controls, and permissions.
- [ ] Restyle the mobile shell and bottom navigation; ensure safe-area padding, clear active indication, accessible names, keyboard focus, and no horizontal overflow at 320px.
- [ ] Add accessible labels to icon-only controls in touched shell files and retain visible focus/disabled/loading states.

**Verify:** unit tests pass; `npm run lint` and `npm run build` pass; manual/browser review at 320, 768, 1024, and 1440 CSS px shows no shell overflow and current navigation still works.

## Task 3: Dashboard, transactions route, and settings reference screens

**Files:** `app/routes/_app.dashboard.tsx`, `app/routes/_app.settings.tsx`, `app/routes/_app.transactions.tsx` (new), `app/routes.ts`, `app/routes/_app.tsx`, `app/components/DashboardCards.tsx`, `app/components/DashboardAlerts.tsx`, `app/components/DashboardCharts.tsx`, `app/components/TransactionTable.tsx`, `app/components/SettingsView.tsx`.

- [ ] Add or extend focused tests for formatting/filtering or rendering behavior where testable without Firebase; do not snapshot the full page as the only assertion.
- [ ] Adapt dashboard hierarchy, summary widgets, charts, and recent-activity presentation to `TELA/light/Dashboard.png`, using Genius Finance data and existing chart logic.
- [ ] Adapt transaction listing to the visual language of `TELA/light/Transactions.png`; keep existing sorting, filtering, modal actions, and make dense rows usable on narrow screens (responsive columns or intentional row layout, not clipped overflow).
- [ ] Add the user-approved missing `/transactions` route; reuse `TransactionTable` with appropriate page title/list settings rather than duplicating data or financial logic. Register it in `app/routes.ts` and verify every `/transactions` link/title caller.
- [ ] Adapt settings form hierarchy to `TELA/light/Settings.png`; preserve all existing save/auth behavior and form validation.
- [ ] Provide meaningful loading/error/empty states in touched screens if missing, without changing API contracts.

**Verify:** relevant Vitest tests, lint, and build pass; sidebar and mobile navigation both reach `/transactions`; representative interactions still work; compare desktop and mobile screenshots with supplied references.

## Task 4: Apply shared patterns to remaining existing routes

**Files:** relevant existing components in `app/components/*View.tsx` and route wrappers under `app/routes/`; edit only routes shown to have a visual or responsive gap.

- [ ] Inventory all `/_app.*` route-to-view pairs and classify screens as table, form, report/chart, or settings; identify callers before touching shared components.
- [ ] Apply the established spacing, typography, color, surface, heading, and responsive patterns in small page-family batches; preserve domain-specific controls and content.
- [ ] Fix concrete overflow, inaccessible control, and missing state defects discovered in those files; do not silently expand into unrelated logic or Firebase/rules changes.
- [ ] Validate modified shared component callers and route-level behavior after each batch.

**Verify:** route inventory has no unreviewed authenticated page; lint, tests, build, and visual checks pass for each modified batch.

## Task 5: Playwright responsive and workflow smoke tests

**Files:** `package.json`, `package-lock.json`, `playwright.config.ts`, `tests/e2e/authenticated-shell.spec.ts`, `tests/e2e/responsive.spec.ts` (adapt filenames to existing conventions if Playwright config already exists).

- [ ] Check whether `@playwright/test` and a browser are already available; if absent, add `@playwright/test` as a dev dependency and install Chromium with `npx playwright install chromium` (do not alter production dependencies).
- [ ] Configure Playwright to run the local React Router app; use a deterministic test account/seed or mock Firebase at the boundary, never a real production account.
- [ ] Write role/label-based smoke assertions for login-to-dashboard or authenticated shell with test fixture, navigation to transactions/settings, and mobile bottom-nav visibility.
- [ ] Assert horizontal document overflow is absent at 320, 768, 1024, and 1440 CSS px; capture screenshots for review without making screenshots the only oracle.
- [ ] Run Playwright suite and correct only regressions attributable to the refresh.

**Verify:** `npx playwright test` passes locally; if auth setup/environment blocks execution, report exact blocker and keep deterministic tests ready to run.

## Spec coverage check

- Light-only Maglo visual adaptation: Tasks 1–4.
- Preserve existing routes/data/business logic and add the user-approved missing `/transactions` destination: Tasks 2–4 and caller inventory.
- Responsive behavior/accessibility/loading/error/empty states: Tasks 2–5.
- Playwright workflow checks: Task 5.
- Lint, tests, build: Tasks 1–5 and final verification.
- PWA is intentionally covered by the separate plan `2026-10-05-genius-finance-pwa.md`.
