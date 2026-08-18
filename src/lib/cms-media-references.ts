import "server-only";

import { prisma } from "@/lib/prisma";

export type CmsMediaReference = {
  source: "site" | "page";
  label: string;
  detail: string;
  editHref: string;
};

type SiteReferenceRow = {
  namespace: string;
  contentKey: string;
  valueJson: string;
};

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

export async function getCmsMediaReferenceMap(mediaUrls: string[]) {
  const urls = [...new Set(mediaUrls.filter((url) => url.startsWith("/") && !url.startsWith("//")))];
  const result = new Map<string, CmsMediaReference[]>(urls.map((url) => [url, []]));
  if (urls.length === 0) return result;

  const [siteRows, pageRows] = await Promise.all([
    prisma.$queryRaw<SiteReferenceRow[]>`
      SELECT namespace, contentKey, valueJson
      FROM SiteContent
      WHERE status = 'published'
        AND namespace NOT IN ('media', 'media_blob', 'form_submission', 'cms_draft')
      ORDER BY updatedAt DESC
      LIMIT 2000
    `,
    prisma.$queryRaw<PageReferenceRow[]>`
      SELECT id, contentKey, slug, title, bodyJson
      FROM ContentPage
      WHERE status = 'published'
      ORDER BY updatedAt DESC
      LIMIT 1000
    `,
  ]);

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

  return result;
}
