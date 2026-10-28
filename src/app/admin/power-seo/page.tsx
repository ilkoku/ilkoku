/* eslint-disable @next/next/no-html-link-for-pages -- Power-SEO operational drill-down links intentionally use full navigation. */
import type { Metadata } from "next";
import Link from "next/link";
import { auditPage } from "@power-seo/audit";
import { analyzeContent } from "@power-seo/content-analysis";
import { analyzeAltText } from "@power-seo/images";
import { generateSerpPreview } from "@power-seo/preview";
import { validateSchema, type SchemaObject } from "@power-seo/schema";
import { buildTitlePrompt, buildMetaDescriptionPrompt } from "@power-seo/ai";
import { createMetadata } from "@power-seo/meta";
import { PowerSeoOperations } from "./PowerSeoOperations";
import { FullSiteLinkAudit } from "./FullSiteLinkAudit";
import { PowerSeoConnections } from "./PowerSeoConnections";
import { PowerSeoProviderChecks } from "./PowerSeoProviderChecks";
import { PowerSeoLocalDiagnostics } from "./PowerSeoLocalDiagnostics";
import styles from "./PowerSeoDashboard.module.css";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Power-SEO | İlkOku",
  robots: { index: false, follow: false },
};

const modules = [
  { slug: "core", title: "Core", note: "SEO doğrulayıcıları ve hesaplama çekirdeği", mode: "Altyapı" },
  { slug: "content-analysis", title: "Content Analysis", note: "Gerçek HTML içeriği üzerinde SEO kontrolleri", mode: "Bu ekranda çalışır" },
  { slug: "audit", title: "Audit", note: "Sayfa bazında teknik kontrol ve bulgular", mode: "Bu ekranda çalışır" },
  { slug: "links", title: "Links", note: "Parçalı denetim ve kullanıcı tarafından başlatılan birleştirilmiş sitemap grafiği", mode: "Tam tarama isteğe bağlı" },
  { slug: "images", title: "Images", note: "Görsel alt metin analizi", mode: "Bu ekranda çalışır" },
  { slug: "preview", title: "Preview", note: "Google arama sonucu önizlemesi", mode: "Bu ekranda çalışır" },
  { slug: "schema", title: "Schema", note: "Canlı HTML üzerindeki JSON-LD doğrulaması", mode: "Bu ekranda çalışır" },
  { slug: "sitemap", title: "Sitemap", note: "Canlı XML URL, tekrar ve lastmod denetimi", mode: "Salt okunur kontrol aktif" },
  { slug: "meta", title: "Meta", note: "Next.js metadata üretim yardımcıları", mode: "Taslak önizleme aktif; mevcut metadata korunuyor" },
  { slug: "react", title: "React", note: "React SEO bileşenleri", mode: "İzole meta önizlemesi aktif, public head değişmez" },
  { slug: "readability", title: "Readability", note: "İngilizce formüller; Türkçe puan geçerli sayılmaz", mode: "İngilizce örnek test edildi, Türkçe puanlama kapalı" },
  { slug: "redirects", title: "Redirects", note: "Dört eski URL’nin HTTP yönlendirme kontrolü", mode: "Salt okunur kontrol aktif" },
  { slug: "analytics", title: "Analytics", note: "GSC gerçek yanıtından sınırlı sayfa analitiği", mode: "Manuel API sorgusunda, yetki gerekli" },
  { slug: "search-console", title: "Search Console", note: "Google API istemcisi ve performans okuma", mode: "Manuel gerçek sorgu; Google yetkilendirmesi gerekli" },
  { slug: "integrations", title: "Integrations", note: "Semrush / Ahrefs API istemcileri", mode: "Manuel gerçek sorgu; API erişimi gerekli" },
  { slug: "ai", title: "AI", note: "Model bağımsız SEO öneri istemleri", mode: "İstem taslakları aktif; model bağlantısı gerekli" },
  { slug: "tracking", title: "Tracking", note: "İzole izin modeli kontrolü", mode: "GTM/GA4 değiştirilmeden test edildi" },
] as const;

const examples = ["/", "/nasil-calisir", "/yazarlar-icin", "/editoryal-standartlar", "/yardim"];
// A small, intentional indexability review. This never triggers the 129-URL
// crawler and never claims to reproduce Google's indexing decisions.
const priorityPaths = ["/nasil-calisir", "/yazarlar-icin/kurgu/roman"] as const;

function priorityFindings(path: string, audit: AuditResult) {
  const findings: string[] = [];
  if (audit.statusCode !== 200) findings.push("Public sayfa HTTP " + audit.statusCode + " döndürüyor.");
  const expected = new URL(path, "https://ilkoku.com").toString().replace(/\/$/, "");
  let canonical = "";
  try { canonical = audit.canonical ? new URL(audit.canonical, "https://ilkoku.com").toString().replace(/\/$/, "") : ""; }
  catch { /* Invalid canonical is reported below. */ }
  if (canonical !== expected) findings.push("Canonical eksik veya beklenen sayfayla eşleşmiyor.");
  if (/(?:^|[,\s])noindex\b/i.test(audit.robots)) findings.push("Robots meta noindex içeriyor.");
  if (/(?:^|[,\s])noindex\b/i.test(audit.xRobotsTag)) findings.push("HTTP X-Robots-Tag noindex içeriyor.");
  if (!audit.title) findings.push("SEO başlığı eksik.");
  if (!audit.description) findings.push("Meta açıklaması eksik.");
  if (audit.h1Count !== 1) findings.push("Beklenen tek H1 yerine " + audit.h1Count + " H1 bulundu.");
  if (audit.imageAltIssues) findings.push(audit.imageAltIssues + " görsel alt metin bulgusu var.");
  if (audit.schemaIssues.length) findings.push(audit.schemaIssues.length + " schema uyarısı/bulgusu var.");
  return findings;
}

function safePath(raw: string) {
  if (raw.length > 160 || !/^\/(?:[a-z0-9-]+\/?)*$/.test(raw)) return null;
  const segments = raw.split("/").filter(Boolean);
  if (segments.some((s) => ["admin", "icerik", "api", "sistem-yonetimi", "harita", "hesabim", "giris"].includes(s))) return null;
  return raw;
}

function attr(tag: string, name: string) {
  const pattern = new RegExp("\\b" + name + "\\s*=\\s*(['\"])(.*?)\\1", "i");
  return pattern.exec(tag)?.[2]?.trim() || "";
}

function textOnly(html: string) {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function findMeta(html: string, key: string, val: string) {
  const tags = html.match(/<meta\b[^>]*>/gi) || [];
  const tag = tags.find((t) => attr(t, key).toLowerCase() === val.toLowerCase());
  return tag ? attr(tag, "content") : "";
}

function canonicalFromHtml(html: string) {
  const tags = html.match(/<link\b[^>]*>/gi) || [];
  const tag = tags.find((t) => attr(t, "rel").toLowerCase().split(/\s+/).includes("canonical"));
  return tag ? attr(tag, "href") : "";
}

type AuditResult = {
  statusCode: number;
  elapsed: number;
  title: string;
  description: string;
  canonical: string;
  robots: string;
  xRobotsTag: string;
  h1Count: number;
  linkCount: number;
  imageCount: number;
  score: number;
  rules: Array<{ id: string; title: string; description: string; severity: string }>;
  advisoryRules: Array<{ id: string; title: string; description: string; severity: string }>;
  contentScore: number | null;
  previewTitle: string;
  previewUrl: string;
  titleTruncated: boolean;
  imageAltIssues: number;
  imageReviewSignals: number;
  schemaCount: number;
  schemaTypes: string[];
  schemaIssues: string[];
  titlePrompt: string;
  descriptionPrompt: string;
  metadataTitle: string;
};

async function inspectLivePage(path: string): Promise<AuditResult> {
  const url = new URL(path, "https://ilkoku.com");
  const start = performance.now();
  // The path is strictly same-origin and public. No user-provided host or redirect.
  const response = await fetch(url.toString(), {
    cache: "no-store",
    redirect: "manual",
    signal: AbortSignal.timeout(8000),
    headers: { "User-Agent": "IlkOku-PowerSEO-Admin-Audit/1.0" },
  });
  const elapsed = Math.round(performance.now() - start);
  const contentType = response.headers.get("content-type") || "";
  if (!contentType.toLowerCase().includes("text/html")) {
    throw new Error("Hedef HTML döndürmedi (HTTP " + response.status + ").");
  }
  const length = Number(response.headers.get("content-length") || "0");
  if (length > 900000) throw new Error("HTML boyutu denetim sınırını aşıyor.");
  const html = await response.text();
  if (html.length > 900000) throw new Error("HTML boyutu denetim sınırını aşıyor.");
  const title = textOnly(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] || "");
  const description = findMeta(html, "name", "description");
  const canonical = canonicalFromHtml(html);
  const robots = findMeta(html, "name", "robots");
  const xRobotsTag = response.headers.get("x-robots-tag") || "";
  const headings = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((m) => "h" + m[1] + ":" + textOnly(m[2]));
  const links = (html.match(/<a\b[^>]*>/gi) || []).map((t) => attr(t, "href")).filter(Boolean);
  const imageTags = html.match(/<img\b[^>]*>/gi) || [];
  const images = imageTags.map((t) => ({ src: attr(t, "src"), alt: attr(t, "alt") }))
    .filter((item) => item.src);
  // Decorative images may intentionally use alt="". Missing alt on a
  // non-presentational image is a more defensible actionable finding.
  const imageAltIssues = imageTags.filter((tag) =>
    attr(tag, "src") && !/\balt\s*=/i.test(tag) &&
    attr(tag, "role").toLowerCase() !== "presentation" &&
    attr(tag, "aria-hidden").toLowerCase() !== "true"
  ).length;
  const documentTag = /<html\b[^>]*>/i.exec(html)?.[0] || "";
  const isTurkishPage = attr(documentTag, "lang").toLowerCase().startsWith("tr");
  const internalLinks = links.filter((href) => href.startsWith("/") || href.startsWith("https://ilkoku.com/"));
  const externalLinks = links.filter((href) => /^https?:\/\//.test(href) && !href.startsWith("https://ilkoku.com/"));
  const content = html.replace(/<head\b[^>]*>[\s\S]*?<\/head>/i, "")
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, "")
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, "").slice(0, 450000);

  const audit = auditPage({
    url: url.toString(),
    title, metaDescription: description, canonical, robots,
    content, headings, images, internalLinks, externalLinks,
    statusCode: response.status, responseTime: elapsed, contentLength: html.length,
  });
  // Automated editorial-language scoring can be misleading for Turkish.
  // Show the upstream content score separately rather than labeling it Google rank.
  const contentAnalysis = analyzeContent({ content, title, metaDescription: description });
  const imageAudit = analyzeAltText(images);
  const preview = generateSerpPreview({ title, description, url: url.toString(), siteTitle: "İlkOku" });
  // Prompt templates are local and read-only; no model is called or billed.
  const excerpt = content.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").slice(0, 900);
  const titlePrompt = buildTitlePrompt({ content: excerpt, tone: "Turkish" }).user;
  const descriptionPrompt = buildMetaDescriptionPrompt({ title, content: excerpt, tone: "Turkish" }).user;
  // Compare generated preview metadata without injecting it into the site's head.
  const previewMetadata = createMetadata({ title, description, canonical });
  const schemaTypes: string[] = [];
  const schemaIssues: string[] = [];
  let schemaCount = 0;
  const jsonLdScripts = [...html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)]
    .filter((match) => /\btype\s*=\s*["']application\/ld\+json["']/i.test(match[1]))
    .slice(0, 25);
  for (const script of jsonLdScripts) {
    try {
      const parsed: unknown = JSON.parse(script[2]);
      const roots = Array.isArray(parsed) ? parsed : [parsed];
      for (const root of roots.slice(0, 50)) {
        if (!root || typeof root !== "object" || Array.isArray(root)) continue;
        const record = root as Record<string, unknown>;
        const graph = Array.isArray(record["@graph"]) ? record["@graph"] : [record];
        for (const node of graph.slice(0, 50)) {
          if (!node || typeof node !== "object" || Array.isArray(node)) continue;
          const item = node as Record<string, unknown>;
          const label = typeof item["@type"] === "string" ? item["@type"] : "Tanımsız";
          schemaTypes.push(label);
          const result = validateSchema(item as unknown as SchemaObject);
          schemaCount++;
          for (const issue of result.issues.slice(0, 10)) {
            // Do not invent historical publication dates to appease a schema library.
            const dateAdvice = issue.field === "datePublished" || issue.field === "dateModified";
            schemaIssues.push(label + " · " + (dateAdvice ? "tarih önerisi" : issue.severity) +
              " · " + issue.field + ": " + (dateAdvice ? "Yalnız doğrulanmış yayın/güncelleme tarihi varsa eklenmeli." : issue.message));
          }
        }
      }
    } catch {
      schemaIssues.push("Bozuk JSON-LD: script JSON olarak okunamadı.");
    }
  }
  // Independently parsed HTML outranks conflicting package heuristics.
  const canonicalMatches = (() => {
    try { return new URL(canonical, url).toString().replace(/\/$/, "") === url.toString().replace(/\/$/, ""); }
    catch { return false; }
  })();
  const oneH1 = headings.filter((heading) => heading.startsWith("h1:")).length === 1;
  // Only reconcile claims that directly contradict independently observed HTML.
  // Never ignore a genuine missing/multiple H1, missing canonical or absent schema.
  const reliableRules = audit.rules.filter((rule) => {
    if (canonicalMatches && /canonical url/i.test(rule.title)) return false;
    if (oneH1 && /^(?:single h1|heading structure)$/i.test(rule.title)) return false;
    if (schemaCount > 0 && /^structured data$/i.test(rule.title)
      && /no structured data/i.test(rule.description)) return false;
    if (imageAltIssues === 0 && /^image alt text$/i.test(rule.title)
      && /missing alt text/i.test(rule.description)) return false;
    return true;
  });
  // The upstream package uses English lexical signals and generic E-E-A-T/AEO
  // templates. These are suggestions, not confirmed technical SEO failures,
  // especially when inspecting Turkish HTML and a separately parsed JSON-LD graph.
  const editorialTitles = new Set([
    "seo title",
    "paragraph length",
    "sentence length",
    "title number",
    "title sentiment",
    "title power word",
    "headline analyzer",
    "table of contents",
    "experience signals",
    "multimedia evidence",
    "case studies & examples",
    "author schema",
    "technical vocabulary",
    "methodology transparency",
    "author social presence",
    "organization affiliation",
    "published works & credentials",
    "expert sourcing",
    "editorial review",
    "source quality",
    "correction & update policy",
    "privacy & safety",
    "e-e-a-t overall score",
    "word complexity",
    "flesch reading ease",
    "consecutive sentences",
    "featured snippet readiness",
    "people also ask coverage",
    "rich result schema readiness",
    "direct answer opening (aeo)",
    "faq section (aeo)",
    "fact density (aeo)",
    "tl;dr / summary section (aeo)",
    "concise answer paragraphs (aeo)",
    "structured content patterns (aeo)",
    "citation readiness (aeo)",
    "content size",
    "transition words",
    "expert precision",
  ]);
  const isEditorialRule = (title: string) => editorialTitles.has(title.toLowerCase().trim());
  const advisoryRules = reliableRules.filter((rule) => isTurkishPage && isEditorialRule(rule.title));
  const technicalRules = reliableRules.filter((rule) => !(isTurkishPage && isEditorialRule(rule.title)));
  return {
    statusCode: response.status,
    elapsed, title, description, canonical, robots, xRobotsTag,
    h1Count: headings.filter((h) => h.startsWith("h1:")).length,
    linkCount: internalLinks.length, imageCount: images.length,
    score: audit.score,
    rules: technicalRules.map(({ id, title: ruleTitle, description: detail, severity }) =>
      ({ id, title: ruleTitle, description: detail, severity })),
    advisoryRules: advisoryRules.map(({ id, title: ruleTitle, description: detail }) =>
      ({ id, title: ruleTitle, description: detail, severity: "review" })),
    contentScore: !isTurkishPage && contentAnalysis.maxScore > 0 && Number.isFinite(contentAnalysis.score)
      ? Math.round((contentAnalysis.score / contentAnalysis.maxScore) * 100)
      : null,
    previewTitle: preview.title,
    previewUrl: preview.displayUrl,
    titleTruncated: preview.titleTruncated,
    imageAltIssues,
    imageReviewSignals: imageAudit.issues.length,
    schemaCount, schemaTypes, schemaIssues,
    titlePrompt, descriptionPrompt,
    metadataTitle: typeof previewMetadata.title === "string" ? previewMetadata.title : title,
  };
}

export default async function PowerSeoDashboard({
  searchParams,
}: {
  searchParams: Promise<{ yol?: string | string[]; mod?: string | string[]; parca?: string | string[]; sekme?: string | string[]; kontrol?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = typeof params.yol === "string" ? params.yol : "";
  const mode = typeof params.mod === "string" ? params.mod : "";
  const requestedTab = typeof params.sekme === "string" ? params.sekme : "";
  // Keep previously shared ?mod=... and ?yol=... deep links working.
  const activeTab = ["genel", "tarama", "sayfa", "servisler", "teknik"].includes(requestedTab)
    ? requestedTab : mode ? "tarama" : raw ? "sayfa" : "genel";
  const scanMode = mode || "full-links";
  const requestedSlice = typeof params.parca === "string" && /^\d{1,2}$/.test(params.parca) ? Number(params.parca) : 1;
  const path = raw ? safePath(raw) : null;
  let audit: AuditResult | null = null;
  let error = raw && !path ? "Yalnız İlkOku'nun herkese açık site içi yolları denetlenebilir." : "";
  if (path) {
    try { audit = await inspectLivePage(path); }
    catch (e) { error = e instanceof Error ? e.message : "Canlı HTML denetimi yapılamadı."; }
  }

  // Exactly two same-origin requests, sequential and only on explicit admin action.
  // A status of "teknik engel görülmedi" is NOT proof that Google indexed the URL.
  const priorityRequested = activeTab === "genel" && params.kontrol === "oncelik";
  const priorityResults: Array<{ path: string; audit: AuditResult | null; error: string }> = [];
  if (priorityRequested) {
    for (const target of priorityPaths) {
      try {
        priorityResults.push({ path: target, audit: await inspectLivePage(target), error: "" });
      } catch {
        priorityResults.push({ path: target, audit: null, error: "Canlı HTML denetimi başarısız veya zaman aşımına uğradı." });
      }
    }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.top}>
        <div>
          <small>SEO YÖNETİM MERKEZİ</small>
          <h1>Power-SEO</h1>
          <p>Denetim, Google verileri ve harici API işlemleri ayrı çalışma alanlarında.</p>
        </div>
        <Link href="/sistem-yonetimi">← Sistem yönetimi</Link>
      </div>
      {activeTab === "genel" ? (
        <>
          <div className={styles.stats}>
            <div><strong>17 / 17</strong><span>Entegre npm modülü</span></div>
            <div><strong>17</strong><span>Kod entegrasyonu (API yetkisi ayrı)</span></div>
            <div><strong>0</strong><span>Değiştirilen public SEO politikası</span></div>
          </div>
          <section className={styles.panel}>
            <h2>Öncelikli sayfalarda canlı Power-SEO teşhisi</h2>
            <p>129 URL taraması ve sitemap dışı HTTP kontrolleri daha önce tamamlandı. Şimdi Google’ın tarayıp indekslemediği iki öncelikli public sayfayı gerçek HTML, Audit, Content Analysis, Images, Schema ve Preview motorlarıyla kontrol edin. Yalnız düğmeye basıldığında iki sayfa sırayla okunur; SEO kuralları değiştirilmez.</p>
            <div className={styles.primaryActions}>
              <a href="/sistem-yonetimi/power-seo?sekme=genel&kontrol=oncelik">
                İki öncelikli sayfanın canlı SEO kontrolünü çalıştır →
              </a>
            </div>
            {priorityRequested ? (
              <div className={styles.results} aria-label="Canlı öncelikli Power-SEO sonuçları">
                {priorityResults.map(({ path: checkedPath, audit: inspected, error: failure }) => {
                  const findings = inspected ? priorityFindings(checkedPath, inspected) : [];
                  return (
                    <article className={styles.panel} key={checkedPath}>
                      <h3>{checkedPath}</h3>
                      {failure ? <p className={styles.error} role="alert">{failure}</p> : null}
                      {inspected ? (
                        <>
                          <p><b>HTTP {inspected.statusCode}</b> · Power-SEO Audit {inspected.score}/100 · H1: {inspected.h1Count} · İç bağlantı: {inspected.linkCount} · Schema: {inspected.schemaCount} · Alt metin bulgusu: {inspected.imageAltIssues}</p>
                          <p><b>Canonical:</b> {inspected.canonical || "Eksik"} · <b>Robots:</b> {inspected.robots || "Meta belirtilmedi"} · <b>X-Robots-Tag:</b> {inspected.xRobotsTag || "Yok"}</p>
                          {findings.length ? (
                            <ul className={styles.issues}>{findings.map((finding) => <li key={finding}>{finding}</li>)}</ul>
                          ) : <p>Bu teknik kontrollerde doğrudan engel bulunmadı. Google indeks durumu ayrıca GSC ile değerlendirilir.</p>}
                          <div className={styles.quick}>
                            <Link href={"/sistem-yonetimi/power-seo?sekme=sayfa&yol=" + encodeURIComponent(checkedPath)}>Ayrıntılı audit, içerik, schema ve SERP önizlemesi →</Link>
                            <Link href="/sistem-yonetimi/power-seo?sekme=servisler">Google URL Inspection durumunu sorgula →</Link>
                          </div>
                        </>
                      ) : null}
                    </article>
                  );
                })}
                <p className={styles.note}>Bu denetim Google’ın indeksleme kararını veya Search Console’daki son tarama tarihini taklit etmez. Otomatik indeksleme isteği ve içerik yayını yoktur.</p>
              </div>
            ) : null}
          </section>
          <section className={styles.panel}>
            <h2>Hangi işlemi yapmak istiyorsunuz?</h2>
            <div className={styles.actionGrid}>
              <a href="/sistem-yonetimi/power-seo?sekme=tarama&mod=full-links"><strong>Tam site ve kırık bağlantılar</strong><span>JSON raporu, 404/410 doğrulaması, kaynaklar</span></a>
              <a href="/sistem-yonetimi/power-seo?sekme=sayfa"><strong>Tek sayfa SEO kontrolü</strong><span>HTML, başlık, canonical, schema</span></a>
              <a href="/sistem-yonetimi/power-seo?sekme=servisler"><strong>GSC ve diğer API servisleri</strong><span>Gerçek yanıt ve yetkilendirme testleri</span></a>
              <a href="/sistem-yonetimi/power-seo?sekme=teknik"><strong>17 teknik modül</strong><span>Envanter ve izole modül tanıları</span></a>
            </div>
          </section>
        </>
      ) : null}
      {activeTab === "tarama" ? (
        <>
          <section className={styles.panel}>
            <h2>Site taraması ve bağlantılar</h2>
            <p>Bir denetim seçin. Tam site raporunu içeri almak için ilk seçeneği kullanın; tarama otomatik başlamaz.</p>
            <nav className={styles.subNav} aria-label="Site tarama araçları">
              <a aria-current={scanMode === "full-links" ? "page" : undefined} href="/sistem-yonetimi/power-seo?sekme=tarama&mod=full-links">Tam site / HTTP doğrulaması</a>
              <a aria-current={scanMode === "sitemap" ? "page" : undefined} href="/sistem-yonetimi/power-seo?sekme=tarama&mod=sitemap">Sitemap</a>
              <a aria-current={scanMode === "links" ? "page" : undefined} href="/sistem-yonetimi/power-seo?sekme=tarama&mod=links&parca=1">Parçalı bağlantı grafiği</a>
              <a aria-current={scanMode === "redirects" ? "page" : undefined} href="/sistem-yonetimi/power-seo?sekme=tarama&mod=redirects">Yönlendirmeler</a>
            </nav>
          </section>
          {scanMode === "full-links" ? <FullSiteLinkAudit /> : <PowerSeoOperations mode={scanMode} slice={requestedSlice} />}
        </>
      ) : null}
      {activeTab === "sayfa" ? (
        <section className={styles.panel}>
        <h2>Canlı sayfa denetimi</h2>
        <p>Bir public URL’nin sunucudan alınan HTML çıktısını analiz eder. Sıralama veya indeksleme garantisi vermez.</p>
        <form method="get" action="/sistem-yonetimi/power-seo" className={styles.form}>
          <label htmlFor="audit-path">URL yolu (örnek: /nasil-calisir)</label>
          <input id="audit-path" name="yol" required defaultValue={path || ""} placeholder="/nasil-calisir" />
          <button type="submit">Canlı sayfayı denetle</button>
        </form>
        <div className={styles.quick}>
          {examples.map((p) => <Link key={p} href={"/sistem-yonetimi/power-seo?yol=" + encodeURIComponent(p)}>{p}</Link>)}
        </div>
        {error ? <p className={styles.error} role="alert">Denetim yapılmadı: {error}</p> : null}
        {audit ? (
          <div className={styles.results}>
            <h3>{path} — HTTP {audit.statusCode}</h3>
            <div className={styles.stats}>
              <div><strong>{audit.score}/100</strong><span>Ham paket puanı (doğrulanmış SEO notu değil)</span></div>
              <div><strong>{audit.contentScore === null ? "Türkçe için uygulanmaz" : audit.contentScore + "/100"}</strong><span>İngilizce odaklı içerik motoru</span></div>
              <div><strong>{audit.elapsed} ms</strong><span>Bu denetimde gözlenen yanıt</span></div>
            </div>
            <div className={styles.facts}>
              <p><b>Başlık:</b> {audit.title || "Eksik"}</p>
              <p><b>Açıklama:</b> {audit.description || "Eksik"}</p>
              <p><b>Canonical:</b> {audit.canonical || "Eksik"}</p>
              <p><b>H1:</b> {audit.h1Count} · <b>İç bağlantı:</b> {audit.linkCount} · <b>Görsel:</b> {audit.imageCount} · <b>Alt niteliği eksik görsel:</b> {audit.imageAltIssues}</p>
              <p>Images paketinin ham inceleme sinyali: {audit.imageReviewSignals}. Boş alt niteliği dekoratif görsellerde geçerli olabilir; bu sayı otomatik hata değildir.</p>
            </div>
            <h3>Google arama sonucu önizlemesi</h3>
            <div className={styles.facts}>
              <small>{audit.previewUrl}</small>
              <p><strong>{audit.previewTitle}</strong>{audit.titleTruncated ? " · Başlık kırpılmış" : ""}</p>
              <p>{audit.description || "Açıklama eksik"}</p>
            </div>
            <h3>Gerçek JSON-LD / schema kontrolü</h3>
            <p>{audit.schemaCount} yapılandırılmış veri nesnesi bulundu. {audit.schemaTypes.length ? audit.schemaTypes.join(" · ") : "JSON-LD tespit edilmedi."}</p>
            {audit.schemaIssues.length ? (
              <ul className={styles.issues}>
                {audit.schemaIssues.slice(0, 25).map((issue, i) => <li key={i}><span>{issue}</span></li>)}
              </ul>
            ) : <p>Modülün tanıdığı alanlarda uyarı yok. Tanınmayan tipler için bu Google zengin sonuç uygunluğu anlamına gelmez.</p>}
            <h3>Power-SEO meta taslağı (salt okunur)</h3>
            <p>Meta modülünün oluşturduğu karşılaştırma başlığı: {audit.metadataTitle}. Bu taslak yayınlanmaz ve sayfa başlığını değiştirmez.</p>
            <h3>Yapay zekâ öneri istemleri — taslak</h3>
            <p>AI modülüyle Türkçe öneri istemleri oluşturuldu. Harici yapay zekâ çağrısı yapılmadı; otomatik öneri üretildiği veya içerik düzenlendiği iddia edilmez.</p>
            <details>
              <summary>SEO başlığı önerisi istemi</summary>
              <pre className={styles.facts}>{audit.titlePrompt}</pre>
            </details>
            <details>
              <summary>Meta açıklaması önerisi istemi</summary>
              <pre className={styles.facts}>{audit.descriptionPrompt}</pre>
            </details>
            <h3>Doğrulanmış teknik denetim bulguları</h3>
            {audit.rules.some((rule) => rule.severity !== "pass") ? (
              <ul className={styles.issues}>
                {audit.rules.filter((r) => r.severity !== "pass").map((r, i) => (
                  <li key={r.id + i}><b>{r.severity.toUpperCase()} — {r.title}</b><span>{r.description}</span></li>
                ))}
              </ul>
            ) : <p>Canlı HTML ile çelişen paket uyarıları teknik hata olarak gösterilmiyor.</p>}
            {audit.advisoryRules.length ? (
              <>
                <h3>Editoryal inceleme önerileri (Google indeksleme hatası değil)</h3>
                <p>Bu paket önerileri İngilizce odaklı veya genel şablon ölçümleridir. Türkçe sayfa için doğrulanmış teknik SEO hatası, Google sıralama kuralı ya da siteyi değiştirme talimatı değildir.</p>
                <ul className={styles.issues}>
                  {audit.advisoryRules.map((r, i) => (
                    <li key={r.id + i}><b>İNCELEME — {r.title}</b><span>{r.description}</span></li>
                  ))}
                </ul>
              </>
            ) : null}
          </div>
        ) : null}
      </section>
      ) : null}
      {activeTab === "servisler" ? (
        <>
          <PowerSeoConnections />
          <PowerSeoProviderChecks />
        </>
      ) : null}
      {activeTab === "teknik" ? (
        <>
          <PowerSeoLocalDiagnostics />
          <section className={styles.panel}>
        <h2>Power-SEO modül envanteri</h2>
        <p>“Paket kurulu” bir modülün otomatik olarak yapılandırıldığı veya dış API’lere bağlandığı anlamına gelmez.</p>
        <div className={styles.modules}>
          {modules.map((m) => (
            <article key={m.slug} className={styles.module}>
              <div><b>{m.title}</b><small>@power-seo/{m.slug} · 1.0.19</small></div>
              <p>{m.note}</p>
              <em>{m.mode}</em>
            </article>
          ))}
        </div>
      </section>
        </>
      ) : null}
      <p className={styles.note}>Power-SEO ekranındaki denetimler kendiliğinden yayın yapmaz; sitemap, robots, canonical, noindex ve mevcut site tasarımı korunur.</p>
    </div>
  );
}
