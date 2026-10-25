import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ORIGIN = "https://ilkoku.com";
const BATCH_SIZE = 4;
const MAX_URLS = 400;
const MAX_HTML_CHARS = 850_000;

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status, headers: { "Cache-Control": "private, no-store" },
  });
}

function sitemapUrls(xml: string) {
  if (!/<urlset(?:\s|>)/i.test(xml)) throw new Error("Sitemap urlset biçiminde değil.");
  const urls: string[] = [];
  const seen = new Set<string>();
  for (const item of xml.matchAll(/<url>([\s\S]*?)<\/url>/gi)) {
    const raw = /<loc>\s*([^<]+)\s*<\/loc>/i.exec(item[1])?.[1]?.trim().replace(/&amp;/g, "&");
    if (!raw) throw new Error("Sitemap içinde loc olmayan kayıt var.");
    const candidate = new URL(raw);
    if (candidate.origin !== ORIGIN || candidate.username || candidate.password || candidate.search || candidate.hash) {
      throw new Error("Sitemap dışında veya sorgu içeren adres tespit edildi; güvenli tarama durduruldu.");
    }
    const url = candidate.toString();
    if (seen.has(url)) throw new Error("Sitemap içinde tekrar eden adres var; tarama durduruldu.");
    seen.add(url);
    urls.push(url);
    if (urls.length > MAX_URLS) throw new Error("400 URL güvenlik sınırı aşıldı; tarama durduruldu.");
  }
  if (!urls.length) throw new Error("Sitemap'te taranabilir URL bulunamadı.");
  return urls;
}

function extractInternalLinks(html: string, source: string) {
  const found = new Set<string>();
  for (const m of html.matchAll(/<a\b[^>]*\bhref\s*=\s*(["'])(.*?)\1/gi)) {
    try {
      const link = new URL(m[2].replace(/&amp;/g, "&"), source);
      if (link.origin !== ORIGIN || link.username || link.password) continue;
      link.hash = "";
      link.search = "";
      found.add(link.toString());
    } catch {
      // Ignore malformed href attributes rather than adding phantom graph nodes.
    }
  }
  return [...found].slice(0, 1500);
}

async function inspect(url: string) {
  try {
    const response = await fetch(url, {
      cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(6500),
      headers: { "User-Agent": "IlkOku-PowerSEO-Fullsite-Admin/1.0" },
    });
    if (response.status !== 200 || !response.headers.get("content-type")?.toLowerCase().includes("text/html")) {
      return { url, title: "", links: [] as string[], error: "HTTP " + response.status + " veya HTML değil" };
    }
    if (Number(response.headers.get("content-length") || "0") > MAX_HTML_CHARS) {
      return { url, title: "", links: [] as string[], error: "HTML boyut sınırı aşıldı" };
    }
    const html = await response.text();
    if (html.length > MAX_HTML_CHARS) {
      return { url, title: "", links: [] as string[], error: "HTML boyut sınırı aşıldı" };
    }
    const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.replace(/<[^>]+>/g, " ").trim() || "";
    return { url, title: title.slice(0, 180), links: extractInternalLinks(html, url), error: "" };
  } catch (error) {
    return { url, title: "", links: [] as string[], error: error instanceof Error ? error.name : "Tarama hatası" };
  }
}

export async function GET(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Oturum gerekli.", 401);
  if (user.role !== "admin") return fail("Yönetici yetkisi gerekli.", 403);

  const raw = new URL(request.url).searchParams.get("offset");
  if (raw === null || !/^(?:0|[1-9]\d{0,2})$/.test(raw)) return fail("Geçersiz tarama sırası.", 400);
  const offset = Number(raw);
  if (!Number.isInteger(offset) || offset < 0 || offset >= MAX_URLS || offset % BATCH_SIZE !== 0) {
    return fail("Geçersiz tarama parçası.", 400);
  }

  try {
    const response = await fetch(ORIGIN + "/sitemap.xml", {
      cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(8000),
      headers: { "User-Agent": "IlkOku-PowerSEO-Fullsite-Admin/1.0" },
    });
    const type = response.headers.get("content-type") || "";
    if (response.status !== 200 || !type.toLowerCase().includes("xml")) {
      throw new Error("Sitemap yanıtı uygun değil (HTTP " + response.status + ").");
    }
    if (Number(response.headers.get("content-length") || "0") > 1_500_000) {
      throw new Error("Sitemap boyut sınırı aşıldı.");
    }
    const xml = await response.text();
    if (xml.length > 1_500_000) throw new Error("Sitemap boyut sınırı aşıldı.");

    const urls = sitemapUrls(xml);
    if (offset >= urls.length) return fail("Sitemap aralığı dışında parça istendi.", 400);
    const fingerprint = createHash("sha256").update(urls.join("\n")).digest("hex").slice(0, 20);
    const batch = urls.slice(offset, offset + BATCH_SIZE);

    // At most two concurrent page reads, with bounded timeouts; zero automatic retries.
    const results = [];
    for (let i = 0; i < batch.length; i += 2) {
      results.push(...await Promise.all(batch.slice(i, i + 2).map(inspect)));
    }
    return NextResponse.json({
      fingerprint, urls, offset, nextOffset: offset + batch.length,
      total: urls.length, items: results,
    }, { headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
  } catch (error) {
    return fail(error instanceof Error ? error.message : "Güvenli tarama başarısız.", 502);
  }
}
