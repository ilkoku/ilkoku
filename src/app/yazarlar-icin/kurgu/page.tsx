import type { Metadata } from "next";

import { WritingCategoryLandingPage } from "@/components/content/WritingCategoryLandingPage";
import { getWritingCategoryHub } from "@/lib/writing-category-hubs";

const hub = getWritingCategoryHub("kurgu");
if (!hub) throw new Error("Kurgu category hub definition missing");

export const metadata: Metadata = {
  title: "Kurgu Yazarlığı ve Eğitimleri | İlkOku",
  description: "Kurgu nedir, kurgu türleri neden farklı yazılır ve hangi tür eğitiminden başlamalısın? İlkOku Yazarlık Okulu Kurgu giriş sayfası.",
  alternates: { canonical: "https://ilkoku.com/yazarlar-icin/kurgu" },
  robots: { index: true, follow: true },
};

export default function KurguCategoryPage() {
  return <WritingCategoryLandingPage hub={hub} />;
}
