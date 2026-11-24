import { readFileSync } from "node:fs";
import { join } from "node:path";
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

// Hub sayfasında "Öne çıkan başlangıç rehberleri" bloğunun VARSAYILAN listesi ve sırası
// (arama niyetine göre yaygın olandan başlar). Tıklama verisi varsa sıralama
// getFeaturedGuideSlugs ile veriye göre değişir; eşitlikte bu sıra geçerlidir.
export const FEATURED_GUIDE_SLUGS: Record<GenreCategory, readonly string[]> = {
  Kurgu: ["roman", "oyku", "bilim-kurgu", "fantastik", "distopya", "novella"],
  Edebiyat: ["siir", "deneme", "ani", "biyografi", "gunluk"],
  "Senaryo ve Sahne": ["film-senaryosu", "dizi-senaryosu", "kisa-film-senaryosu", "tiyatro"],
  Akademik: ["tez", "makale", "arastirma", "bildiri"],
  Bilgilendirici: ["tarih", "felsefe", "psikoloji", "kisisel-gelisim", "yapay-zeka", "girisimcilik"],
  "Çocuk ve Gençlik": ["masal", "cocuk-hikayesi", "cocuk-romani", "genc-yetiskin"],
  "Çizgi Anlatı": ["grafik-roman", "cizgi-roman", "manga", "webtoon"],
};

export const MAX_FEATURED_GUIDES = 6;

const FEATURED_CLICKS_PATH = join(process.cwd(), "src", "data", "featured-guide-clicks.json");

// Depodaki tıklama anlık görüntüsünü okur: { "updatedAt": "...", "clicks": { slug: sayı } }.
// Dosya yoksa, bozuksa ya da boşsa boş nesne döner; sıralama varsayılan listeye düşer.
function readFeaturedClicks(): Record<string, number> {
  try {
    const parsed: unknown = JSON.parse(readFileSync(FEATURED_CLICKS_PATH, "utf8"));
    const clicks = (parsed as { clicks?: unknown } | null)?.clicks;
    if (!clicks || typeof clicks !== "object") return {};
    const result: Record<string, number> = {};
    for (const [slug, value] of Object.entries(clicks)) {
      if (typeof value === "number" && Number.isFinite(value) && value > 0) result[slug] = value;
    }
    return result;
  } catch {
    return {};
  }
}

// Öne çıkan slug'ları döndürür: tıklaması azalan, eşitlikte varsayılan sıra, en çok 6.
// Aday havuzu = varsayılan liste + kategoride tıklaması 0'dan büyük olan rehberler;
// böylece listede olmayan ama çok tıklanan bir rehber de öne çıkabilir.
export function getFeaturedGuideSlugs(
  category: GenreCategory,
  eligibleSlugs: readonly string[],
  clicks: Record<string, number> = readFeaturedClicks(),
): string[] {
  const defaults = FEATURED_GUIDE_SLUGS[category];
  const eligible = new Set(eligibleSlugs);
  const candidates = [
    ...defaults,
    ...eligibleSlugs.filter((slug) => !defaults.includes(slug) && (clicks[slug] ?? 0) > 0),
  ].filter((slug) => eligible.has(slug));

  return candidates
    .map((slug, order) => ({ slug, order, count: clicks[slug] ?? 0 }))
    .sort((a, b) => b.count - a.count || a.order - b.order)
    .slice(0, MAX_FEATURED_GUIDES)
    .map((item) => item.slug);
}
