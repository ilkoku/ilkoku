export const GENRE_CATEGORIES = [
  "Kurgu",
  "Edebiyat",
  "Senaryo ve Sahne",
  "Akademik",
  "Bilgilendirici",
  "Çocuk ve Gençlik",
  "Çizgi Anlatı",
] as const;

export type GenreCategory = (typeof GENRE_CATEGORIES)[number];

export const GENRES = [
  // Kurgu
  { slug: "roman", label: "Roman", category: "Kurgu" },
  { slug: "oyku", label: "Öykü", category: "Kurgu" },
  { slug: "novella", label: "Novella", category: "Kurgu" },
  { slug: "fantastik", label: "Fantastik", category: "Kurgu" },
  { slug: "bilim-kurgu", label: "Bilim Kurgu", category: "Kurgu" },
  { slug: "distopya", label: "Distopya", category: "Kurgu" },
  { slug: "utopya", label: "Ütopya", category: "Kurgu" },
  { slug: "polisiye", label: "Polisiye", category: "Kurgu" },
  { slug: "dedektif", label: "Dedektif", category: "Kurgu" },
  { slug: "gerilim", label: "Gerilim", category: "Kurgu" },
  { slug: "korku", label: "Korku", category: "Kurgu" },
  { slug: "macera", label: "Macera", category: "Kurgu" },
  { slug: "aksiyon", label: "Aksiyon", category: "Kurgu" },
  { slug: "casusluk", label: "Casusluk", category: "Kurgu" },
  { slug: "tarihi-roman", label: "Tarihî Roman", category: "Kurgu" },
  { slug: "psikolojik-roman", label: "Psikolojik Roman", category: "Kurgu" },
  { slug: "romantik", label: "Romantik", category: "Kurgu" },
  { slug: "dram", label: "Dram", category: "Kurgu" },
  { slug: "mizah", label: "Mizah", category: "Kurgu" },
  { slug: "hiciv", label: "Hiciv (Satir)", category: "Kurgu" },
  { slug: "alternatif-tarih", label: "Alternatif Tarih", category: "Kurgu" },
  { slug: "gotik", label: "Gotik", category: "Kurgu" },
  { slug: "mitoloji", label: "Mitoloji", category: "Kurgu" },
  { slug: "paranormal", label: "Paranormal", category: "Kurgu" },
  { slug: "post-apokaliptik", label: "Post-Apokaliptik", category: "Kurgu" },

  // Edebiyat
  { slug: "siir", label: "Şiir", category: "Edebiyat" },
  { slug: "deneme", label: "Deneme", category: "Edebiyat" },
  { slug: "ani", label: "Anı", category: "Edebiyat" },
  { slug: "gunluk", label: "Günlük", category: "Edebiyat" },
  { slug: "mektup", label: "Mektup", category: "Edebiyat" },
  { slug: "biyografi", label: "Biyografi", category: "Edebiyat" },
  { slug: "otobiyografi", label: "Otobiyografi", category: "Edebiyat" },
  { slug: "gezi-yazisi", label: "Gezi Yazısı", category: "Edebiyat" },
  { slug: "elestiri", label: "Eleştiri", category: "Edebiyat" },
  { slug: "inceleme", label: "İnceleme", category: "Edebiyat" },
  { slug: "edebi-kurmaca", label: "Edebî Kurmaca", category: "Edebiyat" },
  { slug: "soylesi", label: "Söyleşi", category: "Edebiyat" },
  { slug: "portre", label: "Portre", category: "Edebiyat" },

  // Senaryo ve Sahne
  { slug: "film-senaryosu", label: "Film Senaryosu", category: "Senaryo ve Sahne" },
  { slug: "dizi-senaryosu", label: "Dizi Senaryosu", category: "Senaryo ve Sahne" },
  { slug: "kisa-film-senaryosu", label: "Kısa Film Senaryosu", category: "Senaryo ve Sahne" },
  { slug: "tiyatro", label: "Tiyatro", category: "Senaryo ve Sahne" },
  { slug: "radyo-tiyatrosu", label: "Radyo Tiyatrosu", category: "Senaryo ve Sahne" },
  { slug: "podcast-senaryosu", label: "Podcast Senaryosu", category: "Senaryo ve Sahne" },
  { slug: "belgesel-senaryosu", label: "Belgesel Senaryosu", category: "Senaryo ve Sahne" },

  // Akademik
  { slug: "makale", label: "Makale", category: "Akademik" },
  { slug: "arastirma", label: "Araştırma", category: "Akademik" },
  { slug: "tez", label: "Tez", category: "Akademik" },
  { slug: "bildiri", label: "Bildiri", category: "Akademik" },
  { slug: "vaka-analizi", label: "Vaka Analizi", category: "Akademik" },
  { slug: "akademik-inceleme", label: "Akademik İnceleme", category: "Akademik" },

  // Bilgilendirici
  { slug: "tarih", label: "Tarih", category: "Bilgilendirici" },
  { slug: "felsefe", label: "Felsefe", category: "Bilgilendirici" },
  { slug: "psikoloji", label: "Psikoloji", category: "Bilgilendirici" },
  { slug: "sosyoloji", label: "Sosyoloji", category: "Bilgilendirici" },
  { slug: "kisisel-gelisim", label: "Kişisel Gelişim", category: "Bilgilendirici" },
  { slug: "is-dunyasi", label: "İş Dünyası", category: "Bilgilendirici" },
  { slug: "girisimcilik", label: "Girişimcilik", category: "Bilgilendirici" },
  { slug: "finans", label: "Finans", category: "Bilgilendirici" },
  { slug: "ekonomi", label: "Ekonomi", category: "Bilgilendirici" },
  { slug: "teknoloji", label: "Teknoloji", category: "Bilgilendirici" },
  { slug: "yapay-zeka", label: "Yapay Zekâ", category: "Bilgilendirici" },
  { slug: "programlama", label: "Programlama", category: "Bilgilendirici" },
  { slug: "hukuk", label: "Hukuk", category: "Bilgilendirici" },
  { slug: "egitim", label: "Eğitim", category: "Bilgilendirici" },
  { slug: "siyaset", label: "Siyaset", category: "Bilgilendirici" },
  { slug: "iletisim", label: "İletişim", category: "Bilgilendirici" },
  { slug: "sanat", label: "Sanat", category: "Bilgilendirici" },
  { slug: "mimarlik", label: "Mimarlık", category: "Bilgilendirici" },
  { slug: "saglik", label: "Sağlık", category: "Bilgilendirici" },
  { slug: "spor", label: "Spor", category: "Bilgilendirici" },
  { slug: "yemek-ve-gastronomi", label: "Yemek ve Gastronomi", category: "Bilgilendirici" },
  { slug: "seyahat", label: "Seyahat", category: "Bilgilendirici" },
  { slug: "din-ve-inanc", label: "Din ve İnanç", category: "Bilgilendirici" },

  // Çocuk ve Gençlik
  { slug: "masal", label: "Masal", category: "Çocuk ve Gençlik" },
  { slug: "fabl", label: "Fabl", category: "Çocuk ve Gençlik" },
  { slug: "cocuk-hikayesi", label: "Çocuk Hikâyesi", category: "Çocuk ve Gençlik" },
  { slug: "cocuk-romani", label: "Çocuk Romanı", category: "Çocuk ve Gençlik" },
  { slug: "genc-yetiskin", label: "Genç Yetişkin", category: "Çocuk ve Gençlik" },
  { slug: "egitici-cocuk-kitabi", label: "Eğitici Çocuk Kitabı", category: "Çocuk ve Gençlik" },

  // Çizgi Anlatı
  { slug: "cizgi-roman", label: "Çizgi Roman", category: "Çizgi Anlatı" },
  { slug: "grafik-roman", label: "Grafik Roman", category: "Çizgi Anlatı" },
  { slug: "manga", label: "Manga", category: "Çizgi Anlatı" },
  { slug: "webtoon", label: "Webtoon", category: "Çizgi Anlatı" },
  { slug: "karikatur", label: "Karikatür", category: "Çizgi Anlatı" },
] as const satisfies readonly {
  slug: string;
  label: string;
  category: GenreCategory;
}[];

export type Genre = (typeof GENRES)[number];
export type GenreSlug = Genre["slug"];
export type GenreLabel = Genre["label"];

export const GENRE_LABELS = GENRES.map((genre) => genre.label);

export function getGenreBySlug(slug: string) {
  return GENRES.find((genre) => genre.slug === slug);
}

export function getGenreByLabel(label: string) {
  return GENRES.find((genre) => genre.label === label);
}

export function getGenresByCategory(category: GenreCategory) {
  return GENRES.filter((genre) => genre.category === category);
}

export function isGenreSlug(value: string): value is GenreSlug {
  return GENRES.some((genre) => genre.slug === value);
}
