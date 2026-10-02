const searchExcludedInternalRoots = [
  "/admin",
  "/sistem-yonetimi",
  "/harita",
  "/sozlesme",
  "/sozlesmelerim",
  "/icerik",
  "/bildirimler",
  "/editor",
  "/editor-daveti",
  "/editor-paneli",
  "/erisim-reddedildi",
  "/eserlerim",
  "/favorilerim",
  "/geri-bildirimler",
  "/giris",
  "/hesabim",
  "/kayit",
  "/kesfet",
  "/okumaya-devam",
  "/okuyucu",
  "/rol-secimi",
  "/sifre-yenile",
  "/sifremi-unuttum",
  "/tamamlanan-eserler",
  "/yazar",
  "/satis-erisim",
  "/gelirler",
  "/satinal",
  "/kutuphanem",
  "/yazmaya-devam",
  "/yayinevi",
  "/yayinevleri",
  "/yorumlarim",
] as const;

export function shouldNofollowSearchExcludedHref(href: string) {
  if (!href.startsWith("/")) return false;

  const pathname = href.split(/[?#]/u, 1)[0];
  return searchExcludedInternalRoots.some(
    (root) => pathname === root || pathname.startsWith(`${root}/`),
  );
}
