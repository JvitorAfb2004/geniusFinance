import { expect, test } from "@playwright/test";
import path from "node:path";

// Geração dos prints da landing com a conta demo (dados de teste).
// Execução manual: PRINTS=1 PRINTS_EMAIL=... PRINTS_PASSWORD=... npx playwright test prints
// Não roda no CI nem junto da suite padrão.
test.describe("landing prints", () => {
  test.skip(
    process.env.PRINTS !== "1" || !process.env.PRINTS_EMAIL || !process.env.PRINTS_PASSWORD,
    "prints exigem PRINTS=1 com credenciais da conta demo",
  );

  const shots: Array<{ route: string; title: string; file: string }> = [
    { route: "/dashboard", title: "Visão Geral", file: "dashboard.png" },
    { route: "/transactions", title: "Entradas / Saídas", file: "entradaesaida.png" },
    { route: "/dre", title: "DRE", file: "DRE.png" },
    { route: "/projects", title: "Projetos", file: "projetos.png" },
    { route: "/fixed-monthly", title: "Fixos Mensais", file: "fixosmensais.png" },
    { route: "/spending-limits", title: "Limites", file: "limites.png" },
    { route: "/goals", title: "Metas", file: "metas.png" },
    { route: "/commercial", title: "Leads", file: "vendas.png" },
    { route: "/reports", title: "Relatórios Anuais", file: "relatorio.png" },
  ];

  test("captura telas da conta demo", async ({ page }) => {
    test.setTimeout(180_000);
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto("/login");
    await page.getByPlaceholder("Email").fill(process.env.PRINTS_EMAIL!);
    await page.getByPlaceholder("Senha").first().fill(process.env.PRINTS_PASSWORD!);
    await page.getByRole("checkbox").check();
    await page.getByRole("button", { name: "Entrar com email" }).click();
    await page.waitForURL("**/dashboard", { timeout: 30_000 });

    for (const shot of shots) {
      await page.goto(shot.route);
      await expect(page.locator("h1", { hasText: shot.title })).toBeVisible({ timeout: 30_000 });
      await page.waitForTimeout(3_000);
      await page.screenshot({ path: path.resolve("public/prints", shot.file) });
    }
  });
});
