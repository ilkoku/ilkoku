import type { Metadata } from "next";

import { WritingCategoryLandingPage } from "@/components/content/WritingCategoryLandingPage";
import { getWritingCategoryHub } from "@/lib/writing-category-hubs";

const hub = getWritingCategoryHub("senaryo-ve-sahne");
if (!hub) throw new Error("Senaryo ve Sahne category hub definition missing");

export const metadata: Metadata = {
  title: "Senaryo ve Sahne Yazarlığı Eğitimleri | İlkOku",
  description: "Film, dizi, tiyatro, podcast ve diğer senaryo-sahne türlerinin farklı yazarlık mantıklarını keşfet.",
  alternates: { canonical: "https://ilkoku.com/yazarlar-icin/senaryo-ve-sahne" },
  robots: { index: false, follow: true },
};

export default function SenaryoVeSahneCategoryPage() {
  return <WritingCategoryLandingPage hub={hub} />;
}
