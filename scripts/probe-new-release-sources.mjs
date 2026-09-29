const UA = "IlkOkuBookIndex/0.1 (+https://ilkoku.com)";

async function fetchText(url, headers = {}) {
  const response = await fetch(url, {
    cache: "no-store",
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "tr-TR,tr;q=0.9,en;q=0.7",
      ...headers,
    },
    signal: AbortSignal.timeout(20000),
  });
  return { response, text: await response.text() };
}

function unique(values) {
  return [...new Set(values)];
}

function parseKitapSepeti(html) {
  const catalog = html.match(
    /<div\b[^>]*id=["']catalog\d+["'][^>]*>([\s\S]*?)(?=<div\b[^>]*class=["'][^"']*folder-products-bottom|<footer\b|$)/iu,
  )?.[1] ?? "";
  const cards = [...catalog.matchAll(/<div\b[^>]*class=["'][^"']*\sproduct-item(?:\s[^"']*)?["'][^>]*>/giu)];
  const productUrls = unique(
    [...catalog.matchAll(/<a\b(?=[^>]*\bclass=["'][^"']*\bproduct-title\b[^"']*["'])(?=[^>]*\bhref=["']([^"']+)["'])[^>]*>/giu)]
      .map((m) => m[1])
      .filter(Boolean),
  );
  return {
    catalogFound: Boolean(catalog),
    cardCount: cards.length,
    uniqueProductUrlCount: productUrls.length,
    firstProductUrls: productUrls.slice(0, 5),
    productUrls,
  };
}

function idefixCandidateLinks(html) {
  const links = [...html.matchAll(/href=["']([^"']+)["']/giu)].map((m) => m[1]);
  const candidates = unique(
    links.filter((href) => /yeni|new/iu.test(href)),
  ).slice(0, 40);
  const phraseContexts = [];
  const lower = html.toLocaleLowerCase("tr-TR");
  for (const phrase of ["yeni çıkanlar", "yeni çıkan kitaplar", "yeni kitaplar"]) {
    let start = 0;
    while (true) {
      const idx = lower.indexOf(phrase, start);
      if (idx < 0) break;
      phraseContexts.push(html.slice(Math.max(0, idx - 240), Math.min(html.length, idx + 420)));
      start = idx + phrase.length;
      if (phraseContexts.length >= 12) break;
    }
  }
  return { candidates, phraseContexts };
}

const out = { checkedAt: new Date().toISOString(), kitapsepeti: {}, idefix: {} };

for (const [label, url] of [
  ["page1", "https://www.kitapsepeti.com/yeni-cikan-kitaplar"],
  ["page2", "https://www.kitapsepeti.com/yeni-cikan-kitaplar?pg=2"],
]) {
  try {
    const { response, text } = await fetchText(url);
    const parsed = parseKitapSepeti(text);
    out.kitapsepeti[label] = {
      url,
      http: response.status,
      titleMatch: /<title[^>]*>[^<]*Yeni Çıkan Kitaplar[^<]*<\/title>/iu.test(text),
      headingMatch: /Yeni Çıkan Kitaplar/iu.test(text),
      ...parsed,
    };
  } catch (error) {
    out.kitapsepeti[label] = { url, error: error instanceof Error ? error.message : String(error) };
  }
}

if (out.kitapsepeti.page1?.productUrls && out.kitapsepeti.page2?.productUrls) {
  const page1 = new Set(out.kitapsepeti.page1.productUrls);
  const page2 = new Set(out.kitapsepeti.page2.productUrls);
  out.kitapsepeti.pagination = {
    overlap: [...page1].filter((value) => page2.has(value)).length,
    page2AddsNewProducts: [...page2].some((value) => !page1.has(value)),
  };
  delete out.kitapsepeti.page1.productUrls;
  delete out.kitapsepeti.page2.productUrls;
}

try {
  const { response, text } = await fetchText("https://www.idefix.com/");
  out.idefix.home = {
    http: response.status,
    ...idefixCandidateLinks(text),
  };
} catch (error) {
  out.idefix.home = { error: error instanceof Error ? error.message : String(error) };
}

console.log(JSON.stringify(out, null, 2));
