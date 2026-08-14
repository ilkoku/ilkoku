import { defaultCmsLocale, type CmsLocaleCode } from "@/lib/cms-locales";

export const cmsLegalDocuments = [
  { slug: "kullanim-sartlari", key: "legal:kullanim-sartlari", title: "Kullanım Şartları" },
  { slug: "gizlilik-politikasi", key: "legal:gizlilik-politikasi", title: "Gizlilik Politikası" },
  { slug: "kvkk", key: "legal:kvkk", title: "KVKK Aydınlatma Metni" },
  { slug: "cerez-politikasi", key: "legal:cerez-politikasi", title: "Çerez Politikası" },
  { slug: "telif-hakki-politikasi", key: "legal:telif-hakki-politikasi", title: "Telif Hakkı Politikası" },
] as const;

export type CmsLegalSlug = (typeof cmsLegalDocuments)[number]["slug"];

export function getCmsLegalDocument(slug: string) {
  return cmsLegalDocuments.find((item) => item.slug === slug) ?? null;
}

export function cmsLegalContentKey(slug: CmsLegalSlug, locale: CmsLocaleCode) {
  if (locale === defaultCmsLocale) return `legal:${slug}`;
  return `legal:${locale}:${slug}`;
}

export function cmsLegalPublicPath(slug: CmsLegalSlug, locale: CmsLocaleCode) {
  if (locale === defaultCmsLocale) return `/yasal/${slug}`;
  return `/${locale}/yasal/${slug}`;
}
