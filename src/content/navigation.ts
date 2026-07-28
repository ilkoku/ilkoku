export const commonContent = {
  brandName: "İlkOku",
  tagline: "Her hikâye burada başlar.",
  homeLabel: "İlkOku ana sayfasına dön",
  logoAlt: "İlkOku — kitap ve tüy amblemi",
  back: "Geri",
  homeAction: "Ana sayfaya dön",
  skipToContent: "Ana içeriğe geç",
} as const;

export const navigationContent = {
  ariaLabel: "Ana menü",
  edition: "İlk sürüm · 2026",
  items: [
    { label: "Ana Sayfa", href: "/yazar" },
    { label: "Yazmaya Devam Et", href: "/yazmaya-devam" },
    { label: "Eserlerim", href: "/eserlerim" },
    { label: "Geri Bildirimler", href: "/geri-bildirimler" },
    { label: "Yayınevleri", href: "/yayinevleri" },
    { label: "Profilim", href: "/profilim" },
  ],
} as const;
export const readerNavigationContent = {
  ariaLabel: "Okuyucu menüsü",
  items: [
    {
      label: "Ana Sayfa",
      href: "/okuyucu",
    },
    {
      label: "Keşfet",
      href: "/kesfet",
    },
    {
      label: "Favorilerim",
      href: "/favorilerim",
    },
    {
      label: "Okumaya Devam Et",
      href: "/okumaya-devam",
    },
    {
      label: "Bildirimler",
      href: "/bildirimler",
    },
    {
      label: "Profilim",
      href: "/profilim",
    },
  ],
} as const;

export const editorNavigationContent = {
  ariaLabel: "Editör menüsü",
  items: [
    {
      type: "heading",
      label: "Keşif",
    },
    {
      type: "item",
      label: "Eser Keşfet",
      href: "/editor/kesfet",
    },
    {
      type: "item",
      label: "Yazar Keşfet",
      href: "/editor/yazarlar",
    },
    {
      type: "item",
      label: "Favorilerim",
      href: "/editor/favoriler",
    },
    {
      type: "item",
      label: "Editör Seçkilerim",
      href: "/editor/seckiler",
    },

    {
      type: "heading",
      label: "Çalışma Alanı",
    },
    {
      type: "item",
      label: "Yeni İnceleme Talepleri",
      href: "/editor/talepler",
    },
    {
      type: "item",
      label: "İncelemeye Aldıklarım",
      href: "/editor/incelemeler",
    },
    {
      type: "item",
      label: "Tamamlanan İncelemeler",
      href: "/editor/incelemeler?durum=tamamlanan",
    },
    {
      type: "item",
      label: "Bildirimler",
      href: "/editor/bildirimler",
    },
    {
      type: "item",
      label: "Profilim",
      href: "/editor/profil",
    },
  ],
} as const;
