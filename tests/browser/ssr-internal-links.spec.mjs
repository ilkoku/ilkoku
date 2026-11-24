import { expect, test } from "@playwright/test";

// Ham HTML (JS çalışmadan) içindeki gerçek <a href> bağlantılarını sayar.
// Yalnızca <a ...> etiketleri sayılır; RSC verisindeki düz metin ikilenir, sayılmaz.
function childGuideLinks(html) {
  const found = new Set();
  for (const tag of html.matchAll(/<a\s[^>]*>/gi)) {
    const href = tag[0].match(/\shref\s*=\s*"([^"]*)"/i)?.[1];
    if (!href) continue;
    const path = href.replace(/^https?:\/\/(www\.)?ilkoku\.com/i, "").split(/[?#]/)[0].replace(/\/$/, "");
    if (/^\/yazarlar-icin\/[^/]+/.test(path)) found.add(path);
  }
  return found;
}

test("/yazarlar-icin ham HTML'inde 85 rehber + 7 hub bağlantısı var", async ({ request }) => {
  const response = await request.get("/yazarlar-icin");
  expect(response.ok()).toBe(true);
  const links = childGuideLinks(await response.text());
  expect(links.size).toBeGreaterThanOrEqual(85 + 7);
  // Eski "İlk rehberini seç" kısayollarının hepsi dizinde de bulunmalı (Roman dahil).
  for (const path of [
    "/yazarlar-icin/kurgu/roman",
    "/yazarlar-icin/kurgu/oyku",
    "/yazarlar-icin/kurgu/fantastik",
    "/yazarlar-icin/kurgu/bilim-kurgu",
    "/yazarlar-icin/kurgu/distopya",
    "/yazarlar-icin/kurgu/dedektif",
    "/yazarlar-icin/edebiyat/siir",
  ]) {
    expect(links.has(path), path).toBe(true);
  }
});

test("Ana sayfa ham HTML'inde /yazarlar-icin altına en az 11 bağlantı var", async ({ request }) => {
  const response = await request.get("/");
  expect(response.ok()).toBe(true);
  const links = childGuideLinks(await response.text());
  expect(links.size).toBeGreaterThanOrEqual(11);
  for (const path of [
    "/yazarlar-icin/kurgu/novella",
    "/yazarlar-icin/akademik/makale",
    "/yazarlar-icin/cizgi-anlati/grafik-roman",
  ]) {
    expect(links.has(path), path).toBe(true);
  }
});
