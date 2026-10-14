import "server-only";

import {
  createCmsSiteMapPages,
  defaultHeaderNavigation,
  HEADER_NAV_LIVE_KEY,
  parseHeaderNavigation,
  SITE_MAP_PAGES,
  type HeaderNavigationPayload,
  type SiteMapPage,
} from "@/lib/cms-header-navigation";
import { prisma } from "@/lib/prisma";

type HeaderRow = { valueJson: string; status: "draft" | "published" | "archived" };
type CmsPageRow = { slug: string; title: string; noIndex: boolean };

export async function loadPublishedCmsSiteMapPages(): Promise<SiteMapPage[]> {
  try {
    const rows = await prisma.$queryRaw<CmsPageRow[]>`
      SELECT slug, title, noIndex
      FROM ContentPage
      WHERE contentKey LIKE 'page:tr:%'
        AND status = 'published'
      ORDER BY title ASC
    `;
    return createCmsSiteMapPages(rows);
  } catch {
    return [];
  }
}

async function loadPublishedHeaderRow(): Promise<HeaderRow | null> {
  try {
    const rows = await prisma.$queryRaw<HeaderRow[]>`
      SELECT valueJson, status
      FROM SiteContent
      WHERE namespace = 'site'
        AND contentKey = ${HEADER_NAV_LIVE_KEY}
      LIMIT 1
    `;
    return rows[0] ?? null;
  } catch {
    // The navigation must keep its safe default if CMS settings are unavailable.
    return null;
  }
}

export async function getPublishedHeaderNavigation(): Promise<{ payload: HeaderNavigationPayload; pages: SiteMapPage[] }> {
  // Independent reads must not add serial database round trips to the public header's TTFB.
  const [cmsPages, row] = await Promise.all([
    loadPublishedCmsSiteMapPages(),
    loadPublishedHeaderRow(),
  ]);
  const pages = [...SITE_MAP_PAGES, ...cmsPages];

  if (!row || row.status !== "published") return { payload: defaultHeaderNavigation, pages };
  try {
    return { payload: parseHeaderNavigation(row.valueJson, pages) ?? defaultHeaderNavigation, pages };
  } catch {
    return { payload: defaultHeaderNavigation, pages };
  }
}
