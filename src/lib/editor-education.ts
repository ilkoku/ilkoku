export type EditorEducationCategory = {
  slug: string;
  title: string;
  shortDescription: string;
  live: boolean;
};

export const EDITOR_EDUCATION_CATEGORIES: readonly EditorEducationCategory[] = [
  {
    slug: "editorluge-baslama",
    title: "Editörlüğe Başlama",
    shortDescription: "Editörün rolünü, sorumluluğunu, etik sınırlarını ve yazarla çalışma çerçevesini öğren.",
    live: true,
  },
  {
    slug: "metin-degerlendirme",
    title: "Metin Değerlendirme",
    shortDescription: "Bir eserin güçlü ve geliştirmeye açık yönlerini ilk okumadan itibaren sistemli biçimde çözümle.",
    live: true,
  },
  {
    slug: "yapisal-editorluk",
    title: "Yapısal Editörlük",
    shortDescription: "Kurgu, olay örgüsü, karakter, tempo, bölüm yapısı ve anlatı bütünlüğünü değerlendirmeyi öğren.",
    live: true,
  },
  {
    slug: "dil-ve-anlatim-editorlugu",
    title: "Dil ve Anlatım Editörlüğü",
    shortDescription: "Cümle, akıcılık, tekrar, anlatım, ton ve üslup sorunlarını metnin sesini koruyarak ele al.",
    live: false,
  },
  {
    slug: "tur-editorlugu",
    title: "Tür Editörlüğü",
    shortDescription: "Farklı eser türlerinin editöryal ihtiyaçlarını kendi anlatı mantığı ve okur beklentisiyle değerlendir.",
    live: false,
  },
  {
    slug: "editor-notu-ve-geri-bildirim",
    title: "Editör Notu ve Geri Bildirim",
    shortDescription: "Tespiti gerekçeye, gerekçeyi yazara yol gösterecek uygulanabilir geri bildirime dönüştür.",
    live: false,
  },
  {
    slug: "yazarla-calismak",
    title: "Yazarla Çalışmak",
    shortDescription: "Revizyon, fikir ayrılığı, iletişim ve müdahale sınırlarını profesyonel bir çalışma ilişkisine dönüştür.",
    live: false,
  },
  {
    slug: "yayincilik-ve-profesyonel-editorluk",
    title: "Yayıncılık ve Profesyonel Editörlük",
    shortDescription: "Dosya değerlendirmeden yayıma hazırlığa uzanan profesyonel editörlük ve yayıncılık sürecini tanı.",
    live: false,
  },
] as const;

export function editorEducationPublicPath(category: Pick<EditorEducationCategory, "slug">) {
  return `/editorler-icin/egitim/${category.slug}`;
}

export function getEditorEducationCategory(slug: string) {
  return EDITOR_EDUCATION_CATEGORIES.find((category) => category.slug === slug) ?? null;
}
