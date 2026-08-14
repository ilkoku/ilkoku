import { CmsDocumentIndex } from "@/components/content/CmsDocumentIndex";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import { normalizeCmsLocale } from "@/lib/cms-locales";

function parseCount(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ dil?: string; devralindi?: string; atlandi?: string }>;
}) {
  const params = await searchParams;
  const locale = normalizeCmsLocale(params.dil);
  const localeEnabled = await isCmsLocaleEnabled(locale);
  return (
    <CmsDocumentIndex
      locale={locale}
      localeEnabled={localeEnabled}
      adopted={parseCount(params.devralindi)}
      skipped={parseCount(params.atlandi)}
    />
  );
}
