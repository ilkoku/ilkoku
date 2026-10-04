import type { Metadata } from "next";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";

import { WritingCategoryLandingPage } from "@/components/content/WritingCategoryLandingPage";
import { getWritingCategoryHub } from "@/lib/writing-category-hubs";

const hub = getWritingCategoryHub("bilgilendirici");
if (!hub) throw new Error("Bilgilendirici category hub definition missing");

export const metadata: Metadata = createPublicPageMetadata({
  title: "Bilgilendirici Yazarlık Eğitimleri | İlkOku",
  description: "Tarih, psikoloji, teknoloji, finans ve diğer bilgi odaklı eser alanlarının farklı yazım mantıklarını keşfet.",
  canonical: "/yazarlar-icin/bilgilendirici",
});

export default function BilgilendiriciCategoryPage() {
  return <WritingCategoryLandingPage hub={hub} />;
}
