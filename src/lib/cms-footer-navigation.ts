export const FOOTER_LIVE_KEY = "footer_navigation";
export const FOOTER_DRAFT_KEY = "footer_navigation_draft";

export const footerNavigationFields = [
  "platformTitle",
  "platform1Label",
  "platform1Href",
  "platform2Label",
  "platform2Href",
  "platform3Label",
  "platform3Href",
  "supportTitle",
  "supportLabel",
  "supportHref",
  "legalTitle",
  "termsLabel",
  "termsHref",
  "privacyLabel",
  "privacyHref",
  "kvkkLabel",
  "kvkkHref",
  "cookieLabel",
  "cookieHref",
  "copyrightLabel",
  "copyrightHref",
] as const;

export type FooterNavigationPayload = Record<(typeof footerNavigationFields)[number], string>;

// Every editable platform slot is tied to a stable public route identity.
 // Never use array indices to replace unrelated footer links.
export const footerPlatformSlots = [
  { key: "platform1", href: "/yazarlar", label: "Yazarlar" },
  { key: "platform2", href: "/turler", label: "Türler" },
  { key: "platform3", href: "/nasil-calisir", label: "Nasıl Çalışır?" },
] as const;

export const defaultFooterNavigation: FooterNavigationPayload = {
  platformTitle: "Platform",
  platform1Label: "Yazarlar",
  platform1Href: "/yazarlar",
  platform2Label: "Türler",
  platform2Href: "/turler",
  platform3Label: "Nasıl Çalışır?",
  platform3Href: "/nasil-calisir",
  supportTitle: "Destek",
  supportLabel: "Yardım Merkezi",
  supportHref: "",
  legalTitle: "Yasal",
  termsLabel: "Kullanım Şartları",
  termsHref: "",
  privacyLabel: "Gizlilik Politikası",
  privacyHref: "",
  kvkkLabel: "KVKK",
  kvkkHref: "",
  cookieLabel: "Çerez Politikası",
  cookieHref: "",
  copyrightLabel: "Telif Hakkı Politikası",
  copyrightHref: "",
};

export function parseFooterNavigation(valueJson: string): FooterNavigationPayload | null {
  try {
    const parsed = JSON.parse(valueJson) as unknown;
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return null;
    const record = parsed as Record<string, unknown>;
    if (footerNavigationFields.some((field) => typeof record[field] !== "string")) return null;
    return Object.fromEntries(
      footerNavigationFields.map((field) => [field, String(record[field])]),
    ) as FooterNavigationPayload;
  } catch {
    return null;
  }
}

/**
 * CMS may change a stable platform link's label, not which route owns a slot.
 * Published legacy slot data is ignored rather than replacing unrelated links.
 * This helper is intentionally shared by SSR/CMS contracts and the hydrator.
 */
export function resolveCmsPlatformLabel(
  slot: (typeof footerPlatformSlots)[number],
  content: Partial<FooterNavigationPayload>,
): string {
  const configuredHref = content[`${slot.key}Href`]?.trim();
  if (configuredHref && configuredHref !== slot.href) return slot.label;
  return content[`${slot.key}Label`]?.trim() || slot.label;
}
