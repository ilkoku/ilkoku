import { readFileSync } from "node:fs";
import { readFile } from "node:fs/promises";
import path from "node:path";

import mysql from "mysql2/promise";
import { expect, test } from "@playwright/test";

// Production accounts must never be used by this test. The fixtures and local
// email transport are created solely on the disposable MariaDB CI instance.
const fixtureFile = process.env.BROWSER_AUTH_FIXTURE_PATH;
const fixture = fixtureFile ? JSON.parse(readFileSync(fixtureFile, "utf8")) : null;
const cookieUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
const recipientEmail = "ci-browser-reader@example.invalid";

async function asRole(page, role) {
  const token = fixture?.sessions?.[role];
  expect(token, `Missing isolated ${role} session`).toBeTruthy();
  await page.context().clearCookies();
  await page.context().addCookies([
    { name: fixture.cookieName, value: token, url: cookieUrl },
  ]);
}

async function sendFreshReaderContract(page, note) {
  await asRole(page, "admin");
  await page.goto("/sozlesme", { waitUntil: "domcontentloaded" });
  await page.locator("select").filter({
    has: page.locator('option[value="reader"]'),
  }).selectOption("reader");
  await page.locator('select[name="recipientUserId"]').selectOption({
    label: `CI reader · ${recipientEmail}`,
  });
  await page.locator('select[name="templateId"]').selectOption({
    label: "CI Browser Reader Contract · v1",
  });
  await page.locator('textarea[name="adminNote"]').fill(note);
  await expect(page.getByRole("button", { name: "Sözleşmeyi gönder" })).toBeEnabled();
  await page.locator('input[name="dispatchConfirmed"]').check();
  await page.getByRole("button", { name: "Sözleşmeyi gönder" }).click();
  await expect(page).toHaveURL(/\/sozlesme\?durum=gonderildi&sozlesme=/);
  const id = new URL(page.url()).searchParams.get("sozlesme");
  expect(id).toMatch(/^[0-9a-f-]{36}$/i);
  return id;
}

async function contractEvents(db, contractId) {
  const [rows] = await db.execute(
    "SELECT eventType, metadata FROM UserContractEvent WHERE contractId = ? ORDER BY createdAt, id",
    [contractId],
  );
  return rows;
}

async function contractStatus(db, contractId) {
  const [rows] = await db.execute(
    "SELECT status, activeKey FROM UserContract WHERE id = ?",
    [contractId],
  );
  expect(rows).toHaveLength(1);
  return rows[0];
}

test("disposable contract E2E: send, secure reminder, daily dedupe, rejection, reissue, cancellation and audit", async ({ page }) => {
  test.skip(!fixture, "No isolated browser-auth fixture");
  // Fail closed even if somebody tries to run this against production.
  expect(process.env.EMAIL_DELIVERY_MODE).toBe("local");
  expect(process.env.DATABASE_URL).toMatch(/^mysql:\/\/ci_user:ci_password@127\.0\.0\.1:3307\/ilkoku_recovery$/);
  test.setTimeout(120_000);

  const db = await mysql.createConnection(process.env.DATABASE_URL);
  try {
    const privateNote = "CI PRIVATE ADMIN NOTE - must not appear in outbound mail";
    const rejectedId = await sendFreshReaderContract(page, privateNote);
    await page.goto(`/sozlesme/${rejectedId}`, { waitUntil: "domcontentloaded" });

    // No side effects until the administrator checks the explicit confirmation.
    await expect(page.locator('input[name="reminderConfirmed"]')).not.toBeChecked();
    await page.locator('input[name="reminderConfirmed"]').check();
    await page.getByRole("button", { name: "Hatırlatma gönder" }).click();
    await expect(page).toHaveURL(new RegExp(`/sozlesme/${rejectedId}\\?durum=reminder_sent$`));
    await expect(page.getByText("Admin hatırlatma gönderdi")).toBeVisible();
    await expect(page.getByText("Hatırlatma e-postası teslimata verildi")).toBeVisible();

    // Same contract and Istanbul calendar day: no second email or in-app reminder.
    await page.locator('input[name="reminderConfirmed"]').check();
    await page.getByRole("button", { name: "Hatırlatma gönder" }).click();
    await expect(page).toHaveURL(new RegExp(`/sozlesme/${rejectedId}\\?durum=already_reminded$`));
    const eventsBeforeResponse = await contractEvents(db, rejectedId);
    expect(eventsBeforeResponse.filter((event) => event.eventType === "reminder_requested")).toHaveLength(1);
    const transports = eventsBeforeResponse.filter((event) => event.eventType === "reminder_email_sent");
    expect(transports).toHaveLength(1);

    // Prove the isolated local transport persisted ONE successful email record,
    // with the target contract deep-link and without the private admin note.
    const { deliveryId } = JSON.parse(transports[0].metadata);
    expect(deliveryId).toBeTruthy();
    const [deliveries] = await db.execute(
      "SELECT template, deliveryMode, status, providerMessageId FROM EmailDelivery WHERE id = ?",
      [deliveryId],
    );
    expect(deliveries).toHaveLength(1);
    expect(deliveries[0].template).toBe("user_contract_reminder");
    expect(deliveries[0].deliveryMode).toBe("local");
    expect(deliveries[0].status).toBe("sent");
    const savedOutbox = JSON.parse(await readFile(path.join(
      process.env.EMAIL_OUTBOX_DIR ?? "/tmp/ilkoku-mail-outbox",
      deliveries[0].providerMessageId,
    ), "utf8"));
    expect(savedOutbox.to).toBe(recipientEmail);
    expect(savedOutbox.text).toContain(`/sozlesmelerim/${rejectedId}`);
    expect(savedOutbox.text).not.toContain(privateNote);
    expect(savedOutbox.text).not.toContain("CI browser mutation acceptance fixture.");

    await asRole(page, "reader");
    await page.goto(`/sozlesmelerim/${rejectedId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("button", { name: "Reddet" })).toBeVisible();
    await page.locator('textarea[name="responseNote"]').fill("CI reader rejection");
    await page.locator('input[name="responseConfirmed"]').check();
    await page.getByRole("button", { name: "Reddet" }).click();
    await expect(page).toHaveURL(new RegExp(`/sozlesmelerim/${rejectedId}\\?durum=rejected$`));
    await expect(page.getByText("Sözleşme ret kararınız kaydedildi.")).toBeVisible();
    await expect(page.getByText("Sözleşme durumu: Reddedildi")).toBeVisible();
    await expect(page.getByRole("button", { name: "Kabul et" })).toHaveCount(0);

    await asRole(page, "admin");
    await page.goto(`/sozlesme/${rejectedId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Kullanıcı reddetti")).toBeVisible();
    await expect(page.getByText("CI reader rejection")).toBeVisible();
    await expect(page.getByRole("button", { name: "Hatırlatma gönder" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Aktif sözleşmeyi iptal et" })).toHaveCount(0);
    expect((await contractStatus(db, rejectedId)).status).toBe("rejected");
    expect((await contractStatus(db, rejectedId)).activeKey).toBeNull();

    // Terminal response must release active assignment; another separate
    // contract can then be created and explicitly cancelled by an admin.
    const cancelledId = await sendFreshReaderContract(page, "CI cancellation test");
    expect(cancelledId).not.toBe(rejectedId);
    await page.goto(`/sozlesme/${cancelledId}`, { waitUntil: "domcontentloaded" });
    await expect(page.locator('input[name="cancelConfirmed"]')).not.toBeChecked();
    await page.locator('textarea[name="reason"]').fill("CI browser cancellation");
    await page.locator('input[name="cancelConfirmed"]').check();
    await page.getByRole("button", { name: "Aktif sözleşmeyi iptal et" }).click();
    await expect(page).toHaveURL(new RegExp(`/sozlesme/${cancelledId}\\?durum=cancelled$`));
    await expect(page.getByText("Admin iptal etti")).toBeVisible();
    await expect(page.getByText("Gerekçe: CI browser cancellation")).toBeVisible();
    await expect(page.getByRole("button", { name: "Hatırlatma gönder" })).toHaveCount(0);
    expect((await contractStatus(db, cancelledId)).status).toBe("cancelled");
    expect((await contractStatus(db, cancelledId)).activeKey).toBeNull();

    await asRole(page, "reader");
    await page.goto(`/sozlesmelerim/${cancelledId}`, { waitUntil: "domcontentloaded" });
    await expect(page.getByText("Sözleşme durumu: İptal edildi")).toBeVisible();
    await expect(page.getByRole("button", { name: "Kabul et" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "Reddet" })).toHaveCount(0);
    const finalEvents = await contractEvents(db, cancelledId);
    expect(finalEvents.map((event) => event.eventType)).toContain("cancelled");
  } finally {
    await db.end();
  }
});
