export type PublicSiteLink = {
  href: string;
  label: string;
};

export const publicPlatformLinks = [
  { href: "/hakkimizda", label: "Hakkımızda" },
  { href: "/nasil-calisir", label: "Nasıl Çalışır?" },
  { href: "/yazarlar-icin", label: "Yazarlar İçin" },
  { href: "/editorler-icin", label: "Editörler İçin" },
  { href: "/yayinevleri-icin", label: "Yayınevleri İçin" },
] as const satisfies readonly PublicSiteLink[];

export const publicTrustLinks = [
  { href: "/editoryal-standartlar", label: "Editoryal Standartlar" },
  { href: "/icerik-ve-yas-politikasi", label: "İçerik ve Yaş" },
  { href: "/topluluk-kurallari", label: "Topluluk Kuralları" },
  { href: "/telif-bildirimi", label: "Telif Bildirimi" },
] as const satisfies readonly PublicSiteLink[];

export const publicSupportLinks = [
  { href: "/yardim", label: "Yardım Merkezi" },
  { href: "/iletisim", label: "İletişim" },
] as const satisfies readonly PublicSiteLink[];

export const publicLegalLinks = [
  { href: "/yasal/kullanim-sartlari", label: "Kullanım Şartları" },
  { href: "/yasal/gizlilik-politikasi", label: "Gizlilik Politikası" },
  { href: "/yasal/kvkk", label: "KVKK" },
  { href: "/yasal/cerez-politikasi", label: "Çerez Politikası" },
  { href: "/yasal/telif-hakki-politikasi", label: "Telif Hakkı Politikası" },
] as const satisfies readonly PublicSiteLink[];
