import "server-only";

import { randomUUID } from "node:crypto";

import { prisma } from "@/lib/prisma";

export const advertisingNamespace = "advertising";
export const homepageAfterRolesSlotKey = "homepage-after-roles";

export type AdvertisingCreative = {
  href: string;
  imageSrc: string;
  width: number;
  height: number;
};

export type AdvertisingSlotConfig = {
  active: boolean;
  advertiser: string;
  heading: string;
  description: string;
  disclosure: string;
  desktop: AdvertisingCreative;
  mobile: AdvertisingCreative;
};

export type AdvertisingSlotState =
  | { state: "missing" }
  | { state: "valid"; config: AdvertisingSlotConfig; updatedAt: Date; publishedAt: Date | null }
  | { state: "corrupt"; updatedAt: Date }
  | { state: "unavailable" };

type AdvertisingRow = {
  valueJson: string;
  updatedAt: Date;
  publishedAt: Date | null;
};

export const defaultHomepageAfterRolesAd: AdvertisingSlotConfig = {
  active: true,
  advertiser: "Magzter",
  heading: "Okurlar İçin Daha Fazlasını Keşfet",
  description: "Dergi, gazete ve premium içerikleri keşfedin.",
  disclosure: "İş ortağı bağlantısı",
  desktop: {
    href: "https://www.dpbolvw.net/click-101886825-13992555",
    imageSrc: "https://www.ftjcfx.com/image-101886825-13992555",
    width: 728,
    height: 90,
  },
  mobile: {
    href: "https://www.jdoqocy.com/click-101886825-13992112",
    imageSrc: "https://www.awltovhc.com/image-101886825-13992112",
    width: 300,
    height: 250,
  },
};

export const advertisingPlacementPlan = [
  {
    key: homepageAfterRolesSlotKey,
    label: "Ana Sayfa · Rol kartları sonrası",
    detail: "Rol kartlarının hemen altında, Eser Pasaportu bölümünden önce.",
    desktop: "728×90",
    mobile: "300×250",
    connected: true,
  },
  {
    key: "reader-content",
    label: "Okur alanı",
    detail: "Okur içeriklerinin yanında veya içerik akışı sonrasında.",
    desktop: "300×250",
    mobile: "300×250",
    connected: false,
  },
  {
    key: "discover-bestsellers",
    label: "Keşfet / En Çok Satanlar",
    detail: "Liste sonunda veya uygun masaüstü yan alanında.",
    desktop: "300×250",
    mobile: "300×250",
    connected: false,
  },
  {
    key: "work-detail",
    label: "Eser detay sayfası",
    detail: "Eserin kendi CTA'larının altında, sayfanın alt bölümünde.",
    desktop: "300×250",
    mobile: "300×250",
    connected: false,
  },
  {
    key: "editorial-content",
    label: "Blog / içerik sayfaları",
    detail: "Yazı veya içerik bittikten sonra.",
    desktop: "728×90",
    mobile: "300×250",
    connected: false,
  },
  {
    key: "pre-footer",
    label: "Footer üstü",
    detail: "Ana footer başlamadan hemen önce.",
    desktop: "728×90",
    mobile: "300×250",
    connected: false,
  },
] as const;

function isSafeHttpsUrl(value: unknown): value is string {
  if (typeof value !== "string" || value.length > 1200) return false;
  try {
    const url = new URL(value);
    return url.protocol === "https:";
  } catch {
    return false;
  }
}

function parseDimension(value: unknown, max: number) {
  if (typeof value !== "number" || !Number.isInteger(value)) return null;
  if (value < 1 || value > max) return null;
  return value;
}

function parseCreative(value: unknown): AdvertisingCreative | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const raw = value as Record<string, unknown>;
  const width = parseDimension(raw.width, 2000);
  const height = parseDimension(raw.height, 2000);
  if (!isSafeHttpsUrl(raw.href) || !isSafeHttpsUrl(raw.imageSrc) || !width || !height) return null;
  return { href: raw.href, imageSrc: raw.imageSrc, width, height };
}

export function parseAdvertisingSlotConfig(valueJson: string): AdvertisingSlotConfig | null {
  try {
    const raw = JSON.parse(valueJson) as unknown;
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
    const record = raw as Record<string, unknown>;
    if (typeof record.active !== "boolean") return null;

    const advertiser = typeof record.advertiser === "string" ? record.advertiser.trim().slice(0, 120) : "";
    const heading = typeof record.heading === "string" ? record.heading.trim().slice(0, 160) : "";
    const description = typeof record.description === "string" ? record.description.trim().slice(0, 320) : "";
    const disclosure = typeof record.disclosure === "string" ? record.disclosure.trim().slice(0, 120) : "";
    const desktop = parseCreative(record.desktop);
    const mobile = parseCreative(record.mobile);

    if (!advertiser || !heading || !description || !disclosure || !desktop || !mobile) return null;

    return {
      active: record.active,
      advertiser,
      heading,
      description,
      disclosure,
      desktop,
      mobile,
    };
  } catch {
    return null;
  }
}

export function parseAffiliateCreativeHtml(html: string): AdvertisingCreative | null {
  const value = html.trim().slice(0, 6000);
  const href = value.match(/<a\b[^>]*\bhref=["']([^"']+)["']/i)?.[1]?.trim();
  const imageSrc = value.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1]?.trim();
  const widthRaw = value.match(/<img\b[^>]*\bwidth=["']?(\d+)["']?/i)?.[1];
  const heightRaw = value.match(/<img\b[^>]*\bheight=["']?(\d+)["']?/i)?.[1];
  const width = widthRaw ? Number(widthRaw) : NaN;
  const height = heightRaw ? Number(heightRaw) : NaN;

  if (!isSafeHttpsUrl(href) || !isSafeHttpsUrl(imageSrc)) return null;
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || width > 2000 || height < 1 || height > 2000) return null;

  return { href, imageSrc, width, height };
}

export function creativeToHtml(creative: AdvertisingCreative) {
  return '<a href="' + creative.href + '" target="_top">\n<img src="' + creative.imageSrc + '" width="' + creative.width + '" height="' + creative.height + '" alt="" border="0"/>\n</a>';
}

export async function getAdvertisingSlotState(slotKey: string): Promise<AdvertisingSlotState> {
  try {
    const rows = await prisma.$queryRaw<AdvertisingRow[]>`
      SELECT valueJson, updatedAt, publishedAt
      FROM SiteContent
      WHERE namespace = ${advertisingNamespace}
        AND contentKey = ${slotKey}
        AND status = 'published'
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return { state: "missing" };
    const config = parseAdvertisingSlotConfig(row.valueJson);
    if (!config) return { state: "corrupt", updatedAt: row.updatedAt };
    return { state: "valid", config, updatedAt: row.updatedAt, publishedAt: row.publishedAt };
  } catch {
    return { state: "unavailable" };
  }
}

export async function getHomepageAfterRolesAdvertising() {
  const state = await getAdvertisingSlotState(homepageAfterRolesSlotKey);
  if (state.state === "valid") return state.config;
  if (state.state === "missing") return defaultHomepageAfterRolesAd;
  return null;
}

export async function publishAdvertisingSlot(
  userId: string,
  slotKey: string,
  config: AdvertisingSlotConfig,
) {
  const valueJson = JSON.stringify(config);
  await prisma.$executeRaw`
    INSERT INTO SiteContent (
      id, namespace, contentKey, valueJson, valueType, status,
      publishedAt, updatedById, createdAt, updatedAt
    ) VALUES (
      ${randomUUID()}, ${advertisingNamespace}, ${slotKey}, ${valueJson}, 'json', 'published',
      CURRENT_TIMESTAMP(3), ${userId}, CURRENT_TIMESTAMP(3), CURRENT_TIMESTAMP(3)
    )
    ON DUPLICATE KEY UPDATE
      valueJson = VALUES(valueJson),
      status = 'published',
      publishedAt = CURRENT_TIMESTAMP(3),
      updatedById = VALUES(updatedById),
      updatedAt = CURRENT_TIMESTAMP(3)
  `;
}
