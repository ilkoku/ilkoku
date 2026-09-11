import type { Metadata } from "next";

import { PublicCmsPageBlocks } from "@/components/content/PublicCmsPageBlocks";
import { WritingGuideShell } from "@/components/content/WritingGuideShell";
import type { CmsPageBlock } from "@/lib/cms-page-blocks";
import { getCmsPageTemplate } from "@/lib/cms-page-templates";

import "./roman-guide.css";

const template = getCmsPageTemplate("ornek-roman");

const romanVisuals = {
  hero: "/writing-guides/kurgu/roman/kurgu-roman-01-hero.avif",
  ideaFlow: "/writing-guides/kurgu/roman/kurgu-roman-02-fikir-akisi.avif",
  structure: "/writing-guides/kurgu/roman/kurgu-roman-03-yapi-diyagrami.avif",
  anatomy: "/writing-guides/kurgu/roman/kurgu-roman-04-eser-anatomisi.avif",
  pageSetup: "/writing-guides/kurgu/roman/kurgu-roman-05-sayfa-ayari.avif",
  project: "/writing-guides/kurgu/roman/kurgu-roman-06-ornek-proje.avif",
  finalCta: "/writing-guides/kurgu/roman/kurgu-roman-07-final-cta.avif",
} as const;

const visualAfter: Record<string, CmsPageBlock> = {
  "ornek-roman-ilham": {
    id: "roman-gorsel-fikir-akisi",
    type: "image",
    imageUrl: romanVisuals.ideaFlow,
    alt: "Bir roman fikrinin gözlem, merak, soru, karakter ve çatışmadan doğuşunu anlatan görsel",
    caption: "Bir fikir, tek bir ayrıntıyı meraka dönüştürerek büyümeye başlayabilir.",
    layout: "wide",
  },
  "ornek-roman-olay-orgusu": {
    id: "roman-gorsel-yapi",
    type: "image",
    imageUrl: romanVisuals.structure,
    alt: "Romanın başlangıçtan sonuca uzanan yapısını gösteren anlatı diyagramı",
    caption: "Bu akış katı bir formül değil; ilk taslağı kaybetmeden ilerletmek için bir haritadır.",
    layout: "wide",
  },
  "ornek-roman-anatomi": {
    id: "roman-gorsel-anatomi",
    type: "image",
    imageUrl: romanVisuals.anatomy,
    alt: "Karakter, mekân, olay örgüsü, tema, anlatıcı ve üslup bileşenlerini anlatan roman anatomisi görseli",
    caption: "Romanın parçaları tek tek değil, birbirini taşıyan bir bütün olarak çalışır.",
    layout: "wide",
  },
  "ornek-roman-sayfa": {
    id: "roman-gorsel-sayfa-ayari",
    type: "image",
    imageUrl: romanVisuals.pageSetup,
    alt: "Roman taslağı için örnek sayfa düzeni ve yazım ayarlarını gösteren görsel",
    caption: "Taslak ayarları çalışma rahatlığı içindir; yayın görünümünde yazarın ve eserin tercihi korunur.",
    layout: "wide",
  },
  "ornek-roman-ilk-sahne": {
    id: "roman-gorsel-ornek-proje",
    type: "image",
    imageUrl: romanVisuals.project,
    alt: "Bir roman fikrinin araştırma, karakter, taslak, yazım, revizyon ve yayına dönüşümünü gösteren örnek proje",
    caption: "Örnek proje, bir fikrin yalnız ilhamla değil; araştırma, taslak ve revizyonla romana dönüştüğünü gösterir.",
    layout: "wide",
  },
  "ornek-roman-sss": {
    id: "roman-gorsel-final",
    type: "image",
    imageUrl: romanVisuals.finalCta,
    alt: "Roman yazmaya başlama çağrısını ve İlkOku yazarlık ortamını anlatan kapanış görseli",
    caption: "İlk romanın bugün tek bir cümleyle başlayabilir.",
    layout: "wide",
  },
};

const romanBlocks = template.blocks.flatMap<CmsPageBlock>((block) => {
  let current: CmsPageBlock = block;

  if (block.id === "ornek-roman-hero" && block.type === "hero") {
    current = {
      ...block,
      eyebrow: "Yazarlar İçin · Kurgu",
      text: "Hayal et. Planla. Yaz. Tamamla. İlk roman fikrinden karaktere, olay örgüsünden ilk taslağa kadar adım adım ilerle.",
      imageUrl: romanVisuals.hero,
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
      imageAlt: "Ham fikrin karakter, amaç ve engel üzerinden tek cümlelik roman fikrine dönüşümünü gösteren görsel",
    };
  }

  if (block.id === "ornek-roman-karakter" && block.type === "split") {
    current = {
      ...block,
      imageUrl: romanVisuals.anatomy,
      imageAlt: "Karakterin istek, korku, zayıflık, sır ve dönüşümünü romanın bütünü içinde gösteren görsel",
    };
  }

  if (block.id === "ornek-roman-taslak" && block.type === "quote") {
    current = { ...block, attribution: "İlkOku · Yazarlık rehberi" };
  }

  if (block.id === "ornek-roman-cta" && block.type === "cta") {
    current = {
      ...block,
      secondaryLabel: "",
      secondaryHref: "",
    };
  }

  const visual = visualAfter[block.id];
  return visual ? [current, visual] : [current];
});

export const metadata: Metadata = {
  title: "Roman Nasıl Yazılır? | İlkOku",
  description: "Roman fikrinden karaktere, olay örgüsünden sayfa düzenine, ilk taslaktan revizyona kadar örneklerle adım adım roman yazarlık rehberi.",
  robots: {
    index: false,
    follow: false,
  },
};

export default function RomanYazarlikRehberiPage() {
  return (
    <WritingGuideShell activeCategory="Kurgu" activeGenreSlug="roman">
      <div className="roman-writing-guide">
        <PublicCmsPageBlocks
          blocks={romanBlocks}
          eyebrow="Yazarlar İçin · Kurgu"
          pageTitle="Roman Nasıl Yazılır?"
          summary="İlk roman fikrinden karaktere, olay örgüsünden sayfa düzenine ve ilk taslağa kadar adım adım ilerleyen görsel yazarlık rehberi."
          unoptimizedImages
        />
      </div>
    </WritingGuideShell>
  );
}
