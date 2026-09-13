import Image from "next/image";

import { ReaderEducationShell } from "@/components/content/ReaderEducationShell";
import type { ReaderEducationGuideRecord } from "@/lib/cms-reader-education";
import {
  READER_EDUCATION_VISUAL_SLOTS,
  type ReaderEducationCategory,
  type ReaderEducationVisualSlotKey,
} from "@/lib/reader-education";

function ReaderVisual({
  guide,
  slotKey,
  fallbackAlt,
}: {
  guide: ReaderEducationGuideRecord;
  slotKey: ReaderEducationVisualSlotKey;
  fallbackAlt: string;
}) {
  const visual = guide.visuals[slotKey];
  if (!visual) return null;
  const slot = READER_EDUCATION_VISUAL_SLOTS.find((item) => item.key === slotKey)!;

  return (
    <figure className="mt-6 overflow-hidden rounded-[1.8rem] border border-black/[0.06] bg-white shadow-[0_14px_44px_rgba(34,23,70,0.08)]">
      <Image
        src={visual.url}
        alt={visual.altText || fallbackAlt}
        width={visual.recommendedWidth}
        height={visual.recommendedHeight}
        className="h-auto w-full object-contain"
        unoptimized
      />
      <figcaption className="border-t border-black/[0.06] px-5 py-3 text-xs leading-6 text-[#746d7d]">
        {slot.label} · {guide.title}
      </figcaption>
    </figure>
  );
}

export function ReaderEducationPage({ category, guide }: { category: ReaderEducationCategory; guide: ReaderEducationGuideRecord }) {
  return (
    <ReaderEducationShell activeCategory={category}>
      <article className="mx-auto max-w-5xl">
        <header className="rounded-[2rem] border border-[#2a2338]/10 bg-[#fffdf8] px-7 py-9 shadow-sm sm:px-10 sm:py-11">
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#7c6d94]">İlkOku · Okurluk Okulu</span>
          <h1 className="mt-4 font-serif text-4xl font-semibold tracking-[-0.045em] text-[#211746] sm:text-5xl lg:text-6xl">{guide.title}</h1>
        </header>

        <ReaderVisual guide={guide} slotKey="hero" fallbackAlt={`${category.title} eğitimini anlatan ana görsel`} />
        <ReaderVisual guide={guide} slotKey="learningPath" fallbackAlt={`${category.title} öğrenme yolunu gösteren görsel`} />
        <ReaderVisual guide={guide} slotKey="analysis" fallbackAlt={`${category.title} analiz kavramlarını anlatan görsel`} />
        <ReaderVisual guide={guide} slotKey="example" fallbackAlt={`${category.title} örnek çözümleme görseli`} />
        <ReaderVisual guide={guide} slotKey="practice" fallbackAlt={`${category.title} uygulama çalışmasını anlatan görsel`} />
        <ReaderVisual guide={guide} slotKey="finalCta" fallbackAlt={`${category.title} eğitimi kapanış görseli`} />
      </article>
    </ReaderEducationShell>
  );
}
