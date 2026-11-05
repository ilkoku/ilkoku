import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SITE_ORIGIN = "https://ilkoku.com";
const GSC_INDEXED = "Gönderildi ve dizine eklendi";
const GSC_UNKNOWN = "URL Google tarafından bilinmiyor";
const GSC_CRAWLED = "Tarandı - şu anda dizine eklenmiş değil";
const GSC_DISCOVERED = "Keşfedildi - şu anda dizine eklenmiş değil";

function siteUrl(value) {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    if (url.origin !== SITE_ORIGIN || url.search || url.hash) return null;
    const cleanPath = url.pathname.length > 1 ? url.pathname.replace(/\/+$/u, "") : "/";
    return SITE_ORIGIN + cleanPath;
  } catch {
    return null;
  }
}

function cohort(url) {
  const p = url.slice(SITE_ORIGIN.length);
  if (/^\/yazarlar-icin\/kurgu\/[^/]+$/u.test(p)) return "Kurgu rehberleri";
  if (/^\/yazarlar-icin\/bilgilendirici\/[^/]+$/u.test(p)) return "Bilgilendirici rehberler";
  if (/^\/yazarlar-icin\/edebiyat\/[^/]+$/u.test(p)) return "Edebiyat rehberleri";
  if (/^\/yazarlar-icin\/senaryo-ve-sahne\/[^/]+$/u.test(p)) return "Senaryo ve sahne rehberleri";
  if (/^\/editorler-icin\/egitim\/[^/]+$/u.test(p)) return "Editör eğitimleri";
  if (/^\/okurlar-icin\/[^/]+$/u.test(p)) return "Okur eğitimleri";
  if (/^\/yazarlar-icin\/[^/]+\/[^/]+$/u.test(p)) return "Diğer yazarlık rehberleri";
  if (/^\/yazarlar-icin\/[^/]+$/u.test(p)) return "Yazarlık kategori sayfaları";
  if (p.startsWith("/en-cok-satanlar")) return "En çok satanlar";
  return "Diğer sayfalar";
}

function priorityFamily(url) {
  const p = url.slice(SITE_ORIGIN.length);
  if (p === "/yazarlar-icin" || p.startsWith("/yazarlar-icin/")) return "Yazarlar";
  if (p === "/okurlar-icin" || p.startsWith("/okurlar-icin/")) return "Okurlar";
  if (p === "/editorler-icin" || p.startsWith("/editorler-icin/")) return "Editörler";
  if (p === "/yayinevleri-icin") return "Yayınevleri";
  if (["/hakkimizda", "/nasil-calisir", "/editoryal-standartlar"].includes(p)) return "Kurumsal";
  return null;
}

function googleState(row) {
  if (row.error) return "inspection_error";
  if (row.verdict === "PASS" || row.coverageState === GSC_INDEXED) return "indexed";
  if (row.coverageState === GSC_UNKNOWN) return "unknown";
  if (row.coverageState === GSC_CRAWLED) return "crawled_not_indexed";
  if (row.coverageState === GSC_DISCOVERED) return "discovered_not_indexed";
  return "other";
}

function countGroups(items, key) {
  const result = {};
  for (const item of items) {
    const value = item[key] ?? "missing";
    result[value] = (result[value] || 0) + 1;
  }
  return result;
}

function dateAgeHours(time, now = new Date()) {
  const parsed = Date.parse(time || "");
  return Number.isFinite(parsed) ? Math.max(0, (now.getTime() - parsed) / 3_600_000) : null;
}

function getIncoming(power) {
  const sources = new Map();
  for (const page of power.linkReview?.pageLinks || []) {
    const from = siteUrl(page.url);
    if (!from) continue;
    for (const raw of page.insideSitemap || []) {
      const target = siteUrl(raw);
      if (!target || target === from) continue;
      if (!sources.has(target)) sources.set(target, new Set());
      sources.get(target).add(from);
    }
  }
  return sources;
}

function percentage(numerator, denominator) {
  return denominator ? +(100 * numerator / denominator).toFixed(1) : null;
}

function csvCell(value) {
  const str = value === undefined || value === null ? "" : String(value);
  return '"' + str.replaceAll('"', '""') + '"';
}

export function buildAudit({ gsc, power, previousGsc = null, now = new Date() }) {
  if (!Array.isArray(gsc?.results) || gsc.results.length === 0) throw new Error("GSC report lacks URL inspection rows");
  if (!Array.isArray(power?.results) || power.results.length === 0) throw new Error("Power-SEO report lacks live URL rows");
  const incoming = getIncoming(power);
  const liveByUrl = new Map(power.results.map((row) => [siteUrl(row.url), row]).filter(([url]) => url));
  const gscByUrl = new Map(gsc.results.map((row) => [siteUrl(row.inspectionUrl), row]).filter(([url]) => url));
  const previousByUrl = new Map((previousGsc?.results || []).map((row) => [siteUrl(row.inspectionUrl), row]).filter(([url]) => url));
  if (gscByUrl.size !== gsc.results.length) throw new Error("GSC URLs are duplicated or unsafe");
  if (liveByUrl.size !== power.results.length) throw new Error("Power-SEO URLs are duplicated or unsafe");
  const watch = new Map((gsc.summary?.recrawlWatch?.pages || []).map((p) => [p.path, p]));
  const rows = [...gscByUrl.entries()].map(([url, google]) => {
    const live = liveByUrl.get(url) || null;
    const state = googleState(google);
    const previous = previousByUrl.get(url);
    const previousState = previous ? googleState(previous) : null;
    const priority = priorityFamily(url);
    const incomingSources = incoming.get(url)?.size ?? 0;
    const pathName = url.slice(SITE_ORIGIN.length);
    const latestCrawl = watch.get(pathName);
    const googleCrawled = Boolean(google.lastCrawlTime);
    const technicalIssue = live
      ? live.ok === false || live.canonicalMatches === false || /\bnoindex\b/iu.test(live.robots || "")
      : true;
    const googleTechnicalIssue = googleCrawled && (
      google.robotsTxtState === "DISALLOWED" ||
      google.indexingState === "INDEXING_NOT_ALLOWED" ||
      (google.pageFetchState && google.pageFetchState !== "SUCCESSFUL")
    );
    return {
      url, path: pathName, group: cohort(url), priorityFamily: priority, googleState: state,
      previousGoogleState: previousState,
      googleChanged: previousState !== null && previousState !== state,
      lastGoogleCrawl: google.lastCrawlTime || "",
      newContentCrawledNotIndexed: latestCrawl?.state === "POST_UPDATE_CRAWLED_NOT_INDEXED",
      liveHtmlVerified: live !== null && live.ok === true,
      canonicalVerified: live?.canonicalMatches === true,
      incomingSitemapPages: incomingSources,
      structuralIssue: technicalIssue || googleTechnicalIssue,
      googleSitemapAttribution: Array.isArray(google.sitemap) ? google.sitemap.length : null,
      // Missing GSC referringUrls/sitemap attribution is NOT evidence of missing real links.
    };
  });
  const states = countGroups(rows, "googleState");
  const groupTable = [];
  for (const group of [...new Set(rows.map((row) => row.group))].sort()) {
    const subset = rows.filter((row) => row.group === group);
    const incomingSorted = subset.map((row) => row.incomingSitemapPages).sort((a, b) => a - b);
    groupTable.push({
      group, total: subset.length,
      indexed: subset.filter((row) => row.googleState === "indexed").length,
      crawledNotIndexed: subset.filter((row) => row.googleState === "crawled_not_indexed").length,
      unknown: subset.filter((row) => row.googleState === "unknown").length,
      medianSitemapIncoming: incomingSorted[Math.floor((incomingSorted.length - 1) / 2)] ?? null,
    });
  }
  const priorityRows = rows.filter((row) => row.priorityFamily !== null);
  const priorityStats = {
    total: priorityRows.length,
    indexed: priorityRows.filter((row) => row.googleState === "indexed").length,
    crawledNotIndexed: priorityRows.filter((row) => row.googleState === "crawled_not_indexed").length,
    unknown: priorityRows.filter((row) => row.googleState === "unknown").length,
    discoveredNotIndexed: priorityRows.filter((row) => row.googleState === "discovered_not_indexed").length,
  };
  const priorityGroups = ["Yazarlar", "Okurlar", "Editörler", "Yayınevleri", "Kurumsal"].map((group) => {
    const subset = priorityRows.filter((row) => row.priorityFamily === group);
    return {
      group, total: subset.length,
      indexed: subset.filter((row) => row.googleState === "indexed").length,
      crawledNotIndexed: subset.filter((row) => row.googleState === "crawled_not_indexed").length,
      unknown: subset.filter((row) => row.googleState === "unknown").length,
      discoveredNotIndexed: subset.filter((row) => row.googleState === "discovered_not_indexed").length,
    };
  });
  const sourceAge = {
    gscHours: dateAgeHours(gsc.generatedAt, now),
    powerHours: dateAgeHours(power.checkedAt, now),
    previousGscHours: previousGsc ? dateAgeHours(previousGsc.generatedAt, now) : null,
  };
  const mismatchedUrls = rows.filter((row) => !row.liveHtmlVerified || !row.canonicalVerified || row.structuralIssue);
  const sourceMismatch = [...liveByUrl.keys()].filter((url) => !gscByUrl.has(url));
  const incomplete = Boolean(
    gsc.summary?.errors || power.summary?.errors || sourceMismatch.length ||
    rows.length !== liveByUrl.size || sourceAge.gscHours === null ||
    sourceAge.powerHours === null || sourceAge.gscHours > 72 || sourceAge.powerHours > 72
  );
  const changingPages = rows.filter((row) => row.googleChanged);
  const stats = {
    total: rows.length,
    indexed: states.indexed || 0,
    crawledNotIndexed: states.crawled_not_indexed || 0,
    unknown: states.unknown || 0,
    discoveredNotIndexed: states.discovered_not_indexed || 0,
    other: (states.other || 0) + (states.inspection_error || 0),
    noIncomingInSitemapGraph: rows.filter((row) => row.path !== "/" && row.incomingSitemapPages === 0).length,
    unknownWithMultipleInlinks: rows.filter((row) => row.googleState === "unknown" && row.incomingSitemapPages >= 2).length,
    newContentCrawledNotIndexed: rows.filter((row) => row.newContentCrawledNotIndexed).length,
    technicalReviewUrls: mismatchedUrls.length,
    googleChangedUrls: changingPages.length,
    indexedSharePct: percentage(states.indexed || 0, rows.length),
  };
  return {
    generatedAt: now.toISOString(), sources: {
      gscGeneratedAt: gsc.generatedAt,
      powerCheckedAt: power.checkedAt,
      previousGscGeneratedAt: previousGsc?.generatedAt || null,
      sourceAge, incomplete,
    },
    scope: "READ ONLY: GSC URL Inspection + Power-SEO live public sitemap graph. No indexed guarantee, no Google attribution inferred from empty referral fields, no external link authority measured.",
    stats, priorityStats, priorityGroups, groupTable, changes: changingPages.map((row) => ({
      path: row.path, from: row.previousGoogleState, to: row.googleState,
    })),
    technicalReview: mismatchedUrls.map((row) => ({
      path: row.path, liveHtmlVerified: row.liveHtmlVerified,
      canonicalVerified: row.canonicalVerified,
    })),
    sourceMismatchUrls: sourceMismatch,
    contentOverlapCandidates: power.contentReview?.contentOverlapCandidates || [],
    rows,
  };
}

export function markdownReport(audit) {
  const s = audit.stats;
  const lines = [
    "# İlkOku SEO tanı döngüsü — " + audit.generatedAt.slice(0, 10),
    "",
    "**Kapsam:** Yalnızca kanıtlı, salt okunur GSC ve canlı Power-SEO verileri. Bir sayfanın Google tarafından seçilmemesinin kesin algoritmik nedeni görülemez.",
    "",
    "## Google dizinleme",
    "",
    "| Ölçüm | URL |", "| --- | ---: |",
    "| Sitemap/GSC URL | " + s.total + " |",
    "| Dizinde | " + s.indexed + " |",
    "| Tarandı, dizinde değil | " + s.crawledNotIndexed + " |",
    "| Google bilinmiyor | " + s.unknown + " |",
    "| Keşfedildi, dizinde değil | " + s.discoveredNotIndexed + " |",
    "| Diğer/inceleme hatası | " + s.other + " |",
    "",
    "## Birinci öncelik: İlkOku temel sayfaları",
    "",
    "| Grup | Toplam | İndekste | Tarandı ama eklenmedi | Google bilmiyor | Keşfedildi ama eklenmedi |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...audit.priorityGroups.map((row) => "| " + row.group + " | " + row.total + " | " + row.indexed + " | " + row.crawledNotIndexed + " | " + row.unknown + " | " + row.discoveredNotIndexed + " |"),
    "| **Toplam** | **" + audit.priorityStats.total + "** | **" + audit.priorityStats.indexed + "** | **" + audit.priorityStats.crawledNotIndexed + "** | **" + audit.priorityStats.unknown + "** | **" + audit.priorityStats.discoveredNotIndexed + "** |",
    "",
    "> Kitap satış listeleri bu tablonun dışındadır; tam veri ve teknik kontroller saklanır.",
    "",
        "## Kanıtların ayrımı",
    "",
    "- Google bilinmiyor ancak sitemap HTML grafiğinde en az 2 farklı sayfadan bağlantılı: **" + s.unknownWithMultipleInlinks + "**. Bu bağlantı sayısı Google'ın sayfayı kesin keşfettiği anlamına gelmez.",
    "- Teknik değerlendirme gerektiren canlı URL: **" + s.technicalReviewUrls + "**. Bu sayfalar kanıtlı kontrol gerektirir; otomatik içerik değişikliği yapılmaz.",
    "- Son güncellemesinden sonra tekrar taranmış ve hâlâ dizinde olmayan izleme sayfası: **" + s.newContentCrawledNotIndexed + "**.",
    "- Canlı sitemap grafiğinde başka sitemap URL'sinden bağlantı almayan sayfa (anasayfa hariç): **" + s.noIncomingInSitemapGraph + "**.",
    "",
    "## Rehber aileleri",
    "",
    "| Grup | Toplam | İndeksli | Tarandı/eklenmedi | Google bilinmiyor | Ortanca farklı sitemap kaynak sayfası |",
    "| --- | ---: | ---: | ---: | ---: | ---: |",
    ...audit.groupTable.map((row) => "| " + row.group + " | " + row.total + " | " + row.indexed + " | " + row.crawledNotIndexed + " | " + row.unknown + " | " + (row.medianSitemapIncoming ?? "—") + " |"),
    "",
    "## Önceki denetime göre değişimler",
    "",
    ...(audit.sources.previousGscGeneratedAt
      ? [audit.changes.length ? audit.changes.map((r) => "- " + r.path + ": " + r.from + " → " + r.to).join("\n") : "Dizin durumu değişimi bulunmadı."]
      : ["Önceki GSC raporu bulunmadı; günlük karşılaştırma yapılamıyor."]),
    "",
    "## Kaynak güvenilirliği",
    "",
    "- GSC: " + audit.sources.gscGeneratedAt,
    "- Power-SEO: " + audit.sources.powerCheckedAt,
    "- Kaynak eski/eksik/eşleşmiyor: **" + (audit.sources.incomplete ? "EVET — bulguları güncel kabul etme" : "HAYIR") + "**",
    "",
    "> GSC URL Inspection ekranındaki boş sitemap/referrer alanları, gerçekte sitemap veya HTML bağlantısı bulunmadığını kanıtlamaz. Screaming Frog masaüstü CSV'si bu otomatik raporda canlı veri olarak gösterilmez.",
    "",
  ];
  return lines.join("\n");
}

export function csvReport(audit) {
  const cols = [
    "url", "path", "group", "priorityFamily", "googleState", "previousGoogleState",
    "googleChanged", "lastGoogleCrawl", "incomingSitemapPages",
    "liveHtmlVerified", "canonicalVerified", "structuralIssue",
    "newContentCrawledNotIndexed"
  ];
  return [cols.map(csvCell).join(","), ...audit.rows.map((row) =>
    cols.map((col) => csvCell(row[col])).join(",")
  )].join("\n") + "\n";
}

function getArgs(argv) {
  const options = {};
  for (let i = 0; i < argv.length; i += 2) {
    if (!argv[i].startsWith("--") || !argv[i + 1]) throw new Error("Arguments must be --name value pairs");
    options[argv[i].slice(2)] = argv[i + 1];
  }
  return options;
}

function main() {
  const args = getArgs(process.argv.slice(2));
  if (!args.gsc || !args.power || !args.output) {
    throw new Error("Usage: node scripts/seo-audit-loop.mjs --gsc gsc.json --power power.json --output directory [--previous-gsc previous.json]");
  }
  const load = (name) => JSON.parse(fs.readFileSync(name, "utf8"));
  const report = buildAudit({
    gsc: load(args.gsc), power: load(args.power),
    previousGsc: args["previous-gsc"] ? load(args["previous-gsc"]) : null,
  });
  fs.mkdirSync(args.output, { recursive: true });
  fs.writeFileSync(path.join(args.output, "seo-audit-loop.json"), JSON.stringify(report, null, 2));
  fs.writeFileSync(path.join(args.output, "seo-audit-loop.md"), markdownReport(report));
  fs.writeFileSync(path.join(args.output, "seo-audit-loop.csv"), csvReport(report));
  console.log(JSON.stringify({ stats: report.stats, sources: report.sources }));
  if (process.env.GITHUB_STEP_SUMMARY) {
    fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, markdownReport(report));
  }
  if (report.sources.incomplete) {
    console.warn("SEO audit source data stale or incomplete; result is diagnostic only.");
    process.exitCode = 2;
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) {
  try { main(); } catch (error) {
    console.error(error instanceof Error ? error.message : String(error));
    process.exitCode = 1;
  }
}
