export type AffiliateBannerCreative = {
  href: string;
  src: string;
  width: number;
  height: number;
  alt: string;
};

export type AffiliateTextCreative = {
  href: string;
  text: string;
  trackingPixelSrc: string | null;
};

function decodeHtml(value: string) {
  return value
    .replace(/&apos;|&#39;/gi, "'")
    .replace(/&quot;|&#34;/gi, '"')
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">");
}

function safeHttpsUrl(value: string) {
  try {
    const url = new URL(decodeHtml(value.trim()));
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function attribute(tag: string, name: string) {
  const match = tag.match(new RegExp(`\\b${name}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s>]+))`, "i"));
  return match ? decodeHtml(match[1] ?? match[2] ?? match[3] ?? "") : null;
}

function containsUnsafeMarkup(code: string) {
  return /<(?:script|iframe|object|embed|style|svg|form)\b|\bon\w+\s*=|javascript\s*:|data\s*:/i.test(code);
}

function plainText(value: string) {
  return decodeHtml(value.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim());
}

export function parseAffiliateBannerCode(
  code: string,
  expectedWidth: number,
  expectedHeight: number,
): AffiliateBannerCreative | null {
  if (!code || containsUnsafeMarkup(code)) return null;

  const anchor = code.match(/<a\b[^>]*>/i)?.[0];
  const image = code.match(/<img\b[^>]*>/i)?.[0];
  if (!anchor || !image) return null;

  const hrefRaw = attribute(anchor, "href");
  const srcRaw = attribute(image, "src");
  const width = Number(attribute(image, "width"));
  const height = Number(attribute(image, "height"));
  if (!hrefRaw || !srcRaw || width !== expectedWidth || height !== expectedHeight) return null;

  const href = safeHttpsUrl(hrefRaw);
  const src = safeHttpsUrl(srcRaw);
  if (!href || !src) return null;

  return {
    href,
    src,
    width,
    height,
    alt: attribute(image, "alt")?.trim() || "İş ortağı reklamı",
  };
}

export function parseAffiliateTextCode(code: string): AffiliateTextCreative | null {
  if (!code || containsUnsafeMarkup(code)) return null;

  const anchorMatch = code.match(/<a\b[^>]*>([\s\S]*?)<\/a>/i);
  if (!anchorMatch) return null;

  const anchorTag = anchorMatch[0].match(/<a\b[^>]*>/i)?.[0];
  const hrefRaw = anchorTag ? attribute(anchorTag, "href") : null;
  const text = plainText(anchorMatch[1]);
  if (!hrefRaw || !text) return null;

  const href = safeHttpsUrl(hrefRaw);
  if (!href) return null;

  const image = code.match(/<img\b[^>]*>/i)?.[0] ?? null;
  let trackingPixelSrc: string | null = null;

  if (image) {
    const srcRaw = attribute(image, "src");
    const width = Number(attribute(image, "width"));
    const height = Number(attribute(image, "height"));
    if (!srcRaw || width !== 1 || height !== 1) return null;
    trackingPixelSrc = safeHttpsUrl(srcRaw);
    if (!trackingPixelSrc) return null;
  }

  return { href, text, trackingPixelSrc };
}

export function validateAffiliateCreativeSet(input: {
  desktopCode: string;
  mobileCode: string;
  textCode: string;
}) {
  const desktop = parseAffiliateBannerCode(input.desktopCode, 728, 90);
  const mobile = parseAffiliateBannerCode(input.mobileCode, 300, 250);
  const text = parseAffiliateTextCode(input.textCode);

  return {
    ok: Boolean(desktop && mobile && text),
    desktop,
    mobile,
    text,
    invalidField: !desktop ? "desktop" : !mobile ? "mobile" : !text ? "text" : null,
  } as const;
}
