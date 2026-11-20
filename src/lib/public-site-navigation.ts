export type PublicSiteLink = {
  href: string;
  label: string;
};

// Public directories expose only published, publicly discoverable content.
// Keep private workspaces and unpublished content behind their existing gates.
export const publicDiscoveryEnabled = true;

export const publicPlatformLinks = [
  { href: "/eserler", label: "Eserler" },
  { href: "/yazarlar", label: "Yazarlar" },
  { href: "/turler", label: "Türler" },
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/nasil-calisir", label: "Nasıl Çalışır?" },
  { href: "/yazarlar-icin", label: "Yazarlar İçin" },
  { href: "/okurlar-icin", label: "Okurlar İçin" },
  { href: "/editorler-icin", label: "Editörler İçin" },
  { href: "/yayinevleri-icin", label: "Yayınevleri İçin" },
] satisfies readonly PublicSiteLink[];

// The role guides are published routes used by SEO too. Keep them in the
// complete platform inventory, but display them in their own footer column.
const publicAudienceHrefs = new Set([
  "/yazarlar-icin",
  "/okurlar-icin",
  "/editorler-icin",
  "/yayinevleri-icin",
]);
export const publicAudienceLinks = publicPlatformLinks.filter((link) => publicAudienceHrefs.has(link.href));
export const publicFooterPlatformLinks = publicPlatformLinks.filter((link) => !publicAudienceHrefs.has(link.href));

export const publicTrustLinks = [
  { href: "/editoryal-standartlar", label: "Editoryal Standartlar" },
  { href: "/icerik-ve-yas-politikasi", label: "İçerik ve Yaş" },
  { href: "/topluluk-kurallari", label: "Topluluk Kuralları" },
  { href: "/telif-bildirimi", label: "Telif Bildirimi" },
] as const satisfies readonly PublicSiteLink[];

export const publicSupportLinks = [
  { href: "/yardim", label: "Yardım Merkezi" },
  { href: "/iletisim", label: "İletişim" },
  { href: "/site-haritasi", label: "Site Haritası" },
] as const satisfies readonly PublicSiteLink[];

export const publicLegalLinks = [
  { href: "/yasal/kullanim-sartlari", label: "Kullanım Şartları" },
  { href: "/yasal/gizlilik-politikasi", label: "Gizlilik Politikası" },
  { href: "/yasal/kvkk", label: "KVKK" },
  { href: "/yasal/cerez-politikasi", label: "Çerez Politikası" },
  { href: "/yasal/telif-hakki-politikasi", label: "Telif Hakkı Politikası" },
] as const satisfies readonly PublicSiteLink[];
