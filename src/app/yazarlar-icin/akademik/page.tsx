import type { Metadata } from "next";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";

import { WritingCategoryLandingPage } from "@/components/content/WritingCategoryLandingPage";
import { getWritingCategoryHub } from "@/lib/writing-category-hubs";

const hub = getWritingCategoryHub("akademik");
if (!hub) throw new Error("Akademik category hub definition missing");

export const metadata: Metadata = createPublicPageMetadata({
  title: "Akademik Yazarlık Eğitimleri | İlkOku",
  description: "Makale, tez, araştırma, bildiri ve diğer akademik çalışma türlerinin farklı yazım mantıklarını keşfet.",
  canonical: "/yazarlar-icin/akademik",
});

export default function AkademikCategoryPage() {
  return <WritingCategoryLandingPage hub={hub} />;
}
