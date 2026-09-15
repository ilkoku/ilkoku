import "server-only";

import {
  defaultHeaderNavigation,
  HEADER_NAV_LIVE_KEY,
  parseHeaderNavigation,
  type HeaderNavigationPayload,
} from "@/lib/cms-header-navigation";
import { prisma } from "@/lib/prisma";

type HeaderRow = { valueJson: string; status: "draft" | "published" | "archived" };

export async function getPublishedHeaderNavigation(): Promise<HeaderNavigationPayload> {
  try {
    const rows = await prisma.$queryRaw<HeaderRow[]>`
      SELECT valueJson, status
      FROM SiteContent
      WHERE namespace = 'site'
        AND contentKey = ${HEADER_NAV_LIVE_KEY}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row || row.status !== "published") return defaultHeaderNavigation;
    return parseHeaderNavigation(row.valueJson) ?? defaultHeaderNavigation;
  } catch {
    return defaultHeaderNavigation;
  }
}
