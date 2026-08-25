export type PublicTrustPagePath =
  | "/nasil-calisir"
  | "/editoryal-standartlar"
  | "/icerik-ve-yas-politikasi"
  | "/topluluk-kurallari"
  | "/telif-bildirimi"
  | "/yazarlar-icin"
  | "/editorler-icin";

type PublicTrustPageVisual = {
  src: `/${string}.webp`;
  alt: string;
  focalPoint: `${number}% ${number}%`;
};

export const publicTrustPageVisuals = {
  "/nasil-calisir": {
    src: "/how-it-works/journey.webp",
    alt: "Bir eserin yazardan editöre ve okura uzanan İlkOku yolculuğu",
    focalPoint: "52% 72%",
  },
  "/editoryal-standartlar": {
    src: "/trust-pages/editorial-standards.webp",
    alt: "Kaynakları karşılaştırarak gerekçeli değerlendirme hazırlayan bir editör",
    focalPoint: "50% 60%",
  },
  "/icerik-ve-yas-politikasi": {
    src: "/trust-pages/content-age-policy.webp",
    alt: "Yaşa uygun okuma alanlarını koruyan aydınlık bir kütüphane bahçesi",
    focalPoint: "50% 55%",
  },
  "/topluluk-kurallari": {
    src: "/trust-pages/community-rules.webp",
    alt: "Yuvarlak masa çevresinde birbirini dinleyen İlkOku edebiyat topluluğu",
    focalPoint: "50% 55%",
  },
  "/telif-bildirimi": {
    src: "/trust-pages/copyright-notice.webp",
    alt: "Eser kaydını korumalı inceleme sürecine bırakan bir yazar",
    focalPoint: "50% 58%",
  },
  "/yazarlar-icin": {
    src: "/trust-pages/for-writers.webp",
    alt: "İlk fikirden bölümlere ve revizyonlara ilerleyen bir yazarın çalışma yolculuğu",
    focalPoint: "50% 60%",
  },
  "/editorler-icin": {
    src: "/trust-pages/for-editors.webp",
    alt: "Aynı eseri bağımsız biçimde değerlendiren iki editör",
    focalPoint: "50% 58%",
  },
} as const satisfies Record<PublicTrustPagePath, PublicTrustPageVisual>;

export function getPublicTrustPageVisual(path: PublicTrustPagePath) {
  return publicTrustPageVisuals[path];
}
