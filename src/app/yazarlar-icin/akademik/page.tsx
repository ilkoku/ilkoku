import type { Metadata } from "next";

import { WritingCategoryLandingPage } from "@/components/content/WritingCategoryLandingPage";
import { getWritingCategoryHub } from "@/lib/writing-category-hubs";

const hub = getWritingCategoryHub("akademik");
if (!hub) throw new Error("Akademik category hub definition missing");

export const metadata: Metadata = {
  title: "Akademik Yazarlık Eğitimleri | İlkOku",
  description: "Makale, tez, araştırma, bildiri ve diğer akademik çalışma türlerinin farklı yazım mantıklarını keşfet.",
  alternates: { canonical: "https://ilkoku.com/yazarlar-icin/akademik" },
  robots: { index: true, follow: true },
};

export default function AkademikCategoryPage() {
  return <WritingCategoryLandingPage hub={hub} />;
}
