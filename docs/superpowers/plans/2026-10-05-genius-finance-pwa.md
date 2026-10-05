# Genius Finance PWA Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make Genius Finance installable as a PWA and ensure deployed frontend updates are activated without users uninstalling/reinstalling.

**Architecture:** Add a web app manifest and a narrowly scoped service worker for update lifecycle, registered only in the browser. New service worker versions activate promptly and trigger one controlled page reload; finance/API/authenticated responses are never cached. Keep deployment and React Router server behavior unchanged.

**Tech Stack:** React Router 7 SSR, Vite 6, browser Web App Manifest, Service Worker API, Vitest/Playwright.

## Global Constraints

- Never cache Firebase requests, authenticated pages, financial data, or user-specific API responses.
- No API/routing/authentication changes; no offline finance-data functionality.
- Do not place secrets or user data in the manifest/service worker.
- Preserve supported HTTPS deployment and localhost development; service workers are browser-only.
- Verify updated version behavior, lint, tests, and production build before claiming completion.

---

## File Map

- `app/root.tsx`: manifest link, mobile/web-app metadata, browser-side service-worker registration component.
- `public/manifest.webmanifest`: app name, start URL, display mode, theme/background colors, and icon references.
- `public/sw.js`: service worker lifecycle, update activation, and required non-caching fetch listener.
- `public/logo.png` or icon derivatives under `public/icons/`: install icons; inspect actual source dimensions and generate valid 192×192/512×512 PNGs from the existing logo only if needed.
- `app/lib/registerServiceWorker.ts` (or small component colocated in `app/root.tsx`): browser-only registration, update/reload coordination, typed and testable.
- `app/lib/registerServiceWorker.test.ts` or `scripts/pwa.test.ts`: unit tests using Vitest mocks for browser lifecycle behavior.
- `tests/e2e/pwa-update.spec.ts`: Playwright verification of manifest and service-worker registration/update behavior, added in the UI plan's test setup or integrated with it.

## Task 1: Confirm production static-asset serving and PWA icon inputs

**Files:** inspect `vite.config.ts`, `app/root.tsx`, `firebase.json`, `Dockerfile`, `public/icon.svg`, and `public/logo.png`; no modifications until paths are confirmed.

- [ ] Confirm Vite public asset output path and production server serves `/manifest.webmanifest` and `/sw.js` from the app origin.
- [ ] Inspect current logo dimensions and SVG content; select an existing suitable icon or produce 192×192 and 512×512 derivatives that preserve the existing brand mark.
- [ ] Confirm no existing service worker, manifest, or deploy cache rules conflict; preserve unrelated user changes.

**Verify:** document confirmed output/public paths and selected icon sources; do not make a production deployment or external change.

## Task 2: Add manifest and metadata

**Files:** `public/manifest.webmanifest`, `public/icons/*` only if resized icon files are required, `app/root.tsx`.

- [ ] Write a Vitest assertion for manifest fields and correct icon URLs before linking it in the app.
- [ ] Add manifest with `name` and `short_name` Genius Finance, `start_url: "/"`, `scope: "/"`, `display: "standalone"`, and theme/background colors matching the Light UI and existing blue brand.
- [ ] Declare valid, square 192×192 and 512×512 icons (including maskable purpose only if the artwork supports safe cropping); use the official Genius Finance logo, not the Maglo reference mark.
- [ ] Add `<link rel="manifest">`, `mobile-web-app-capable`, updated `theme-color`, and retain favicon/apple touch icon metadata.

**Verify:** manifest test passes; production build includes the manifest and each declared icon responds successfully at the app origin.

## Task 3: Service worker update lifecycle without sensitive caching

**Files:** `public/sw.js`, `app/lib/registerServiceWorker.ts` or focused registration component in `app/root.tsx`, tests under `app/lib/`.

- [ ] Add unit tests with mocked `navigator.serviceWorker` for unsupported browser, initial registration, waiting worker activation, and single reload on `controllerchange`.
- [ ] Implement a minimal versioned service worker. On install call `skipWaiting()`; on activate call `clients.claim()`; attach a fetch listener but do not `respondWith`, cache requests, or intercept Firebase/API/authenticated content.
- [ ] Register `/sw.js` from a browser-only effect after the page loads; do not access `window` or `navigator` during SSR.
- [ ] When `registration.waiting` exists or a new worker installs while the page is controlled, request activation and reload once after the controller changes; prevent duplicate reloads during React rerenders.
- [ ] Ensure browser naturally revalidates the worker script; do not use a long cache lifetime for `/sw.js` in deploy config.

**Verify:** unit tests pass; server rendering has no `window`/`navigator` errors; service worker has no Cache API calls and no `respondWith` path.

## Task 4: Browser verification and update behavior

**Files:** `tests/e2e/pwa-update.spec.ts`, `playwright.config.ts` and package setup if created by visual-refresh plan, `firebase.json` only if verified headers are needed.

- [ ] Add Playwright checks for manifest response/content, install metadata, successful service-worker registration in Chromium secure local context, and normal app navigation after controller takeover.
- [ ] Add a controlled two-version test (serve or mutate a test-only worker script between contexts) proving the second worker activates and the page reloads once; do not alter actual production deployment or Firebase hosting config without evidence.
- [ ] Verify direct navigation to `/login` and authenticated routes still renders through React Router; ensure only the worker script receives appropriate revalidation headers if configuration change is necessary.
- [ ] Run `npm run lint`, `npm test`, `npm run build`, and `npx playwright test`.
- [ ] Document browser/deployment limitations if update test cannot run in the current environment; never claim it passed without observed output.

**Verify:** installed app requests the new UI after a deployment/update cycle without reinstall; no financial/API response is stored by the service worker.

## Spec coverage check

- Installable PWA metadata/icons: Tasks 1–2.
- Service-worker update without reinstall: Tasks 3–4.
- No offline/authenticated financial cache: global constraints and Tasks 3–4.
- SSR and production asset paths: Tasks 1, 3, and 4.
- Verification: Tasks 1–4 and final lint/test/build.
