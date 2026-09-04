export type PublicCmsPageCatalogItem = {
  contentKey: `page:tr:${string}`;
  label: string;
  slug: `/${string}`;
  group: "corporate" | "trust-role";
};

export const publicCmsPageCatalog = [
  { contentKey: "page:tr:hakkimizda", label: "Hakkımızda", slug: "/hakkimizda", group: "corporate" },
  { contentKey: "page:tr:nasil-calisir", label: "Nasıl Çalışır", slug: "/nasil-calisir", group: "trust-role" },
  { contentKey: "page:tr:editoryal-standartlar", label: "Editoryal Standartlar", slug: "/editoryal-standartlar", group: "trust-role" },
  { contentKey: "page:tr:icerik-ve-yas-politikasi", label: "İçerik ve Yaş Politikası", slug: "/icerik-ve-yas-politikasi", group: "trust-role" },
  { contentKey: "page:tr:topluluk-kurallari", label: "Topluluk Kuralları", slug: "/topluluk-kurallari", group: "trust-role" },
  { contentKey: "page:tr:telif-bildirimi", label: "Telif Bildirimi", slug: "/telif-bildirimi", group: "trust-role" },
  { contentKey: "page:tr:yazarlar-icin", label: "Yazarlar İçin", slug: "/yazarlar-icin", group: "trust-role" },
  { contentKey: "page:tr:editorler-icin", label: "Editörler İçin", slug: "/editorler-icin", group: "trust-role" },
  { contentKey: "page:tr:yayinevleri-icin", label: "Yayınevleri İçin", slug: "/yayinevleri-icin", group: "trust-role" },
] as const satisfies readonly PublicCmsPageCatalogItem[];

const coreContentKeys = new Set<string>(publicCmsPageCatalog.map((item) => item.contentKey));

export function isCorePublicCmsPage(contentKey: string | null | undefined) {
  return Boolean(contentKey && coreContentKeys.has(contentKey));
}
