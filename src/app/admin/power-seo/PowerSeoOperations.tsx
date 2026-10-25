import Link from "next/link";
import { validateSitemapUrl } from "@power-seo/sitemap";
import { buildLinkGraph, analyzeLinkEquity, suggestLinks } from "@power-seo/links";
import { isDestinationSafe, matchExact } from "@power-seo/redirects";
import styles from "./PowerSeoDashboard.module.css";

type Entry = { loc: string; lastmod?: string };
const ORIGIN = "https://ilkoku.com";
const PAGE_LIMIT = 4;
const MAX_SLICES = 40;

const knownRedirects = [
  { from: "/en-cok-satanlar/yeni-girisler", to: "/en-cok-satanlar/cok-satanlara-yeni-girenler" },
  { from: "/en-cok-satanlar/yukselenler", to: "/en-cok-satanlar/cok-satanlarda-yukselenler" },
  { from: "/en-cok-satanlar/her-yerde-satanlar", to: "/en-cok-satanlar/birden-fazla-listede-cok-satanlar" },
  { from: "/en-cok-satanlar/uzun-satanlar", to: "/en-cok-satanlar/uzun-suredir-cok-satanlar" },
] as const;

// Only read the site's existing sitemap. Never generate or publish a replacement.
async function readSitemap(): Promise<Entry[]> {
  const response = await fetch(ORIGIN + "/sitemap.xml", {
    cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(8000),
    headers: { "User-Agent": "IlkOku-PowerSEO-Admin-Inventory/1.0" },
  });
  if (!response.ok || !response.headers.get("content-type")?.includes("xml")) {
    throw new Error("Canlı sitemap XML okunamadı (HTTP " + response.status + ").");
  }
  if (Number(response.headers.get("content-length") || 0) > 1500000) throw new Error("Sitemap güvenli boyut sınırını aşıyor.");
  const xml = await response.text();
  if (xml.length > 1500000 || !xml.includes("<urlset")) throw new Error("Sitemap beklenen XML biçiminde değil.");
  const entries: Entry[] = [];
  for (const match of xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
    const loc = /<loc>\s*([\s\S]*?)\s*<\/loc>/i.exec(match[1])?.[1]?.replace(/&amp;/g, "&").trim();
    const lastmod = /<lastmod>\s*([\s\S]*?)\s*<\/lastmod>/i.exec(match[1])?.[1]?.trim();
    if (!loc) continue;
    entries.push(lastmod ? { loc, lastmod } : { loc });
  }
  if (!entries.length) throw new Error("Sitemap içinde okunabilir URL bulunamadı.");
  return entries;
}

function inventoryErrors(entries: Entry[]) {
  const issues: Array<{ url: string; message: string }> = [];
  const seen = new Set<string>();
  for (const e of entries) {
    const validated = validateSitemapUrl(e);
    for (const message of validated.errors) issues.push({ url: e.loc, message });
    try {
      const u = new URL(e.loc);
      if (u.origin !== ORIGIN || u.hash || u.search) issues.push({ url: e.loc, message: "Hatalı origin veya query/fragment" });
    } catch {
      issues.push({ url: e.loc, message: "Geçersiz URL" });
    }
    const normalized = e.loc.replace(/\/$/, "");
    if (seen.has(normalized)) issues.push({ url: e.loc, message: "Sitemap tekrarı" });
    seen.add(normalized);
  }
  return issues;
}

async function readPublicHtml(url: string) {
  const parsed = new URL(url);
  if (parsed.origin !== ORIGIN || parsed.search || parsed.hash || !/^\/[a-z0-9/-]*$/.test(parsed.pathname)) {
    throw new Error("Yalnız doğrulanmış aynı site URL'leri denetlenebilir.");
  }
  const response = await fetch(parsed.toString(), {
    cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(6500),
    headers: { "User-Agent": "IlkOku-PowerSEO-Admin-Links/1.0" },
  });
  if (!response.ok || !response.headers.get("content-type")?.includes("text/html")) {
    throw new Error("HTML döndürmedi: HTTP " + response.status);
  }
  if (Number(response.headers.get("content-length") || 0) > 900000) throw new Error("HTML boyut sınırını aşıyor.");
  const html = await response.text();
  if (html.length > 900000) throw new Error("HTML boyut sınırını aşıyor.");
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.replace(/<[^>]+>/g, "") || "";
  const links = [...html.matchAll(/<a\b[^>]*href=(["'])(.*?)\1/gi)].map((m) => m[2]);
  return { url, title, links };
}

async function linkSample(entries: Entry[], slice: number) {
  const subset = entries.slice((slice - 1) * PAGE_LIMIT, slice * PAGE_LIMIT)
    .filter((e) => {
      try { const u = new URL(e.loc); return u.origin === ORIGIN && !u.search && !u.hash; }
      catch { return false; }
    });
  // Keep a deliberately small bounded batch to avoid server overload/503.
  const responses = await Promise.all(subset.map(async (entry) => {
    try { return { page: await readPublicHtml(entry.loc), error: "" }; }
    catch (e) { return { page: null, error: e instanceof Error ? e.message : "Bilinmeyen tarama hatası" }; }
  }));
  const pages = responses.flatMap((r) => r.page ? [r.page] : []);
  const failed = responses.flatMap((r, i) => r.error ? [{ url: subset[i].loc, error: r.error }] : []);
  const graph = buildLinkGraph(pages);
  const equity = analyzeLinkEquity(graph);
  const allowed = new Set(pages.map((p) => p.url));
  const suggestions = suggestLinks(pages, { maxSuggestions: 12, minRelevance: 0.25 })
    .filter((item) => allowed.has(item.from) && allowed.has(item.to));
  return { pages, failed, graph, equity, suggestions };
}

async function checkRedirects() {
  return Promise.all(knownRedirects.map(async ({ from, to }) => {
    try {
      const response = await fetch(ORIGIN + from, {
        method: "HEAD", cache: "no-store", redirect: "manual",
        signal: AbortSignal.timeout(5500),
        headers: { "User-Agent": "IlkOku-PowerSEO-Admin-Redirects/1.0" },
      });
      const location = response.headers.get("location") || "";
      const resolved = location ? new URL(location, ORIGIN) : null;
      const isExpected = matchExact(from, from) && resolved?.origin === ORIGIN && resolved.pathname === to;
      const safe = location ? isDestinationSafe(to, location) : false;
      return { from, to, code: response.status, location, ok: response.status >= 300 && response.status < 400 && isExpected && safe, error: "" };
    } catch (e) {
      return { from, to, code: 0, location: "", ok: false, error: e instanceof Error ? e.message : "Yönlendirme okunamadı" };
    }
  }));
}

export async function PowerSeoOperations({ mode, slice }: { mode: string; slice: number }) {
  if (mode === "sitemap" || mode === "links") {
    let entries: Entry[] = [];
    let error = "";
    try { entries = await readSitemap(); }
    catch (e) { error = e instanceof Error ? e.message : "Sitemap okunamadı"; }
    const issues = entries.length ? inventoryErrors(entries) : [];
    const totalSlices = Math.min(MAX_SLICES, Math.ceil(entries.length / PAGE_LIMIT));
    const actualSlice = Math.min(Math.max(1, slice), Math.max(1, totalSlices));
    const sample = mode === "links" && entries.length ? await linkSample(entries, actualSlice) : null;
    return (
      <section className={styles.panel} aria-label="Power-SEO toplu denetimler">
        <h2>{mode === "sitemap" ? "Canlı sitemap doğrulaması" : "İç bağlantı grafiği — güvenli parça taraması"}</h2>
        <p>{mode === "sitemap"
          ? "Mevcut XML sitemap yalnız okunur. URL, tekrar ve adres geçerliliği denetlenir; sitemap değiştirilmez."
          : "Her istekte en çok 4 public sayfa taranır. Grafikteki sayılar yalnızca bu parçayı kapsar; site genelinde bağlantısız sayfa sonucu değildir."}</p>
        {error ? <p className={styles.error} role="alert">{error}</p> : null}
        {entries.length ? (
          <>
            <div className={styles.stats}>
              <div><strong>{entries.length}</strong><span>Sitemap URL sayısı</span></div>
              <div><strong>{issues.length}</strong><span>XML URL / tekrar bulgusu</span></div>
              <div><strong>{entries.filter((e) => Boolean(e.lastmod)).length}</strong><span>Lastmod içeren URL</span></div>
            </div>
            {issues.length ? (
              <ul className={styles.issues}>
                {issues.slice(0, 25).map((issue, i) => <li key={i}><b>{issue.message}</b><span>{issue.url}</span></li>)}
              </ul>
            ) : <p>Denetlenen XML URL alanlarında sorun görülmedi. Bu, Google indeksleme garantisi değildir.</p>}
          </>
        ) : null}
        {mode === "links" && sample ? (
          <>
            <h3>Parça {actualSlice} / {totalSlices}</h3>
            <div className={styles.quick}>
              {actualSlice > 1 ? <Link href={"/sistem-yonetimi/power-seo?mod=links&parca=" + (actualSlice - 1)}>← Önceki</Link> : null}
              {actualSlice < totalSlices ? <Link href={"/sistem-yonetimi/power-seo?mod=links&parca=" + (actualSlice + 1)}>Sonraki →</Link> : null}
            </div>
            <p>Bu parçada {sample.pages.length} sayfanın HTML çıktısı okundu, {sample.failed.length} hata görüldü. Link grafiğinde {sample.graph.totalLinks} yönlendirilmiş bağlantı tespit edildi. Site dışı ya da parça dışı sayfalara çıkan bağlantılar, grafikte de yer alabilir.</p>
            {sample.failed.length ? <ul className={styles.issues}>{sample.failed.map((item) => <li key={item.url}><b>{item.url}</b><span>{item.error}</span></li>)}</ul> : null}
            <ul className={styles.issues}>
              {sample.pages.map((p) => {
                const node = sample.graph.nodes.get(p.url.replace(/\/$/, ""));
                return (
                  <li key={p.url}>
                    <b>{p.title || p.url}</b>
                    <span>{p.url} · Çıkan: {node?.outboundCount ?? 0} · Bu parçada gelen: {node?.inboundCount ?? 0}</span>
                  </li>
                );
              })}
            </ul>
            {sample.suggestions.length ? (
              <>
                <h3>Otomatik bağlantı adayları (yayınlanmadı)</h3>
                <p>Bu öneriler sözcük benzerliği üzerinden üretildi; özellikle Türkçe için editör incelemesi olmadan uygulanmamalıdır.</p>
                <ul className={styles.issues}>{sample.suggestions.map((item, i) =>
                  <li key={i}><b>{item.anchorText}</b><span>{item.from} → {item.to} · Benzerlik: {item.relevanceScore}</span></li>
                )}</ul>
              </>
            ) : null}
            {sample.equity.length ? <p>Power-SEO bağlantı ağı ölçümü yapıldı. Kısıtlı örneklemin göreli otorite değerlerini site geneli PageRank değeri olarak göstermiyoruz.</p> : null}
          </>
        ) : null}
      </section>
    );
  }

  if (mode === "redirects") {
    const results = await checkRedirects();
    return (
      <section className={styles.panel} aria-label="Power-SEO yönlendirme kontrolleri">
        <h2>Yönlendirme doğrulaması (salt okunur)</h2>
        <p>Bilinen dört eski Kitap Endeksi adresinin gerçek HTTP yanıtını ve hedefini kontrol eder. Hiçbir 301/308 kuralı değiştirilmez.</p>
        <div className={styles.stats}>
          <div><strong>{results.filter((r) => r.ok).length} / {results.length}</strong><span>Doğrulanan yönlendirme</span></div>
        </div>
        <ul className={styles.issues}>
          {results.map((r) => (
            <li key={r.from}>
              <b>{r.ok ? "Doğrulandı" : "İncele"} · {r.code || "Hata"} · {r.from}</b>
              <span>Beklenen: {r.to} · Gerçek: {r.location || r.error || "Location yok"}</span>
            </li>
          ))}
        </ul>
      </section>
    );
  }

  return null;
}
