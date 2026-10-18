"use client";

import { useMemo, useRef, useState } from "react";
import { analyzeLinkEquity, buildLinkGraph, findOrphanPages, suggestLinks } from "@power-seo/links";
import styles from "./PowerSeoDashboard.module.css";

type Page = { url: string; title: string; links: string[]; error: string };
type Batch = {
  fingerprint: string;
  urls: string[];
  offset: number;
  nextOffset: number;
  total: number;
  items: Page[];
};

const ORIGIN = "https://ilkoku.com";
const BATCH_SIZE = 4;
const MAX_URLS = 400;
const VERIFY_BATCH = 4;

type LinkTarget = { url: string; path: string; sourceCount: number; category: "email-protection" | "account" | "protected" | "other" };
type HttpVerification = { path: string; status: number | null; outcome: "reachable" | "redirect" | "missing" | "access-restricted" | "temporary-error" | "unverified"; redirectTo: string | null; reason: string };

function classifyOffSitemap(url: string): LinkTarget["category"] {
  const path = new URL(url).pathname;
  if (path.startsWith("/cdn-cgi/l/email-protection")) return "email-protection";
  if (["/giris", "/kayit", "/sifremi-unuttum"].includes(path)) return "account";
  if (["/yazar", "/hesabim", "/kesfet"].includes(path) ||
    path.startsWith("/editor/") || path.startsWith("/oku/") || path.endsWith("/pasaport")) return "protected";
  return "other";
}

const categoryLabels: Record<LinkTarget["category"], string> = {
  "email-protection": "Cloudflare e-posta koruması (HTTP kontrolü dışı)",
  account: "Hesap / giriş sayfası (sitemap dışı olması olağan)",
  protected: "Oturum veya role bağlı alan (içerik erişimi ayrı)",
  other: "Sitemap dışı sayfa (robots / noindex ayrı doğrulanmalı)",
};


function normal(url: string) {
  const parsed = new URL(url, ORIGIN);
  parsed.hash = "";
  parsed.search = "";
  return parsed.toString().replace(/\/$/, "");
}

export function FullSiteLinkAudit() {
  const [pages, setPages] = useState<Page[]>([]);
  const [urls, setUrls] = useState<string[]>([]);
  const [fingerprint, setFingerprint] = useState("");
  const [cursor, setCursor] = useState(0);
  const [running, setRunning] = useState(false);
  const [complete, setComplete] = useState(false);
  const [error, setError] = useState("");
  const stopRef = useRef(false);
  const [checkingLinks, setCheckingLinks] = useState(false);
  const [linkChecks, setLinkChecks] = useState<HttpVerification[]>([]);
  const [linkCheckComplete, setLinkCheckComplete] = useState(false);
  const [linkCheckError, setLinkCheckError] = useState("");
  const [importingReport, setImportingReport] = useState(false);
  const [sourceMeasuredAt, setSourceMeasuredAt] = useState("");



  const summary = useMemo(() => {
    if (!complete || !urls.length) return null;
    const failures = pages.filter((item) => item.error);
    if (failures.length || pages.length !== urls.length) {
      return { failures, orphans: [] as Array<{url:string;title?:string;outboundCount:number}>,
        equity: [] as Array<{url:string;score:number;inboundCount:number}>,
        suggestions: [] as Array<{from:string;to:string;anchorText:string;relevanceScore:number}>,
        nodes: 0, edges: 0, complete: false, offSitemapTargets: [] as LinkTarget[] };
    }
    const allowed = new Set(urls.map(normal));
    // Off-sitemap links are real HTML anchors, not automatically broken or orphaned.
    const incoming = new Map<string, number>();
    for (const page of pages) {
      for (const link of page.links) {
        try {
          const target = normal(link);
          if (!allowed.has(target)) incoming.set(target, (incoming.get(target) ?? 0) + 1);
        } catch { /* Invalid attributes were excluded at extraction. */ }
      }
    }
    const offSitemapTargets: LinkTarget[] = [...incoming.entries()].map(([url, sourceCount]) => ({
      url, path: new URL(url).pathname, sourceCount, category: classifyOffSitemap(url),
    })).sort((a, b) => b.sourceCount - a.sourceCount || a.url.localeCompare(b.url));
    const graphPages = pages.map((p) => ({
      url: p.url, title: p.title,
      // Only sitemap-to-sitemap edges count; never call off-sitemap pages orphaned.
      links: p.links.filter((link) => {
        try { return allowed.has(normal(link)); } catch { return false; }
      }),
    }));
    const graph = buildLinkGraph(graphPages);
    const orphans = findOrphanPages(graph, [ORIGIN + "/"]).filter((p) => allowed.has(normal(p.url)));
    const equity = analyzeLinkEquity(graph).filter((p) => allowed.has(normal(p.url))).slice(0, 15);
    const suggestions = suggestLinks(graphPages, { maxSuggestions: 12, minRelevance: 0.25 })
      .filter((item) => allowed.has(normal(item.from)) && allowed.has(normal(item.to)));
    return { failures, orphans, equity, suggestions, nodes: graph.totalPages, edges: graph.totalLinks, complete: true, offSitemapTargets };
  }, [complete, pages, urls]);

  async function run(fromZero: boolean) {
    if (running || importingReport || checkingLinks) return;
    stopRef.current = false;
    setRunning(true);
    setError("");
    if (fromZero) {
      setLinkChecks([]);
      setLinkCheckComplete(false);
      setLinkCheckError("");
      setSourceMeasuredAt("");
      setPages([]);
      setUrls([]);
      setFingerprint("");
      setCursor(0);
      setComplete(false);
    }
    let offset = fromZero ? 0 : cursor;
    let expected = fromZero ? "" : fingerprint;
    let expectedUrls = fromZero ? [] : urls;
    const byUrl = new Map((fromZero ? [] : pages).map((page) => [page.url, page]));
    try {
      while (!stopRef.current) {
        const response = await fetch("/api/admin/power-seo/scan?offset=" + offset, {
          cache: "no-store", credentials: "same-origin",
        });
        const data: Batch | { error: string } = await response.json();
        if (!response.ok || "error" in data) {
          throw new Error("error" in data ? data.error : "Tarama yanıtı başarısız.");
        }
        if (data.offset !== offset || data.total < 1 || data.total > MAX_URLS ||
          !Array.isArray(data.urls) || data.urls.length !== data.total ||
          !Array.isArray(data.items) || data.items.length < 1 ||
          data.items.length > BATCH_SIZE || data.nextOffset !== offset + data.items.length) {
          throw new Error("Tarama parçasının doğrulaması başarısız.");
        }
        if (expected && (data.fingerprint !== expected || data.urls.join("\n") !== expectedUrls.join("\n"))) {
          throw new Error("Sitemap tarama sırasında değişti. Baştan yeniden denetleyin.");
        }
        expected = data.fingerprint;
        expectedUrls = data.urls;
        for (const page of data.items) {
          if (!expectedUrls.includes(page.url)) throw new Error("Sitemap dışı tarama yanıtı.");
          byUrl.set(page.url, page);
        }
        offset = data.nextOffset;
        setFingerprint(expected);
        setUrls(expectedUrls);
        setPages([...byUrl.values()]);
        setCursor(offset);
        if (offset >= data.total) {
          setComplete(true);
          break;
        }
        // Explicit pacing: this request sends no concurrent new batch to origin.
        await new Promise<void>((resolve) => setTimeout(resolve, 1600));
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Bağlantı taraması başarısız.");
    } finally {
      setRunning(false);
    }
  }

  async function importPreviousReport(file: File | undefined) {
    if (!file || running || checkingLinks || importingReport) return;
    setImportingReport(true);
    setError("");
    try {
      if (file.size > 1_500_000 || file.size < 100) throw new Error("JSON raporu beklenen boyut sınırları dışında.");
      const parsed: unknown = JSON.parse(await file.text());
      if (!parsed || typeof parsed !== "object") throw new Error("Geçerli JSON raporu bulunamadı.");
      const report = parsed as Record<string, unknown>;
      const expected = report.expectedUrls;
      if (report.site !== ORIGIN || report.source !== "sitemap.xml" ||
        report.complete !== true || !Array.isArray(report.failures) || report.failures.length > 0 ||
        !Number.isInteger(expected) || typeof expected !== "number" || expected < 1 || expected > MAX_URLS ||
        report.scannedUrls !== expected || !Array.isArray(report.pages) ||
        report.pages.length !== expected || typeof report.sitemapFingerprint !== "string" ||
        !/^[a-f0-9]{20}$/.test(report.sitemapFingerprint)) {
        throw new Error("Eksik veya farklı siteye ait rapor kabul edilmedi.");
      }
      const savedPages: Page[] = report.pages.map((item: unknown) => {
        if (!item || typeof item !== "object") throw new Error("JSON sayfa kaydı geçersiz.");
        const row = item as Record<string, unknown>;
        if (typeof row.url !== "string" || typeof row.title !== "string" ||
          row.title.length > 180 || row.error !== "" ||
          !Array.isArray(row.links) || row.links.length > 1500 ||
          row.links.some((link: unknown) => typeof link !== "string" || link.length > 2048)) {
          throw new Error("JSON sayfa bağlantıları geçersiz.");
        }
        const urlsToCheck = [row.url, ...row.links] as string[];
        if (urlsToCheck.some((link) => {
          try {
            const parsedUrl = new URL(link);
            return parsedUrl.origin !== ORIGIN || !!parsedUrl.username || !!parsedUrl.password;
          } catch { return true; }
        })) throw new Error("JSON içinde site dışı veya geçersiz bağlantı var.");
        return { url: row.url, title: row.title, links: row.links as string[], error: "" };
      });
      if (new Set(savedPages.map((page) => page.url)).size !== expected) {
        throw new Error("JSON raporunda tekrarlanan sitemap sayfası var.");
      }
      // One small authenticated verification batch (4 URLs); never rescan all 129 pages.
      const response = await fetch("/api/admin/power-seo/scan?offset=0", {
        cache: "no-store", credentials: "same-origin",
      });
      const live: Batch | { error: string } = await response.json();
      if (!response.ok || "error" in live || !Array.isArray(live.urls) ||
        live.fingerprint !== report.sitemapFingerprint || live.urls.length !== expected ||
        live.urls.some((url) => !savedPages.some((page) => page.url === url))) {
        throw new Error("Canlı sitemap rapordaki sitemap ile eşleşmiyor. Yeni tarama gerekir.");
      }
      setPages(savedPages);
      setUrls(live.urls);
      setFingerprint(live.fingerprint);
      setCursor(savedPages.length);
      setComplete(true);
      setLinkChecks([]);
      setLinkCheckComplete(false);
      setLinkCheckError("");
      setSourceMeasuredAt(typeof report.measuredAt === "string" ? report.measuredAt : "");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "JSON raporu alınamadı.");
    } finally {
      setImportingReport(false);
    }
  }

  async function verifyOffSitemap() {
    if (!summary?.complete || checkingLinks || running) return;
    const targets = summary.offSitemapTargets.filter((item) => item.category !== "email-protection");
    setCheckingLinks(true);
    setLinkCheckComplete(false);
    setLinkCheckError("");
    setLinkChecks([]);
    const gathered: HttpVerification[] = [];
    try {
      for (let offset = 0; offset < targets.length; offset += VERIFY_BATCH) {
        const response = await fetch("/api/admin/power-seo/verify-links", {
          method: "POST",
          cache: "no-store",
          credentials: "same-origin",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paths: targets.slice(offset, offset + VERIFY_BATCH).map((item) => item.path) }),
        });
        const body: { results?: HttpVerification[]; halted?: boolean; error?: string } = await response.json();
        if (!response.ok || !Array.isArray(body.results)) {
          throw new Error(body.error || "HTTP doğrulama sunucusu yanıt veremedi.");
        }
        gathered.push(...body.results);
        setLinkChecks([...gathered]);
        if (body.halted) {
          throw new Error("HTTP 403/429 erişim koruması algılandı. İstekler durduruldu; kalan hedefler doğrulanmadı.");
        }
        if (offset + VERIFY_BATCH < targets.length) {
          await new Promise<void>((resolve) => setTimeout(resolve, 1600));
        }
      }
      setLinkCheckComplete(true);
    } catch (cause) {
      setLinkCheckError(cause instanceof Error ? cause.message : "HTTP doğrulama tamamlanamadı.");
    } finally {
      setCheckingLinks(false);
    }
  }

  function downloadReport() {
    if (!summary || !complete) return;
    const report = {
      site: ORIGIN, source: "sitemap.xml", measuredAt: sourceMeasuredAt || new Date().toISOString(),
      reportExportedAt: new Date().toISOString(),
      sitemapFingerprint: fingerprint, expectedUrls: urls.length,
      scannedUrls: pages.length, failures: summary.failures, complete: summary.complete,
      scope: "Sitemap içindeki HTML sayfalarından alınan bağlantılar; sitemap dışındaki gelen bağlantılar ölçülmez.",
      pages, orphanCandidates: summary.orphans, topEquity: summary.equity, suggestions: summary.suggestions,
      offSitemapTargets: summary.offSitemapTargets,
      httpVerification: linkChecks,
      httpVerificationComplete: linkCheckComplete,
      httpVerificationScope: "Yalnız sitemap dışında kalan aynı alan adı hedefleri; Cloudflare e-posta koruması hariç. Yönlendirme, erişim engeli ve zaman aşımı kırık bağlantı değildir.",
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(report, null, 2)], { type: "application/json" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = "ilkoku-power-seo-fullsite-" + new Date().toISOString().slice(0, 10) + ".json";
    link.click();
    URL.revokeObjectURL(url);
  }

  const failed = pages.filter((item) => item.error).length;
  const percent = urls.length ? Math.min(100, Math.round((pages.length / urls.length) * 100)) : 0;
  return (
    <section className={styles.panel} aria-label="Power-SEO tam site bağlantı analizi">
      <h2>Tam site bağlantı denetimi</h2>
      <p>
        Yalnız mevcut sitemap içindeki public sayfaları, her istekte en çok dört URL ve
        iki eşzamanlı bağlantıyla okur. Taramayı yalnız yönetici başlatabilir; sunucuda
        otomatik toplu tarama veya SEO değişikliği yapmaz.
      </p>
      <div className={styles.quick}>
        <button type="button" onClick={() => void run(true)} disabled={running || importingReport || checkingLinks}>
          {pages.length ? "Baştan tara" : "Tam site taramasını başlat"}
        </button>
        {pages.length && cursor < urls.length && !running ? (
          <button type="button" onClick={() => void run(false)}>Kaldığı yerden devam et</button>
        ) : null}
        {running ? <button type="button" onClick={() => { stopRef.current = true; }}>Durdur</button> : null}
        {complete ? <button type="button" onClick={downloadReport}>JSON raporunu al</button> : null}
      </div>
      <p>Önceden tamamladığınız taramayı yeniden çalıştırmadan kullanmak için önceki Power-SEO JSON raporunu yükleyebilirsiniz. Sistem, canlı sitemap parmak izini kontrol eder ve uyumsuz raporu reddeder.</p>
      <label>
        Tamamlanmış Power-SEO JSON raporunu içeri al
        <input type="file" accept=".json,application/json" disabled={running || importingReport || checkingLinks}
          onChange={(event) => {
            const file = event.target.files?.[0];
            event.target.value = "";
            void importPreviousReport(file);
          }} />
      </label>
      {importingReport ? <p role="status">Sitemap ve rapor tutarlılığı kontrol ediliyor…</p> : null}
      {sourceMeasuredAt && complete ? <p>Önceki tarama yeniden kullanıldı: {sourceMeasuredAt}. Yeni HTTP doğrulaması ayrı başlatılır.</p> : null}
      <div className={styles.stats}>
        <div><strong>{pages.length} / {urls.length || "?"}</strong><span>İncelenen sitemap URL</span></div>
        <div><strong>{percent}%</strong><span>Tarama ilerlemesi</span></div>
        <div><strong>{failed}</strong><span>Yanıtı alınamayan sayfa</span></div>
      </div>
      {urls.length ? (
        <div role="progressbar" aria-label="Tam site bağlantı taraması" aria-valuemin={0} aria-valuemax={urls.length} aria-valuenow={pages.length}
          className={styles.progress}>
          <div style={{ width: percent + "%" }} />
        </div>
      ) : null}
      {running ? <p role="status">İşlem sayfa açıkken sürer; istekler sırayla gönderiliyor.</p> : null}
      {error ? <p className={styles.error} role="alert">{error} Tam sonuç oluşturulmadı.</p> : null}
      {complete && summary ? (
        <>
          <h3>Tarama raporu</h3>
          {summary.complete ? (
            <>
              <p>Gerçek HTML çıktısı başarıyla okunan {pages.length} sitemap sayfası üzerinde {summary.edges} bağlantı kenarı ölçüldü.</p>
              <p><strong>{summary.orphans.length}</strong> sitemap kapsamında diğer sitemap sayfalarından bağlantı almayan URL adayı var. Bu sonuç Google dizininde olup olmama veya sitemap dışı gelen bağlantılar hakkında hüküm vermez.</p>
              <ul className={styles.issues}>
                {summary.orphans.slice(0, 30).map((item) => (
                  <li key={item.url}><b>Bağlantı almayan aday</b><span>{item.url}</span></li>
                ))}
              </ul>
              <h3>Sitemap dışı bağlantılar ve gerçek HTTP durumları</h3>
              <p>{summary.offSitemapTargets.length} farklı sitemap dışı hedefe {summary.offSitemapTargets.reduce((sum, item) => sum + item.sourceCount, 0)} bağlantı bulundu. Sitemap dışında olması tek başına kırık veya Google tarafından indekslenmemiş anlamına gelmez.</p>
              <p>{summary.offSitemapTargets.filter((item) => item.category === "email-protection").length} Cloudflare e-posta koruma hedefi sayfa yerine e-posta gizleme bağlantısıdır; hash bilgisi kaldırıldığı için HTTP 404 olarak değerlendirilmez.</p>
              <div className={styles.quick}>
                <button type="button" disabled={running || checkingLinks || !summary.offSitemapTargets.length}
                  onClick={() => void verifyOffSitemap()}>
                  {checkingLinks ? "HTTP doğrulaması sürüyor…" : "Sitemap dışı hedefleri HTTP ile doğrula"}
                </button>
              </div>
              <p><strong>{linkChecks.filter((item) => item.outcome === "missing").length}</strong> HTTP 404/410 ile doğrulanmış kırık hedef · <strong>{linkChecks.filter((item) => item.outcome === "temporary-error" || item.outcome === "unverified").length}</strong> kesinleşmeyen yanıt · <strong>{linkChecks.length}</strong> HTTP kontrolü tamamlanmış hedef. {linkCheckComplete ? "Bu turdaki kontrol tamamlandı." : "HTTP kontrolü tamamlanmadı veya henüz başlatılmadı."}</p>
              {linkCheckError ? <p className={styles.error} role="alert">{linkCheckError}</p> : null}
              <ul className={styles.issues}>
                {summary.offSitemapTargets.map((item) => {
                  const result = linkChecks.find((row) => row.path === item.path);
                  const httpLabel = result ? `HTTP ${result.status ?? "?"} · ${result.reason}` : "HTTP sonucu henüz yok";
                  return <li key={item.url}>
                    <b>{item.sourceCount} sayfadan bağlantı · {categoryLabels[item.category]}</b>
                    <span>{item.url} — {item.category === "email-protection" ? "Cloudflare bağlantısı: HTTP kontrolü uygulanmaz" : httpLabel}</span>
                  </li>;
                })}
              </ul>
              <h3>En yüksek göreli bağlantı ağı puanları</h3>
              <ul className={styles.issues}>
                {summary.equity.map((item) => (
                  <li key={item.url}><b>{item.score.toFixed(3)} · {item.inboundCount} gelen bağlantı</b><span>{item.url}</span></li>
                ))}
              </ul>
              {summary.suggestions.length ? (
                <>
                  <h3>Editör incelemesine sunulan bağlantı adayları</h3>
                  <p>Otomatik sözcük benzerliği Türkçe anlam uygunluğunu garanti etmez; hiçbir bağlantı kendiliğinden eklenmez.</p>
                  <ul className={styles.issues}>
                    {summary.suggestions.map((item, index) => (
                      <li key={index}><b>{item.anchorText}</b><span>{item.from} → {item.to}</span></li>
                    ))}
                  </ul>
                </>
              ) : null}
            </>
          ) : (
            <>
              <p className={styles.error}>Tarama bitti ancak {summary.failures.length} sayfa okunamadı. Bu nedenle site geneli bağlantısız sayfa puanı oluşturulmadı.</p>
              <ul className={styles.issues}>{summary.failures.map((item) => (
                <li key={item.url}><b>{item.error}</b><span>{item.url}</span></li>
              ))}</ul>
            </>
          )}
        </>
      ) : null}
      <p className={styles.note}>Sitemap, robots, canonical ve mevcut bağlantılar değiştirilmez. Ölçüm yalnız bu tarama anını ve sitemap kapsamını temsil eder.</p>
    </section>
  );
}
