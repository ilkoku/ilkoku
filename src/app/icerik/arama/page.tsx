import Link from "next/link";
import { requireCmsManager } from "@/lib/cms-access";
import { isCmsStagedPayloadStrict } from "@/lib/cms-live-payload-integrity";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type CmsStatus = "draft" | "published" | "archived";

type PageSearchRow = {
  id: string;
  contentKey: string;
  slug: string;
  title: string;
  status: CmsStatus;
  bodyJson: string;
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: Date;
};

type SiteSearchRow = {
  id: string;
  namespace: string;
  contentKey: string;
  valueJson: string;
  status: CmsStatus;
  updatedAt: Date;
};

type StagedPageSearchRow = {
  contentKey: string;
  valueJson: string;
  updatedAt: Date;
  pageId: string;
  targetContentKey: string;
  slug: string;
  title: string;
  liveStatus: CmsStatus;
};

type SearchResult = {
  key: string;
  title: string;
  area: string;
  detail: string;
  href: string;
  status: CmsStatus | "corrupt";
  source: "live" | "staged";
  updatedAt: Date;
};

function parseObject(valueJson: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(valueJson) as unknown;
    return value && typeof value === "object" && !Array.isArray(value)
      ? value as Record<string, unknown>
      : null;
  } catch {
    return null;
  }
}

function stringValue(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function firstString(payload: Record<string, unknown> | null, keys: string[]) {
  if (!payload) return "";
  for (const key of keys) {
    const value = stringValue(payload[key]);
    if (value) return value;
  }
  return "";
}

function compact(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function excerpt(values: Array<string | null | undefined>, query: string) {
  const text = compact(values.filter(Boolean).join(" · "));
  if (!text) return "İçerik ayrıntısı bulunmuyor.";

  const lower = text.toLocaleLowerCase("tr-TR");
  const needle = query.toLocaleLowerCase("tr-TR");
  const matchAt = lower.indexOf(needle);
  const start = matchAt >= 0 ? Math.max(0, matchAt - 70) : 0;
  const end = Math.min(text.length, start + 210);
  return `${start > 0 ? "…" : ""}${text.slice(start, end)}${end < text.length ? "…" : ""}`;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function statusLabel(status: SearchResult["status"]) {
  if (status === "published") return "Yayında";
  if (status === "archived") return "Arşiv";
  if (status === "corrupt") return "Taslak bütünlüğü bozuk";
  return "Taslak";
}

function pageDestination(contentKey: string, id: string) {
  if (contentKey.startsWith("guide:en:")) {
    return { area: "Rehber · EN", href: `/icerik/rehber/${id}?dil=en` };
  }
  if (contentKey.startsWith("guide:")) {
    return { area: "Rehber · TR", href: `/icerik/rehber/${id}?dil=tr` };
  }
  if (contentKey.startsWith("legal:en:")) {
    const slug = contentKey.slice("legal:en:".length);
    return { area: "Yasal Sayfa · EN", href: `/icerik/yasal/${slug}?dil=en` };
  }
  if (contentKey.startsWith("legal:")) {
    const slug = contentKey.slice("legal:".length);
    return { area: "Yasal Sayfa · TR", href: `/icerik/yasal/${slug}?dil=tr` };
  }
  return { area: "Kurumsal Sayfa · TR", href: `/icerik/sayfalar/${id}` };
}

function livePageResult(row: PageSearchRow, query: string): SearchResult {
  const payload = parseObject(row.bodyJson);
  const destination = pageDestination(row.contentKey, row.id);
  return {
    key: `page:${row.id}`,
    title: row.title || row.slug,
    area: destination.area,
    href: destination.href,
    detail: excerpt([
      row.slug,
      row.seoTitle,
      row.seoDescription,
      firstString(payload, ["summary", "description", "body"]),
    ], query),
    status: row.status,
    source: "live",
    updatedAt: row.updatedAt,
  };
}

function liveSiteResult(row: SiteSearchRow, query: string): SearchResult {
  const payload = parseObject(row.valueJson);
  const payloadTitle = firstString(payload, ["title", "question", "alt", "altText", "name", "fileName", "slogan"]);
  const payloadDetail = firstString(payload, ["description", "answer", "body", "summary", "caption"]);

  if (row.namespace === "homepage" || row.namespace === "homepage_en") {
    const locale = row.namespace === "homepage_en" ? "en" : "tr";
    return {
      key: `site:${row.id}`,
      title: payloadTitle || `Ana Sayfa · ${row.contentKey}`,
      area: `Ana Sayfa · ${locale.toUpperCase()}`,
      detail: excerpt([row.contentKey, payloadDetail, row.valueJson], query),
      href: `/icerik/ana-sayfa?dil=${locale}`,
      status: row.status,
      source: "live",
      updatedAt: row.updatedAt,
    };
  }

  if (row.namespace === "faq" || row.namespace === "faq_en") {
    const locale = row.namespace === "faq_en" ? "en" : "tr";
    return {
      key: `site:${row.id}`,
      title: payloadTitle || `SSS · ${row.contentKey}`,
      area: `SSS & Yardım · ${locale.toUpperCase()}`,
      detail: excerpt([payloadDetail, row.contentKey], query),
      href: `/icerik/sss?dil=${locale}#faq-${row.contentKey}`,
      status: row.status,
      source: "live",
      updatedAt: row.updatedAt,
    };
  }

  if (row.namespace === "announcement") {
    return {
      key: `site:${row.id}`,
      title: payloadTitle || `Duyuru · ${row.contentKey}`,
      area: "Duyurular",
      detail: excerpt([payloadDetail, row.contentKey], query),
      href: "/icerik/duyurular",
      status: row.status,
      source: "live",
      updatedAt: row.updatedAt,
    };
  }

  return {
    key: `site:${row.id}`,
    title: payloadTitle || `Medya · ${row.contentKey}`,
    area: "Medya",
    detail: excerpt([payloadDetail, row.contentKey, row.valueJson], query),
    href: "/icerik/medya",
    status: row.status,
    source: "live",
    updatedAt: row.updatedAt,
  };
}

function stagedSiteResult(row: SiteSearchRow, query: string): SearchResult {
  const payload = parseObject(row.valueJson);
  const valid = Boolean(payload && isCmsStagedPayloadStrict(row.contentKey, payload));
  if (!valid) {
    return {
      key: `staged:${row.id}`,
      title: row.contentKey,
      area: "Çalışma Taslağı",
      detail: "Taslak kaydı bulundu ancak içerik şeması doğrulanamadı. Ham kayıt korunuyor; normal düzenleme/yayın akışına alınmamalı.",
      href: "/icerik/saglik",
      status: "corrupt",
      source: "staged",
      updatedAt: row.updatedAt,
    };
  }

  const payloadTitle = firstString(payload, ["title", "question", "slogan"]);
  const payloadDetail = firstString(payload, ["description", "answer", "body", "summary"]);

  if (row.contentKey.startsWith("homepage:")) {
    const [, locale = "tr", section = "bölüm"] = row.contentKey.split(":");
    return {
      key: `staged:${row.id}`,
      title: payloadTitle || `Ana Sayfa · ${section}`,
      area: `Ana Sayfa Taslağı · ${locale.toUpperCase()}`,
      detail: excerpt([section, payloadDetail], query),
      href: `/icerik/ana-sayfa?dil=${locale === "en" ? "en" : "tr"}`,
      status: "draft",
      source: "staged",
      updatedAt: row.updatedAt,
    };
  }

  const [, locale = "tr", ...keyParts] = row.contentKey.split(":");
  const faqKey = keyParts.join(":");
  return {
    key: `staged:${row.id}`,
    title: payloadTitle || `SSS · ${faqKey}`,
    area: `SSS Taslağı · ${locale.toUpperCase()}`,
    detail: excerpt([payloadDetail, faqKey], query),
    href: `/icerik/sss?dil=${locale === "en" ? "en" : "tr"}#faq-${faqKey}`,
    status: "draft",
    source: "staged",
    updatedAt: row.updatedAt,
  };
}

function stagedPageResult(row: StagedPageSearchRow, query: string): SearchResult {
  const payload = parseObject(row.valueJson);
  const valid = Boolean(payload && isCmsStagedPayloadStrict(row.contentKey, payload));
  const destination = pageDestination(row.targetContentKey, row.pageId);

  if (!valid) {
    return {
      key: `staged-page:${row.pageId}`,
      title: row.title,
      area: `${destination.area} · çalışma taslağı`,
      detail: "Bekleyen çalışma taslağı bulundu ancak içerik şeması doğrulanamadı. Canlı kayıt değiştirilmeden Sistem Sağlığına yönlendirildi.",
      href: "/icerik/saglik",
      status: "corrupt",
      source: "staged",
      updatedAt: row.updatedAt,
    };
  }

  const stagedTitle = firstString(payload, ["title"]) || row.title;
  const stagedDetail = firstString(payload, ["summary", "description", "body"]);
  return {
    key: `staged-page:${row.pageId}`,
    title: stagedTitle,
    area: `${destination.area} · çalışma taslağı`,
    detail: excerpt([row.slug, stagedDetail, `Canlı durum: ${statusLabel(row.liveStatus)}`], query),
    href: destination.href,
    status: "draft",
    source: "staged",
    updatedAt: row.updatedAt,
  };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireCmsManager("/icerik/arama");
  const params = await searchParams;
  const query = (params.q ?? "").trim().slice(0, 120);
  const canSearch = query.length >= 2;
  let dataError = false;
  let allResults: SearchResult[] = [];

  if (canSearch) {
    const like = `%${query}%`;
    try {
      const [pages, siteRows, stagedRows, stagedPages] = await Promise.all([
        prisma.$queryRaw<PageSearchRow[]>`
          SELECT id, contentKey, slug, title, status, bodyJson, seoTitle, seoDescription, updatedAt
          FROM ContentPage
          WHERE (
            contentKey LIKE 'page:tr:%'
            OR contentKey LIKE 'guide:%'
            OR contentKey LIKE 'legal:%'
          )
          AND (
            title LIKE ${like}
            OR slug LIKE ${like}
            OR COALESCE(seoTitle, '') LIKE ${like}
            OR COALESCE(seoDescription, '') LIKE ${like}
            OR bodyJson LIKE ${like}
          )
          ORDER BY updatedAt DESC
          LIMIT 80
        `,
        prisma.$queryRaw<SiteSearchRow[]>`
          SELECT id, namespace, contentKey, valueJson, status, updatedAt
          FROM SiteContent
          WHERE namespace IN ('homepage', 'homepage_en', 'faq', 'faq_en', 'announcement', 'media')
            AND status IN ('draft', 'published', 'archived')
            AND (contentKey LIKE ${like} OR valueJson LIKE ${like})
          ORDER BY updatedAt DESC
          LIMIT 80
        `,
        prisma.$queryRaw<SiteSearchRow[]>`
          SELECT id, namespace, contentKey, valueJson, status, updatedAt
          FROM SiteContent
          WHERE namespace = 'cms_draft'
            AND status = 'draft'
            AND (contentKey LIKE 'homepage:%' OR contentKey LIKE 'faq:%')
            AND (contentKey LIKE ${like} OR valueJson LIKE ${like})
          ORDER BY updatedAt DESC
          LIMIT 80
        `,
        prisma.$queryRaw<StagedPageSearchRow[]>`
          SELECT
            d.contentKey,
            d.valueJson,
            d.updatedAt,
            p.id AS pageId,
            p.contentKey AS targetContentKey,
            p.slug,
            p.title,
            p.status AS liveStatus
          FROM SiteContent d
          INNER JOIN ContentPage p ON d.contentKey = CONCAT('page:', p.id)
          WHERE d.namespace = 'cms_draft'
            AND d.status = 'draft'
            AND (
              p.contentKey LIKE 'page:tr:%'
              OR p.contentKey LIKE 'guide:%'
              OR p.contentKey LIKE 'legal:%'
            )
            AND (d.valueJson LIKE ${like} OR p.title LIKE ${like} OR p.slug LIKE ${like})
          ORDER BY d.updatedAt DESC
          LIMIT 80
        `,
      ]);

      allResults = [
        ...pages.map((row) => livePageResult(row, query)),
        ...siteRows.map((row) => liveSiteResult(row, query)),
        ...stagedRows.map((row) => stagedSiteResult(row, query)),
        ...stagedPages.map((row) => stagedPageResult(row, query)),
      ].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    } catch {
      dataError = true;
    }
  }

  const results = allResults.slice(0, 120);

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Site · İçerik Bulucu</span>
          <h1>İçerik Ara</h1>
          <p>Kurumsal sayfa, rehber, yasal metin, ana sayfa, SSS, duyuru, medya ve bekleyen çalışma taslaklarında tek noktadan arayın.</p>
        </div>
        <aside className="cms-editor-status-card" data-tone={dataError ? "danger" : canSearch ? "success" : "info"} aria-label="Arama durumu">
          <span className="cms-editor-status-card__label">Arama durumu</span>
          <strong>{dataError ? "Kaynaklar doğrulanamadı" : canSearch ? `${allResults.length} eşleşme bulundu` : "Aramaya hazır"}</strong>
          <div className="cms-editor-status-card__meta">
            <span className="cms-editor-chip">Public/CMS içerikleri</span>
            <span className="cms-editor-chip is-positive">PII hariç</span>
          </div>
        </aside>
      </div>

      <nav className="cms-editor-toolbar" aria-label="İçerik arama hızlı işlemleri">
        <div className="cms-editor-toolbar__cluster">
          <Link href="/icerik">← Genel Bakış</Link>
          <Link href="/icerik/yayin-kuyrugu">Yayın Kuyruğu</Link>
          <Link href="/icerik/gecmis">Sürüm Geçmişi</Link>
        </div>
        <div className="cms-editor-toolbar__cluster">
          <Link href="/icerik/saglik">Sistem Sağlığı</Link>
        </div>
      </nav>

      <div className="content-panel">
        <form action="/icerik/arama" method="get" className="content-form">
          <label>
            <span>Arama</span>
            <input
              name="q"
              type="search"
              maxLength={120}
              defaultValue={query}
              placeholder="Başlık, soru, URL, metin veya medya açıklaması…"
              autoComplete="off"
            />
          </label>
          <p className="content-form-help">En az 2 karakter. Form talepleri, kullanıcı kayıtları, yetkiler, ayarlar, audit kayıtları ve diğer hassas sistem verileri bilinçli olarak arama dışında tutulur.</p>
          <div className="content-form-actions"><button type="submit">Ara</button></div>
        </form>
      </div>

      {query && !canSearch ? (
        <div className="content-panel cms-editor-notice is-warning" role="status">
          <strong>Arama için en az 2 karakter gerekli.</strong>
          <p>Daha uzun bir başlık, URL parçası veya içerik ifadesi girin.</p>
        </div>
      ) : null}

      {dataError ? (
        <div className="content-panel cms-editor-notice is-danger" role="alert">
          <strong>İçerik arama kaynaklarının tamamı okunamadı.</strong>
          <p>Kısmi sonuç gösterip görünmeyen bir taslağı veya içeriği yok saymamak için sonuç listesi fail-closed durduruldu. Hiçbir kayıt değiştirilmedi.</p>
          <div className="content-form-actions" style={{ flexWrap: "wrap" }}>
            <Link href="/icerik/saglik">Sistem Sağlığı →</Link>
            <Link href={`/icerik/arama?q=${encodeURIComponent(query)}`}>Tekrar dene ↻</Link>
          </div>
        </div>
      ) : null}

      {canSearch && !dataError ? (
        <div className="content-panel">
          <div className="content-section-heading">
            <div><span>01</span><h2>Arama sonuçları</h2></div>
            <p>{results.length}{allResults.length > results.length ? ` / ${allResults.length}` : ""} sonuç gösteriliyor</p>
          </div>

          {results.length === 0 ? (
            <div className="content-empty-state">
              <strong>“{query}” için CMS içeriği bulunamadı.</strong>
              <p>Bu boş sonuç yalnız tüm izinli içerik kaynakları başarıyla okunduktan sonra gösterilir.</p>
            </div>
          ) : (
            <div className="content-table-wrap">
              <table className="content-table">
                <thead>
                  <tr>
                    <th>İçerik</th>
                    <th>Alan</th>
                    <th>Kaynak</th>
                    <th>Durum</th>
                    <th>Güncellendi</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {results.map((result) => (
                    <tr key={result.key}>
                      <td><strong>{result.title}</strong><br /><small>{result.detail}</small></td>
                      <td>{result.area}</td>
                      <td><span className={`cms-status-pill ${result.source === "staged" ? "is-draft" : ""}`}>{result.source === "staged" ? "Bekleyen taslak" : "CMS kaydı"}</span></td>
                      <td>{result.status === "corrupt" ? <span className="cms-editor-chip is-danger">{statusLabel(result.status)}</span> : <span className={`cms-status-pill is-${result.status}`}>{statusLabel(result.status)}</span>}</td>
                      <td>{formatDate(result.updatedAt)}</td>
                      <td><Link className="cms-button-link" href={result.href}>{result.status === "corrupt" ? "Sağlığı aç →" : "Yönet →"}</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {allResults.length > results.length ? (
            <div className="content-panel cms-editor-notice is-info" style={{ marginTop: "1rem" }}>
              <strong>Sonuç limiti uygulandı.</strong>
              <p>{allResults.length} eşleşmenin en güncel 120 kaydı gösteriliyor. Daha dar bir arama ifadesi kullanarak sonucu küçültebilirsiniz.</p>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
