# Project Kanban Columns Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Persist editable `/projects` Kanban columns in Firestore, fix the project modal dropdown layering, open cards directly in edit mode, and remove the Kanban summary counters.

**Architecture:** Add a scoped `project-kanban-settings` document per personal/account workspace and expose it through `useFinance`. Keep existing `ProjectStatus` values as storage/status semantics, with customizable labels, order, visibility, and color stored as configuration. Keep the UI focused by editing columns from a compact modal and using native drag/drop consistent with the existing app.

**Tech Stack:** React Router 7, TypeScript, React, Firebase Firestore, Tailwind CSS, lucide-react.

---

### Task 1: Column settings model and normalization

**Files:**
- Modify: `app/types.ts`
- Create: `app/lib/projectKanbanColumns.ts`
- Create: `scripts/project-kanban-columns.test.ts`

- [ ] Write a failing assertion script for default settings, normalization, reorder, rename, hide, and restore behavior.
- [ ] Run `npx tsx scripts/project-kanban-columns.test.ts` and confirm it fails because the module/types do not exist.
- [ ] Add `ProjectKanbanColumn`, `ProjectKanbanSettings`, defaults, and pure helper functions.
- [ ] Run the assertion script and `npm run lint`.

### Task 2: Firestore persistence in finance context

**Files:**
- Modify: `app/types.ts`
- Modify: `app/hooks/useFinance.tsx`
- Modify: `app/lib/pathAdapter.ts`
- Modify if needed: `firestore.rules`

- [ ] Add `projectKanbanSettings`, `projectKanbanColumns`, and `updateProjectKanbanSettings` to `FinanceContextState`.
- [ ] Subscribe to a `project-kanban-settings/default` document under the current personal/account scope.
- [ ] Normalize missing/partial settings to default columns on read.
- [ ] Persist partial updates with `writeBatch`, `serverTimestamp`, and `handleFirestoreError`.
- [ ] Run `npm run lint`.

### Task 3: Editable Kanban columns UI

**Files:**
- Modify: `app/components/ProjectKanban.tsx`
- Create: `app/components/ProjectKanbanColumnsModal.tsx`
- Modify: `app/components/ProjectsView.tsx`

- [ ] Replace hard-coded `COLUMNS` with persisted visible columns from context.
- [ ] Remove the summary bar above the columns.
- [ ] Make the whole project card click open `ProjectModal` in edit mode while preserving drag and menu interactions.
- [ ] Add `Editar colunas` action near Kanban controls.
- [ ] Build column editor modal with rename, drag reorder, hide/show, color, reset defaults.
- [ ] Persist changes through `updateProjectKanbanSettings`.
- [ ] Run `npm run lint`.

### Task 4: Modal dropdown layering fix

**Files:**
- Modify: `app/components/ProjectModal.tsx`

- [ ] Render service type and lead dropdown menus as `fixed` panels using button measurements.
- [ ] Keep click-outside behavior and search behavior.
- [ ] Ensure dropdown z-index is above modal body/footer and not clipped by scroll.
- [ ] Run `npm run lint` and `npm run build`.
