import type { Metadata } from "next";

import { WritingCategoryLandingPage } from "@/components/content/WritingCategoryLandingPage";
import { getWritingCategoryHub } from "@/lib/writing-category-hubs";

const hub = getWritingCategoryHub("bilgilendirici");
if (!hub) throw new Error("Bilgilendirici category hub definition missing");

export const metadata: Metadata = {
  title: "Bilgilendirici Yazarlık Eğitimleri | İlkOku",
  description: "Tarih, psikoloji, teknoloji, finans ve diğer bilgi odaklı eser alanlarının farklı yazım mantıklarını keşfet.",
  alternates: { canonical: "https://ilkoku.com/yazarlar-icin/bilgilendirici" },
  robots: { index: true, follow: true },
};

export default function BilgilendiriciCategoryPage() {
  return <WritingCategoryLandingPage hub={hub} />;
}
