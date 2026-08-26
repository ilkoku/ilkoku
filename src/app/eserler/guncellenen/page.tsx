import type { Metadata } from "next";

import { PublicWorkFeedPage } from "@/features/public-discovery/PublicWorkFeedPage";

const title = "Son Güncellenen Eserler | İlkOku";
const description =
  "İlkOku’da yakın zamanda güncellenen herkese açık Türkçe eserleri ve kalıcı kitap sayfalarını keşfedin.";

type UpdatedWorksSearchParams = {
  arama?: string;
  sayfa?: string;
  tur?: string;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<UpdatedWorksSearchParams>;
}): Promise<Metadata> {
  const query = await searchParams;

  return {
    title,
    description,
    alternates: {
      canonical: "/eserler/guncellenen",
    },
    robots: {
      index: !query.sayfa && !query.arama && !query.tur,
      follow: true,
    },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url: "/eserler/guncellenen",
      title,
      description,
    },
  };
}

export default function UpdatedPublicWorksPage({
  searchParams,
}: {
  searchParams: Promise<UpdatedWorksSearchParams>;
}) {
  return (
    <PublicWorkFeedPage
      basePath="/eserler/guncellenen"
      description={description}
      emptyText="Bu ölçütlerde güncellenmiş herkese açık eser bulunamadı."
      eyebrow="SON GÜNCELLENENLER"
      heading="Son güncellenen eserler"
      searchParams={searchParams}
      sort="updated"
    />
  );
}
