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

  const horizontalOverflow = await page.evaluate(() => {
    const root = document.documentElement;
    return root.scrollWidth - root.clientWidth;
  });

  expect(horizontalOverflow).toBeLessThanOrEqual(1);
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
