import type { Metadata } from "next";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";

import { WritingCategoryLandingPage } from "@/components/content/WritingCategoryLandingPage";
import { getWritingCategoryHub } from "@/lib/writing-category-hubs";

const hub = getWritingCategoryHub("cizgi-anlati");
if (!hub) throw new Error("Çizgi Anlatı category hub definition missing");

export const metadata: Metadata = createPublicPageMetadata({
  title: "Çizgi Anlatı Yazarlığı Eğitimleri | İlkOku",
  description: "Çizgi roman, grafik roman, manga, webtoon ve karikatür türlerinin farklı anlatı mantıklarını keşfet.",
  canonical: "/yazarlar-icin/cizgi-anlati",
});

export default function CizgiAnlatiCategoryPage() {
  return <WritingCategoryLandingPage hub={hub} />;
}
