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
    { label: "Profilim", href: "#", disabled: true, badge: "Yakında" },
  ],
} as const;
