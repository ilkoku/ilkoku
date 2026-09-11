import type { Metadata } from "next";

import { PublicCmsPageBlocks } from "@/components/content/PublicCmsPageBlocks";
import { WritingGuideShell } from "@/components/content/WritingGuideShell";
import type { CmsPageBlock } from "@/lib/cms-page-blocks";
import { getEducationGuideRecord } from "@/lib/cms-education";
import { getCmsPageTemplate } from "@/lib/cms-page-templates";

import "./roman-guide.css";

const template = getCmsPageTemplate("ornek-roman");

const defaultRomanVisuals = {
  hero: "/writing-guides/kurgu/roman/kurgu-roman-01-hero.avif",
  ideaFlow: "/writing-guides/kurgu/roman/kurgu-roman-02-fikir-akisi.avif",
  structure: "/writing-guides/kurgu/roman/kurgu-roman-03-yapi-diyagrami.avif",
  anatomy: "/writing-guides/kurgu/roman/kurgu-roman-04-eser-anatomisi.avif",
  pageSetup: "/writing-guides/kurgu/roman/kurgu-roman-05-sayfa-ayari.avif",
  project: "/writing-guides/kurgu/roman/kurgu-roman-06-ornek-proje.avif",
  finalCta: "/writing-guides/kurgu/roman/kurgu-roman-07-final-cta.avif",
} as const;

const defaultAlt = {
  hero: "Roman yazım sürecini planlama masası üzerinden anlatan görsel",
  ideaFlow: "Bir roman fikrinin gözlem, merak, soru, karakter ve çatışmadan doğuşunu anlatan görsel",
  structure: "Romanın başlangıçtan sonuca uzanan yapısını gösteren anlatı diyagramı",
  anatomy: "Karakter, mekân, olay örgüsü, tema, anlatıcı ve üslup bileşenlerini anlatan roman anatomisi görseli",
  pageSetup: "Roman taslağı için örnek sayfa düzeni ve yazım ayarlarını gösteren görsel",
  project: "Bir roman fikrinin araştırma, karakter, taslak, yazım, revizyon ve yayına dönüşümünü gösteren örnek proje",
  finalCta: "Roman yazmaya başlama çağrısını ve İlkOku yazarlık ortamını anlatan kapanış görseli",
} as const;

type RomanVisuals = typeof defaultRomanVisuals;
type RomanAlts = typeof defaultAlt;

function buildRomanBlocks(romanVisuals: RomanVisuals, romanAlts: RomanAlts, title: string, summary: string) {
  const visualAfter: Record<string, CmsPageBlock> = {
    "ornek-roman-olay-orgusu": {
      id: "roman-gorsel-yapi",
      type: "image",
      imageUrl: romanVisuals.structure,
      alt: romanAlts.structure,
      caption: "Bu akış katı bir formül değil; ilk taslağı kaybetmeden ilerletmek için bir haritadır.",
      layout: "wide",
    },
    "ornek-roman-sayfa": {
      id: "roman-gorsel-sayfa-ayari",
      type: "image",
      imageUrl: romanVisuals.pageSetup,
      alt: romanAlts.pageSetup,
      caption: "Taslak ayarları çalışma rahatlığı içindir; yayın görünümünde yazarın ve eserin tercihi korunur.",
      layout: "wide",
    },
    "ornek-roman-ilk-sahne": {
      id: "roman-gorsel-ornek-proje",
      type: "image",
      imageUrl: romanVisuals.project,
      alt: romanAlts.project,
      caption: "Örnek proje, bir fikrin yalnız ilhamla değil; araştırma, taslak ve revizyonla romana dönüştüğünü gösterir.",
      layout: "wide",
    },
    "ornek-roman-sss": {
      id: "roman-gorsel-final",
      type: "image",
      imageUrl: romanVisuals.finalCta,
      alt: romanAlts.finalCta,
      caption: "İlk romanın bugün tek bir cümleyle başlayabilir.",
      layout: "wide",
    },
  };

  return template.blocks.flatMap<CmsPageBlock>((block) => {
    let current: CmsPageBlock = block;

    if (block.id === "ornek-roman-hero" && block.type === "hero") {
      current = {
        ...block,
        eyebrow: "Yazarlar İçin · Kurgu",
        title,
        text: summary,
        imageUrl: romanVisuals.hero,
        imageAlt: romanAlts.hero,
        primaryLabel: "Roman Yazmaya Başla",
        primaryHref: "/yazar",
        secondaryLabel: "",
        secondaryHref: "",
      };
    }

    if (block.id === "ornek-roman-cekirdek" && block.type === "split") {
      current = {
        ...block,
        imageUrl: romanVisuals.ideaFlow,
        imageAlt: romanAlts.ideaFlow,
      };
    }

    if (block.id === "ornek-roman-karakter" && block.type === "split") {
      current = {
        ...block,
        imageUrl: romanVisuals.anatomy,
        imageAlt: romanAlts.anatomy,
      };
    }

    if (block.id === "ornek-roman-taslak" && block.type === "quote") {
      current = { ...block, attribution: "İlkOku · Yazarlık rehberi" };
    }

    if (block.id === "ornek-roman-cta" && block.type === "cta") {
      current = { ...block, secondaryLabel: "", secondaryHref: "" };
    }

    const visual = visualAfter[block.id];
    return visual ? [current, visual] : [current];
  });
}

export const metadata: Metadata = {
  title: "Roman Nasıl Yazılır? | İlkOku",
  description: "Roman fikrinden karaktere, olay örgüsünden sayfa düzenine, ilk taslaktan revizyona kadar örneklerle adım adım roman yazarlık rehberi.",
  robots: { index: false, follow: false },
};

export default async function RomanYazarlikRehberiPage() {
  let guide: Awaited<ReturnType<typeof getEducationGuideRecord>> = null;
  try {
    guide = await getEducationGuideRecord("roman");
  } catch {
    guide = null;
  }

  const visuals = guide?.visuals ?? {};
  const romanVisuals: RomanVisuals = {
    hero: visuals.hero?.url ?? defaultRomanVisuals.hero,
    ideaFlow: visuals.ideaFlow?.url ?? defaultRomanVisuals.ideaFlow,
    structure: visuals.structure?.url ?? defaultRomanVisuals.structure,
    anatomy: visuals.anatomy?.url ?? defaultRomanVisuals.anatomy,
    pageSetup: visuals.pageSetup?.url ?? defaultRomanVisuals.pageSetup,
    project: visuals.project?.url ?? defaultRomanVisuals.project,
    finalCta: visuals.finalCta?.url ?? defaultRomanVisuals.finalCta,
  };
  const romanAlts: RomanAlts = {
    hero: visuals.hero?.altText || defaultAlt.hero,
    ideaFlow: visuals.ideaFlow?.altText || defaultAlt.ideaFlow,
    structure: visuals.structure?.altText || defaultAlt.structure,
    anatomy: visuals.anatomy?.altText || defaultAlt.anatomy,
    pageSetup: visuals.pageSetup?.altText || defaultAlt.pageSetup,
    project: visuals.project?.altText || defaultAlt.project,
    finalCta: visuals.finalCta?.altText || defaultAlt.finalCta,
  };
  const title = guide?.title || "Roman Nasıl Yazılır?";
  const summary = guide?.summary || "Hayal et. Planla. Yaz. Tamamla. İlk roman fikrinden karaktere, olay örgüsünden ilk taslağa kadar adım adım ilerle.";
  const romanBlocks = buildRomanBlocks(romanVisuals, romanAlts, title, summary);

  return (
    <WritingGuideShell activeCategory="Kurgu" activeGenreSlug="roman">
      <div className="roman-writing-guide">
        <PublicCmsPageBlocks
          blocks={romanBlocks}
          eyebrow="Yazarlar İçin · Kurgu"
          pageTitle={title}
          summary={summary}
          unoptimizedImages
        />
      </div>
    </WritingGuideShell>
  );
}
