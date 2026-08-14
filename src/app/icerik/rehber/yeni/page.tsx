import { CmsGuideEditor } from "@/components/content/CmsGuideEditor";
import { normalizeCmsLocale } from "@/lib/cms-locales";

export const dynamic = "force-dynamic";

export default async function NewGuidePage({ searchParams }: { searchParams: Promise<{ dil?: string }> }) {
  const params = await searchParams;
  const locale = normalizeCmsLocale(params.dil);
  return <CmsGuideEditor locale={locale} />;
}
