import { readFileSync } from "node:fs";
import { expect, test } from "@playwright/test";

// End-to-end test of the actual admin UI and state transitions using a bounded,
// deterministic five-page API fixture. Never crawl public production pages or
// write SEO content as part of browser QA.
const fixturePath = process.env.BROWSER_AUTH_FIXTURE_PATH;
const fixture = fixturePath ? JSON.parse(readFileSync(fixturePath, "utf8")) : null;
const baseUrl = process.env.PLAYWRIGHT_BASE_URL ?? "http://127.0.0.1:3100";
const origin = "https://ilkoku.com";
const paths = [
  "/",
  "/nasil-calisir",
  "/yazarlar-icin",
  "/yazarlar-icin/kurgu",
  "/yazarlar-icin/kurgu/roman",
];
const urls = paths.map((path) => origin + path);
const pages = urls.map((url, index) => ({
  url,
  title: "Power-SEO QA Sayfa " + index,
  links: [
    index === 0 ? urls[1] : urls[0],
    index + 1 < urls.length ? urls[index + 1] : urls[1],
    ...(index === 0 ? [origin + "/giris"] : []),
  ],
  error: "",
}));

test("Power-SEO admin full-site scan, progress, HTTP verification and JSON export", async ({ page }) => {
  test.skip(!fixture?.sessions?.admin, "Authenticated browser fixture required.");

  await page.context().addCookies([{
    name: fixture.cookieName, value: fixture.sessions.admin, url: baseUrl,
  }]);

  const seenOffsets = [];
  const verifiedPaths = [];
  await page.route("**/api/admin/power-seo/scan?offset=*", async (route) => {
    const request = route.request();
    expect(request.method()).toBe("GET");
    const offset = Number(new URL(request.url()).searchParams.get("offset"));
    seenOffsets.push(offset);
    const items = pages.slice(offset, offset + 4);
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({
        fingerprint: "0123456789abcdefabcd", urls,
        offset, nextOffset: offset + items.length, total: urls.length, items,
      }),
    });
  });
  await page.route("**/api/admin/power-seo/verify-links", async (route) => {
    const body = route.request().postDataJSON();
    verifiedPaths.push(...body.paths);
    await route.fulfill({
      status: 200, contentType: "application/json",
      body: JSON.stringify({
        results: body.paths.map((path) => ({
          path, status: 200, outcome: "reachable",
          redirectTo: null, reason: "HTTP 200",
        })),
        halted: false,
      }),
    });
  });

  const response = await page.goto("/sistem-yonetimi/power-seo?sekme=tarama&mod=full-links", {
    waitUntil: "domcontentloaded",
  });
  expect(response?.status()).toBeLessThan(400);
  await expect(page.getByRole("heading", { name: "Tam site bağlantı denetimi" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tam site taramasını başlat" })).toBeEnabled();

  await page.getByRole("button", { name: "Tam site taramasını başlat" }).click();
  await expect(page.getByRole("progressbar", { name: "Tam site bağlantı taraması" }))
    .toHaveAttribute("aria-valuenow", "5");
  await expect(page.getByRole("button", { name: "JSON raporunu al" })).toBeVisible();
  expect(seenOffsets).toEqual([0, 4]);
  await expect(page.getByText("5 / 5")).toBeVisible();

  await page.getByRole("button", { name: "Sitemap dışı hedefleri HTTP ile doğrula" }).click();
  await expect(page.getByText("Bu turdaki kontrol tamamlandı.")).toBeVisible();
  expect(verifiedPaths).toEqual(["/giris"]);

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: "JSON raporunu al" }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^ilkoku-power-seo-fullsite-\d{4}-\d{2}-\d{2}\.json$/u);
  const report = JSON.parse(readFileSync(await download.path(), "utf8"));
  assertReport(report);
});

function assertReport(report) {
  expect(report.site).toBe(origin);
  expect(report.source).toBe("sitemap.xml");
  expect(report.complete).toBe(true);
  expect(report.expectedUrls).toBe(5);
  expect(report.scannedUrls).toBe(5);
  expect(report.failures).toEqual([]);
  expect(report.pages).toHaveLength(5);
  expect(report.httpVerificationComplete).toBe(true);
  expect(report.httpVerification).toHaveLength(1);
  expect(report.httpVerification[0].outcome).toBe("reachable");
}
