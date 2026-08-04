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
    { label: "Yorumlarım", href: "/yorumlarim" },
    { label: "Geri Bildirimler", href: "/geri-bildirimler" },
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
      label: "Tamamlanan Eserler",
      href: "/tamamlanan-eserler",
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

export const publisherNavigationContent = {
  ariaLabel: "Yayınevi menüsü",
  items: [
    { type: "item", label: "Panel", href: "/yayinevi" },
    { type: "heading", label: "KEŞİF" },
    { type: "item", label: "Eser Keşfet", href: "/yayinevi/kesfet/eserler" },
    { type: "item", label: "Yazar Keşfet", href: "/yayinevi/kesfet/yazarlar" },
    { type: "item", label: "Favorilerim", href: "/yayinevi/favorilerim" },
    { type: "item", label: "Takip Ettiklerim", href: "/yayinevi/takip-ettiklerim" },
    { type: "heading", label: "Başvurular" },
    { type: "item", label: "Yeni Başvurular", href: "/yayinevi?durum=pending" },
    { type: "item", label: "İncelenenler", href: "/yayinevi?durum=reviewing" },
    { type: "item", label: "Kararlar", href: "/yayinevi?durum=completed" },
    { type: "heading", label: "Operasyon" },
    { type: "item", label: "Dosya Merkezi", href: "/yayinevi/dosyalar" },
    { type: "item", label: "Bildirimler", href: "/yayinevi/bildirimler" },
    { type: "item", label: "Ekip ve Yetkiler", href: "/yayinevi/uyeler" },
    { type: "item", label: "Yetkilerim", href: "/yayinevi/yetkilerim" },
    { type: "heading", label: "Hesap" },
    { type: "item", label: "Profilim", href: "/profilim" },
  ],
} as const;
