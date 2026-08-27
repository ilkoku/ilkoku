import type { Metadata } from "next";

import { PublicWorkFeedPage } from "@/features/public-discovery/PublicWorkFeedPage";

const title = "Son Güncellenen Eserler | İlkOku";
const description =
  "İlkOku’da yakın zamanda güncellenen keşfe açık Türkçe eser vitrinlerini ve kalıcı kitap sayfalarını keşfedin.";
const socialImage = "/opengraph-image";

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
      images: [{ url: socialImage, alt: "İlkOku son güncellenen eserler" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
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
      emptyText="Bu ölçütlerde güncellenmiş keşfe açık eser bulunamadı."
      eyebrow="SON GÜNCELLENENLER"
      heading="Son güncellenen eserler"
      searchParams={searchParams}
      sort="updated"
    />
  );
}
