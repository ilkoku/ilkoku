import { prisma } from "@/lib/prisma";

export const AFFILIATE_PLACEMENT_NAMESPACE = "affiliate_placement";
export const HOMEPAGE_AFTER_ROLES_PLACEMENT = "homepage_after_roles";

type Row = { valueJson: string };

export type AffiliatePlacementSetting = {
  enabled: boolean;
};

export function parseAffiliatePlacementSetting(value: string | null | undefined): AffiliatePlacementSetting | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const setting = parsed as Record<string, unknown>;
    if (typeof setting.enabled !== "boolean") return null;
    return { enabled: setting.enabled };
  } catch {
    return null;
  }
}

export async function getHomepageAffiliateEnabled(): Promise<boolean> {
  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT valueJson FROM SiteContent
      WHERE namespace = ${AFFILIATE_PLACEMENT_NAMESPACE}
        AND contentKey = ${HOMEPAGE_AFTER_ROLES_PLACEMENT}
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return true;
    return parseAffiliatePlacementSetting(row.valueJson)?.enabled ?? true;
  } catch {
    // Reklam ayarı okunamazsa mevcut canlı davranışı koru.
    return true;
  }
}
