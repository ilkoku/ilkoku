import { createSign } from "node:crypto";
import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth/current-user";
import { createGSCClient, createTokenManager, exchangeRefreshToken, getServiceAccountToken, querySearchAnalytics } from "@power-seo/search-console";
import { buildDashboardData } from "@power-seo/analytics";
import { createAhrefsClient, createSemrushClient } from "@power-seo/integrations";
import { buildTitlePrompt, buildMetaDescriptionPrompt } from "@power-seo/ai";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const ORIGIN = "https://ilkoku.com";
type Provider = "gsc" | "gsc-index" | "ahrefs" | "semrush" | "ai";
const providers: Provider[] = ["gsc", "gsc-index", "ahrefs", "semrush", "ai"];

function result(data: unknown, status = 200) {
  return NextResponse.json(data, {
    status,
    headers: { "Cache-Control": "private, no-store", "X-Robots-Tag": "noindex, nofollow" },
  });
}

function safePublicPath(raw: string) {
  if (raw.length > 140 || !/^\/(?:[a-z0-9-]+\/?)*$/.test(raw)) return null;
  if (raw.split("/").some((part) =>
    ["admin", "icerik", "api", "sistem-yonetimi", "giris", "hesabim", "harita", "yazar", "editor", "yayinevi", "oku"].includes(part))) return null;
  return raw;
}

function getGscAuth() {
  const clientId = process.env.GSC_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GSC_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GSC_OAUTH_REFRESH_TOKEN;
  if (clientId && clientSecret && refreshToken) {
    return createTokenManager(() => exchangeRefreshToken({ clientId, clientSecret, refreshToken }));
  }
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.replace(/\\n/g, "\n");
  if (!email || !privateKey) return null;
  return createTokenManager(() => getServiceAccountToken({
    clientEmail: email,
    privateKeyId: "",
    signJwt: async (payload) => {
      const header = Buffer.from(JSON.stringify({ alg: "RS256", typ: "JWT" })).toString("base64url");
      const body = Buffer.from(JSON.stringify(payload)).toString("base64url");
      const unsigned = header + "." + body;
      const signer = createSign("RSA-SHA256");
      signer.update(unsigned);
      signer.end();
      return unsigned + "." + signer.sign(privateKey).toString("base64url");
    },
  }));
}

async function queryGsc() {
  const auth = getGscAuth();
  if (!auth) return { state: "missing", message: "GSC OAuth veya servis hesabı kimlik bilgileri üretim ortamında bulunamadı." };
  const siteUrl = process.env.GSC_SITE_URL || process.env.GOOGLE_SEARCH_CONSOLE_PROPERTY || process.env.GSC_PROPERTY || ORIGIN + "/";
  if (siteUrl !== ORIGIN && siteUrl !== ORIGIN + "/" && siteUrl !== "sc-domain:ilkoku.com") {
    return { state: "invalid", message: "GSC property İlkOku alan adıyla eşleşmiyor." };
  }
  const client = createGSCClient({ siteUrl, auth, maxRetries: 0, rateLimitPerMinute: 10 });
  // GSC finalized data is delayed. Limit to one small read-only analytics request.
  const end = new Date(Date.now() - 3 * 86400000);
  const start = new Date(end.getTime() - 27 * 86400000);
  const startDate = start.toISOString().slice(0, 10);
  const endDate = end.toISOString().slice(0, 10);
  const response = await querySearchAnalytics(client, {
    startDate, endDate, dimensions: ["page"], rowLimit: 15, dataState: "final",
  });
  const rows = (response.rows || []).filter((row) => row.keys?.[0]?.startsWith(ORIGIN)).slice(0, 15);
  const dashboard = buildDashboardData({
    gscPages: rows.map((row) => ({
      url: row.keys[0]!,
      clicks: row.clicks,
      impressions: row.impressions,
      ctr: row.ctr,
      position: row.position,
    })),
  });
  return {
    state: "verified", source: "Google Search Console — gerçek API yanıtı",
    dateRange: startDate + " / " + endDate,
    sampledPages: rows.length,
    scope: "Yalnız en fazla 15 sayfalık sonuç örneklemi; genel site toplamı değildir.",
    overview: dashboard.overview,
    topPages: dashboard.topPages.slice(0, 8),
  };
}

async function queryGscIndex(rawPath: string) {
  // One user-requested, read-only URL Inspection query; not a live URL test or indexing request.
  const path = safePublicPath(rawPath);
  if (!path) return { state: "invalid", message: "Yalnız herkese açık İlkOku yolları sorgulanabilir." };
  const clientId = process.env.GSC_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GSC_OAUTH_CLIENT_SECRET;
  const refreshToken = process.env.GSC_OAUTH_REFRESH_TOKEN;
  if (!clientId || !clientSecret || !refreshToken) return { state: "missing", message: "GSC Production OAuth kimlik bilgileri bulunamadı." };
  const siteUrl = process.env.GSC_SITE_URL || process.env.GOOGLE_SEARCH_CONSOLE_PROPERTY || process.env.GSC_PROPERTY || ORIGIN + "/";
  if (![ORIGIN, ORIGIN + "/", "sc-domain:ilkoku.com"].includes(siteUrl)) {
    return { state: "invalid", message: "GSC property İlkOku alan adıyla eşleşmiyor." };
  }
  const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret, refresh_token: refreshToken, grant_type: "refresh_token" }),
    signal: AbortSignal.timeout(12000),
  });
  // Never include an upstream OAuth response body in user-visible output.
  if (!tokenResponse.ok) return { state: "error", message: "Google OAuth erişim belirteci alınamadı (HTTP " + tokenResponse.status + ")." };
  const tokenPayload: unknown = await tokenResponse.json();
  const accessToken = tokenPayload && typeof tokenPayload === "object" && "access_token" in tokenPayload &&
    typeof tokenPayload.access_token === "string" ? tokenPayload.access_token : null;
  if (!accessToken) return { state: "error", message: "Google OAuth geçerli erişim belirteci döndürmedi." };
  const inspectionUrl = ORIGIN + path;
  const apiResponse = await fetch("https://searchconsole.googleapis.com/v1/urlInspection/index:inspect", {
    method: "POST",
    headers: { authorization: "Bearer " + accessToken, "content-type": "application/json" },
    body: JSON.stringify({ inspectionUrl, siteUrl, languageCode: "tr-TR" }),
    signal: AbortSignal.timeout(24000),
  });
  if (!apiResponse.ok) return { state: "error", message: "Google URL Inspection API yanıt vermedi (HTTP " + apiResponse.status + ")." };
  const inspectionPayload: unknown = await apiResponse.json();
  const record = inspectionPayload as { inspectionResult?: { indexStatusResult?: {
    verdict?: string; coverageState?: string; robotsTxtState?: string; indexingState?: string;
    pageFetchState?: string; lastCrawlTime?: string; userCanonical?: string; googleCanonical?: string;
  } } };
  const indexed = record?.inspectionResult?.indexStatusResult;
  if (!indexed) return { state: "error", message: "Google URL Inspection sonucu eksik döndü." };
  return {
    state: "verified",
    source: "Google Search Console URL Inspection — gerçek API yanıtı",
    inspectionUrl, siteUrl,
    verdict: indexed.verdict ?? "UNSPECIFIED",
    coverageState: indexed.coverageState ?? "Belirtilmedi",
    robotsTxtState: indexed.robotsTxtState ?? null,
    indexingState: indexed.indexingState ?? null,
    pageFetchState: indexed.pageFetchState ?? null,
    lastCrawlTime: indexed.lastCrawlTime ?? null,
    userCanonical: indexed.userCanonical ?? null,
    googleCanonical: indexed.googleCanonical ?? null,
    scope: "Google'ın kayıtlı indeksleme durumu; canlı test değildir. Sorgu dizine ekleme isteği göndermez.",
  };
}

async function queryAhrefs() {
  const key = process.env.AHREFS_API_KEY || process.env.AHREFS_API_TOKEN;
  if (!key) return { state: "missing", message: "Ahrefs API anahtarı üretim ortamında bulunamadı." };
  const client = createAhrefsClient(key, { maxRetries: 0, timeoutMs: 8000 });
  const data = await client.getSiteOverview("ilkoku.com");
  return { state: "verified", source: "Ahrefs — gerçek API yanıtı", data };
}

async function querySemrush() {
  const key = process.env.SEMRUSH_API_KEY;
  if (!key) return { state: "missing", message: "Semrush API anahtarı üretim ortamında bulunamadı." };
  const client = createSemrushClient(key, { maxRetries: 0, timeoutMs: 8000 });
  const data = await client.getDomainOverview("ilkoku.com", "tr");
  return { state: "verified", source: "Semrush — gerçek API yanıtı", data };
}

// OpenAI 429 can mean spent credit/budget OR a temporary request/token rate limit.
// Only whitelisted error codes may leave this admin-only endpoint; never echo upstream
// messages, request headers, provider response bodies or API credentials.
async function classifyOpenAiFailure(response: Response) {
  if (response.status !== 429) {
    return { state: "error", message: "AI servisi yanıt vermedi (HTTP " + response.status + ")." };
  }
  const payload: unknown = await response.json().catch(() => null);
  const error = payload && typeof payload === "object" && "error" in payload &&
    payload.error && typeof payload.error === "object" ? payload.error as { code?: unknown; type?: unknown } : null;
  const code = typeof error?.code === "string" ? error.code : "";
  const type = typeof error?.type === "string" ? error.type : "";
  const quotaCodes = [
    "credit_balance_exhausted",
    "organization_usage_limit_exceeded",
    "organization_spend_limit_exceeded",
    "project_spend_limit_exceeded",
    "insufficient_quota",
  ];
  if (quotaCodes.includes(code) || type === "insufficient_quota") {
    const errorCode = quotaCodes.includes(code) ? code : "insufficient_quota";
    return {
      state: "error", reason: "quota", errorCode,
      message: "OpenAI API kullanım bakiyesi veya kullanım/harcama limiti dolmuş (HTTP 429). OpenAI API Billing ve Limits sayfalarını kontrol edin; art arda yeniden denemeyin.",
    };
  }
  if (code === "rate_limit_exceeded" || type === "rate_limit_exceeded") {
    return {
      state: "error", reason: "rate_limit", errorCode: "rate_limit_exceeded",
      message: "OpenAI API istek veya token hız sınırına ulaşıldı (HTTP 429). Kısa süre bekleyin ve yalnız bir kez tekrar deneyin; bakiye yüklemek bu sınırı değiştirmez.",
    };
  }
  return {
    state: "error", reason: "unknown_429",
    message: "OpenAI HTTP 429 döndürdü; yanıtında tanınan kota veya hız limiti kodu bulunamadı. OpenAI API Billing ve Limits sayfalarını inceleyin.",
  };
}

async function queryAi(rawPath: string) {
  const key = process.env.OPENAI_API_KEY;
  if (!key) return { state: "missing", message: "OpenAI API anahtarı üretim ortamında bulunamadı." };
  const path = safePublicPath(rawPath);
  if (!path) return { state: "invalid", message: "Yalnız herkese açık İlkOku yolları kullanılabilir." };
  const response = await fetch(ORIGIN + path, {
    cache: "no-store", redirect: "manual", signal: AbortSignal.timeout(6500),
  });
  if (response.status !== 200 || !response.headers.get("content-type")?.includes("text/html")) {
    return { state: "error", message: "Public HTML yanıtı alınamadı." };
  }
  if (Number(response.headers.get("content-length") || 0) > 850000) {
    return { state: "error", message: "HTML güvenli boyut sınırını aşıyor." };
  }
  const html = await response.text();
  if (html.length > 850000) return { state: "error", message: "HTML güvenli boyut sınırını aşıyor." };
  const title = /<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1]?.replace(/<[^>]*>/g, "").slice(0, 150) || "";
  const body = html.replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, "")
    .replace(/<(script|style|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, "")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1000);
  const titlePrompt = buildTitlePrompt({ content: body, tone: "Turkish" }).user;
  const metaPrompt = buildMetaDescriptionPrompt({ title, content: body, tone: "Turkish" }).user;
  // One explicitly requested bounded model call; never publishes or modifies page metadata.
  const aiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    signal: AbortSignal.timeout(11000),
    headers: { "Authorization": "Bearer " + key, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "gpt-4o-mini",
      max_tokens: 220,
      temperature: 0.2,
      messages: [
        { role: "system", content: "Türkçe SEO editörüsün. Mevcut yazıya sadık kal. Gerçek dışı vaat ve uydurma bilgi ekleme. Yalnız 1 başlık ve 1 meta açıklaması öner; yayınlama." },
        { role: "user", content: titlePrompt.slice(0, 1100) + "\n\n" + metaPrompt.slice(0, 1100) },
      ],
    }),
  });
  if (!aiResponse.ok) return classifyOpenAiFailure(aiResponse);
  const payload: unknown = await aiResponse.json();
  const obj = payload as { choices?: Array<{ message?: { content?: string } }> };
  const suggestion = obj.choices?.[0]?.message?.content?.slice(0, 1500) || "";
  if (!suggestion) return { state: "error", message: "Model boş yanıt döndürdü." };
  return { state: "verified", source: "OpenAI — gerçek model yanıtı", path, suggestion, scope: "Yalnız taslak; sayfaya otomatik yazılmaz." };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) return result({ state: "denied", message: "Oturum gerekli." }, 401);
  if (user.role !== "admin") return result({ state: "denied", message: "Yönetici yetkisi gerekli." }, 403);
  // The request URL can have a different hostname behind Hostinger or an internal
  // reverse proxy. Compare the browser Origin against our fixed public origin,
  // never against the proxy-rewritten request.url or forwarded host headers.
  const origin = request.headers.get("origin");
  let trustedOrigin = false;
  if (origin) {
    try {
      const browserOrigin = new URL(origin);
      const requestUrl = new URL(request.url);
      const loopback = ["localhost", "127.0.0.1"];
      const localPreview = loopback.includes(browserOrigin.hostname) &&
        loopback.includes(requestUrl.hostname) &&
        browserOrigin.protocol === "http:" &&
        browserOrigin.port === requestUrl.port;
      trustedOrigin = browserOrigin.origin === ORIGIN || localPreview;
    } catch {
      trustedOrigin = false;
    }
  }
  // Browser cross-site requests are never permitted, even if a proxy
  // introduces untrusted X-Forwarded-Host or a cross-origin form is submitted.
  if (!trustedOrigin || request.headers.get("sec-fetch-site") === "cross-site") {
    return result({ state: "denied", message: "Geçersiz istek kaynağı." }, 403);
  }
  if (Number(request.headers.get("content-length") || 0) > 1024) {
    return result({ state: "invalid", message: "İstek boyutu sınırı aşıldı." }, 413);
  }
  try {
    const raw = await request.text();
    if (raw.length > 1024) return result({ state: "invalid", message: "İstek boyutu sınırı aşıldı." }, 413);
    const body: unknown = JSON.parse(raw);
    if (!body || typeof body !== "object" || Array.isArray(body)) return result({ state: "invalid" }, 400);
    const input = body as { provider?: unknown; path?: unknown };
    if (typeof input.provider !== "string" || !providers.includes(input.provider as Provider)) {
      return result({ state: "invalid", message: "Bilinmeyen servis." }, 400);
    }
    const provider = input.provider as Provider;
    const report = provider === "gsc" ? await queryGsc()
      : provider === "gsc-index" ? await queryGscIndex(typeof input.path === "string" ? input.path : "")
      : provider === "ahrefs" ? await queryAhrefs()
      : provider === "semrush" ? await querySemrush()
      : await queryAi(typeof input.path === "string" ? input.path : "");
    return result({ provider, ...report });
  } catch (error) {
    // Upstream error messages may include credential-bearing URLs or response bodies.
    const status = error && typeof error === "object" && "status" in error &&
      typeof error.status === "number" ? error.status : null;
    return result({
      state: "error",
      message: status ? "Harici API isteği başarısız (HTTP " + status + ")." : "Servis doğrulanamadı veya zaman aşımına uğradı.",
    }, 502);
  }
}
