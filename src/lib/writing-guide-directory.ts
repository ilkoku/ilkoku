import { getEducationGuideDefinition as getAcademicGuide } from "@/lib/academic-guide-batch";
import { getEducationGuideDefinition as getLiteratureGuide } from "@/lib/education-guide-batch";
import { FICTION_GUIDE_DEFINITIONS } from "@/lib/fiction-guide-batch";
import { getEducationGuideDefinition as getGraphicGuide } from "@/lib/graphic-narrative-guide-batch";
import { getEducationGuideDefinition as getInformationalGuide } from "@/lib/informational-guide-batch";
import { getEducationGuideDefinition as getStageGuide } from "@/lib/stage-guide-batch";
import { getEducationGuideDefinition as getYouthGuide } from "@/lib/youth-guide-batch";
import { getGenresByCategory, type GenreCategory } from "@/lib/genres";

export type WritingGuideEntry = {
  href: string;
  label: string;
  slug: string;
  summary: string;
  title: string;
};

// Altı Kurgu rehberi (roman, öykü, novella, fantastik, bilim kurgu, distopya)
// toplu tanım kullanmıyor; sayfa dosyalarındaki varsayılan başlık ve özet burada
// ayrıca tutuluyor. O sayfalardaki varsayılan metin değişirse burası da güncellenmeli.
const standaloneFictionGuides: Record<string, { summary: string; title: string }> = {
  roman: {
    title: "Roman Nasıl Yazılır?",
    summary: "Hayal et. Planla. Yaz. Tamamla. İlk roman fikrinden karaktere, olay örgüsünden ilk taslağa kadar adım adım ilerle.",
  },
  oyku: {
    title: "Öykü Nasıl Yazılır?",
    summary: "Tek bir anı, çatışmayı veya değişimi yoğunlaştır. Fikirden karaktere, sahne ekonomisinden finale ve revizyona kadar kısa öykünü adım adım kur.",
  },
  novella: {
    title: "Novella Nasıl Yazılır?",
    summary: "Öykünün yoğunluğunu, romanın gelişim alanıyla birleştir. Tek ana dönüşümü sahne sahne büyüt, dağıtmadan tamamla.",
  },
  fantastik: {
    title: "Fantastik Nasıl Yazılır?",
    summary: "Dünyayı kur, büyünün sınırlarını belirle, bedeli karakterin seçimine bağla. Fantastik evreni ansiklopedi değil hikâye olarak yaz.",
  },
  "bilim-kurgu": {
    title: "Bilim Kurgu Nasıl Yazılır?",
    summary: "Bir 'ya şöyle olsaydı?' sorusunu kurala dönüştür, sonuç zincirini kur, bilimi insan bedeline bağla. Bilim kurguyu teknoloji dekoru değil nedensellik olarak yaz.",
  },
  distopya: {
    title: "Distopya Nasıl Yazılır?",
    summary: "Bir korkudan düzen kur, düzeni vaat ve kurumla inandırıcı hâle getir, karakteri sistemin faydasına ve bedeline bağla. Distopyayı karanlık dekor değil yaşayan güç ilişkisi olarak yaz.",
  },
};

type GuideCore = { summary: string; title: string };

function resolveGuide(category: GenreCategory, slug: string): GuideCore | null {
  try {
    switch (category) {
      case "Kurgu":
        return standaloneFictionGuides[slug] ?? FICTION_GUIDE_DEFINITIONS[slug] ?? null;
      case "Edebiyat":
        return getLiteratureGuide(slug);
      case "Senaryo ve Sahne":
        return getStageGuide(slug);
      case "Akademik":
        return getAcademicGuide(slug);
      case "Bilgilendirici":
        return getInformationalGuide(slug);
      case "Çocuk ve Gençlik":
        return getYouthGuide(slug);
      case "Çizgi Anlatı":
        return getGraphicGuide(slug);
    }
  } catch {
    return null;
  }
}

// Bir kategorideki tüm rehberleri (GENRES sırasıyla) gerçek başlık ve özetle döndürür.
// Tanımı bulunamayan tür sessizce düşmez; başlık "<Tür> Nasıl Yazılır?" olarak yedeklenir.
export function getWritingGuideEntries(category: GenreCategory, hubHref: string): WritingGuideEntry[] {
  return getGenresByCategory(category).map((genre) => {
    const guide = resolveGuide(category, genre.slug);
    return {
      href: `${hubHref}/${genre.slug}`,
      label: genre.label,
      slug: genre.slug,
      summary: guide?.summary ?? "",
      title: guide?.title || `${genre.label} Nasıl Yazılır?`,
    };
  });
}

// Hub sayfasında "Öne çıkan başlangıç rehberleri" bloğuna giren 4-6 rehber.
export const FEATURED_GUIDE_SLUGS: Record<GenreCategory, readonly string[]> = {
  Kurgu: ["roman", "oyku", "fantastik", "bilim-kurgu", "distopya", "dedektif"],
  Edebiyat: ["siir", "deneme", "ani", "biyografi", "gunluk"],
  "Senaryo ve Sahne": ["film-senaryosu", "dizi-senaryosu", "kisa-film-senaryosu", "tiyatro"],
  Akademik: ["makale", "tez", "arastirma", "bildiri"],
  Bilgilendirici: ["tarih", "felsefe", "psikoloji", "kisisel-gelisim", "yapay-zeka", "girisimcilik"],
  "Çocuk ve Gençlik": ["masal", "cocuk-hikayesi", "cocuk-romani", "genc-yetiskin"],
  "Çizgi Anlatı": ["cizgi-roman", "manga", "webtoon", "grafik-roman"],
};
