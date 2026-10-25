import type { Metadata } from "next";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";

import { WritingCategoryLandingPage } from "@/components/content/WritingCategoryLandingPage";
import { getWritingCategoryHub } from "@/lib/writing-category-hubs";

const hub = getWritingCategoryHub("senaryo-ve-sahne");
if (!hub) throw new Error("Senaryo ve Sahne category hub definition missing");

export const metadata: Metadata = createPublicPageMetadata({
  title: "Senaryo ve Sahne Yazarlığı Eğitimleri | İlkOku",
  description: "Film, dizi, tiyatro ve podcast gibi türler için senaryo ve sahne yazarlığı eğitimlerini keşfedin. Anlatı kurma ve türlere göre yazma yollarını inceleyin.",
  canonical: "/yazarlar-icin/senaryo-ve-sahne",
});

export default function SenaryoVeSahneCategoryPage() {
  return <WritingCategoryLandingPage hub={hub} />;
}
