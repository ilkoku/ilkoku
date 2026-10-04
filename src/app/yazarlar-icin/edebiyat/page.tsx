import type { Metadata } from "next";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";

import { WritingCategoryLandingPage } from "@/components/content/WritingCategoryLandingPage";
import { getWritingCategoryHub } from "@/lib/writing-category-hubs";

const hub = getWritingCategoryHub("edebiyat");
if (!hub) throw new Error("Edebiyat category hub definition missing");

export const metadata: Metadata = createPublicPageMetadata({
  title: "Edebiyat Yazarlığı ve Eğitimleri | İlkOku",
  description: "Şiir, deneme, anı, biyografi ve diğer edebiyat türlerinin farklı yazarlık mantıklarını keşfet.",
  canonical: "/yazarlar-icin/edebiyat",
});

export default function EdebiyatCategoryPage() {
  return <WritingCategoryLandingPage hub={hub} />;
}
