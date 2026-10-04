import type { Metadata } from "next";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";

import { WritingCategoryLandingPage } from "@/components/content/WritingCategoryLandingPage";
import { getWritingCategoryHub } from "@/lib/writing-category-hubs";

const hub = getWritingCategoryHub("kurgu");
if (!hub) throw new Error("Kurgu category hub definition missing");

export const metadata: Metadata = createPublicPageMetadata({
  title: "Kurgu Yazarlığı ve Eğitimleri | İlkOku",
  description: "Kurgu nedir, kurgu türleri neden farklı yazılır ve hangi tür eğitiminden başlamalısın? İlkOku Yazarlık Okulu Kurgu giriş sayfası.",
  canonical: "/yazarlar-icin/kurgu",
});

export default function KurguCategoryPage() {
  return <WritingCategoryLandingPage hub={hub} />;
}
