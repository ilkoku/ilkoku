import type { Metadata } from "next";

import { PublicWorkFeedPage } from "@/features/public-discovery/PublicWorkFeedPage";

const title = "Yeni Yayımlanan Eserler | İlkOku";
const description =
  "İlkOku’da son yayımlanan herkese açık Türkçe eserleri kalıcı kitap bağlantılarıyla keşfedin.";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ sayfa?: string }>;
}): Promise<Metadata> {
  const query = await searchParams;

  return {
    title,
    description,
    alternates: {
      canonical: "/eserler/yeni",
    },
    robots: {
      index: !query.sayfa,
      follow: true,
    },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url: "/eserler/yeni",
      title,
      description,
    },
  };
}

export default function NewPublicWorksPage({
  searchParams,
}: {
  searchParams: Promise<{ sayfa?: string }>;
}) {
  return (
    <PublicWorkFeedPage
      basePath="/eserler/yeni"
      description={description}
      emptyText="Henüz herkese açık yayımlanmış eser yok."
      eyebrow="YENİ YAYINLAR"
      heading="Yeni yayımlanan eserler"
      searchParams={searchParams}
      sort="newest"
    />
  );
}
