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
    { label: "Ana Sayfa", href: "/okuyucu" },
    { label: "Keşfet", href: "/kesfet" },
    { label: "Favorilerim", href: "/favorilerim" },
    { label: "Okumaya Devam Et", href: "#", disabled: true, badge: "Yakında" },
    { label: "Bildirimler", href: "#", disabled: true, badge: "Yakında" },
    { label: "Profil", href: "#", disabled: true, badge: "Yakında" },
  ],
} as const;

export const editorNavigationContent = {
  ariaLabel: "Editör menüsü",
  items: [
    { label: "Keşfet", href: "/editor/kesfet" },
    { label: "Favorilerim", href: "/editor/favoriler" },
    { label: "Editör Seçkilerim", href: "/editor/seckiler" },
    { label: "İncelemelerim", href: "/editor/incelemeler" },
    { label: "Bana Önerilenler", href: "/editor/onerilenler" },
    { label: "Bildirimler", href: "/editor/bildirimler" },
    { label: "Profil", href: "/editor/profil" },
  ],
} as const;
