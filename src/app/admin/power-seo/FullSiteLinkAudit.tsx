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

  const summary = useMemo(() => {
    if (!complete || !urls.length) return null;
    const failures = pages.filter((item) => item.error);
    if (failures.length || pages.length !== urls.length) {
      return { failures, orphans: [] as Array<{url:string;title?:string;outboundCount:number}>,
        equity: [] as Array<{url:string;score:number;inboundCount:number}>,
        suggestions: [] as Array<{from:string;to:string;anchorText:string;relevanceScore:number}>,
        nodes: 0, edges: 0, complete: false };
    }
    const allowed = new Set(urls.map(normal));
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
    return { failures, orphans, equity, suggestions, nodes: graph.totalPages, edges: graph.totalLinks, complete: true };
  }, [complete, pages, urls]);

  async function run(fromZero: boolean) {
    if (running) return;
    stopRef.current = false;
    setRunning(true);
    setError("");
    if (fromZero) {
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

  function downloadReport() {
    if (!summary || !complete) return;
    const report = {
      site: ORIGIN, source: "sitemap.xml", measuredAt: new Date().toISOString(),
      sitemapFingerprint: fingerprint, expectedUrls: urls.length,
      scannedUrls: pages.length, failures: summary.failures, complete: summary.complete,
      scope: "Sitemap içindeki HTML sayfalarından alınan bağlantılar; sitemap dışındaki gelen bağlantılar ölçülmez.",
      pages, orphanCandidates: summary.orphans, topEquity: summary.equity, suggestions: summary.suggestions,
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
        <button type="button" onClick={() => void run(true)} disabled={running}>
          {pages.length ? "Baştan tara" : "Tam site taramasını başlat"}
        </button>
        {pages.length && cursor < urls.length && !running ? (
          <button type="button" onClick={() => void run(false)}>Kaldığı yerden devam et</button>
        ) : null}
        {running ? <button type="button" onClick={() => { stopRef.current = true; }}>Durdur</button> : null}
        {complete ? <button type="button" onClick={downloadReport}>JSON raporunu al</button> : null}
      </div>
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
