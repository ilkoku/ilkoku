import type { Metadata } from "next";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";

import { WritingCategoryLandingPage } from "@/components/content/WritingCategoryLandingPage";
import { getWritingCategoryHub } from "@/lib/writing-category-hubs";

const hub = getWritingCategoryHub("cocuk-ve-genclik");
if (!hub) throw new Error("Çocuk ve Gençlik category hub definition missing");

export const metadata: Metadata = createPublicPageMetadata({
  title: "Çocuk ve Gençlik Yazarlığı Eğitimleri | İlkOku",
  description: "Masal, çocuk hikâyesi, çocuk romanı ve genç yetişkin türlerinin farklı yazarlık mantıklarını keşfet.",
  canonical: "/yazarlar-icin/cocuk-ve-genclik",
});

export default function CocukVeGenclikCategoryPage() {
  return <WritingCategoryLandingPage hub={hub} />;
}
