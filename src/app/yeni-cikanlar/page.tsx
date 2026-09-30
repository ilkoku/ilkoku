import type { Metadata } from "next";

import { NewReleasePublicView } from "@/features/book-index/public/NewReleasePublicView";
import { getTurkeyNewReleaseRows } from "@/lib/book-index/new-releases";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";

const canonical = "/yeni-cikanlar";
const description =
  "Türkiye'deki kitap satış kaynaklarının kendi yeni çıkan ve yeni gelen listelerinde yer verdiği kitapları karşılaştırın.";

export const revalidate = 300;

export function generateMetadata(): Metadata {
  return createPublicPageMetadata({
    title: "Yeni Çıkan Kitaplar | İlkOku Kitap Endeksi",
    description,
    canonical,
    image: "/en-cok-satanlar/opengraph-image",
    noIndex: false,
  });
}

export default async function NewReleasesPage() {
  const rows = await getTurkeyNewReleaseRows(500);

  return <NewReleasePublicView rows={rows} />;
}
