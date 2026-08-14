export const homepagePublicFallback = {
  hero: {
    title: "İlk cümle,\nilk okurun,\nilk adımın.",
    description: "Eserini yaz, okurlarla geliştir, profesyonel editör incelemesine taşı ve yayınevleri tarafından keşfedil.",
    primaryCtaLabel: "Eserini Yazmaya Başla",
    primaryCtaHref: "/kayit?rol=writer",
    secondaryCtaLabel: "Eserleri Keşfet",
    secondaryCtaHref: "/kesfet",
  },
  roles: {
    eyebrow: "Topluluğa katıl",
    title: "İlkOku’ya nasıl katılmak istiyorsun?",
    description: "Rolünü seç; kayıt akışını sana uygun şekilde başlatalım.",
  },
  passport: {
    eyebrow: "Eserin dijital izi",
    title: "Bir eserin yalnızca sonucunu değil, oluşum sürecini de görün.",
    description: "Eser Pasaportu; yazım oturumlarını, revizyonları, sürüm geçmişini ve profesyonel inceleme durumunu tek bir kayıt altında birleştirir.",
    ctaLabel: "Rolünü Seç",
    ctaHref: "#roller",
  },
  why: {
    eyebrow: "Güven, kayıt ve keşif",
    title: "Neden İlkOku?",
  },
  footer: {
    slogan: "İlk cümle, ilk okurun, ilk adımın.",
    supportEmail: "destek@ilkoku.com",
    copyright: `© ${new Date().getFullYear()} İlkOku. Tüm hakları saklıdır.`,
  },
} as const;

export type HomepagePublicSectionKey = keyof typeof homepagePublicFallback;
