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

export const defaultFooterNavigation: FooterNavigationPayload = {
  platformTitle: "Platform",
  platform1Label: "Hakkımızda",
  platform1Href: "#hakkimizda",
  platform2Label: "Eser Pasaportu",
  platform2Href: "#eser-pasaportu",
  platform3Label: "Neden İlkOku?",
  platform3Href: "#neden-ilkoku",
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
