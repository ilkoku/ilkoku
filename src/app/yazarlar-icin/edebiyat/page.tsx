import type { Metadata } from "next";

import { WritingCategoryLandingPage } from "@/components/content/WritingCategoryLandingPage";
import { getWritingCategoryHub } from "@/lib/writing-category-hubs";

const hub = getWritingCategoryHub("edebiyat");
if (!hub) throw new Error("Edebiyat category hub definition missing");

export const metadata: Metadata = {
  title: "Edebiyat Yazarlığı ve Eğitimleri | İlkOku",
  description: "Şiir, deneme, anı, biyografi ve diğer edebiyat türlerinin farklı yazarlık mantıklarını keşfet.",
  alternates: { canonical: "https://ilkoku.com/yazarlar-icin/edebiyat" },
  robots: { index: false, follow: true },
};

export default function EdebiyatCategoryPage() {
  return <WritingCategoryLandingPage hub={hub} />;
}
