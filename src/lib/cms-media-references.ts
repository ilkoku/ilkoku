import "server-only";

import { prisma } from "@/lib/prisma";

export type CmsMediaReference = {
  source: "site" | "page" | "work";
  label: string;
  detail: string;
  editHref: string;
};

type SiteReferenceRow = {
  namespace: string;
  contentKey: string;
  valueJson: string;
};

type WorkCoverReferenceRow = { coverUrl: string | null };

function firstPartyMediaVariants(path: string) {
  return [path, `https://ilkoku.com${path}`, `https://www.ilkoku.com${path}`];
}

function workCoverMediaPath(coverUrl: string | null) {
  return coverUrl?.match(
    /^(?:https:\/\/(?:www\.)?ilkoku\.com)?(\/api\/media\/[0-9a-f]{8}-(?:[0-9a-f]{4}-){3}[0-9a-f]{12})(?:\?.*)?$/iu,
  )?.[1] ?? null;
}

type PageReferenceRow = {
  id: string;
  contentKey: string;
  slug: string;
  title: string;
  bodyJson: string;
};

function siteReferenceMeta(row: SiteReferenceRow): Omit<CmsMediaReference, "source"> {
  if (row.namespace === "homepage" || row.namespace === "homepage_en") {
    const locale = row.namespace.endsWith("_en") ? "en" : "tr";
    return { label: `Ana Sayfa · ${row.contentKey}`, detail: `${locale.toUpperCase()} canlı bölüm`, editHref: `/icerik/ana-sayfa?dil=${locale}` };
  }
  if (row.namespace === "role_cards" || row.namespace === "role_cards_en") {
    const locale = row.namespace.endsWith("_en") ? "en" : "tr";
    return { label: "Rol Kartları", detail: `${locale.toUpperCase()} canlı kart seti`, editHref: `/icerik/rol-kartlari?dil=${locale}` };
  }
  if (row.namespace === "faq" || row.namespace === "faq_en") {
    const locale = row.namespace.endsWith("_en") ? "en" : "tr";
    return { label: `SSS · ${row.contentKey}`, detail: `${locale.toUpperCase()} yayın kaydı`, editHref: `/icerik/sss?dil=${locale}` };
  }
  if (row.namespace === "site" && row.contentKey === "footer_navigation") {
    return { label: "Menüler & Footer", detail: "Canlı footer yapılandırması", editHref: "/icerik/menuler" };
  }
  return { label: `${row.namespace} · ${row.contentKey}`, detail: "Yayındaki CMS kaydı", editHref: "/icerik/saglik" };
}

function legalSlug(contentKey: string) {
  const parts = contentKey.split(":");
  return parts[1] === "en" ? parts[2] || "" : parts[1] || "";
}

function pageReferenceMeta(row: PageReferenceRow): Omit<CmsMediaReference, "source"> {
  if (row.contentKey.startsWith("legal:")) {
    const locale = row.contentKey.startsWith("legal:en:") ? "en" : "tr";
    return { label: row.title, detail: `${locale.toUpperCase()} yasal sayfa`, editHref: `/icerik/yasal/${legalSlug(row.contentKey)}?dil=${locale}` };
  }
  if (row.contentKey.startsWith("guide:")) {
    const locale = row.contentKey.startsWith("guide:en:") ? "en" : "tr";
    return { label: row.title, detail: `${locale.toUpperCase()} rehber`, editHref: `/icerik/rehber/${row.id}?dil=${locale}` };
  }
  return { label: row.title, detail: `Kurumsal sayfa · ${row.slug}`, editHref: `/icerik/sayfalar/${row.id}` };
}

export async function isCmsMediaReferencedByPublishedContent(mediaUrl: string) {
  if (!mediaUrl.startsWith("/") || mediaUrl.startsWith("//")) return false;

  // Protect every work cover, including drafts/private works, from media deletion.
  const workCoverVariants = firstPartyMediaVariants(mediaUrl);
  // Hostinger uses a single MariaDB adapter connection per app process.
  // Serialize the three reads to avoid pool contention; on any error the
  // caller must continue to fail closed and deny media deletion.
  const siteRows = await prisma.$queryRaw<Array<{ total: bigint | number }>>`
      SELECT COUNT(*) AS total
      FROM SiteContent
      WHERE status = 'published'
        AND namespace NOT IN ('media', 'media_blob', 'form_submission', 'cms_draft')
        AND LOCATE(${mediaUrl}, valueJson) > 0
    `;
  const pageRows = await prisma.$queryRaw<Array<{ total: bigint | number }>>`
      SELECT COUNT(*) AS total
      FROM ContentPage
      WHERE status = 'published'
        AND LOCATE(${mediaUrl}, bodyJson) > 0
    `;
  // Query Work through the same bounded MariaDB raw-SQL adapter as the CMS tables.
  // Work in this check includes draft/private covers so archiving remains fail-closed.
  const workCounts = await prisma.$queryRaw<Array<{ total: bigint | number }>>`
    SELECT COUNT(*) AS total
    FROM `Work`
    WHERE coverUrl = ${workCoverVariants[0]} OR coverUrl LIKE CONCAT(${workCoverVariants[0]}, '?%')
       OR coverUrl = ${workCoverVariants[1]} OR coverUrl LIKE CONCAT(${workCoverVariants[1]}, '?%')
       OR coverUrl = ${workCoverVariants[2]} OR coverUrl LIKE CONCAT(${workCoverVariants[2]}, '?%')
  `;

  return Number(siteRows[0]?.total ?? 0) + Number(pageRows[0]?.total ?? 0) + Number(workCounts[0]?.total ?? 0) > 0;
}

export async function getCmsMediaReferenceMap(mediaUrls: string[]) {
  const urls = [...new Set(mediaUrls.filter((url) => url.startsWith("/") && !url.startsWith("//")))];
  const result = new Map<string, CmsMediaReference[]>(urls.map((url) => [url, []]));
  if (urls.length === 0) return result;

  // One MariaDB pool connection: avoid firing concurrent inventory queries.
  const siteRows = await prisma.$queryRaw<SiteReferenceRow[]>`
      SELECT namespace, contentKey, valueJson
      FROM SiteContent
      WHERE status = 'published'
        AND namespace NOT IN ('media', 'media_blob', 'form_submission', 'cms_draft')
      ORDER BY updatedAt DESC
      LIMIT 2000
    `;
  const pageRows = await prisma.$queryRaw<PageReferenceRow[]>`
      SELECT id, contentKey, slug, title, bodyJson
      FROM ContentPage
      WHERE status = 'published'
      ORDER BY updatedAt DESC
      LIMIT 1000
    `;
  const workRows = await prisma.$queryRaw<WorkCoverReferenceRow[]>`
    SELECT coverUrl
    FROM `Work`
    WHERE coverUrl LIKE '/api/media/%'
       OR coverUrl LIKE 'https://ilkoku.com/api/media/%'
       OR coverUrl LIKE 'https://www.ilkoku.com/api/media/%'
  `;

  for (const row of siteRows) {
    for (const url of urls) {
      if (!row.valueJson.includes(url)) continue;
      const meta = siteReferenceMeta(row);
      result.get(url)?.push({ source: "site", ...meta });
    }
  }
  for (const row of pageRows) {
    for (const url of urls) {
      if (!row.bodyJson.includes(url)) continue;
      const meta = pageReferenceMeta(row);
      result.get(url)?.push({ source: "page", ...meta });
    }
  }

  // Work covers live outside the CMS SiteContent/ContentPage tables.
  // A media asset referenced by a draft or private work is also not safe to delete.
  for (const row of workRows) {
    const path = workCoverMediaPath(row.coverUrl);
    if (!path) continue;
    result.get(path)?.push({
      source: "work",
      // CMS publishers need a deletion lock, not disclosure of private draft titles.
      label: "Eser kapağı",
      detail: "Eser kaydında kullanılıyor (taslak veya yayında)",
      editHref: "/sistem-yonetimi/eserler",
    });
  }

  return result;
}
