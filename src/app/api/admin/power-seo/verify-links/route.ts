import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ORIGIN = "https://ilkoku.com";
const MAX_BATCH = 4;
const MAX_BODY_LENGTH = 1800;
const HTTP_TIMEOUT_MS = 6500;
const RESTRICTED_PREFIXES = ["/api/", "/_next/", "/sistem-yonetimi/", "/admin/", "/cdn-cgi/"];

function fail(message: string, status: number) {
  return NextResponse.json({ error: message }, {
    status, headers: { "Cache-Control": "private, no-store" },
  });
}

function trustedOrigin(request: Request) {
  const origin = request.headers.get("origin");
  const browserOrigin = origin ? new URL(origin) : null;
  const requestUrl = new URL(request.url);
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  if (browserOrigin?.origin === ORIGIN) return true;
  return (requestUrl.hostname === "localhost" || requestUrl.hostname === "127.0.0.1") &&
    browserOrigin?.origin === requestUrl.origin;
}

function safeLinkPath(raw: unknown) {
  if (typeof raw !== "string" || raw.length > 210 || !/^\/[A-Za-z0-9/_-]*$/.test(raw) || raw.includes("//")) return null;
  if (raw === "/") return null; // Public home URL is already in the sitemap.
  if (RESTRICTED_PREFIXES.some((prefix) => raw.startsWith(prefix))) return null;
  const url = new URL(raw, ORIGIN);
  return url.origin === ORIGIN && url.pathname === raw ? raw : null;
}

type LinkResult = {
  path: string;
  status: number | null;
  outcome: "reachable" | "redirect" | "missing" | "access-restricted" | "temporary-error" | "unverified";
  redirectTo: string | null;
  reason: string;
};

async function verifyLink(path: string): Promise<LinkResult> {
  try {
    const response = await fetch(ORIGIN + path, {
      method: "GET",
      cache: "no-store",
      redirect: "manual",
      signal: AbortSignal.timeout(HTTP_TIMEOUT_MS),
      headers: { "User-Agent": "IlkOku-PowerSEO-Link-Verify/1.0", accept: "text/html" },
    });
    // Never follow auth redirects, send admin session cookies or read page bodies.
    await response.body?.cancel().catch(() => undefined);
    const status = response.status;
    const location = response.headers.get("location");
    let redirectTo: string | null = null;
    if (location) {
      try {
        const target = new URL(location, ORIGIN);
        if (target.origin === ORIGIN) redirectTo = target.pathname;
      } catch { /* Never expose unexpected Location values. */ }
    }
    let outcome: LinkResult["outcome"] = "unverified";
    if (status >= 200 && status < 300) outcome = "reachable";
    else if (status >= 300 && status < 400) outcome = "redirect";
    else if (status === 404 || status === 410) outcome = "missing";
    else if (status === 401 || status === 403) outcome = "access-restricted";
    else if (status === 429 || status >= 500) outcome = "temporary-error";
    return {
      path, status, outcome, redirectTo,
      reason: outcome === "missing" ? "HTTP 404/410 doğrulandı" :
        outcome === "redirect" ? "Yönlendirme (otomatik takip edilmedi)" :
        outcome === "temporary-error" ? "Geçici yanıt / erişim sınırı; kırık bağlantı hükmü verilmedi" :
        outcome === "access-restricted" ? "Erişim kısıtlı; kırık bağlantı hükmü verilmedi" :
        outcome === "reachable" ? "HTTP başarılı; indeksleme ve içerik kalitesi ayrıca değerlendirilir" :
        "HTTP yanıtı kararsız; kırık bağlantı hükmü verilmedi",
    };
  } catch {
    return { path, status: null, outcome: "unverified", redirectTo: null,
      reason: "Ağ hatası veya zaman aşımı; kırık bağlantı hükmü verilmedi" };
  }
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return fail("Oturum gerekli.", 401);
  if (user.role !== "admin") return fail("Yönetici yetkisi gerekli.", 403);
  if (!trustedOrigin(request)) return fail("Güvenilmeyen kaynak.", 403);
  try {
    const text = await request.text();
    if (text.length > MAX_BODY_LENGTH) return fail("İstek çok büyük.", 400);
    const body: unknown = JSON.parse(text);
    const paths = body && typeof body === "object" && "paths" in body ? body.paths : null;
    if (!Array.isArray(paths) || paths.length < 1 || paths.length > MAX_BATCH) {
      return fail("En fazla dört hedef aynı anda doğrulanabilir.", 400);
    }
    const valid = paths.map(safeLinkPath);
    if (valid.some((path) => !path) || new Set(valid).size !== valid.length) {
      return fail("Geçersiz, tekrarlanan veya korumalı hedef.", 400);
    }
    const results: LinkResult[] = [];
    // Bounded concurrency 2; no retries; no external targets.
    for (let i = 0; i < valid.length; i += 2) {
      const pair = await Promise.all((valid.slice(i, i + 2) as string[]).map(verifyLink));
      results.push(...pair);
      // Respect origin protection. Do not continue the batch after a WAF/rate-limit response.
      if (pair.some((row) => row.status === 403 || row.status === 429)) break;
    }
    return NextResponse.json({
      results, halted: results.some((row) => row.status === 403 || row.status === 429),
      scope: "Sitemap dışı aynı alan adı HTTP kontrolü; indeksleme testi veya otomatik düzeltme değildir.",
    }, { headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" } });
  } catch {
    return fail("Bağlantı doğrulama isteği işlenemedi.", 400);
  }
}
