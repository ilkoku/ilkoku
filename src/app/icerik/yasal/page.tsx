import { CmsDocumentIndex } from "@/components/content/CmsDocumentIndex";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import { normalizeCmsLocale } from "@/lib/cms-locales";

export default async function Page({ searchParams }: { searchParams: Promise<{ dil?: string }> }) {
  const params = await searchParams;
  const locale = normalizeCmsLocale(params.dil);
  const localeEnabled = await isCmsLocaleEnabled(locale);
  return <CmsDocumentIndex locale={locale} localeEnabled={localeEnabled} />;
}
