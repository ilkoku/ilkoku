import { readFileSync } from "node:fs";
import mysql from "mysql2/promise";

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

test("public registration agreement has unique SEO metadata in server HTML head", async ({ page }) => {
  const response = await page.goto("/uyelik-sozlesmesi", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  const html = await response.text();
  const serverHead = html.split("</head>")[0];
  expect(serverHead).toContain("<title>Platform Kullanım ve Gizlilik Taahhüdü | İlkOku</title>");
  await expect(page).toHaveTitle("Platform Kullanım ve Gizlilik Taahhüdü | İlkOku");
  await expect(page.locator('meta[name="description"]')).toHaveAttribute(
    "content",
    "İlkOku Platform Kullanım ve Gizlilik Taahhüdü: hesap oluştururken kabul edilen temel üyelik, platform kullanımı ve gizlilik koşullarını inceleyin.",
  );
  await expect(page.locator('meta[property="og:title"]')).toHaveAttribute(
    "content", "Platform Kullanım ve Gizlilik Taahhüdü | İlkOku",
  );
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute(
    "href", "https://ilkoku.com/uyelik-sozlesmesi",
  );
});

// Guard the complete public writing education family, not just the Kurgu example.
// These routes share one footer; a route-only CSS import regression must fail CI.
const writingFooterFamilies = [
  { category: "Kurgu", hub: "kurgu", guide: "roman" },
  { category: "Edebiyat", hub: "edebiyat", guide: "siir" },
  { category: "Senaryo ve Sahne", hub: "senaryo-ve-sahne", guide: "film-senaryosu" },
  { category: "Akademik", hub: "akademik", guide: "makale" },
  { category: "Bilgilendirici", hub: "bilgilendirici", guide: "tarih" },
  { category: "Çocuk ve Gençlik", hub: "cocuk-ve-genclik", guide: "masal" },
  { category: "Çizgi Anlatı", hub: "cizgi-anlati", guide: "cizgi-roman" },
];

const sharedFooterScenarios = [
  { name: "Homepage desktop", path: "/", viewport: viewports.desktop },
  { name: "Homepage mobile", path: "/", viewport: viewports.phone390 },
  // Regression: non-home routes must ship with the full shared footer CSS.
  { name: "Editor genre lesson desktop", path: "/editorler-icin/egitim/tur-editorlugu", viewport: viewports.desktop },
  { name: "Editor genre lesson 390px", path: "/editorler-icin/egitim/tur-editorlugu", viewport: viewports.phone390 },
  { name: "Editor intro lesson 390px", path: "/editorler-icin/egitim/editorluge-baslama", viewport: viewports.phone390 },
  { name: "Reader education lesson 390px", path: "/okurlar-icin/okumaya-baslama", viewport: viewports.phone390 },
  ...writingFooterFamilies.flatMap(({ category, hub, guide }) => [
    { name: `${category} desktop hub`, path: `/yazarlar-icin/${hub}`, viewport: viewports.desktop },
    { name: `${category} 390px mobile hub`, path: `/yazarlar-icin/${hub}`, viewport: viewports.phone390 },
    { name: `${category} 390px mobile guide`, path: `/yazarlar-icin/${hub}/${guide}`, viewport: viewports.phone390 },
  ]),
];

for (const scenario of sharedFooterScenarios) {
  test(`shared public footer visual integrity: ${scenario.name}`, async ({ page }) => {
    await page.setViewportSize(scenario.viewport);
    const response = await page.goto(scenario.path, { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    const footer = page.locator(".nx-live-footer-scope .landing-footer");
    await expect(footer).toBeVisible();
    const logo = footer.locator(".landing-logo--footer img");
    await expect(logo).toBeVisible();
    const metrics = await footer.evaluate((element) => {
      const image = element.querySelector(".landing-logo--footer img");
      const grid = element.querySelector(".landing-footer__grid");
      const rect = element.getBoundingClientRect();
      const firstColumn = grid?.firstElementChild?.getBoundingClientRect();
      const lastColumn = grid?.lastElementChild?.getBoundingClientRect();
      const precedingContent = element.closest(".nx-live-footer-scope")?.previousElementSibling?.getBoundingClientRect();
      return {
        logoWidth: image?.getBoundingClientRect().width ?? 0,
        logoHeight: image?.getBoundingClientRect().height ?? 0,
        gridDisplay: grid ? getComputedStyle(grid).display : "",
        gridColumns: grid ? getComputedStyle(grid).gridTemplateColumns : "",
        backgroundImage: getComputedStyle(element).backgroundImage,
        footerHeight: rect.height,
        left: rect.left,
        right: rect.right,
        viewportWidth: document.documentElement.clientWidth,
        columnCount: grid?.children.length ?? 0,
        isSingleColumn: !!firstColumn && !!lastColumn &&
          Math.abs(firstColumn.left - lastColumn.left) <= 2 &&
          lastColumn.top > firstColumn.bottom,
        precedingContentBottom: precedingContent?.bottom ?? null,
        footerTop: rect.top,
      };
    });
    expect(metrics.logoWidth, JSON.stringify(metrics)).toBeGreaterThan(75);
    expect(metrics.logoWidth, JSON.stringify(metrics)).toBeLessThan(210);
    expect(metrics.logoHeight, JSON.stringify(metrics)).toBeLessThan(230);
    expect(metrics.gridDisplay, JSON.stringify(metrics)).toBe("grid");
    expect(metrics.gridColumns, JSON.stringify(metrics)).not.toBe("none");
    expect(metrics.backgroundImage, JSON.stringify(metrics)).toContain("linear-gradient");
    expect(metrics.columnCount, JSON.stringify(metrics)).toBe(5);
    if (scenario.viewport.width <= 390) {
      expect(metrics.isSingleColumn, JSON.stringify(metrics)).toBe(true);
    }
    if (metrics.precedingContentBottom !== null) {
      expect(metrics.footerTop, JSON.stringify(metrics)).toBeGreaterThanOrEqual(metrics.precedingContentBottom - 2);
    }
    expect(metrics.footerHeight, JSON.stringify(metrics)).toBeLessThan(2400);
    expect(metrics.left, JSON.stringify(metrics)).toBeGreaterThanOrEqual(-1);
    expect(metrics.right, JSON.stringify(metrics)).toBeLessThanOrEqual(metrics.viewportWidth + 1);
    await expect(footer.getByRole("heading", { name: "Platform" })).toBeVisible();
    await expect(footer.getByRole("heading", { name: "Destek" })).toBeVisible();
  });
}

// This published work is created by prepare-browser-auth-fixtures.mjs.
// Check that moving showcase CSS out of globals does not erase book detail styling.
for (const scenario of [
  { label: "390px published book showcase", viewport: viewports.phone390 },
  { label: "desktop published book showcase", viewport: viewports.desktop },
]) {
  test(`book showcase route CSS: ${scenario.label}`, async ({ page }) => {
    await page.setViewportSize(scenario.viewport);
    const response = await page.goto("/kitap/ci-browser-zero-total-work", {
      waitUntil: "domcontentloaded",
    });
    expect(response?.status()).toBe(200);
    await expect(page.locator(".showcase-page")).toBeVisible();
    await expect(page.locator(".showcase-hero")).toBeVisible();
    const heroDisplay = await page.locator(".showcase-hero").evaluate(
      (element) => getComputedStyle(element).display,
    );
    expect(heroDisplay, "BookShowcase CSS must load on its public detail route").toBe("grid");
    await expect(page.locator(".showcase-primary-actions")).toBeVisible();
    await expect(page.locator(".showcase-chapter-list")).toBeVisible();
    const cards = page.locator(".showcase-chapter-card");
    expect(await cards.count(), "Published chapters must render as cards").toBeGreaterThan(0);
    const chapterDisplay = await cards.first().evaluate(
      (element) => getComputedStyle(element).display,
    );
    expect(chapterDisplay, "Chapter cards must keep their scoped layout styles").toBe("flex");
    const title = page.locator(".showcase-hero h1");
    const titleOverflow = await title.evaluate((element) => ({
      scrollWidth: element.scrollWidth,
      clientWidth: element.clientWidth,
    }));
    expect(titleOverflow.scrollWidth, "Work titles must wrap inside the hero").toBeLessThanOrEqual(titleOverflow.clientWidth + 2);
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
    label: "Power-SEO independent portal",
    path: "/sistem-yonetimi/power-seo",
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
    expectedHeading: "Power-SEO",
    label: "Power-SEO independent admin dashboard",
    path: "/sistem-yonetimi/power-seo",
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
        page.getByRole("heading", { name: scenario.expectedHeading, exact: true }),
      ).toBeVisible();
    }
    await expectResponsiveDocument(page);
  });
}


test("reader checkout shows zero-total summary first with dark cards and intact disabled payment options", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");
  await page.context().addCookies([{
    name: authFixture.cookieName,
    value: authFixture.sessions.reader,
    url: authCookieUrl,
  }]);

  for (const [label, viewport] of [
    ["desktop", viewports.desktop],
    ["phone", viewports.phone390],
  ]) {
    await page.setViewportSize(viewport);
    const response = await page.goto("/satinal/ci-browser-zero-total-work", { waitUntil: "domcontentloaded" });
    expect(response?.status(), label + ": checkout responds").toBe(200);
    const summary = page.getByRole("complementary", { name: "Sipariş özeti" });
    await expect(summary.getByRole("heading", { name: "Sipariş özeti" })).toBeVisible();
    const breakdown = summary.locator('[class*="summaryGrid"] > div');
    await expect(breakdown).toHaveCount(4);
    await expect(breakdown.nth(1)).toContainText("İlkOku kupon indirimi");
    await expect(breakdown.nth(1)).toContainText("0,00");
    await expect(breakdown.nth(2)).toContainText("Yazar indirim kodu");
    await expect(breakdown.nth(2)).toContainText("0,00");
    const totalRow = breakdown.last();
    await expect(totalRow).toContainText("Ödenecek toplam");
    await expect(totalRow).toContainText("0,00");

    const appearance = await summary.evaluate((element) => {
      const grid = element.querySelector('[class*="summaryGrid"]');
      const metadata = element.querySelector('[class*="readerCheckoutWorkMeta"]');
      const price = grid?.lastElementChild;
      const summaryCard = element.querySelector('[class*="readerCheckoutSummary"]');
      return {
        cardBackground: summaryCard ? getComputedStyle(summaryCard).backgroundColor : "",
        order: !!grid && !!metadata && grid.getBoundingClientRect().top < metadata.getBoundingClientRect().top,
        totalBottom: price?.getBoundingClientRect().bottom ?? Infinity,
        viewportHeight: window.innerHeight,
      };
    });
    expect(appearance.cardBackground, label + ": dark panel").toBe("rgb(27, 31, 39)");
    expect(appearance.order, label + ": price displayed before work metadata").toBe(true);
    expect(appearance.totalBottom, label + ": total visible without scrolling").toBeLessThan(appearance.viewportHeight);

    await expect(page.locator('input[name="purchasePath"][value="card"]')).toBeDisabled();
    await expect(page.locator('input[name="purchasePath"][value="carrier"]')).toBeDisabled();
    await expectResponsiveDocument(page);
  }
});

test("reader checkout separates platform and author codes and blocks discounts on staged 0 TL work", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");
  await page.context().addCookies([{
    name: authFixture.cookieName,
    value: authFixture.sessions.reader,
    url: authCookieUrl,
  }]);

  for (const viewport of [viewports.desktop, viewports.phone390]) {
    await page.setViewportSize(viewport);
    await page.goto("/satinal/ci-browser-zero-total-work", { waitUntil: "domcontentloaded" });
    const area = page.locator('[class*="readerCheckoutCoupons"]');
    await expect(area.getByRole("heading", { name: "Kupon ve indirim kodları" })).toBeVisible();
    await expect(area.getByRole("textbox", { name: "İlkOku kupon kodu" })).toBeDisabled();
    await expect(area.getByRole("textbox", { name: "Yazar indirim kodu" })).toBeDisabled();
    await expect(area.getByText("Bu eserin bedeli 0 TL olduğundan")).toBeVisible();
    await expectResponsiveDocument(page);
  }

  await page.setViewportSize(viewports.desktop);
  for (const [type, code, expectedLabel] of [
    ["platform", "CIBROWSER100", "İlkOku kuponu"],
    ["author", "CIBROWSERAUTHOR", "Yazar indirim kodu"],
  ]) {
    await page.goto("/satinal/ci-browser-coupon-work", { waitUntil: "domcontentloaded" });
    const area = page.locator('[class*="readerCheckoutCoupons"]');
    await expect(area.getByRole("textbox", { name: "İlkOku kupon kodu" })).toBeEnabled();
    await expect(area.getByRole("textbox", { name: "Yazar indirim kodu" })).toBeEnabled();
    const form = area.locator(`form:has(input[name="kuponTuru"][value="${type}"])`);
    await form.locator('input[name="kupon"]').fill(code);
    await form.getByRole("button", { name: "Uygula" }).click();
    await expect(page).toHaveURL(new RegExp(`kuponTuru=${type}.*kupon=${code}|kupon=${code}.*kuponTuru=${type}`));
    await expect(area.getByText(`${expectedLabel} ${code} uygulandı.`, { exact: false })).toBeVisible();
    const summary = page.getByRole("complementary", { name: "Sipariş özeti" });
    const breakdown = summary.locator('[class*="summaryGrid"] > div');
    await expect(breakdown).toHaveCount(4);
    await expect(breakdown.first()).toContainText("100,00");
    await expect(breakdown.nth(1)).toContainText("İlkOku kupon indirimi");
    await expect(breakdown.nth(2)).toContainText("Yazar indirim kodu");
    await expect(breakdown.nth(type === "platform" ? 1 : 2)).toContainText("-₺100,00");
    await expect(breakdown.nth(type === "platform" ? 2 : 1)).toContainText("₺0,00");
    await expect(breakdown.last()).toContainText("Ödenecek toplam");
    await expect(breakdown.last()).toContainText("0,00");
    await expectResponsiveDocument(page);
  }

  await page.goto("/satinal/ci-browser-coupon-work?kuponTuru=author&kupon=CIBROWSER100");
  const wrongSource = page.locator('[class*="readerCheckoutCoupons"]');
  await expect(wrongSource.getByText(/seçilen kupon türüyle eşleşmiyor/)).toBeVisible();
  const rejectedBreakdown = page.getByRole("complementary", { name: "Sipariş özeti" })
    .locator('[class*="summaryGrid"] > div');
  await expect(rejectedBreakdown.nth(1)).toContainText("₺0,00");
  await expect(rejectedBreakdown.nth(2)).toContainText("₺0,00");
  await expect(rejectedBreakdown.last()).toContainText("100,00");
});

test("reader discovery row actions stay inside their column without overlapping on desktop and mobile", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");
  await page.context().addCookies([{
    name: authFixture.cookieName,
    value: authFixture.sessions.reader,
    url: authCookieUrl,
  }]);
  await page.setViewportSize(viewports.desktop);
  await page.goto("/kesfet", { waitUntil: "domcontentloaded" });

  // A paid CI work exposes detail, favorite, reading and access controls.
  // At narrower widths the controls must wrap inside the action cell.
  const couponRow = page.locator(".workspace-table--discovery tbody tr")
    .filter({ hasText: "CI Browser Kupon Eseri" });
  await expect(couponRow).toBeVisible();
  await expect(couponRow.getByRole("link", { name: "Erişim koşullarını gör" })).toBeVisible();

  for (const [label, viewport] of [
    ["desktop", viewports.desktop],
    ["tablet", viewports.tablet768],
    ["phone", viewports.phone390],
  ]) {
    await page.setViewportSize(viewport);
    const geometry = await couponRow.locator('td[data-label="İşlem"]').evaluate((cell) => {
      const cellRect = cell.getBoundingClientRect();
      const buttons = Array.from(cell.querySelectorAll(".workspace-row-action")).map((button) => {
        const rect = button.getBoundingClientRect();
        return { label: button.textContent?.trim(), left: rect.left, right: rect.right, top: rect.top, bottom: rect.bottom };
      });
      const outside = buttons.filter((button) =>
        button.left < cellRect.left - 1 || button.right > cellRect.right + 1
      );
      const overlaps = [];
      for (let i = 0; i < buttons.length; i++) {
        for (let j = i + 1; j < buttons.length; j++) {
          const width = Math.min(buttons[i].right, buttons[j].right) - Math.max(buttons[i].left, buttons[j].left);
          const height = Math.min(buttons[i].bottom, buttons[j].bottom) - Math.max(buttons[i].top, buttons[j].top);
          if (width > 1 && height > 1) overlaps.push([buttons[i].label, buttons[j].label]);
        }
      }
      return { controls: buttons, outside, overlaps, cellLeft: cellRect.left, cellRight: cellRect.right };
    });
    expect(geometry.controls, label + ": all paid-work actions present").toHaveLength(4);
    expect(geometry.outside, label + ": controls must stay inside table column").toEqual([]);
    expect(geometry.overlaps, label + ": controls must not overlap").toEqual([]);
    await expectResponsiveDocument(page);
  }
});

test("authenticated admin keeps seven fixed main groups and opens submenus on the right", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");
  const token = authFixture.sessions?.admin;
  expect(token, "Missing admin session fixture").toBeTruthy();
  await page.context().addCookies([{ name: authFixture.cookieName, value: token, url: authCookieUrl }]);
  await page.setViewportSize(viewports.desktop);
  await page.goto("/sistem-yonetimi", { waitUntil: "domcontentloaded" });

  const sidebar = page.locator(".admin-sidebar");
  await expect(sidebar.locator(".admin-nav-group")).toHaveCount(7);
  await expect(sidebar.locator(".admin-nav-child")).toHaveCount(0);
  await expect(page.locator(".admin-secondary-panel")).toHaveCount(0);
  await sidebar.getByRole("button", { name: "Kullanıcı & Roller", exact: true }).click();
  const panel = page.locator(".admin-secondary-panel");
  await expect(panel.getByRole("link", { name: "Kullanıcılar" })).toBeVisible();
  await expect(sidebar.locator(".admin-nav-child")).toHaveCount(0);
  await panel.getByRole("link", { name: "Kullanıcılar" }).click();
  await page.waitForURL(/\/sistem-yonetimi\/kullanicilar$/);
  await expect(panel.getByRole("link", { name: "Başvurular" })).toBeVisible();

  const returnLink = page.getByRole("link", { name: "Genel Yönetim Paneline Dön" }).first();
  await returnLink.click();
  await page.waitForURL(/\/sistem-yonetimi$/);
  await expect(sidebar.locator(".admin-nav-group")).toHaveCount(7);

  for (const path of ["/icerik", "/harita", "/sozlesme"]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    await expect(page.getByRole("link", { name: "Genel Yönetim Paneline Dön" }).first()).toBeVisible();
  }
});

test("authenticated writer commerce configuration mutation smoke: writer stages paid access with agreement and final confirmation", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");

  const token = authFixture.sessions?.writer;
  const workId = authFixture.workIds?.writerCommerceConfiguration;
  expect(token, "Missing writer session fixture").toBeTruthy();
  expect(workId, "Missing writer commerce work fixture").toBeTruthy();

  await page.context().addCookies([
    {
      name: authFixture.cookieName,
      value: token,
      url: authCookieUrl,
    },
  ]);
  await page.setViewportSize(viewports.desktop);
  await page.goto(`/satis-erisim/${workId}`, {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByRole("heading", { name: "CI Browser Writer Commerce Draft" }),
  ).toBeVisible();

  await page.getByLabel("Kilitli", { exact: true }).check();
  await page.getByRole("button", { name: "Erişim planını kaydet" }).click();
  await expect(page.getByText("Kaydedildi: Kilitli", { exact: true })).toBeVisible();

  await page.locator('input[name="saleModel"][value="paid"]').check();
  await page.getByRole("button", { name: "Yayın modelini kaydet" }).click();
  await expect(page.getByText("Yayın modeli kaydedildi.", { exact: true })).toBeVisible();
  await expect(page.getByText("Ücretli", { exact: true }).first()).toBeVisible();

  await page.locator('input[name="acceptAgreement"]').check();
  await page.getByRole("button", { name: "Sözleşmeyi kabul et" }).click();
  await expect(
    page.getByText("Güncel sözleşme kabulün kaydedildi.", { exact: true }),
  ).toBeVisible();
  await expect(page.getByText("Kabul edildi · v1", { exact: true })).toBeVisible();

  const finalConfirmation = page.locator('input[name="confirmWork"]');
  await expect(finalConfirmation).toBeEnabled();
  await finalConfirmation.check();
  await page.getByRole("button", { name: "SATIŞA HAZIRLA" }).click();

  await expect(
    page.getByText(/Ücretli eser 0 TL erişimle hazırlandı/),
  ).toBeVisible();
  await expect(page.getByText("✓ Satışa Hazır", { exact: true })).toBeVisible();
  await expectResponsiveDocument(page);
});

test("admin seller rights workbench is connected to 0 TL readiness without activating payment providers", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");
  const token = authFixture.sessions?.admin;
  expect(token, "Missing admin session").toBeTruthy();
  await page.context().addCookies([
    { name: authFixture.cookieName, value: token, url: authCookieUrl },
  ]);
  await page.setViewportSize(viewports.phone430);
  await page.goto("/sistem-yonetimi/odeme-sistemi/satici-yetkileri", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { name: "Satıcı ve Satış Yetkisi" })).toBeVisible();
  await expect(page.getByRole("heading", { name: /1\. Resmi satıcı kimliği oluştur/u })).toBeVisible();
  await expect(page.getByRole("heading", { name: /2\. Resmî kanıtı incele/u })).toBeVisible();
  await expect(page.getByRole("heading", { name: /3\. Eser için satış yetkisi/u })).toBeVisible();
  await expect(page.getByRole("heading", { name: /4\. Eser satış yetkisini/u })).toBeVisible();
  await expect(page.getByRole("button", { name: "Satıcı taslağını kaydet" })).toBeVisible();
  await expect(page.getByRole("option", { name: "CI ONLY MOCK SELLER - NOT A REAL ENTITY" })).toHaveCount(1);
  await expectResponsiveDocument(page);

  await page.goto("/sistem-yonetimi/odeme-sistemi/ayarlar", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("link", { name: /Satıcı ve satış yetkisi çalışma alanını aç/u })).toBeVisible();
});

test("provider-free 100% platform coupon: preview open, chapter 2 locked, order and finance reconcile at 0 TL", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");
  const token = authFixture.sessions?.reader;
  expect(token, "Missing reader fixture session").toBeTruthy();
  await page.context().addCookies([
    { name: authFixture.cookieName, value: token, url: authCookieUrl },
  ]);
  await page.setViewportSize(viewports.phone430);

  // Even while real providers are absent, the locked content never leaks.
  await page.goto("/oku/ci-browser-coupon-work/bolum-1", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("CI browser preview chapter is readable before purchase.")).toBeVisible();
  await page.goto("/oku/ci-browser-coupon-work/bolum-2", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/satinal\/ci-browser-coupon-work\?from=/u);
  await expect(page.getByText("CI browser coupon paid chapter unlocks after 100 percent discount.")).toHaveCount(0);

  // Coupon entry belongs to the reader checkout (not admin or author forms).
  await page.goto("/satinal/ci-browser-coupon-work", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "CI Browser Kupon Eseri" })).toBeVisible();
  const platformCouponForm = page.locator('form:has(input[name="kuponTuru"][value="platform"])');
  await expect(platformCouponForm.getByRole("textbox", { name: "İlkOku kupon kodu" })).toBeVisible();
  await platformCouponForm.locator('input[name="kupon"]').fill("CIBROWSER100");
  await platformCouponForm.getByRole("button", { name: "Uygula" }).click();
  await expect(page).toHaveURL(/kupon=CIBROWSER100/u);
  await expect(page.getByText(/İlkOku kuponu CIBROWSER100 uygulandı/u)).toBeVisible();
  await expect(page.getByText(/İndirim İlkOku tarafından karşılanır/u)).toBeVisible();
  await expect(page.getByRole("radio", { name: /Ücretli.*0 TL/u })).toBeChecked();
  await expect(page.getByRole("radio", { name: /Kredi Kartı/u })).toBeDisabled();
  await expect(page.getByRole("radio", { name: /Telefon Faturası/u })).toBeDisabled();
  await expect(page.getByRole("button", { name: "0 TL ile satın al" })).toBeEnabled();

  await page.locator('input[name="acceptDigitalContent"]').check();
  await page.getByRole("button", { name: "0 TL ile satın al" }).click();
  await expect(page).toHaveURL(/\/kutuphanem\/satin-aldiklarim\?durum=eklendi&siparis=ILK-/u);
  const orderNo = new URL(page.url()).searchParams.get("siparis");
  expect(orderNo).toMatch(/^ILK-/u);

  await page.goto("/oku/ci-browser-coupon-work/bolum-2", { waitUntil: "domcontentloaded" });
  await expect(page.getByText("CI browser coupon paid chapter unlocks after 100 percent discount.")).toBeVisible();

  if (process.env.DATABASE_URL) {
    const dbUrl = new URL(process.env.DATABASE_URL);
    const db = await mysql.createConnection({
      host: dbUrl.hostname,
      port: Number(dbUrl.port || 3306),
      user: decodeURIComponent(dbUrl.username),
      password: decodeURIComponent(dbUrl.password),
      database: decodeURIComponent(dbUrl.pathname.slice(1)),
    });
    try {
      const sql = [
        "SELECT o.status, o.originalAmount, o.discountAmount, o.finalAmount,",
        "(SELECT COUNT(*) FROM Payment p WHERE p.orderId=o.id) paymentCount,",
        "(SELECT COUNT(*) FROM OrderConsent c WHERE c.orderId=o.id) consentCount,",
        "(SELECT COUNT(*) FROM OrderLegalSnapshot s WHERE s.orderId=o.id) legalSnapshotCount,",
        "(SELECT COUNT(*) FROM WorkEntitlement e WHERE e.orderId=o.id AND e.status='active') entitlementCount,",
        "(SELECT COUNT(*) FROM CouponRedemption cr WHERE cr.orderId=o.id AND cr.status='used' AND cr.discountAmount=10000) couponUseCount,",
        "(SELECT COUNT(*) FROM FinancialLedger l WHERE l.orderId=o.id AND l.entryType='sale_gross' AND l.amount=10000) grossCount,",
        "(SELECT COUNT(*) FROM FinancialLedger l WHERE l.orderId=o.id AND l.entryType='platform_coupon_discount' AND l.amount=10000) discountCount,",
        "(SELECT COUNT(*) FROM FinancialLedger l WHERE l.orderId=o.id AND l.entryType='author_coupon_discount') wrongFundingCount,",
        "(SELECT usageCount FROM Coupon WHERE code='CIBROWSER100') usageCount",
        "FROM \x60Order\x60 o WHERE o.orderNo=?",
      ].join(" ");
      const [records] = await db.execute(sql, [orderNo]);
      expect(records).toHaveLength(1);
      const x = records[0];
      expect(x.status).toBe("paid");
      expect(Number(x.originalAmount)).toBe(10000);
      expect(Number(x.discountAmount)).toBe(10000);
      expect(Number(x.finalAmount)).toBe(0);
      for (const key of ["consentCount", "legalSnapshotCount", "entitlementCount", "couponUseCount", "grossCount", "discountCount", "usageCount"]) {
        expect(Number(x[key]), key).toBe(1);
      }
      expect(Number(x.paymentCount)).toBe(0);
      expect(Number(x.wrongFundingCount)).toBe(0);
    } finally {
      await db.end();
    }
  }
  // Coupon-backed access remains an order-derived entitlement; admin Coupon
  // filtering must include it and keep the real order source unchanged.
  const adminToken = authFixture.sessions?.admin;
  expect(adminToken, "Missing admin session fixture").toBeTruthy();
  await page.context().addCookies([
    { name: authFixture.cookieName, value: adminToken, url: authCookieUrl },
  ]);
  await page.goto(
    "/sistem-yonetimi/odeme-sistemi/erisim-haklari?source=coupon&q=CI%20Browser%20Kupon%20Eseri",
    { waitUntil: "domcontentloaded" },
  );
  const entitlementRow = page.locator("table tbody tr").filter({ hasText: "CI Browser Kupon Eseri" });
  await expect(entitlementRow).toBeVisible();
  await expect(entitlementRow.getByText("Kupon", { exact: true })).toBeVisible();
  await page.goto(
    "/sistem-yonetimi/odeme-sistemi/erisim-haklari?source=purchase&q=CI%20Browser%20Kupon%20Eseri",
    { waitUntil: "domcontentloaded" },
  );
  await expect(page.locator("table tbody tr").filter({ hasText: "CI Browser Kupon Eseri" })).toBeVisible();
});

test("coupon last-use concurrency: two different readers cannot both consume the last 100% voucher", async ({ browser }) => {
  test.skip(!authFixture || !process.env.DATABASE_URL, "Disposable multi-reader CI fixture required.");
  const tokenA = authFixture.sessions?.readerRaceA;
  const tokenB = authFixture.sessions?.readerRaceB;
  expect(tokenA && tokenB, "Two independent reader identities must be configured").toBeTruthy();

  const dbUrl = new URL(process.env.DATABASE_URL);
  const db = await mysql.createConnection({
    host: dbUrl.hostname,
    port: Number(dbUrl.port || 3306),
    user: decodeURIComponent(dbUrl.username),
    password: decodeURIComponent(dbUrl.password),
    database: decodeURIComponent(dbUrl.pathname.slice(1)),
  });
  const couponCode = "CIRACE" + Date.now().toString(36).toUpperCase();
  const couponId = crypto.randomUUID();
  try {
    const [workRows] = await db.execute(
      "SELECT id FROM Work WHERE slug = 'ci-browser-coupon-work'",
    );
    const [adminRows] = await db.execute(
      "SELECT id FROM User WHERE email = 'ci-browser-admin@example.invalid'",
    );
    expect(workRows).toHaveLength(1);
    expect(adminRows).toHaveLength(1);
    await db.execute(
      "INSERT INTO Coupon (id, code, owner, creatorId, discountType, discountValue, " +
      "scope, status, totalUsageLimit, perUserUsageLimit, usageCount, createdAt, updatedAt) " +
      "VALUES (?, ?, 'platform', ?, 'percent', 100, 'selected_works', 'active', 1, 1, 0, NOW(), NOW())",
      [couponId, couponCode, adminRows[0].id],
    );
    await db.execute(
      "INSERT INTO CouponWorkScope (id, couponId, workId, createdAt) VALUES (UUID(), ?, ?, NOW())",
      [couponId, workRows[0].id],
    );

    const contexts = await Promise.all([browser.newContext(), browser.newContext()]);
    try {
      const pages = await Promise.all(contexts.map((c) => c.newPage()));
      for (let i = 0; i < 2; i++) {
        await contexts[i].addCookies([{
          name: authFixture.cookieName,
          value: [tokenA, tokenB][i],
          url: authCookieUrl,
        }]);
      }
      await Promise.all(pages.map((p) =>
        p.goto("/satinal/ci-browser-coupon-work?kupon=" + couponCode, { waitUntil: "domcontentloaded" }),
      ));
      for (const p of pages) {
        await expect(p.getByRole("button", { name: "0 TL ile satın al" })).toBeEnabled();
        await p.locator('input[name="acceptDigitalContent"]').check();
      }
      await Promise.all(pages.map((p) =>
        p.getByRole("button", { name: "0 TL ile satın al" }).click(),
      ));
      await Promise.all(pages.map((p) =>
        p.waitForURL(/durum=(?:eklendi|kupon-gecersiz)/u),
      ));
      const successful = pages.filter((p) => p.url().includes("durum=eklendi"));
      expect(successful, "Exactly one reader may consume the global last coupon use").toHaveLength(1);
      const rejected = pages.filter((p) => p.url().includes("durum=kupon-gecersiz"));
      expect(rejected, "The other reader must be rejected without an order").toHaveLength(1);
    } finally {
      await Promise.all(contexts.map((c) => c.close()));
    }

    const [rows] = await db.execute(
      "SELECT c.usageCount, " +
      "(SELECT COUNT(*) FROM CouponRedemption r WHERE r.couponId=c.id AND r.status='used') usedCount, " +
      "(SELECT COUNT(*) FROM \`Order\` o WHERE o.couponId=c.id) orderCount, " +
      "(SELECT COUNT(*) FROM Payment p JOIN \`Order\` o ON o.id=p.orderId WHERE o.couponId=c.id) paymentCount, " +
      "(SELECT COUNT(*) FROM WorkEntitlement e JOIN \`Order\` o ON o.id=e.orderId WHERE o.couponId=c.id AND e.status='active') entitlementCount, " +
      "(SELECT COUNT(*) FROM FinancialLedger l WHERE l.couponId=c.id AND l.entryType='platform_coupon_discount') discountCount " +
      "FROM Coupon c WHERE c.id=?",
      [couponId],
    );
    expect(rows).toHaveLength(1);
    for (const key of ["usageCount", "usedCount", "orderCount", "entitlementCount", "discountCount"]) {
      expect(Number(rows[0][key]), key).toBe(1);
    }
    expect(Number(rows[0].paymentCount)).toBe(0);
  } finally {
    await db.end();
  }
});

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

  await page.goto("/oku/ci-browser-zero-total-work/bolum-1", {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(
    /\/satinal\/ci-browser-zero-total-work\?from=/,
  );
  await expect(
    page.getByText("Provider-free zero total checkout browser fixture content.", {
      exact: true,
    }),
  ).toHaveCount(0);

  await expect(
    page.getByRole("heading", { name: "CI Browser 0 TL Eser" }),
  ).toBeVisible();
  await expect(page.getByRole("heading", { name: "Sipariş özeti" })).toBeVisible();
  await expect(page.getByText("Platform: İlkOku", { exact: true })).toBeVisible();
  const choiceGroup = page.getByRole("region", { name: "İşlem seçeneği" });
  await expect(choiceGroup).toBeVisible();
  await expect(choiceGroup.getByRole("radio", { name: /Kredi Kartı/u })).toBeDisabled();
  await expect(choiceGroup.getByRole("radio", { name: /Telefon Faturası/u })).toBeDisabled();
  await expect(choiceGroup.getByRole("radio", { name: /Ücretli.*0 TL/u })).toBeChecked();
  await expect(choiceGroup.getByRole("radio")).toHaveCount(3);
  await expect(choiceGroup.getByText("Seçili · Gerçek ödeme yok")).toBeVisible();
  await expect(page.getByRole("button", { name: "0 TL ile satın al" })).toBeEnabled();
  await expect(page.locator('[aria-label="Sipariş özeti"]')).toBeVisible();
  await expectResponsiveDocument(page);
  await expect(
    page.getByText(/Harici ödeme sağlayıcısı kullanılmadan sipariş tamamlanacak/),
  ).toBeVisible();
  await expect(
    page.getByText("CI Browser Reader Purchase Terms", { exact: true }),
  ).toBeVisible();

  // Two independent browser tabs send the same real server action in
  // parallel: exactly one creates an order, the other sees the entitlement.
  await page.locator('input[name="acceptDigitalContent"]').check();
  const parallelPage = await page.context().newPage();
  await parallelPage.goto("/satinal/ci-browser-zero-total-work", {
    waitUntil: "domcontentloaded",
  });
  await parallelPage.locator('input[name="acceptDigitalContent"]').check();

  await Promise.all([
    page.getByRole("button", { name: "0 TL ile satın al" }).click(),
    parallelPage.getByRole("button", { name: "0 TL ile satın al" }).click(),
  ]);
  const completionUrl = /\/kutuphanem\/satin-aldiklarim\?durum=(?:eklendi|zaten-erisim-var)/u;
  await Promise.all([page.waitForURL(completionUrl), parallelPage.waitForURL(completionUrl)]);
  const successfulPages = [page, parallelPage].filter((tab) =>
    tab.url().includes("durum=eklendi"),
  );
  expect(successfulPages, "Only one of two concurrent requests can create a new order").toHaveLength(1);
  const completedZeroTotalOrderNo = new URL(successfulPages[0].url()).searchParams.get("siparis");
  expect(completedZeroTotalOrderNo).toMatch(/^ILK-/u);
  await parallelPage.close();
  if (page.url().includes("zaten-erisim-var")) {
    await page.goto(
      "/kutuphanem/satin-aldiklarim?durum=eklendi&siparis=" +
        encodeURIComponent(completedZeroTotalOrderNo),
      { waitUntil: "domcontentloaded" },
    );
  }
  await expect(page.getByText(/Satın alma başarılı/)).toBeVisible();

  const purchasedCard = page
    .locator("article")
    .filter({ hasText: "CI Browser 0 TL Eser" });
  await expect(purchasedCard).toBeVisible();
  await expect(purchasedCard.getByText("Satın alındı", { exact: true })).toBeVisible();
  await expect(
    purchasedCard.getByRole("link", { name: "Okumaya devam et" }),
  ).toBeVisible();

  await page.goto("/oku/ci-browser-zero-total-work/bolum-1", {
    waitUntil: "domcontentloaded",
  });
  await expect(page).toHaveURL(
    /\/oku\/ci-browser-zero-total-work\/bolum-1(?:\?|$)/,
  );
  await expect(
    page.getByText("Provider-free zero total checkout browser fixture content.", {
      exact: true,
    }),
  ).toBeVisible();
  await expectResponsiveDocument(page);

  // Cross-check the provider-free transaction across reader and admin surfaces.
  expect(completedZeroTotalOrderNo).toMatch(/^ILK-/u);
  await page.goto("/hesabim/odeme-gecmisi", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("heading", { name: "Ödeme Geçmişi" })).toBeVisible();
  const historyCard = page.locator("article").filter({ hasText: completedZeroTotalOrderNo });
  await expect(historyCard).toBeVisible();
  await expect(historyCard.getByText("CI Browser 0 TL Eser")).toBeVisible();
  await expect(historyCard.getByText("0 TL edinildi · Tahsilat yok", { exact: true })).toBeVisible();
  await expect(historyCard.getByText(/₺\s?0,00/u).last()).toBeVisible();

  if (process.env.DATABASE_URL) {
    const databaseUrl = new URL(process.env.DATABASE_URL);
    const db = await mysql.createConnection({
      host: databaseUrl.hostname,
      port: Number(databaseUrl.port || 3306),
      user: decodeURIComponent(databaseUrl.username),
      password: decodeURIComponent(databaseUrl.password),
      database: decodeURIComponent(databaseUrl.pathname.slice(1)),
    });
    try {
      const sql = [
        "SELECT o.status, o.finalAmount,",
        "(SELECT COUNT(*) FROM Payment p WHERE p.orderId = o.id) AS paymentCount,",
        "(SELECT COUNT(*) FROM OrderConsent c WHERE c.orderId = o.id) AS consentCount,",
        "(SELECT COUNT(*) FROM OrderLegalSnapshot s WHERE s.orderId = o.id AND s.sellerName = 'CI ONLY MOCK SELLER - NOT A REAL ENTITY') AS legalSnapshotCount,",
        "(SELECT COUNT(*) FROM WorkEntitlement e WHERE e.orderId = o.id AND e.status = 'active') AS entitlementCount,",
        "(SELECT COUNT(*) FROM FinancialLedger l WHERE l.orderId = o.id AND l.entryType = 'sale_gross' AND l.amount = 0) AS zeroGrossCount,",
        "(SELECT COUNT(*) FROM FinancialLedger l WHERE l.orderId = o.id AND l.entryType IN ('author_earning', 'platform_commission', 'payment_provider_fee')) AS moneyMoveCount",
        "FROM \x60Order\x60 o WHERE o.orderNo = ?",
      ].join(" ");
      const [records] = await db.execute(sql, [completedZeroTotalOrderNo]);
      expect(records, "A single 0 TL order must match").toHaveLength(1);
      const [totalRows] = await db.execute(
        "SELECT COUNT(*) AS orderCount FROM `Order` o " +
          "JOIN Work w ON w.id = o.workId WHERE w.slug = ?",
        ["ci-browser-zero-total-work"],
      );
      expect(
        Number(totalRows[0].orderCount),
        "Concurrent checkout must not create a second order for this work",
      ).toBe(1);
      const record = records[0];
      expect(record.status).toBe("paid");
      expect(Number(record.finalAmount)).toBe(0);
      expect(Number(record.paymentCount)).toBe(0);
      expect(Number(record.consentCount)).toBe(1);
      expect(Number(record.legalSnapshotCount)).toBe(1);
      expect(Number(record.entitlementCount)).toBe(1);
      expect(Number(record.zeroGrossCount)).toBe(1);
      expect(Number(record.moneyMoveCount)).toBe(0);
    } finally {
      await db.end();
    }
  }

  const adminToken = authFixture.sessions?.admin;
  expect(adminToken, "Missing admin session fixture").toBeTruthy();
  await page.context().addCookies([
    { name: authFixture.cookieName, value: adminToken, url: authCookieUrl },
  ]);
  await page.setViewportSize(viewports.desktop);

  await page.goto(
    "/sistem-yonetimi/odeme-sistemi/siparisler?q=" + encodeURIComponent(completedZeroTotalOrderNo),
    { waitUntil: "domcontentloaded" },
  );
  await expect(page.getByRole("heading", { name: "Siparişler" })).toBeVisible();
  const orderRow = page.locator("table tbody tr").filter({ hasText: completedZeroTotalOrderNo });
  await expect(orderRow).toBeVisible();
  await expect(orderRow.getByText("0 TL edinildi", { exact: true })).toBeVisible();
  await expect(orderRow.getByText(/₺\s?0,00/u).first()).toBeVisible();

  await page.goto(
    "/sistem-yonetimi/finans-gelirler/finans-hareketleri?type=sale_gross&q=" + encodeURIComponent(completedZeroTotalOrderNo),
    { waitUntil: "domcontentloaded" },
  );
  await expect(page.getByRole("heading", { name: "Finans Hareketleri" })).toBeVisible();
  const financeRow = page.locator("table tbody tr").filter({ hasText: completedZeroTotalOrderNo });
  await expect(financeRow).toBeVisible();
  await expect(financeRow.getByText("sale_gross", { exact: true })).toBeVisible();
  await expect(financeRow.getByText(/₺\s?0,00/u).first()).toBeVisible();
});

test("authenticated commerce read-only boundaries smoke: admin sees refund payout and settings surfaces without execution controls", async ({ page }) => {
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
  await page.setViewportSize(viewports.desktop);

  await page.goto("/admin/odeme-sistemi/iadeler", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { name: "İadeler" })).toBeVisible();
  await expect(page.getByText("İade işlemi burada yürütülmüyor", { exact: true })).toBeVisible();
  await expect(page.locator("main.admin-content").getByRole("button", { name: /iade/i })).toHaveCount(0);
  await expectResponsiveDocument(page);

  await page.goto("/admin/finans-gelirler/yazar-odemeleri", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { name: "Yazar Ödemeleri" })).toBeVisible();
  await expect(page.getByText("Gerçek payout yürütümü kapalı", { exact: true })).toBeVisible();
  await expect(page.locator("main.admin-content").getByRole("button", { name: /ödeme|payout|başlat/i })).toHaveCount(0);
  await expectResponsiveDocument(page);

  await page.goto("/admin/odeme-sistemi/ayarlar", {
    waitUntil: "domcontentloaded",
  });
  await expect(page.getByRole("heading", { name: "Ayarlar" })).toBeVisible();
  await expect(page.getByText("Bu ekran durum görünümüdür", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: /kaydet|güncelle|etkinleştir|devre dışı|provider|sağlayıcı/i })).toHaveCount(0);
  await expectResponsiveDocument(page);
});

test("authenticated admin platform coupon mutation smoke: admin creates and pauses provider-independent campaign", async ({ page }) => {
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
  await page.setViewportSize(viewports.desktop);
  await page.goto("/admin/odeme-sistemi/kuponlar", {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByRole("heading", { name: "Kuponlar & Kampanyalar" }),
  ).toBeVisible();

  // Coupon management lives inside the dark admin shell. Light-commerce
  // component defaults must not produce white panels or white-on-white fields.
  const couponColors = await page.getByTestId("platform-coupon-create").evaluate((panel) => {
    const css = (selector, property) => {
      const element = panel.querySelector(selector);
      if (!element) throw new Error("Missing coupon contrast target: " + selector);
      return getComputedStyle(element)[property];
    };
    const panelColor = getComputedStyle(panel).backgroundColor;
    return {
      panelColor,
      heading: css("h2", "color"),
      field: css('input[name="code"]', "color"),
      fieldBackground: css('input[name="code"]', "backgroundColor"),
      placeholder: getComputedStyle(
        panel.querySelector('input[name="code"]'), "::placeholder",
      ).color,
    };
  });

  const relativeLuminance = (rgb) => {
    const channels = rgb.match(/[\d.]+/gu)?.slice(0, 3).map(Number);
    expect(channels, "Computed RGB channels should be available").toHaveLength(3);
    const linear = channels.map((channel) => {
      const normalized = channel / 255;
      return normalized <= 0.04045
        ? normalized / 12.92
        : ((normalized + 0.055) / 1.055) ** 2.4;
    });
    return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
  };
  const ratio = (one, two) => {
    const [bright, dark] = [relativeLuminance(one), relativeLuminance(two)]
      .sort((left, right) => right - left);
    return (bright + 0.05) / (dark + 0.05);
  };
  expect(relativeLuminance(couponColors.panelColor)).toBeLessThan(0.035);
  expect(ratio(couponColors.heading, couponColors.panelColor)).toBeGreaterThan(4.5);
  expect(ratio(couponColors.field, couponColors.fieldBackground)).toBeGreaterThan(4.5);
  expect(ratio(couponColors.placeholder, couponColors.fieldBackground)).toBeGreaterThan(4.5);
  await expect(page.getByTestId("platform-coupon-list")).toBeVisible();

  const couponCode = `CIADMIN${Date.now().toString(36).toUpperCase()}`;

  // Regression: an explicit invalid usage limit must not become "unlimited".
  await page.locator('input[name="code"]').fill(couponCode);
  await page.locator('input[name="discountValue"]').fill("15");
  const totalLimitInput = page.locator('input[name="totalUsageLimit"]');
  await totalLimitInput.evaluate((element) => element.removeAttribute("min"));
  await totalLimitInput.fill("0");
  await page.getByRole("button", { name: "Kampanyayı oluştur" }).click();
  await expect(page).toHaveURL(/durum=eksik-bilgi/u);
  await expect(
    page.getByText("Kampanya için gerekli alanları tamamlayın."),
  ).toBeVisible();

  // Clear the previous redirect so a stale matching flash cannot satisfy
  // the next assertion before its own server action has finished.
  await page.goto("/admin/odeme-sistemi/kuponlar", {
    waitUntil: "domcontentloaded",
  });

  // A submitted invalid per-user limit must never silently revert to 1.
  await page.locator('input[name="code"]').fill(couponCode);
  await page.locator('input[name="discountValue"]').fill("15");
  const perUserInput = page.locator('input[name="perUserUsageLimit"]');
  await perUserInput.evaluate((element) => element.removeAttribute("min"));
  await perUserInput.fill("0");
  await page.getByRole("button", { name: "Kampanyayı oluştur" }).click();
  await expect(page).toHaveURL(/durum=eksik-bilgi/u);
  await expect(
    page.getByText("Kampanya için gerekli alanları tamamlayın."),
  ).toBeVisible();

  await page.goto("/admin/odeme-sistemi/kuponlar", {
    waitUntil: "domcontentloaded",
  });

  // Native date controls enforce valid calendar input. Reversed valid dates
  // exercise the real submission flow without changing the DOM input type.
  await page.locator('input[name="code"]').fill(couponCode);
  await page.locator('input[name="discountValue"]').fill("15");
  await page.locator('input[name="startsAt"]').fill("2026-12-31");
  await page.locator('input[name="endsAt"]').fill("2026-12-30");
  await page.getByRole("button", { name: "Kampanyayı oluştur" }).click();
  await expect(page).toHaveURL(/durum=gecersiz-tarih/u);
  await expect(
    page.getByText("Bitiş tarihi başlangıç tarihinden önce olamaz."),
  ).toBeVisible();

  // No live records are created: all mutation tests use disposable CI data.
  await page.goto("/admin/odeme-sistemi/kuponlar", {
    waitUntil: "domcontentloaded",
  });
  await page.locator('input[name="code"]').fill(couponCode);
  await page.locator('input[name="discountValue"]').fill("15");
  await page.getByRole("button", { name: "Kampanyayı oluştur" }).click();

  await expect(page.getByText("İlkOku kampanya kuponu oluşturuldu.")).toBeVisible();

  let couponCard = page.locator("article").filter({ hasText: couponCode });
  await expect(couponCard).toBeVisible();
  await expect(couponCard.getByText("%15 indirim", { exact: false })).toBeVisible();
  await expect(couponCard.getByRole("button", { name: "Pasife al" })).toBeVisible();

  await couponCard.getByRole("button", { name: "Pasife al" }).click();

  await expect(page.getByText("Kupon durumu güncellendi.")).toBeVisible();
  couponCard = page.locator("article").filter({ hasText: couponCode });
  await expect(couponCard.getByRole("button", { name: "Aktif et" })).toBeVisible();
  await expectResponsiveDocument(page);
});

test("authenticated author coupon mutation smoke: writer creates and pauses own-work coupon", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");

  const token = authFixture.sessions?.writer;
  expect(token, "Missing writer session fixture").toBeTruthy();

  await page.context().addCookies([
    {
      name: authFixture.cookieName,
      value: token,
      url: authCookieUrl,
    },
  ]);
  await page.setViewportSize(viewports.phone430);
  await page.goto("/satis-erisim/kuponlar", {
    waitUntil: "domcontentloaded",
  });

  await expect(
    page.getByRole("heading", { name: "Yazar kuponu oluştur" }),
  ).toBeVisible();

  const couponCode = `CIWRITER${Date.now().toString(36).toUpperCase()}`;
  const prepareWriterCoupon = async () => {
    await page.locator('select[name="workId"]').selectOption({
      label: "CI Browser 0 TL Eser",
    });
    await page.locator('input[name="code"]').fill(couponCode);
    await page.locator('input[name="discountValue"]').fill("10");
  };

  await prepareWriterCoupon();
  const totalLimit = page.locator('input[name="totalUsageLimit"]');
  await totalLimit.evaluate((element) => element.removeAttribute("min"));
  await totalLimit.fill("0");
  await page.getByRole("button", { name: "Kupon oluştur" }).click();
  await expect(page).toHaveURL(/durum=eksik-bilgi/u);
  await expect(page.getByText("Kupon için gerekli alanları tamamlamalısın.")).toBeVisible();

  await page.goto("/satis-erisim/kuponlar", { waitUntil: "domcontentloaded" });
  await prepareWriterCoupon();
  const userLimit = page.locator('input[name="perUserUsageLimit"]');
  await userLimit.evaluate((element) => element.removeAttribute("min"));
  await userLimit.fill("0");
  await page.getByRole("button", { name: "Kupon oluştur" }).click();
  await expect(page).toHaveURL(/durum=eksik-bilgi/u);

  await page.goto("/satis-erisim/kuponlar", { waitUntil: "domcontentloaded" });
  await prepareWriterCoupon();
  await page.locator('input[name="startsAt"]').fill("2026-12-31");
  await page.locator('input[name="endsAt"]').fill("2026-12-30");
  await page.getByRole("button", { name: "Kupon oluştur" }).click();
  await expect(page).toHaveURL(/durum=gecersiz-tarih/u);

  await page.goto("/satis-erisim/kuponlar", { waitUntil: "domcontentloaded" });
  await prepareWriterCoupon();
  await page.getByRole("button", { name: "Kupon oluştur" }).click();

  let couponCard = page.locator("article").filter({ hasText: couponCode });
  await expect(couponCard).toBeVisible();
  await expect(couponCard.getByText("CI Browser 0 TL Eser", { exact: true })).toBeVisible();
  await expect(couponCard.getByText("%10", { exact: true })).toBeVisible();
  await expect(couponCard.getByText("Aktif", { exact: true })).toBeVisible();

  await couponCard.getByRole("button", { name: "Pasife al" }).click();

  couponCard = page.locator("article").filter({ hasText: couponCode });
  await expect(couponCard.getByText("Pasif", { exact: true })).toBeVisible();
  await expect(couponCard.getByRole("button", { name: "Aktif et" })).toBeVisible();
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
  // Multiple historic assignments can legitimately share one template title.
  // Always navigate to the contract created by this test, never an arbitrary match.
  const recipientContractLink = page.locator(`a[href="/sozlesmelerim/${contractId}"]`);
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

test("Power-SEO admin sitemap workflow renders real site inventory on mobile", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");
  const token = authFixture.sessions?.admin;
  expect(token, "Missing admin session fixture").toBeTruthy();
  await page.context().addCookies([{
    name: authFixture.cookieName,
    value: token,
    url: authCookieUrl,
  }]);
  await page.setViewportSize(viewports.phone390);
  const response = await page.goto("/sistem-yonetimi/power-seo", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Power-SEO", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "Tam Site ve HTTP", exact: true })).toHaveCount(1);
  await expect(page.getByRole("link", { name: "GSC ve API Bağlantıları", exact: true })).toHaveCount(1);
  await expect(page.getByRole("link", { name: "Tam Site ve HTTP", exact: true })).toBeVisible();
  await expect(page.getByRole("link", { name: "GSC ve API Bağlantıları", exact: true })).toBeVisible();
  // The default page must not dump the full technical inventory into the overview.
  await expect(page.getByRole("heading", { name: "Power-SEO modül envanteri" })).toHaveCount(0);
  await expectResponsiveDocument(page);

  await page.getByRole("link", { name: "Tam Site ve HTTP", exact: true }).click();
  await expect(page).toHaveURL(/sekme=tarama&mod=full-links/u);
  await expect(page.getByRole("link", { name: "Tam site / HTTP doğrulaması" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Parçalı bağlantı grafiği" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Yönlendirmeler" })).toBeVisible();
  await page.getByRole("link", { name: "Sitemap", exact: true }).click();
  await expect(page).toHaveURL(/mod=sitemap/u);
  await expect(page.getByRole("heading", { name: "Canlı sitemap doğrulaması" })).toBeVisible();
  await expect(page.getByText("Sitemap URL sayısı")).toBeVisible();
  await expectResponsiveDocument(page);
});

test("Power-SEO priority action audits both live public pages with admin session", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");
  test.setTimeout(60_000);
  const token = authFixture.sessions?.admin;
  expect(token, "Missing admin session fixture").toBeTruthy();
  await page.context().addCookies([{
    name: authFixture.cookieName,
    value: token,
    url: authCookieUrl,
  }]);
  await page.setViewportSize(viewports.phone390);

  const start = await page.goto("/sistem-yonetimi/power-seo?sekme=genel", {
    waitUntil: "domcontentloaded",
  });
  expect(start?.status()).toBe(200);

  // This is a genuine user-initiated read-only audit: no sitemap crawl,
  // publishing request, external indexing call, or browser response mock.
  await page.getByRole("link", {
    name: /İki öncelikli sayfanın canlı SEO kontrolünü çalıştır/u,
  }).click();
  await expect(page).toHaveURL(/sekme=genel&kontrol=oncelik/u);

  const results = page.locator('[aria-label="Canlı öncelikli Power-SEO sonuçları"]');
  await expect(results).toBeVisible();
  const cards = results.locator("article");
  await expect(cards).toHaveCount(2);

  for (const [index, path] of [
    "/nasil-calisir",
    "/yazarlar-icin/kurgu/roman",
  ].entries()) {
    const card = cards.nth(index);
    await expect(card.locator("h3")).toHaveText(path);
    await expect(card.locator("b", { hasText: "HTTP 200" })).toBeVisible();
    await expect(card.getByText("Canonical:", { exact: false })).toBeVisible();
  }
  await expect(results.getByRole("alert")).toHaveCount(0);
  await expectResponsiveDocument(page);
});

test("Power-SEO full sitemap scan requires admin and produces complete graph from batches", async ({ page }) => {
  const denied = await page.request.get("/api/admin/power-seo/scan?offset=0");
  expect(denied.status()).toBe(401);
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");

  const token = authFixture.sessions?.admin;
  expect(token).toBeTruthy();
  await page.context().addCookies([{
    name: authFixture.cookieName, value: token, url: authCookieUrl,
  }]);

  // Mock only the public page crawl payload for a deterministic browser exercise.
  // Real admin auth and dashboard HTML are still verified against the Next server.
  const siteUrls = [
    "https://ilkoku.com/",
    "https://ilkoku.com/nasil-calisir",
    "https://ilkoku.com/yardim",
    "https://ilkoku.com/hakkimizda",
  ];
  await page.route("**/api/admin/power-seo/scan?offset=0", async (route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({
        fingerprint: "ci-browser-graph",
        urls: siteUrls,
        offset: 0, nextOffset: 4, total: 4,
        items: siteUrls.map((url) => ({
          url, title: url === siteUrls[0] ? "İlkOku" : url.split("/").at(-1),
          links: siteUrls.filter((other) => other !== url),
          error: "",
        })),
      }),
    });
  });
  await page.setViewportSize({ width: 390, height: 844 });
  const pageResponse = await page.goto("/sistem-yonetimi/power-seo?mod=full-links", { waitUntil: "domcontentloaded" });
  expect(pageResponse?.status()).toBe(200);
  await expect(page.getByRole("heading", { name: "Tam site bağlantı denetimi", exact: true })).toBeVisible();
  const importTitle = page.getByText("Tamamlanmış Power-SEO JSON raporunu içeri al", { exact: true });
  const importButton = page.getByText("Dosya seç", { exact: true });
  await expect(importTitle).toBeVisible();
  await expect(importButton).toBeVisible();
  await expect(page.getByText("Henüz dosya seçilmedi", { exact: true })).toBeVisible();
  await expect(page.locator('input[type="file"][accept=".json,application/json"]')).toHaveCount(1);
  const titleBox = await importTitle.boundingBox();
  const buttonBox = await importButton.boundingBox();
  expect(titleBox).not.toBeNull();
  expect(buttonBox).not.toBeNull();
  expect(titleBox.y + titleBox.height).toBeLessThanOrEqual(buttonBox.y);
  await page.getByRole("button", { name: "Tam site taramasını başlat" }).click();
  await expect(page.getByText("Gerçek HTML çıktısı başarıyla okunan 4 sitemap sayfası")).toBeVisible();
  await expect(page.getByRole("button", { name: "JSON raporunu al" })).toBeEnabled();
  await expectResponsiveDocument(page);
});

test("Power-SEO provider checks are manual, protected and work at 390px", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");
  const token = authFixture.sessions?.admin;
  expect(token, "Missing admin session fixture").toBeTruthy();
  await page.context().addCookies([{ name: authFixture.cookieName, value: token, url: authCookieUrl }]);
  await page.setViewportSize(viewports.phone390);
  let calls = 0;
  await page.route("**/api/admin/power-seo/providers", async (route) => {
    calls++;
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({ provider: "gsc", state: "verified", source: "CI mock", sampledPages: 1 }),
    });
  });
  await page.goto("/sistem-yonetimi/power-seo", { waitUntil: "domcontentloaded" });
  await page.getByRole("link", { name: "GSC ve API Bağlantıları", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Canlı servis sorguları — yönetici başlatır" })).toBeVisible();
  expect(calls).toBe(0);
  await page.getByRole("button", { name: "GSC verisini sorgula" }).click();
  await expect(page.getByText("Gerçek API yanıtı alındı")).toBeVisible();
  expect(calls).toBe(1);
  await expectResponsiveDocument(page);
});

test("Power-SEO POST validates the public origin under reverse proxy", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");
  const token = authFixture.sessions?.admin;
  expect(token).toBeTruthy();
  await page.context().addCookies([{ name: authFixture.cookieName, value: token, url: authCookieUrl }]);
  const allowed = await page.request.post("/api/admin/power-seo/providers", {
    headers: { Origin: "https://ilkoku.com" },
    data: { provider: "invalid-provider" },
  });
  expect(allowed.status()).toBe(400);
  expect((await allowed.json()).message).toBe("Bilinmeyen servis.");

  const rejected = await page.request.post("/api/admin/power-seo/providers", {
    headers: { Origin: "https://another.example" },
    data: { provider: "invalid-provider" },
  });
  expect(rejected.status()).toBe(403);
});

test("third-level links open in the RIGHT panel; mobile and Power-SEO stay usable", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");
  const token = authFixture.sessions?.admin;
  expect(token, "Missing admin session fixture").toBeTruthy();
  await page.context().addCookies([{ name: authFixture.cookieName, value: token, url: authCookieUrl }]);
  await page.setViewportSize(viewports.desktop);
  await page.goto("/sistem-yonetimi", { waitUntil: "domcontentloaded" });

  const sidebar = page.locator(".admin-sidebar");
  await sidebar.getByRole("button", { name: "Eser & İçerik", exact: true }).click();
  const panel = page.locator(".admin-secondary-panel");
  await expect(panel.getByRole("button", { name: "İçerik Yönetimi alt menüsünü aç" })).toHaveAttribute("aria-expanded", "false");
  await expect(panel.locator('a[href="/icerik/seo"]')).toBeHidden();
  await panel.getByRole("button", { name: "İçerik Yönetimi alt menüsünü aç" }).click();
  await expect(panel.locator('a[href="/icerik/seo"]')).toBeVisible();
  await expect(panel.locator('a[href="/icerik/rehber"]')).toBeVisible();
  await expect(sidebar.locator(".admin-nav-child")).toHaveCount(0);

  const color = await page.locator(".admin-shell").evaluate((node) => getComputedStyle(node).color);
  expect(color).toBe("rgb(248, 250, 252)");
  await page.setViewportSize(viewports.phone390);
  await page.getByRole("button", { name: "Menüyü aç" }).click();
  await expect(sidebar.getByRole("button", { name: "Eser & İçerik", exact: true })).toBeVisible();
  await expect(panel.locator('a[href="/icerik/seo"]')).toBeVisible();
  await expectResponsiveDocument(page);
  await page.goto("/sistem-yonetimi/power-seo", { waitUntil: "domcontentloaded" });
  await expect(page.getByRole("link", { name: "Tam Site ve HTTP", exact: true })).toHaveCount(1);
});

test("admin header leaves Hesabım and Çıkış unchanged; duplicate topbar shortcut and audit CTA are absent", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");
  const token = authFixture.sessions?.admin;
  expect(token, "Missing admin session fixture").toBeTruthy();
  await page.context().addCookies([{ name: authFixture.cookieName, value: token, url: authCookieUrl }]);

  for (const viewport of [viewports.desktop, viewports.phone390]) {
    await page.setViewportSize(viewport);
    await page.goto("/sistem-yonetimi", { waitUntil: "domcontentloaded" });
    await expect(page.locator('.admin-topbar a[href="/icerik"]')).toHaveCount(0);
    await expect(page.locator('.admin-topbar a[href="/hesabim"]')).toHaveCount(1);
    await expect(page.locator('.admin-topbar button[aria-label="Çıkış yap"]')).toHaveCount(1);
    await expect(page.getByRole("link", { name: "Sistem hareketlerini aç" })).toHaveCount(0);
    await expect(page.locator('.admin-topbar a[aria-label="Sistem hareketlerini görüntüle"]')).toHaveCount(1);
    await expect(page.locator(".admin-sidebar .admin-nav-group")).toHaveCount(7);
    await expectResponsiveDocument(page);
  }
  await page.setViewportSize(viewports.desktop);
  await page.locator(".admin-sidebar").getByRole("button", { name: "Eser & İçerik", exact: true }).click();
  await expect(page.locator(".admin-secondary-panel").getByRole("link", { name: "İçerik Yönetimi", exact: true })).toBeVisible();
  await page.locator(".admin-sidebar").getByRole("button", { name: "Güvenlik & Sistem", exact: true }).click();
  await expect(page.locator(".admin-secondary-panel").getByRole("link", { name: "Audit Log", exact: true })).toBeVisible();
});

test("dashboard shows live metrics without six duplicated management-center cards", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");
  const token = authFixture.sessions?.admin;
  expect(token, "Missing admin session fixture").toBeTruthy();
  await page.context().addCookies([{ name: authFixture.cookieName, value: token, url: authCookieUrl }]);

  for (const viewport of [viewports.desktop, viewports.phone390]) {
    await page.setViewportSize(viewport);
    await page.goto("/sistem-yonetimi", { waitUntil: "domcontentloaded" });
    await expect(page.locator(".admin-control-centers, .admin-control-center")).toHaveCount(0);
    await expect(page.getByText("Nereye gitmek istiyorsun?")).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Anlık platform özeti" })).toBeVisible();
    await expect(page.locator(".admin-sidebar .admin-nav-group")).toHaveCount(7);
    await expect(page.locator('.admin-topbar a[href="/hesabim"]')).toHaveCount(1);
    await expect(page.locator('.admin-topbar button[aria-label="Çıkış yap"]')).toHaveCount(1);
    await expectResponsiveDocument(page);
  }
  await page.setViewportSize(viewports.desktop);
  await page.locator(".admin-sidebar").getByRole("button", { name: "Eser & İçerik", exact: true }).click();
  await expect(page.locator(".admin-secondary-panel").getByRole("link", { name: "İçerik Yönetimi", exact: true })).toBeVisible();
});

test("horizontal admin strips visibly separate heading, links, active item and close control", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");
  const token = authFixture.sessions?.admin;
  expect(token, "Missing admin fixture").toBeTruthy();
  await page.context().addCookies([{ name: authFixture.cookieName, value: token, url: authCookieUrl }]);

  for (const viewport of [viewports.desktop, viewports.phone390]) {
    await page.setViewportSize(viewport);
    await page.goto("/sistem-yonetimi/kullanicilar", { waitUntil: "domcontentloaded" });
    const panel = page.locator(".admin-secondary-panel");
    await expect(panel).toBeVisible();
    const borders = await panel.evaluate((element) => {
      const heading = element.querySelector(".admin-secondary-panel__heading");
      const close = heading?.querySelector("button");
      const selected = element.querySelector('.admin-secondary-panel__items a.is-active');
      const first = element.querySelector('.admin-secondary-panel__items .admin-nav-child__header a');
      if (!heading || !close || !selected || !first) return null;
      const paint = (node) => {
        const style = getComputedStyle(node);
        return {
          borderTop: style.borderTopWidth,
          borderBottom: style.borderBottomWidth,
          borderLeft: style.borderLeftWidth,
          borderColor: style.borderColor,
          shadow: style.boxShadow,
        };
      };
      return {
        panel: paint(element),
        heading: paint(heading),
        close: paint(close),
        first: paint(first),
        selected: paint(selected),
      };
    });
    expect(borders).not.toBeNull();
    expect(borders.panel.borderTop).toBe("1px");
    expect(borders.panel.borderBottom).toBe("1px");
    expect(borders.heading.borderBottom).toBe("1px");
    expect(borders.close.borderLeft).toBe("1px");
    expect(borders.first.borderTop).toBe("1px");
    expect(borders.selected.shadow).toContain("inset");
    await expect(page.locator('.admin-topbar a[href="/hesabim"]')).toHaveCount(1);
    await expect(page.locator('.admin-topbar button[aria-label="Çıkış yap"]')).toHaveCount(1);
    await expectResponsiveDocument(page);
  }
});

test("user directory fits complete name and e-mail as two smaller readable lines", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");
  const token = authFixture.sessions?.admin;
  expect(token, "Missing admin fixture").toBeTruthy();
  await page.context().addCookies([{ name: authFixture.cookieName, value: token, url: authCookieUrl }]);

  for (const viewport of [viewports.desktop, viewports.phone390]) {
    await page.setViewportSize(viewport);
    await page.goto("/sistem-yonetimi/kullanicilar", { waitUntil: "domcontentloaded" });
    const userCell = page.locator(".admin-users-table tbody tr td:nth-child(2)").first();
    await expect(userCell.locator(":scope > strong")).not.toBeEmpty();
    await expect(userCell.locator(":scope > span")).not.toBeEmpty();
    const style = await userCell.evaluate((cell) => {
      const name = cell.querySelector(":scope > strong");
      const email = cell.querySelector(":scope > span");
      if (!name || !email) return null;
      const nameStyle = getComputedStyle(name);
      const emailStyle = getComputedStyle(email);
      const nameBox = name.getBoundingClientRect();
      const emailBox = email.getBoundingClientRect();
      const cellBox = cell.getBoundingClientRect();
      return {
        nameSize: parseFloat(nameStyle.fontSize),
        emailSize: parseFloat(emailStyle.fontSize),
        nameDisplay: nameStyle.display,
        emailDisplay: emailStyle.display,
        nameWrap: nameStyle.overflowWrap,
        emailWrap: emailStyle.overflowWrap,
        nameBottom: nameBox.bottom,
        emailTop: emailBox.top,
        nameRight: nameBox.right,
        emailRight: emailBox.right,
        cellRight: cellBox.right,
      };
    });
    expect(style).not.toBeNull();
    expect(style.nameSize).toBeLessThan(16);
    expect(style.emailSize).toBeLessThan(14);
    expect(style.nameDisplay).toBe("block");
    expect(style.emailDisplay).toBe("block");
    expect(style.nameWrap).toBe("anywhere");
    expect(style.emailWrap).toBe("anywhere");
    expect(style.nameBottom).toBeLessThanOrEqual(style.emailTop + 1);
    expect(style.nameRight).toBeLessThanOrEqual(style.cellRight + 1);
    expect(style.emailRight).toBeLessThanOrEqual(style.cellRight + 1);
    await expect(page.locator('.admin-topbar a[href="/hesabim"]')).toHaveCount(1);
    await expect(page.locator('.admin-topbar button[aria-label="Çıkış yap"]')).toHaveCount(1);
    await expectResponsiveDocument(page);
  }
});

test("secondary navigation is horizontal above the content on desktop and mobile", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");
  const token = authFixture.sessions?.admin;
  expect(token, "Missing admin fixture").toBeTruthy();
  await page.context().addCookies([{ name: authFixture.cookieName, value: token, url: authCookieUrl }]);

  for (const viewport of [viewports.desktop, viewports.phone390]) {
    await page.setViewportSize(viewport);
    await page.goto("/sistem-yonetimi/kullanicilar", { waitUntil: "domcontentloaded" });
    const sidebar = page.locator(".admin-sidebar");
    const panel = page.locator(".admin-secondary-panel");
    await expect(sidebar.locator(".admin-nav-group")).toHaveCount(7);
    await expect(sidebar.getByRole("button", { name: "Kullanıcı & Roller", exact: true })).toHaveAttribute("aria-expanded", "true");
    await expect(panel.locator(".admin-nav-child")).toHaveCount(8);
    await expect(panel.locator(".admin-secondary-panel__items")).toHaveCSS("flex-direction", "row");
    const geometry = await page.evaluate(() => {
      const nav = document.querySelector(".admin-secondary-panel");
      const content = document.querySelector(".admin-content");
      const first = document.querySelectorAll(".admin-secondary-panel .admin-nav-child");
      if (!nav || !content || first.length < 2) return null;
      return {
        panelBottom: nav.getBoundingClientRect().bottom,
        contentTop: content.getBoundingClientRect().top,
        firstTop: first[0].getBoundingClientRect().top,
        secondTop: first[1].getBoundingClientRect().top,
      };
    });
    expect(geometry).not.toBeNull();
    expect(geometry.panelBottom).toBeLessThanOrEqual(geometry.contentTop + 4);
    expect(Math.abs(geometry.firstTop - geometry.secondTop)).toBeLessThan(4);
    await expect(page.locator('.admin-topbar a[href="/hesabim"]')).toHaveCount(1);
    await expect(page.locator('.admin-topbar button[aria-label="Çıkış yap"]')).toHaveCount(1);
    await expectResponsiveDocument(page);
  }

  await page.setViewportSize(viewports.desktop);
  await page.goto("/icerik/seo", { waitUntil: "domcontentloaded" });
  const panel = page.locator(".admin-secondary-panel");
  await expect(panel.getByRole("button", { name: "İçerik Yönetimi alt menüsünü kapat" })).toHaveAttribute("aria-expanded", "true");
  await expect(panel.locator(".admin-tertiary-row")).toHaveCSS("flex-direction", "row");
  await expect(panel.locator('.admin-tertiary-row a[href="/icerik/seo"]')).toBeVisible();
  await panel.getByRole("button", { name: "İçerik Yönetimi alt menüsünü kapat" }).click();
  await expect(panel.locator('.admin-tertiary-row a[href="/icerik/seo"]')).toBeHidden();
  await panel.getByRole("button", { name: "İçerik Yönetimi alt menüsünü aç" }).click();
  await expect(panel.locator('.admin-tertiary-row a[href="/icerik/seo"]')).toBeVisible();
  await expectResponsiveDocument(page);
});

test("communications workspaces render complete tabular rows on 390px and desktop", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");
  const token = authFixture.sessions?.admin;
  expect(token, "Missing admin session").toBeTruthy();
  await page.context().addCookies([{ name: authFixture.cookieName, value: token, url: authCookieUrl }]);

  const scenarios = [
    { path: "/sozlesme", selector: ".contract-list-table table" },
    { path: "/sozlesme/takip", selector: ".contract-table-wrap table" },
    { path: "/sozlesme/sablonlar", selector: ".contract-list-table table" },
    { path: "/sozlesme/taslaklar", selector: ".contract-list-table table" },
    { path: "/sozlesme/inceleme", selector: ".contract-list-table table" },
    { path: "/sozlesme/hukuk-inceleme", selector: ".contract-legal-pack-index table" },
    { path: "/sozlesme/bildirimler", selector: ".contract-notification-table-head" },
    { path: "/sistem-yonetimi/epostalar", selector: ".admin-data-table.admin-email-table" },
    { path: "/sistem-yonetimi/eposta-operasyonlari", selector: ".admin-email-operations-rule-grid" },
  ];

  test.setTimeout(120000);
  for (const scenario of scenarios) {
    await page.setViewportSize(viewports.phone390);
    const response = await page.goto(scenario.path, { waitUntil: "domcontentloaded" });
    expect(response?.status(), `page ${scenario.path}`).toBeLessThan(400);
    await expect(page.locator(scenario.selector), scenario.path).toBeVisible();
    await expectResponsiveDocument(page);
  }

  await page.setViewportSize(viewports.desktop);
  await page.goto("/sozlesme/sablonlar", { waitUntil: "domcontentloaded" });
  const table = page.locator(".contract-list-table table");
  await expect(table).toBeVisible();
  await expect(table.locator("thead th")).toHaveCount(7);
  await expect(page.locator(".admin-sidebar .admin-nav-group")).toHaveCount(7);
  await expect(page.locator('.admin-profile__logout[href="/hesabim"]')).toBeVisible();
  await expectResponsiveDocument(page);
});

test("contract overview and tracking clamp page ranges, preserve URL filters and never overflow mobile", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");
  const token = authFixture.sessions?.admin;
  expect(token, "Missing admin session").toBeTruthy();
  await page.context().addCookies([{ name: authFixture.cookieName, value: token, url: authCookieUrl }]);

  const cases = [
    { path: "/sozlesme?sayfa=999999&gecmisSayfa=999999", labels: [
      "Gönderilen sözleşme sayfaları",
      "Tarihsel yayınevi sözleşmesi sayfaları",
    ] },
    { path: "/sozlesme/takip?akis=registration&q=ilkoku&sayfa=999999", labels: [
      "Takip merkezi sözleşme sayfaları",
    ] },
    { path: "/sozlesme/takip?akis=waiting&sayfa=-10", labels: [
      "Takip merkezi sözleşme sayfaları",
    ] },
  ];
  for (const scenario of cases) {
    await page.setViewportSize(viewports.phone390);
    const response = await page.goto(scenario.path, { waitUntil: "domcontentloaded" });
    expect(response?.status(), scenario.path).toBe(200);
    for (const label of scenario.labels) {
      const pager = page.getByRole("navigation", { name: label });
      await expect(pager).toBeVisible();
      await expect(pager).toContainText("Sayfa");
      await expect(pager).toContainText("toplam kayıt");
    }
    await expectResponsiveDocument(page);
  }

  await page.setViewportSize(viewports.desktop);
  await page.goto("/sozlesme/takip?akis=accepted", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".contract-tracking-filters select[name=akis]")).toHaveValue("accepted");
  await expect(page.getByRole("navigation", { name: "Takip merkezi sözleşme sayfaları" })).toBeVisible();
  await expect(page.locator(".contract-table-wrap table")).toBeVisible();
});

test("email operations keeps historical tests separate and requires retry confirmation", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");
  const token = authFixture.sessions?.admin;
  expect(token, "Missing admin browser session").toBeTruthy();
  await page.context().addCookies([{ name: authFixture.cookieName, value: token, url: authCookieUrl }]);
  await page.setViewportSize(viewports.phone390);

  const response = await page.goto("/sistem-yonetimi/eposta-operasyonlari", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);
  for (const label of [
    "Geçmiş sistem testi hatası", "Bildirim hatası", "Son 24 saatte çözümlenmemiş",
    "Son SMTP sağlayıcı kabulü", "Çözümlenmemiş hata", "Son 1 saat hata",
  ]) {
    await expect(page.getByText(label, { exact: true })).toBeVisible();
  }
  const checkboxes = page.locator('.admin-email-retry-form input[name="retryConfirmed"]');
  const count = await checkboxes.count();
  for (let i = 0; i < count; i += 1) {
    await expect(checkboxes.nth(i)).toHaveAttribute("required", "");
    await expect(checkboxes.nth(i)).not.toBeChecked();
  }
  await expectResponsiveDocument(page);
});

test("fixed LEFT seven headings and RIGHT 25 submenus: responsive accept and screenshots", async ({ page }, testInfo) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");
  const token = authFixture.sessions?.admin;
  expect(token, "Missing admin session fixture").toBeTruthy();
  await page.context().addCookies([{ name: authFixture.cookieName, value: token, url: authCookieUrl }]);
  await page.setViewportSize(viewports.desktop);
  await page.goto("/sistem-yonetimi", { waitUntil: "domcontentloaded" });

  const sidebar = page.locator(".admin-sidebar");
  const panel = page.locator(".admin-secondary-panel");
  const labels = ["Genel Bakış", "Kullanıcı & Roller", "Eser & İçerik", "Ticaret & Finans", "İletişim & Sözleşmeler", "Güvenlik & Sistem", "Arşiv & Ayarlar"];
  await expect(sidebar.locator(".admin-nav-group")).toHaveCount(7);
  await expect(sidebar.locator(".admin-nav-child")).toHaveCount(0);
  await expect(panel).toHaveCount(0);
  const fixedLeft = await sidebar.evaluate((node) => getComputedStyle(node).position);
  expect(fixedLeft).toBe("fixed");

  for (const group of labels) {
    await sidebar.getByRole("button", { name: group, exact: true }).click();
    await expect(panel).toBeVisible();
    await expect(panel.locator(".admin-nav-child")).toHaveCount(
      ({ "Genel Bakış": 1, "Kullanıcı & Roller": 8, "Eser & İçerik": 3, "Ticaret & Finans": 2, "İletişim & Sözleşmeler": 3, "Güvenlik & Sistem": 4, "Arşiv & Ayarlar": 4 })[group],
    );
    await expect(sidebar.locator(".admin-nav-child")).toHaveCount(0);
  }

  const cases = [
    ["Eser & İçerik", "İçerik Yönetimi", "/icerik/seo"],
    ["Ticaret & Finans", "Ödeme Sistemi", "/sistem-yonetimi/odeme-sistemi/siparisler"],
    ["Ticaret & Finans", "Finans & Gelirler", "/sistem-yonetimi/finans-gelirler/mutabakat"],
    ["İletişim & Sözleşmeler", "Sözleşme Yönetimi", "/sozlesme/sablonlar"],
    ["Güvenlik & Sistem", "Sistem Haritası", "/harita/rotalar"],
    ["Güvenlik & Sistem", "Power-SEO", "/sistem-yonetimi/power-seo?sekme=teknik"],
  ];
  let activeGroup = "Arşiv & Ayarlar";
  for (const [group, label, href] of cases) {
    if (activeGroup !== group) {
      await sidebar.getByRole("button", { name: group, exact: true }).click();
      activeGroup = group;
    }
    await panel.getByRole("button", { name: `${label} alt menüsünü aç` }).click();
    const link = panel.locator(`a[href="${href}"]`);
    await expect(link).toBeVisible();
    await panel.getByRole("button", { name: `${label} alt menüsünü kapat` }).click();
    await expect(link).toBeHidden();
  }
  await sidebar.getByRole("button", { name: "Eser & İçerik", exact: true }).click();
  await panel.getByRole("button", { name: "İçerik Yönetimi alt menüsünü aç" }).click();
  await panel.locator('.admin-nav-child__items a[href="/icerik"]').scrollIntoViewIfNeeded();
  await expect(panel.locator('.admin-nav-child__items a[href="/icerik"]')).toBeInViewport();
  await expect(sidebar.locator(".admin-nav-child")).toHaveCount(0);
  await page.screenshot({ path: testInfo.outputPath("fixed-left-right-menu-desktop.png"), animations: "disabled" });
  await page.setViewportSize(viewports.phone390);
  await page.getByRole("button", { name: "Menüyü aç" }).click();
  await expect(sidebar.locator(".admin-nav-group")).toHaveCount(7);
  await expect(panel.locator('a[href="/icerik/seo"]')).toBeVisible();
  await expectResponsiveDocument(page);
  await page.screenshot({ path: testInfo.outputPath("fixed-left-main-mobile390.png"), animations: "disabled" });
  await page.getByRole("button", { name: "Menüyü kapat" }).click({ position: { x: 350, y: 500 } });
  await expect(panel).toBeVisible();
  await panel.locator('a[href="/icerik/seo"]').scrollIntoViewIfNeeded();
  await expect(panel.locator('a[href="/icerik/seo"]')).toBeInViewport();
  await expectResponsiveDocument(page);
  await page.screenshot({ path: testInfo.outputPath("fixed-right-menu-mobile390.png"), animations: "disabled" });

  await page.getByRole("button", { name: "Menüyü aç" }).click();
  await sidebar.getByRole("button", { name: "Kullanıcı & Roller", exact: true }).click();
  await expect(panel.getByRole("link", { name: "Kullanıcılar", exact: true })).toBeVisible();
  await expect(sidebar.locator(".admin-nav-child")).toHaveCount(0);
  await panel.getByRole("button", { name: "Kullanıcı & Roller alt menüsünü kapat" }).click();
  await expect(panel).toHaveCount(0);
});

test("all four admin workspaces share exactly one main sidebar and one right submenu", async ({ page }, testInfo) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");
  const token = authFixture.sessions?.admin;
  expect(token, "Missing admin browser session").toBeTruthy();
  await page.context().addCookies([{ name: authFixture.cookieName, value: token, url: authCookieUrl }]);
  await page.setViewportSize(viewports.desktop);
  const cases = [
    { path: "/sistem-yonetimi", group: "Genel Bakış", second: "Kontrol Merkezi" },
    { path: "/icerik", group: "Eser & İçerik", second: "İçerik Yönetimi", third: "/icerik/seo" },
    { path: "/icerik/seo", group: "Eser & İçerik", second: "İçerik Yönetimi", third: "/icerik/seo" },
    { path: "/harita", group: "Güvenlik & Sistem", second: "Sistem Haritası", third: "/harita/rotalar" },
    { path: "/harita/rotalar", group: "Güvenlik & Sistem", second: "Sistem Haritası", third: "/harita/rotalar" },
    { path: "/sozlesme", group: "İletişim & Sözleşmeler", second: "Sözleşme Yönetimi", third: "/sozlesme/takip" },
    { path: "/sozlesme/takip", group: "İletişim & Sözleşmeler", second: "Sözleşme Yönetimi", third: "/sozlesme/takip" },
  ];
  for (const scenario of cases) {
    const response = await page.goto(scenario.path, { waitUntil: "domcontentloaded" });
    expect(response?.status(), scenario.path).toBeLessThan(400);
    await expect(page.locator(".admin-shell")).toHaveCount(1);
    await expect(page.locator(".admin-sidebar")).toHaveCount(1);
    await expect(page.locator(".admin-nav-group")).toHaveCount(7);
    await expect(page.locator(".admin-secondary-panel")).toHaveCount(scenario.path === "/sistem-yonetimi" ? 0 : 1);
    await expect(page.locator(".admin-sidebar .admin-nav-child")).toHaveCount(0);
    await expect(page.locator(".content-sidebar, .system-map-primary-nav, .contract-management-sidebar")).toHaveCount(0);
    if (scenario.path !== "/sistem-yonetimi") {
      const group = page.locator(".admin-sidebar").getByRole("button", { name: scenario.group, exact: true });
      await expect(group).toHaveAttribute("aria-expanded", "true");
      await expect(page.locator(".admin-secondary-panel").getByRole("link", { name: scenario.second, exact: true })).toBeVisible();
    }
    if (scenario.third) {
      const panel = page.locator(".admin-secondary-panel");
      await expect(panel.getByRole("button", { name: scenario.second + " alt menüsünü kapat" })).toHaveAttribute("aria-expanded", "true");
      await expect(page.locator(`.admin-secondary-panel .admin-nav-child__items a[href="${scenario.third}"]`)).toBeVisible();
    }
    await expectResponsiveDocument(page);
  }
  await page.screenshot({ path: testInfo.outputPath("unified-admin-contracts-desktop.png"), animations: "disabled" });
  await page.setViewportSize(viewports.phone390);
  await page.goto("/icerik", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".admin-secondary-panel")).toBeVisible();
  await expect(page.locator(".content-shell--unified")).toHaveCSS("color", "rgb(23, 21, 33)");
  await page.getByRole("button", { name: "Menüyü aç" }).click();
  await expect(page.locator(".admin-sidebar .admin-nav-group")).toHaveCount(7);
  await page.screenshot({ path: testInfo.outputPath("unified-admin-cms-mobile-drawer.png"), animations: "disabled" });
  await page.getByRole("button", { name: "Menüyü kapat" }).click({ position: { x: 350, y: 500 } });
  await expect(page.locator(".admin-secondary-panel")).toBeVisible();
  await expectResponsiveDocument(page);
  await page.screenshot({ path: testInfo.outputPath("unified-admin-cms-mobile-workspace.png"), animations: "disabled" });
  for (const specialist of ["/harita/rotalar", "/sozlesme/takip"]) {
    await page.goto(specialist, { waitUntil: "domcontentloaded" });
    await expect(page.locator(".admin-shell")).toHaveCount(1);
    await expect(page.locator(".admin-sidebar .admin-nav-group")).toHaveCount(7);
    await expect(page.locator(".admin-secondary-panel")).toBeVisible();
    await expect(page.locator(".system-map-primary-nav, .contract-management-sidebar")).toHaveCount(0);
    await expectResponsiveDocument(page);
  }
});

test("CMS manager without system admin role keeps dedicated CMS interface", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");
  const token = authFixture.sessions?.cmsManager;
  expect(token, "CMS manager fixture missing").toBeTruthy();
  await page.context().addCookies([{ name: authFixture.cookieName, value: token, url: authCookieUrl }]);
  await page.goto("/icerik", { waitUntil: "domcontentloaded" });
  await expect(page.locator(".content-sidebar")).toHaveCount(1);
  await expect(page.locator(".admin-shell")).toHaveCount(0);
  await page.goto("/harita", { waitUntil: "domcontentloaded" });
  await expect(page).toHaveURL(/\/erisim-reddedildi/);
});

test("admin navigation distinguishes Power-SEO tabs and hides CMS utility routes", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");
  test.setTimeout(90_000);
  const token = authFixture.sessions?.admin;
  expect(token, "Missing admin session fixture").toBeTruthy();
  await page.context().addCookies([{ name: authFixture.cookieName, value: token, url: authCookieUrl }]);
  await page.setViewportSize(viewports.desktop);

  for (const href of [
    "/sistem-yonetimi/power-seo",
    "/sistem-yonetimi/power-seo?sekme=tarama&mod=full-links",
    "/sistem-yonetimi/power-seo?sekme=sayfa",
    "/sistem-yonetimi/power-seo?sekme=servisler",
    "/sistem-yonetimi/power-seo?sekme=teknik",
  ]) {
    await page.goto(href, { waitUntil: "domcontentloaded" });
    const panel = page.locator(".admin-secondary-panel");
    await expect(panel.getByRole("button", { name: "Power-SEO alt menüsünü kapat" })).toHaveAttribute("aria-expanded", "true");
    const active = panel.locator('.admin-nav-child__items a.is-active[href^="/sistem-yonetimi/power-seo"]');
    await expect(active).toHaveCount(1);
    await expect(active).toHaveAttribute("href", href);
  }


  // Nested modes stay under the "Tam Site ve HTTP" second-level section.
  // Old ?mod= and ?yol= deep links must select the same section as the page.
  for (const [path, selectedHref] of [
    ["/sistem-yonetimi/power-seo?sekme=tarama&mod=sitemap", "/sistem-yonetimi/power-seo?sekme=tarama&mod=full-links"],
    ["/sistem-yonetimi/power-seo?sekme=tarama&mod=links&parca=1", "/sistem-yonetimi/power-seo?sekme=tarama&mod=full-links"],
    ["/sistem-yonetimi/power-seo?sekme=tarama&mod=redirects", "/sistem-yonetimi/power-seo?sekme=tarama&mod=full-links"],
    ["/sistem-yonetimi/power-seo?mod=sitemap", "/sistem-yonetimi/power-seo?sekme=tarama&mod=full-links"],
    ["/sistem-yonetimi/power-seo?yol=%2Fnasil-calisir", "/sistem-yonetimi/power-seo?sekme=sayfa"],
    ["/sistem-yonetimi/power-seo?sekme=genel&kaynak=yonetim", "/sistem-yonetimi/power-seo"],
  ]) {
    await page.goto(path, { waitUntil: "domcontentloaded" });
    const panel = page.locator(".admin-secondary-panel");
    await expect(panel.getByRole("button", { name: "Power-SEO alt menüsünü kapat" })).toHaveAttribute("aria-expanded", "true");
    const active = panel.locator('.admin-nav-child__items a.is-active[href^="/sistem-yonetimi/power-seo"]');
    await expect(active).toHaveCount(1);
    await expect(active).toHaveAttribute("href", selectedHref);
  }

  await page.goto("/icerik", { waitUntil: "domcontentloaded" });
  const panel = page.locator(".admin-secondary-panel");
  await expect(panel.getByRole("button", { name: "İçerik Yönetimi alt menüsünü kapat" })).toHaveAttribute("aria-expanded", "true");
  await expect(panel.locator('a[href="/icerik/seo"]')).toBeVisible();
  await expect(panel.locator('a[href="/icerik/ana-sayfa/history"]')).toHaveCount(0);
  await expect(panel.locator('a[href="/icerik/sayfalar/sablonlar"]')).toHaveCount(0);
  await expectResponsiveDocument(page);
});


test("deletion center category cards open the selected row-column screen on desktop and 390px", async ({ page }) => {
  test.skip(!authFixture, "Authenticated browser fixture is not configured.");
  test.setTimeout(120_000);
  const token = authFixture.sessions?.admin;
  expect(token, "Missing admin session fixture").toBeTruthy();
  await page.context().addCookies([{ name: authFixture.cookieName, value: token, url: authCookieUrl }]);

  const sections = [
    { key: "yazar", title: "Yazar silme", label: "Yazar silme kayıtları", columns: ["Yazar", "E-posta", "Eser", "Yayınevi başvurusu", "Silme onayı"] },
    { key: "eser", title: "Eser silme", label: "Eser silme kayıtları", columns: ["Eser", "Yazar", "Bölüm", "Aktif erişim", "Başarılı sipariş", "Silme onayı"] },
    { key: "yayinevi", title: "Yayınevi silme", label: "Yayınevi silme kayıtları", columns: ["Yayınevi", "Slug", "Aktif üye", "Başvuru", "Silme onayı"] },
    { key: "editor", title: "Editör silme", label: "Editör silme kayıtları", columns: ["Editör", "E-posta", "Aktif inceleme", "Tamamlanan rapor", "Silme onayı"] },
  ];

  for (const viewport of [viewports.desktop, viewports.phone390]) {
    await page.setViewportSize(viewport);
    const response = await page.goto("/sistem-yonetimi/silme-merkezi", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    await expect(page.getByRole("heading", { name: "Silme Merkezi", exact: true })).toBeVisible();
    await expect(page.getByRole("note")).toContainText("Güvenli silme kullanılıyor.");
    await expect(page.locator(".admin-deletion-center .admin-delete-card")).toHaveCount(0);
    const picker = page.getByRole("navigation", { name: "Silinebilir kayıt türü seçimi" });
    await expect(picker.getByRole("link")).toHaveCount(4);
    await expect(picker.locator('a[href*="bolum=yazar"]')).toHaveAttribute("aria-current", "page");

    for (const scenario of sections) {
      const card = picker.locator('a[href*="bolum=' + scenario.key + '"]');
      await card.click();
      await expect(page).toHaveURL(new RegExp("bolum=" + scenario.key));
      await expect(card).toHaveAttribute("aria-current", "page");
      await expect(picker.locator('a[aria-current="page"]')).toHaveCount(1);
      const section = page.locator(".admin-delete-section");
      await expect(section).toHaveCount(1);
      await expect(section.getByRole("heading", { name: scenario.title, exact: true })).toBeVisible();

      const table = section.getByRole("table");
      if (await table.count()) {
        const region = section.getByRole("region", { name: scenario.label });
        await expect(region).toHaveCount(1);
        await expect(table.locator("thead tr")).toHaveCount(1);
        for (const heading of scenario.columns) {
          await expect(table.getByRole("columnheader", { name: heading, exact: true })).toHaveCount(1);
        }
        const rows = table.locator("tbody tr");
        expect(await rows.count()).toBeGreaterThan(0);
        await expect(rows.first().getByRole("rowheader")).toHaveCount(1);
        await expect(rows.first().locator('input[name="confirmation"]')).toHaveCount(1);
        await expect(rows.first().locator('input[name="targetId"]')).toHaveCount(1);
        await expect(rows.first().locator('input[name="targetType"]')).toHaveCount(1);
        await expect(rows.first().locator('input[name="q"]')).toHaveCount(1);
        await expect(rows.first().getByRole("button")).toHaveCount(1);
        if (viewport.width === 390) {
          const geometry = await region.evaluate((el) => ({
            scroll: el.scrollWidth, client: el.clientWidth, overflow: getComputedStyle(el).overflowX,
          }));
          expect(geometry.scroll).toBeGreaterThan(geometry.client);
          expect(geometry.overflow).toBe("auto");
        }
      } else {
        await expect(section.locator(".admin-profile-empty")).toBeVisible();
      }
      await expectResponsiveDocument(page);
    }

    // Searching and resetting the filter must not switch to another category.
    await page.locator('.admin-delete-search input[name="q"]').fill("unlikely-test-record-20261022");
    await page.locator('.admin-delete-search button[type="submit"]').click();
    await expect(page).toHaveURL(/bolum=editor/u);
    await expect(page).toHaveURL(/q=unlikely-test-record-20261022/u);
    await expect(page.locator(".admin-delete-section")).toHaveCount(1);
    await page.locator(".admin-delete-search a").click();
    await expect(page).toHaveURL(/bolum=editor/u);
    await expect(page.locator('.admin-delete-search input[name="q"]')).toHaveValue("");

    await expect(page.locator('.admin-topbar a[href="/hesabim"]')).toHaveCount(1);
    await expect(page.locator('.admin-topbar button[aria-label="Çıkış yap"]')).toHaveCount(1);
    await expectResponsiveDocument(page);
  }
});
