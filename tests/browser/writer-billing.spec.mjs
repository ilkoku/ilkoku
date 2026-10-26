import { readFileSync } from "node:fs";

import mysql from "mysql2/promise";
import { expect, test } from "@playwright/test";

// All writes happen on CI's disposable recovery database, never production.
// The fixture contains short-lived, synthetic writer/reader/admin identities.
const fixturePath = process.env.BROWSER_AUTH_FIXTURE_PATH;
const fixture = fixturePath ? JSON.parse(readFileSync(fixturePath, "utf8")) : null;
const cookieUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
const writerPublicId = "CI26BROWSER02";
const billingRoute = "/satis-erisim/odeme-vergi-bilgileri";
const reviewRoute = "/sistem-yonetimi/finans-gelirler/yazar-vergi-inceleme";

async function asRole(page, role) {
  const token = fixture?.sessions?.[role];
  expect(token, `Missing isolated ${role} browser session`).toBeTruthy();
  await page.context().clearCookies();
  await page.context().addCookies([
    { name: fixture.cookieName, value: token, url: cookieUrl },
  ]);
}

test("disposable writer billing declaration: persist, admin read-only view, clear and role boundary", async ({ page }) => {
  test.skip(!fixture, "Disposable authenticated browser fixture is required.");
  // Fail closed before mutating any database or author profile.
  expect(process.env.EMAIL_DELIVERY_MODE).toBe("local");
  expect(process.env.DATABASE_URL).toBe(
    "mysql://ci_user:ci_password@127.0.0.1:3307/ilkoku_recovery",
  );
  test.setTimeout(90_000);

  const db = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const [writers] = await db.execute(
      "SELECT id FROM `User` WHERE publicId = ? AND role = 'writer' AND email = ?",
      [writerPublicId, "ci-browser-writer@example.invalid"],
    );
    expect(writers).toHaveLength(1);
    const authorId = writers[0].id;

    await page.setViewportSize({ width: 390, height: 844 });
    await asRole(page, "writer");
    const response = await page.goto(billingRoute, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Fatura ve Vergi Bilgilerim" })).toBeVisible();
    await expect(page.locator('input[name="invoiceStatus"]:checked')).toHaveCount(0);

    await page.locator('input[name="invoiceStatus"][value="invoicing"]').check();
    await page.locator('input[name="billingName"]').fill("CI Writer Invoice Example");
    await page.locator('input[name="taxIdentifier"]').fill("1234567890");
    await page.locator('input[name="taxOffice"]').fill("CI Test Vergi Dairesi");
    await page.locator('textarea[name="billingAddress"]').fill(
      "CI ephemeral test address, no real person or tax document",
    );
    await page.getByRole("button", { name: "Fatura durumumu ve bilgilerimi kaydet" }).click();
    await expect(page).toHaveURL(/durum=kaydedildi/);
    await expect(page.getByText("Fatura durumun ve bilgilerin kaydedildi.")).toBeVisible();

    await page.goto(billingRoute, { waitUntil: "domcontentloaded" });
    await expect(page.locator('input[name="invoiceStatus"][value="invoicing"]')).toBeChecked();
    await expect(page.locator('input[name="billingName"]')).toHaveValue("CI Writer Invoice Example");
    await expect(page.locator('input[name="taxIdentifier"]')).toHaveValue("1234567890");

    let [profiles] = await db.execute(
      "SELECT invoiceStatus, billingName, taxIdentifier, taxOffice, billingAddress FROM `AuthorBillingProfile` WHERE authorId = ?",
      [authorId],
    );
    expect(profiles).toHaveLength(1);
    expect(profiles[0].invoiceStatus).toBe("invoicing");

    await page.goto("/gelirler", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Fatura durumum:/)).toContainText("Faturalı");
    await expect(page.getByRole("link", { name: /Fatura ve vergi bilgilerimi görüntüle veya güncelle/ })).toHaveAttribute("href", billingRoute);

    await asRole(page, "admin");
    await page.goto(`${reviewRoute}?yazar=${writerPublicId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Yazarın fatura beyanı — doğrulanmamış")).toBeVisible();
    await expect(page.getByText("Fatura unvanı: CI Writer Invoice Example")).toBeVisible();
    await expect(page.getByText("Vergi / kimlik numarası: 1234567890")).toBeVisible();

    await asRole(page, "reader");
    await page.goto(billingRoute, { waitUntil: "domcontentloaded" });
    await expect(page).toHaveURL(/\/erisim-reddedildi/);

    await asRole(page, "writer");
    await page.goto(billingRoute, { waitUntil: "domcontentloaded" });
    await page.locator('input[name="invoiceStatus"][value="non_invoicing"]').check();
    await expect(page.locator('input[name="billingName"]')).toHaveCount(0);
    await page.getByRole("button", { name: "Fatura durumumu ve bilgilerimi kaydet" }).click();
    await expect(page).toHaveURL(/durum=kaydedildi/);
    await page.goto(billingRoute, { waitUntil: "domcontentloaded" });
    await expect(page.locator('input[name="invoiceStatus"][value="non_invoicing"]')).toBeChecked();
    await expect(page.locator('input[name="billingName"]')).toHaveCount(0);

    [profiles] = await db.execute(
      "SELECT invoiceStatus, billingName, taxIdentifier, taxOffice, billingAddress FROM `AuthorBillingProfile` WHERE authorId = ?",
      [authorId],
    );
    expect(profiles).toHaveLength(1);
    expect(profiles[0].invoiceStatus).toBe("non_invoicing");
    for (const field of ["billingName", "taxIdentifier", "taxOffice", "billingAddress"]) {
      expect(profiles[0][field], `${field} must clear on non-invoicing switch`).toBeNull();
    }

    await page.goto("/gelirler", { waitUntil: "domcontentloaded" });
    await expect(page.getByText(/Fatura durumum:/)).toContainText("Faturasız");
    await asRole(page, "admin");
    await page.goto(`${reviewRoute}?yazar=${writerPublicId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Yazarın fatura beyanı — doğrulanmamış")).toBeVisible();
    await expect(page.getByText("Faturasızım", { exact: true })).toBeVisible();
    await expect(page.getByText("Fatura unvanı: CI Writer Invoice Example")).toHaveCount(0);
  } finally {
    await db.end();
  }
});
