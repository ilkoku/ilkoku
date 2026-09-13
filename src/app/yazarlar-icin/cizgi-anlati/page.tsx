import type { Metadata } from "next";

import { WritingCategoryLandingPage } from "@/components/content/WritingCategoryLandingPage";
import { getWritingCategoryHub } from "@/lib/writing-category-hubs";

const hub = getWritingCategoryHub("cizgi-anlati");
if (!hub) throw new Error("Çizgi Anlatı category hub definition missing");

export const metadata: Metadata = {
  title: "Çizgi Anlatı Yazarlığı Eğitimleri | İlkOku",
  description: "Çizgi roman, grafik roman, manga, webtoon ve karikatür türlerinin farklı anlatı mantıklarını keşfet.",
  alternates: { canonical: "https://ilkoku.com/yazarlar-icin/cizgi-anlati" },
  robots: { index: false, follow: true },
};

export default function CizgiAnlatiCategoryPage() {
  return <WritingCategoryLandingPage hub={hub} />;
}
