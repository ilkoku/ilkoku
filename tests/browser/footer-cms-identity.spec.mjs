import { expect, test } from "@playwright/test";

const platformHrefs = ["/eserler", "/yazarlar", "/turler", "/hakkimizda", "/nasil-calisir"];

for (const scenario of [
  {
    name: "legacy CMS defaults cannot remove or duplicate Platform links",
    content: {
      platformTitle: "Platform CMS kanıtı",
      supportTitle: "Destek CMS kanıtı",
      platform1Href: "/nasil-calisir",
      platform1Label: "Nasıl Çalışır?",
      platform2Href: "/yazarlar-icin",
      platform2Label: "Yazarlar İçin",
      platform3Href: "/editorler-icin",
      platform3Label: "Editörler İçin",
    },
    expectedLabels: {
      "/yazarlar": "Yazarlar",
      "/turler": "Türler",
      "/nasil-calisir": "Nasıl Çalışır?",
    },
  },
  {
    name: "valid CMS label edits preserve link identity and DOM nodes",
    content: {
      platformTitle: "Platform CMS kanıtı",
      supportTitle: "Destek CMS kanıtı",
      platform1Href: "/yazarlar",
      platform1Label: "Yazar Rehberi",
      platform2Href: "/turler",
      platform2Label: "Tür Seçimi",
      platform3Href: "/nasil-calisir",
      platform3Label: "Nasıl Çalışır?",
    },
    expectedLabels: {
      "/yazarlar": "Yazar Rehberi",
      "/turler": "Tür Seçimi",
      "/nasil-calisir": "Nasıl Çalışır?",
    },
  },
]) {
  test(`homepage footer CMS reconciliation: ${scenario.name}`, async ({ page }) => {
    let cmsCalls = 0;
    await page.route("**/api/site-content/footer-navigation", async (route) => {
      cmsCalls += 1;
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ content: scenario.content }),
      });
    });

    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);

    const footer = page.locator("footer.landing-footer");
    const platform = footer.locator(".landing-footer__grid > div").filter({
      has: page.locator('a[href="/eserler"]'),
    });
    const support = footer.locator(".landing-footer__grid > div").filter({
      has: page.locator('a[href="/yardim"]'),
    });

    await expect(platform.locator('a[href="/yazarlar"]')).toHaveCount(1);
    const originalAnchors = new Map();
    for (const href of platformHrefs) {
      const link = platform.locator(`a[href="${href}"]`);
      await expect(link).toHaveCount(1);
      originalAnchors.set(href, await link.elementHandle());
    }

    // The hydrator deliberately waits for the footer to approach the viewport.
    await footer.scrollIntoViewIfNeeded();
    await expect(support.locator("h3")).toHaveText("Destek CMS kanıtı");
    expect(cmsCalls).toBe(1);

    for (const href of platformHrefs) {
      const link = platform.locator(`a[href="${href}"]`);
      await expect(link).toHaveCount(1);
      const original = originalAnchors.get(href);
      expect(original).toBeTruthy();
      expect(await original.evaluate(
        (node, path) => node === document.querySelector(`.landing-footer__grid a[href="${path}"]`),
        href,
      ), `SSR anchor must survive CMS update: ${href}`).toBe(true);
    }

    for (const [href, label] of Object.entries(scenario.expectedLabels)) {
      await expect(platform.locator(`a[href="${href}"]`)).toHaveText(label);
    }
    expect(await platform.locator(":scope > a").count()).toBe(platformHrefs.length);
    await expect(footer.locator(".landing-footer__audience a")).toHaveCount(4);
  });
}
