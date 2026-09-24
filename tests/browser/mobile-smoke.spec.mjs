import { readFileSync } from "node:fs";

import { expect, test } from "@playwright/test";

const viewports = {
  phone390: { width: 390, height: 844 },
  phone430: { width: 430, height: 932 },
  tablet768: { width: 768, height: 1024 },
  desktop: { width: 1440, height: 900 },
};

async function expectResponsiveDocument(page) {
  await expect(page.locator("body")).toBeVisible();

  const overflowState = await page.evaluate(() => {
    const root = document.documentElement;
    const viewportWidth = root.clientWidth;
    const offenders = [...document.querySelectorAll("*")]
      .map((element) => {
        const rect = element.getBoundingClientRect();
        return {
          className:
            typeof element.className === "string" ? element.className : "",
          left: Math.round(rect.left),
          right: Math.round(rect.right),
          scrollWidth: element.scrollWidth,
          tag: element.tagName.toLowerCase(),
          width: Math.round(rect.width),
        };
      })
      .filter(
        (item) =>
          item.right > viewportWidth + 1 ||
          item.left < -1 ||
          item.scrollWidth > Math.max(item.width + 1, viewportWidth + 1),
      )
      .sort((a, b) => Math.max(b.right - viewportWidth, b.scrollWidth - b.width) - Math.max(a.right - viewportWidth, a.scrollWidth - a.width))
      .slice(0, 12);

    return {
      horizontalOverflow: root.scrollWidth - root.clientWidth,
      offenders,
      scrollWidth: root.scrollWidth,
      viewportWidth,
    };
  });

  expect(
    overflowState.horizontalOverflow,
    `Horizontal overflow diagnostics: ${JSON.stringify(overflowState)}`,
  ).toBeLessThanOrEqual(1);
}

const publicCases = [
  { label: "390px homepage", path: "/", viewport: viewports.phone390 },
  { label: "390px login", path: "/giris", viewport: viewports.phone390 },
  { label: "390px register", path: "/kayit", viewport: viewports.phone390 },
  { label: "430px homepage", path: "/", viewport: viewports.phone430 },
  { label: "430px login", path: "/giris", viewport: viewports.phone430 },
  { label: "430px register", path: "/kayit", viewport: viewports.phone430 },
  { label: "768px homepage", path: "/", viewport: viewports.tablet768 },
  { label: "768px login", path: "/giris", viewport: viewports.tablet768 },
  { label: "768px register", path: "/kayit", viewport: viewports.tablet768 },
  { label: "desktop homepage", path: "/", viewport: viewports.desktop },
  { label: "desktop login", path: "/giris", viewport: viewports.desktop },
  { label: "desktop register", path: "/kayit", viewport: viewports.desktop },
];

for (const scenario of publicCases) {
  test(`public responsive smoke: ${scenario.label}`, async ({ page }) => {
    await page.setViewportSize(scenario.viewport);

    const response = await page.goto(scenario.path, {
      waitUntil: "domcontentloaded",
    });

    expect(response?.status()).toBe(200);
    await expectResponsiveDocument(page);
  });
}

const protectedCases = [
  {
    label: "reader workspace",
    path: "/kesfet",
    viewport: viewports.phone390,
  },
  {
    label: "writer workspace",
    path: "/yazar",
    viewport: viewports.phone430,
  },
  {
    label: "editor workspace",
    path: "/editor/kesfet",
    viewport: viewports.tablet768,
  },
  {
    label: "publisher workspace",
    path: "/yayinevi",
    viewport: viewports.desktop,
  },
  {
    label: "admin workspace",
    path: "/admin",
    viewport: viewports.phone390,
  },
  {
    label: "CMS workspace",
    path: "/icerik",
    viewport: viewports.tablet768,
  },
];

for (const scenario of protectedCases) {
  test(`auth boundary smoke: ${scenario.label}`, async ({ page }) => {
    await page.setViewportSize(scenario.viewport);

    await page.goto(scenario.path, {
      waitUntil: "domcontentloaded",
    });

    await expect(page).toHaveURL(/\/giris(?:\?|$)/);
    await expectResponsiveDocument(page);
  });
}

const authFixturePath = process.env.BROWSER_AUTH_FIXTURE_PATH;
const authFixture = authFixturePath
  ? JSON.parse(readFileSync(authFixturePath, "utf8"))
  : null;
const authCookieUrl =
  process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";

if (process.env.CI && !authFixture) {
  throw new Error(
    "BROWSER_AUTH_FIXTURE_PATH is required for authenticated browser QA in CI.",
  );
}

const authenticatedCases = [
  {
    label: "reader workspace",
    path: "/kesfet",
    role: "reader",
    viewport: viewports.phone390,
  },
  {
    label: "writer workspace",
    path: "/yazar",
    role: "writer",
    viewport: viewports.phone430,
  },
  {
    label: "editor workspace",
    path: "/editor/kesfet",
    role: "editor",
    viewport: viewports.tablet768,
  },
  {
    label: "publisher workspace",
    path: "/yayinevi",
    role: "publisher",
    viewport: viewports.desktop,
  },
  {
    label: "admin workspace",
    path: "/admin",
    role: "admin",
    viewport: viewports.phone390,
  },
  {
    label: "CMS manager workspace",
    path: "/icerik",
    role: "cmsManager",
    viewport: viewports.tablet768,
  },
  {
    label: "TR SEO operations as CMS manager",
    path: "/icerik/seo",
    role: "cmsManager",
    viewport: viewports.tablet768,
  },
  {
    label: "architecture control center",
    path: "/harita",
    role: "admin",
    viewport: viewports.desktop,
  },
  {
    label: "admin contract center",
    path: "/sozlesme",
    role: "admin",
    viewport: viewports.desktop,
  },
  {
    expectedHeading: "Sözleşmelerim",
    label: "recipient contract inbox",
    path: "/sozlesmelerim",
    role: "reader",
    viewport: viewports.phone390,
  },
  {
    label: "writer commerce configuration",
    path: "/satis-erisim",
    role: "writer",
    viewport: viewports.phone430,
  },
  {
    label: "admin payment operations",
    path: "/admin/odeme-sistemi",
    role: "admin",
    viewport: viewports.phone390,
  },
  {
    label: "admin finance operations",
    path: "/admin/finans-gelirler",
    role: "admin",
    viewport: viewports.tablet768,
  },
];

for (const scenario of authenticatedCases) {
  test(`authenticated role smoke: ${scenario.label}`, async ({ page }) => {
    test.skip(!authFixture, "Authenticated browser fixture is not configured.");

    const token = authFixture.sessions?.[scenario.role];
    expect(token, `Missing ${scenario.role} session fixture`).toBeTruthy();

    await page.context().addCookies([
      {
        name: authFixture.cookieName,
        value: token,
        url: authCookieUrl,
      },
    ]);
    await page.setViewportSize(scenario.viewport);

    const response = await page.goto(scenario.path, {
      waitUntil: "domcontentloaded",
    });

    expect(response?.status()).toBeLessThan(400);
    await expect(page).not.toHaveURL(/\/giris(?:\?|$)/);
    await expect(page).not.toHaveURL(/\/erisim-reddedildi(?:\?|$)/);
    if (scenario.expectedHeading) {
      await expect(
        page.getByRole("heading", { name: scenario.expectedHeading }),
      ).toBeVisible();
    }
    await expectResponsiveDocument(page);
  });
}


test("authenticated zero-total commerce mutation smoke: reader completes provider-free purchase and receives entitlement", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");

  const token = authFixture.sessions?.reader;
  expect(token, "Missing reader session fixture").toBeTruthy();

  await page.context().addCookies([
    {
      name: authFixture.cookieName,
      value: token,
      url: authCookieUrl,
    },
  ]);
  await page.setViewportSize(viewports.phone430);
  await page.goto("/satinal/ci-browser-zero-total-work", {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByRole("heading", { name: "CI Browser 0 TL Eser" }),
  ).toBeVisible();
  await expect(
    page.getByText(/Harici ödeme sağlayıcısı kullanılmadan sipariş tamamlanacak/),
  ).toBeVisible();
  await expect(
    page.getByText("CI Browser Reader Purchase Terms", { exact: true }),
  ).toBeVisible();

  await page.locator('input[name="acceptDigitalContent"]').check();
  await page.getByRole("button", { name: "0 TL ile satın al" }).click();

  await expect(page).toHaveURL(
    /\/kutuphanem\/satin-aldiklarim\?durum=eklendi&siparis=ILK-/,
  );
  await expect(page.getByText(/Satın alma başarılı/)).toBeVisible();

  const purchasedCard = page
    .locator("article")
    .filter({ hasText: "CI Browser 0 TL Eser" });
  await expect(purchasedCard).toBeVisible();
  await expect(purchasedCard.getByText("Satın alındı", { exact: true })).toBeVisible();
  await expect(
    purchasedCard.getByRole("link", { name: "Okumaya devam et" }),
  ).toBeVisible();
  await expectResponsiveDocument(page);
});

test("authenticated platform coupon mutation smoke: admin creates and pauses İlkOku campaign", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");

  const token = authFixture.sessions?.admin;
  expect(token, "Missing admin session fixture").toBeTruthy();

  await page.context().addCookies([
    {
      name: authFixture.cookieName,
      value: token,
      url: authCookieUrl,
    },
  ]);
  await page.setViewportSize(viewports.tablet768);
  await page.goto("/sistem-yonetimi/odeme-sistemi/kuponlar", {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByRole("heading", { name: "Kuponlar & Kampanyalar" }),
  ).toBeVisible();

  await page.locator('input[name="code"]').fill("CI_BROWSER20");
  await page.locator('select[name="discountType"]').selectOption("percent");
  await page.locator('input[name="discountValue"]').fill("20");
  await page.locator('select[name="scope"]').selectOption("all_paid_works");
  await page.getByRole("button", { name: "Kampanyayı oluştur" }).click();

  await expect(page).toHaveURL(
    /\/sistem-yonetimi\/odeme-sistemi\/kuponlar\?durum=kupon-olusturuldu$/,
  );
  await expect(
    page.getByText("İlkOku kampanya kuponu oluşturuldu.", { exact: true }),
  ).toBeVisible();

  let couponCard = page
    .locator("article")
    .filter({ hasText: "CI_BROWSER20" });
  await expect(couponCard).toBeVisible();
  await expect(
    couponCard.getByRole("button", { name: "Pasife al" }),
  ).toBeVisible();

  await couponCard.getByRole("button", { name: "Pasife al" }).click();

  await expect(page).toHaveURL(
    /\/sistem-yonetimi\/odeme-sistemi\/kuponlar\?durum=kupon-guncellendi$/,
  );
  await expect(
    page.getByText("Kupon durumu güncellendi.", { exact: true }),
  ).toBeVisible();

  couponCard = page
    .locator("article")
    .filter({ hasText: "CI_BROWSER20" });
  await expect(
    couponCard.getByRole("button", { name: "Aktif et" }),
  ).toBeVisible();
  await expectResponsiveDocument(page);
});

test("authenticated publisher member mutation smoke: owner updates member while owner stays protected", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");

  const token = authFixture.sessions?.publisher;
  expect(token, "Missing publisher session fixture").toBeTruthy();

  await page.context().addCookies([
    {
      name: authFixture.cookieName,
      value: token,
      url: authCookieUrl,
    },
  ]);
  await page.setViewportSize(viewports.desktop);
  await page.goto("/yayinevi/uyeler", {
    waitUntil: "domcontentloaded",
  });

  const ownerCard = page
    .locator(".publisher-member-card")
    .filter({ hasText: "ci-browser-publisher@example.invalid" });
  await expect(ownerCard.getByText("Sahip hesabı korunuyor")).toBeVisible();
  await expect(
    ownerCard.getByText("Rol ve yetkileri düzenle", { exact: true }),
  ).toHaveCount(0);

  let memberCard = page
    .locator(".publisher-member-card")
    .filter({ hasText: "ci-browser-publisher-member@example.invalid" });
  await expect(memberCard).toBeVisible();
  await memberCard
    .getByText("Rol ve yetkileri düzenle", { exact: true })
    .click();

  await memberCard.locator('select[name="role"]').selectOption("reviewer");
  await memberCard.locator('select[name="active"]').selectOption("false");
  await memberCard.getByRole("button", { name: "Kaydet" }).click();

  await expect(
    memberCard.getByText("Üye yetkisi güncellendi.", { exact: true }),
  ).toBeVisible();

  await page.reload({ waitUntil: "domcontentloaded" });

  memberCard = page
    .locator(".publisher-member-card")
    .filter({ hasText: "ci-browser-publisher-member@example.invalid" });
  await expect(
    memberCard.locator('span[data-active="false"]'),
  ).toHaveText("Pasif");
  await expect(
    memberCard.locator(".publisher-member-card__role strong"),
  ).toHaveText("Değerlendirici");
  await expectResponsiveDocument(page);
});

test("authenticated contract mutation smoke: admin send, recipient response, ownership denial, admin history", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");

  async function useRole(role) {
    const token = authFixture.sessions?.[role];
    expect(token, `Missing ${role} session fixture`).toBeTruthy();
    await page.context().clearCookies();
    await page.context().addCookies([
      {
        name: authFixture.cookieName,
        value: token,
        url: authCookieUrl,
      },
    ]);
  }

  await useRole("admin");
  await page.setViewportSize(viewports.desktop);
  await page.goto("/sozlesme", { waitUntil: "domcontentloaded" });

  await page.locator("select").filter({ has: page.locator('option[value="reader"]') }).selectOption("reader");
  await page.locator('select[name="recipientUserId"]').selectOption({
    label: "CI reader · ci-browser-reader@example.invalid",
  });
  await page.locator('select[name="templateId"]').selectOption({
    label: "CI Browser Reader Contract · v1",
  });
  await page.locator('textarea[name="adminNote"]').fill("CI browser admin dispatch note");
  await page.locator('input[name="dispatchConfirmed"]').check();
  await expect(page.getByRole("button", { name: "Sözleşmeyi gönder" })).toBeEnabled();
  await page.getByRole("button", { name: "Sözleşmeyi gönder" }).click();

  await expect(page).toHaveURL(
    /\/sozlesme\?durum=(?:gonderildi|aktif_sozlesme_var)&sozlesme=/,
  );
  const contractId = new URL(page.url()).searchParams.get("sozlesme");
  expect(contractId, "Contract dispatch must return the created contract id").toBeTruthy();

  await useRole("writer");
  const foreignResponse = await page.goto(`/sozlesmelerim/${contractId}`, {
    waitUntil: "domcontentloaded",
  });
  expect(foreignResponse?.status()).toBe(404);

  await useRole("reader");
  await page.goto("/sozlesmelerim", {
    waitUntil: "domcontentloaded",
  });
  const recipientContractLink = page.getByRole("link", {
    name: /CI Browser Reader Contract/,
  });
  await expect(recipientContractLink).toBeVisible();
  await recipientContractLink.click();
  await expect(page).toHaveURL(new RegExp(`/sozlesmelerim/${contractId}$`));
  await expect(page.getByRole("heading", { name: "CI Browser Reader Contract" })).toBeVisible();
  await expect(page.getByText("Yanıt bekliyor", { exact: true })).toBeVisible();

  await page.locator('textarea[name="responseNote"]').fill("CI browser recipient accepted");
  await page.locator('input[name="responseConfirmed"]').check();
  await page.getByRole("button", { name: "Kabul et" }).click();

  await expect(page).toHaveURL(new RegExp(`/sozlesmelerim/${contractId}\\?durum=accepted`));
  await expect(page.getByText("Sözleşme kabulünüz kaydedildi.")).toBeVisible();
  await expect(page.getByText("Sözleşme durumu: Kabul edildi")).toBeVisible();

  await useRole("admin");
  await page.goto(`/sozlesme/${contractId}`, {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByText("Kabul edildi", { exact: true })).toBeVisible();
  await expect(page.getByText("Kullanıcı kabul etti")).toBeVisible();
  await expect(page.getByText("Admin gönderdi")).toBeVisible();
  await expect(page.getByText("CI browser recipient accepted")).toBeVisible();
  await expectResponsiveDocument(page);
});

const crossRoleNegativeCases = [
  { role: "reader", path: "/yazar", label: "reader cannot enter writer workspace" },
  { role: "reader", path: "/editor/kesfet", label: "reader cannot enter editor workspace" },
  { role: "reader", path: "/yayinevi", label: "reader cannot enter publisher workspace" },
  { role: "reader", path: "/admin", label: "reader cannot enter admin workspace" },
  { role: "writer", path: "/editor/kesfet", label: "writer cannot enter editor workspace" },
  { role: "writer", path: "/yayinevi", label: "writer cannot enter publisher workspace" },
  { role: "writer", path: "/admin", label: "writer cannot enter admin workspace" },
  { role: "editor", path: "/yayinevi", label: "editor cannot enter publisher workspace" },
  { role: "editor", path: "/admin", label: "editor cannot enter admin workspace" },
  { role: "reader", path: "/harita", label: "reader cannot enter architecture control center" },
  { role: "writer", path: "/sozlesme", label: "writer cannot enter admin contract center" },
  { role: "reader", path: "/icerik/seo", label: "reader cannot enter CMS SEO operations" },
];

for (const scenario of crossRoleNegativeCases) {
  test(`cross-role negative smoke: ${scenario.label}`, async ({ page }) => {
    test.skip(!authFixture, "Authenticated browser fixture is not configured.");

    const token = authFixture.sessions?.[scenario.role];
    expect(token, `Missing ${scenario.role} session fixture`).toBeTruthy();

    await page.context().addCookies([
      {
        name: authFixture.cookieName,
        value: token,
        url: authCookieUrl,
      },
    ]);

    await page.goto(scenario.path, {
      waitUntil: "domcontentloaded",
    });

    await expect(page).toHaveURL(/\/erisim-reddedildi(?:\?|$)/);
    await expectResponsiveDocument(page);
  });
}



const writingGuideShellSource = readFileSync(
  new URL("../../src/components/content/WritingGuideShell.tsx", import.meta.url),
  "utf8",
);
const writingGuideMapMatch = writingGuideShellSource.match(
  /const LIVE_WRITING_GUIDE_HREFS:[\s\S]*?=\s*\{([\s\S]*?)\};/,
);
const writingGuideRoutes = writingGuideMapMatch
  ? [...writingGuideMapMatch[1].matchAll(/^\s*"?([a-z0-9-]+)"?:\s*"([^"]+)",?\s*$/gm)]
      .map((match) => ({ slug: match[1], path: match[2] }))
      .filter(({ path }) => path.startsWith("/yazarlar-icin/"))
  : [];

test("writing guide mobile route inventory is available", async () => {
  expect(writingGuideRoutes.length).toBeGreaterThan(0);
  expect(new Set(writingGuideRoutes.map(({ path }) => path)).size).toBe(
    writingGuideRoutes.length,
  );
});

for (const guide of writingGuideRoutes) {
  test(`writing guide 390px smoke: ${guide.slug}`, async ({ page }) => {
    await page.setViewportSize(viewports.phone390);

    const response = await page.goto(guide.path, {
      waitUntil: "domcontentloaded",
    });

    expect(response?.status()).toBe(200);
    await expectResponsiveDocument(page);
  });
}
