import { CmsDocumentEditor } from "@/components/content/CmsDocumentEditor";
import { normalizeCmsLocale } from "@/lib/cms-locales";

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ dil?: string }>;
};

export default async function Page({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const query = await searchParams;
  const locale = normalizeCmsLocale(query.dil);
  return <CmsDocumentEditor slug={slug} locale={locale} />;
}
