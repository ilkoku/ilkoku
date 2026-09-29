import type { Metadata } from "next";
import { GlobalBestsellerView } from "@/features/book-index/public/GlobalBestsellerView";
import { getGlobalBestsellerReadModel } from "@/lib/book-index/global-public-read-model";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";

const canonical = "/en-cok-satanlar/dunya";
const description =
  "Amazon ABD, Amazon UK, IBS İtalya, Rakuten Books Japonya, Kyobo Güney Kore ve Readings Avustralya çok satan kitap listelerini ilgili sitelerin kendi sıralamalarıyla inceleyin.";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return createPublicPageMetadata({
    title: `Dünyada Çok Satan Kitaplar ${new Date().getFullYear()} | İlkOku`,
    description,
    canonical,
    image: "/en-cok-satanlar/opengraph-image",
    noIndex: false,
  });
}

export default async function GlobalBestsellersPage() {
  const model = await getGlobalBestsellerReadModel(100);

  return <GlobalBestsellerView model={model} />;
}
