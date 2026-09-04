import { CmsPageEditor } from "@/components/content/CmsPageEditor";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hata?: string | string[] }>;
};

export const dynamic = "force-dynamic";

export default async function EditCmsPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const error = Array.isArray(query.hata) ? query.hata[0] : query.hata;
  return <CmsPageEditor id={id} publishQualityBlocked={error === "kalite"} />;
}
