import { redirect } from "next/navigation";
import { CmsPageEditor } from "@/components/content/CmsPageEditor";
import { requireCmsManager } from "@/lib/cms-access";
import { parseCmsPageBody } from "@/lib/cms-pages";
import { prisma } from "@/lib/prisma";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ hata?: string | string[] }>;
};

type PageRow = { bodyJson: string };

export const dynamic = "force-dynamic";

export default async function EditCmsPage({ params, searchParams }: PageProps) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  await requireCmsManager(`/icerik/sayfalar/${id}`);
  const rows = await prisma.$queryRaw<PageRow[]>`
    SELECT bodyJson FROM ContentPage
    WHERE id = ${id} AND contentKey LIKE 'page:tr:%'
    LIMIT 1
  `;
  if (rows[0] && parseCmsPageBody(rows[0].bodyJson).blocks.length > 0) redirect(`/icerik/sayfalar/${id}/tasarla`);
  const error = Array.isArray(query.hata) ? query.hata[0] : query.hata;
  return <CmsPageEditor id={id} publishQualityBlocked={error === "kalite"} />;
}
