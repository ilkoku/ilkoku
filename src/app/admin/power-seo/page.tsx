import type { Metadata } from "next";
import Link from "next/link";
import { auditPage } from "@power-seo/audit";
import { analyzeContent } from "@power-seo/content-analysis";
import { analyzeAltText } from "@power-seo/images";
import { generateSerpPreview } from "@power-seo/preview";
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
  { slug: "links", title: "Links", note: "Site içi bağlantı grafiği; tam site envanteri gerekli", mode: "Ek bağlantı envanteri gerekli" },
  { slug: "images", title: "Images", note: "Görsel alt metin analizi", mode: "Bu ekranda çalışır" },
  { slug: "preview", title: "Preview", note: "Google arama sonucu önizlemesi", mode: "Bu ekranda çalışır" },
  { slug: "schema", title: "Schema", note: "JSON-LD / schema.org yardımcıları", mode: "Paket kurulu" },
  { slug: "sitemap", title: "Sitemap", note: "XML sitemap üretim/denetim yardımcıları", mode: "Mevcut sitemap korunuyor" },
  { slug: "meta", title: "Meta", note: "Next.js metadata üretim yardımcıları", mode: "Mevcut metadata korunuyor" },
  { slug: "react", title: "React", note: "React SEO bileşenleri", mode: "Paket kurulu" },
  { slug: "readability", title: "Readability", note: "İngilizce formüller; Türkçe puan geçerli sayılmaz", mode: "Türkçe puanlama devre dışı" },
  { slug: "redirects", title: "Redirects", note: "Yönlendirme motoru ve zincir inceleme", mode: "Mevcut yönlendirmeler korunuyor" },
  { slug: "analytics", title: "Analytics", note: "GSC verileri ve denetim eğilimleri", mode: "Veri bağlantısı gerekli" },
  { slug: "search-console", title: "Search Console", note: "Google API istemcisi ve URL inceleme", mode: "Google yetkilendirmesi gerekli" },
  { slug: "integrations", title: "Integrations", note: "Semrush / Ahrefs API istemcileri", mode: "Harici API erişimi gerekli" },
  { slug: "ai", title: "AI", note: "Model bağımsız SEO öneri istemleri", mode: "Harici yapay zekâ modeli gerekli" },
  { slug: "tracking", title: "Tracking", note: "İzleme ve çerez izni yardımcıları", mode: "Mevcut GA4/GTM korunuyor" },
] as const;

const examples = ["/", "/nasil-calisir", "/yazarlar-icin", "/editoryal-standartlar", "/yardim"];

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
  h1Count: number;
  linkCount: number;
  imageCount: number;
  score: number;
  rules: Array<{ id: string; title: string; description: string; severity: string }>;
  contentScore: number | null;
  previewTitle: string;
  previewUrl: string;
  titleTruncated: boolean;
  imageAltIssues: number;
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
  const headings = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((m) => "h" + m[1] + ":" + textOnly(m[2]));
  const links = (html.match(/<a\b[^>]*>/gi) || []).map((t) => attr(t, "href")).filter(Boolean);
  const images = (html.match(/<img\b[^>]*>/gi) || [])
    .map((t) => ({ src: attr(t, "src"), alt: attr(t, "alt") }))
    .filter((item) => item.src);
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
  return {
    statusCode: response.status,
    elapsed, title, description, canonical,
    h1Count: headings.filter((h) => h.startsWith("h1:")).length,
    linkCount: internalLinks.length, imageCount: images.length,
    score: audit.score,
    rules: audit.rules.map(({ id, title: ruleTitle, description: detail, severity }) =>
      ({ id, title: ruleTitle, description: detail, severity })),
    contentScore: contentAnalysis.maxScore > 0 && Number.isFinite(contentAnalysis.score)
      ? Math.round((contentAnalysis.score / contentAnalysis.maxScore) * 100)
      : null,
    previewTitle: preview.title,
    previewUrl: preview.displayUrl,
    titleTruncated: preview.titleTruncated,
    imageAltIssues: imageAudit.issues.length,
  };
}

export default async function PowerSeoDashboard({
  searchParams,
}: {
  searchParams: Promise<{ yol?: string | string[] }>;
}) {
  const params = await searchParams;
  const raw = typeof params.yol === "string" ? params.yol : "";
  const path = raw ? safePath(raw) : null;
  let audit: AuditResult | null = null;
  let error = raw && !path ? "Yalnız İlkOku'nun herkese açık site içi yolları denetlenebilir." : "";
  if (path) {
    try { audit = await inspectLivePage(path); }
    catch (e) { error = e instanceof Error ? e.message : "Canlı HTML denetimi yapılamadı."; }
  }

  return (
    <div className={styles.wrapper}>
      <div className={styles.top}>
        <div>
          <small>BAĞIMSIZ SEO YÖNETİM ALANI</small>
          <h1>Power-SEO</h1>
          <p>Mevcut /icerik/seo veritabanı panelinden bağımsız, gerçek HTML üzerinde salt-okunur denetim.</p>
        </div>
        <Link href="/sistem-yonetimi">← Sistem yönetimi</Link>
      </div>
      <div className={styles.stats}>
        <div><strong>17 / 17</strong><span>npm modülü bağımlılıkta</span></div>
        <div><strong>4</strong><span>Bu ekranda kullanılan modül</span></div>
        <div><strong>0</strong><span>Değiştirilen public SEO politikası</span></div>
      </div>
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
              <div><strong>{audit.score}/100</strong><span>Power-SEO audit puanı</span></div>
              <div><strong>{audit.contentScore === null ? "Veri yok" : audit.contentScore + "/100"}</strong><span>İçerik motoru (Türkçe için ihtiyatlı)</span></div>
              <div><strong>{audit.elapsed} ms</strong><span>Bu denetimde gözlenen yanıt</span></div>
            </div>
            <div className={styles.facts}>
              <p><b>Başlık:</b> {audit.title || "Eksik"}</p>
              <p><b>Açıklama:</b> {audit.description || "Eksik"}</p>
              <p><b>Canonical:</b> {audit.canonical || "Eksik"}</p>
              <p><b>H1:</b> {audit.h1Count} · <b>İç bağlantı:</b> {audit.linkCount} · <b>Görsel:</b> {audit.imageCount} · <b>Alt metin bulgusu:</b> {audit.imageAltIssues}</p>
            </div>
            <h3>Google arama sonucu önizlemesi</h3>
            <div className={styles.facts}>
              <small>{audit.previewUrl}</small>
              <p><strong>{audit.previewTitle}</strong>{audit.titleTruncated ? " · Başlık kırpılmış" : ""}</p>
              <p>{audit.description || "Açıklama eksik"}</p>
            </div>
            <h3>Denetim bulguları</h3>
            <ul className={styles.issues}>
              {audit.rules.filter((r) => r.severity !== "pass").map((r, i) => (
                <li key={r.id + i}><b>{r.severity.toUpperCase()} — {r.title}</b><span>{r.description}</span></li>
              ))}
            </ul>
          </div>
        ) : null}
      </section>
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
      <p className={styles.note}>Google Search Console, Semrush, Ahrefs ve harici yapay zekâ servisleri için gerçek yetkilendirme olmadan “bağlandı” denmez. Bu ekran indeksleme politikalarını veya site içeriğini değiştirmez.</p>
    </div>
  );
}
