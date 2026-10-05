import { expect, test } from "@playwright/test";

test("serves install metadata and registers the service worker", async ({ page, request }) => {
  const manifestResponse = await request.get("/manifest.webmanifest");
  expect(manifestResponse.ok()).toBe(true);
  const manifest = await manifestResponse.json();
  expect(manifest.name).toBe("Genius Finance");
  expect(manifest.display).toBe("standalone");

  for (const icon of manifest.icons) {
    expect((await request.get(icon.src)).ok()).toBe(true);
  }

  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Acesse sua conta" })).toBeVisible();

  const registration = await page.evaluate(async () => {
    const serviceWorkerRegistration = await navigator.serviceWorker.ready;
    return {
      scope: serviceWorkerRegistration.scope,
      activeScript: serviceWorkerRegistration.active?.scriptURL,
    };
  });

  expect(registration.scope).toBe("http://127.0.0.1:3000/");
  expect(registration.activeScript).toBe("http://127.0.0.1:3000/sw.js");
});

for (const width of [320, 768, 1024, 1440]) {
  test(`login has no horizontal overflow at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Acesse sua conta" })).toBeVisible();

    const hasHorizontalOverflow = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(hasHorizontalOverflow).toBe(false);
  });
}
