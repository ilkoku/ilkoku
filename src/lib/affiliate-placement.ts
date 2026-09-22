import {
  parseAffiliateBannerCode,
  parseAffiliateTextCode,
  type AffiliateBannerCreative,
  type AffiliateTextCreative,
} from "@/lib/affiliate-creative";
import { prisma } from "@/lib/prisma";

export const AFFILIATE_PLACEMENT_NAMESPACE = "affiliate_placement";
export const HOMEPAGE_AFTER_ROLES_PLACEMENT = "homepage_after_roles";

export const DEFAULT_AFFILIATE_HEADLINE = "Magzter GOLD – 7 Günlük Ücretsiz Deneme";

export const DEFAULT_DESKTOP_AFFILIATE_CODE = `<a href="https://www.dpbolvw.net/click-101886825-13992555"
   target="_blank"
   rel="sponsored nofollow noopener noreferrer">
  <img src="https://www.ftjcfx.com/image-101886825-13992555"
       width="728"
       height="90"
       alt="Magzter dergi ve gazete okuma kampanyası"
       border="0" />
</a>`;

export const DEFAULT_MOBILE_AFFILIATE_CODE = `<a href="https://www.jdoqocy.com/click-101886825-13992112"
   target="_blank"
   rel="sponsored nofollow noopener noreferrer">
  <img src="https://www.awltovhc.com/image-101886825-13992112"
       width="300"
       height="250"
       alt="Magzter dergi ve gazete okuma kampanyası"
       border="0" />
</a>`;

export const DEFAULT_TEXT_AFFILIATE_CODE = `<a href="https://www.jdoqocy.com/click-101886825-13973461"
   target="_blank"
   rel="sponsored nofollow noopener noreferrer">
  5.000'den fazla dergi, gazete ve seçilmiş premium içeriğe ücretsiz sınırsız erişim elde edin
</a>
<img src="https://www.tqlkg.com/image-101886825-13973461"
     width="1"
     height="1"
     border="0"
     alt="" />`;

type Row = { valueJson: string };

export type AffiliatePlacementSetting = {
  enabled: boolean;
  headline: string;
  desktopCode: string;
  mobileCode: string;
  textCode: string;
};

export type HomepageAffiliateDisplay = {
  enabled: boolean;
  headline: string;
  desktop: AffiliateBannerCreative;
  mobile: AffiliateBannerCreative;
  text: AffiliateTextCreative;
};

export const defaultAffiliatePlacementSetting: AffiliatePlacementSetting = {
  enabled: true,
  headline: DEFAULT_AFFILIATE_HEADLINE,
  desktopCode: DEFAULT_DESKTOP_AFFILIATE_CODE,
  mobileCode: DEFAULT_MOBILE_AFFILIATE_CODE,
  textCode: DEFAULT_TEXT_AFFILIATE_CODE,
};

export function parseAffiliatePlacementSetting(value: string | null | undefined): AffiliatePlacementSetting | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const setting = parsed as Record<string, unknown>;
    if (typeof setting.enabled !== "boolean") return null;

    const headline = typeof setting.headline === "string" && setting.headline.trim()
      ? setting.headline.trim()
      : DEFAULT_AFFILIATE_HEADLINE;
    const desktopCode = typeof setting.desktopCode === "string" && setting.desktopCode.trim()
      ? setting.desktopCode
      : DEFAULT_DESKTOP_AFFILIATE_CODE;
    const mobileCode = typeof setting.mobileCode === "string" && setting.mobileCode.trim()
      ? setting.mobileCode
      : DEFAULT_MOBILE_AFFILIATE_CODE;
    const textCode = typeof setting.textCode === "string" && setting.textCode.trim()
      ? setting.textCode
      : DEFAULT_TEXT_AFFILIATE_CODE;

    return {
      enabled: setting.enabled,
      headline,
      desktopCode,
      mobileCode,
      textCode,
    };
  } catch {
    return null;
  }
}

function toDisplay(setting: AffiliatePlacementSetting): HomepageAffiliateDisplay {
  const desktop = parseAffiliateBannerCode(setting.desktopCode, 728, 90)
    ?? parseAffiliateBannerCode(DEFAULT_DESKTOP_AFFILIATE_CODE, 728, 90)!;
  const mobile = parseAffiliateBannerCode(setting.mobileCode, 300, 250)
    ?? parseAffiliateBannerCode(DEFAULT_MOBILE_AFFILIATE_CODE, 300, 250)!;
  const text = parseAffiliateTextCode(setting.textCode)
    ?? parseAffiliateTextCode(DEFAULT_TEXT_AFFILIATE_CODE)!;

  return {
    enabled: setting.enabled,
    headline: setting.headline,
    desktop,
    mobile,
    text,
  };
}

export async function getHomepageAffiliatePlacement(): Promise<HomepageAffiliateDisplay> {
  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT valueJson FROM SiteContent
      WHERE namespace = ${AFFILIATE_PLACEMENT_NAMESPACE}
        AND contentKey = ${HOMEPAGE_AFTER_ROLES_PLACEMENT}
      LIMIT 1
    `;
    const row = rows[0];
    const setting = row
      ? parseAffiliatePlacementSetting(row.valueJson) ?? defaultAffiliatePlacementSetting
      : defaultAffiliatePlacementSetting;
    return toDisplay(setting);
  } catch {
    return toDisplay(defaultAffiliatePlacementSetting);
  }
}
