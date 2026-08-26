import type { Metadata } from "next";

import { PublicWorkFeedPage } from "@/features/public-discovery/PublicWorkFeedPage";

const title = "Yeni Yayımlanan Eserler | İlkOku";
const description =
  "İlkOku’da son yayımlanan keşfe açık Türkçe eser vitrinlerini kalıcı kitap bağlantılarıyla keşfedin.";

type NewWorksSearchParams = {
  arama?: string;
  sayfa?: string;
  tur?: string;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<NewWorksSearchParams>;
}): Promise<Metadata> {
  const query = await searchParams;

  return {
    title,
    description,
    alternates: {
      canonical: "/eserler/yeni",
    },
    robots: {
      index: !query.sayfa && !query.arama && !query.tur,
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
  searchParams: Promise<NewWorksSearchParams>;
}) {
  return (
    <PublicWorkFeedPage
      basePath="/eserler/yeni"
      description={description}
      emptyText="Bu ölçütlerde yeni yayımlanmış keşfe açık eser bulunamadı."
      eyebrow="YENİ YAYINLAR"
      heading="Yeni yayımlanan eserler"
      searchParams={searchParams}
      sort="newest"
    />
  );
}
