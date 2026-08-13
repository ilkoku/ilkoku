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
