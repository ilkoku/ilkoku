import { CmsGuideEditor } from "@/components/content/CmsGuideEditor";
import { normalizeCmsLocale } from "@/lib/cms-locales";

type PageProps = {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ dil?: string }>;
};

export const dynamic = "force-dynamic";

export default async function EditGuidePage({ params, searchParams }: PageProps) {
  const { id } = await params;
  const query = await searchParams;
  const locale = normalizeCmsLocale(query.dil);
  return <CmsGuideEditor id={id} locale={locale} />;
}
