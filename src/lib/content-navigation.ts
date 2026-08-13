export type ContentNavItem = {
  href: string;
  label: string;
  description: string;
};

export const contentNavigation: ContentNavItem[] = [
  {
    href: "/icerik",
    label: "Genel Bakış",
    description: "İçerik yönetimi özeti",
  },
  {
    href: "/icerik/ana-sayfa",
    label: "Ana Sayfa",
    description: "Hero, bölümler ve footer",
  },
  {
    href: "/icerik/sayfalar",
    label: "Sayfalar",
    description: "Kurumsal ve bilgilendirme sayfaları",
  },
  {
    href: "/icerik/seo",
    label: "SEO",
    description: "Başlık, açıklama ve indeks ayarları",
  },
];
