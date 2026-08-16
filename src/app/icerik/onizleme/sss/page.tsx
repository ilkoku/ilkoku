import Link from "next/link";
import { requireCmsManager } from "@/lib/cms-access";
import { getCmsDraftsByPrefix } from "@/lib/cms-drafts";
import { cmsLocaleNamespace, normalizeCmsLocale } from "@/lib/cms-locales";
import { prisma } from "@/lib/prisma";

type FaqRow = { contentKey: string; valueJson: string; status: "draft" | "published" | "archived" };
type FaqItem = { question?: string; answer?: string; category?: string; audience?: string; position?: number };

function parse(valueJson: string): FaqItem | null {
  try {
    const value = JSON.parse(valueJson) as unknown;
    return value && typeof value === "object" && !Array.isArray(value) ? value as FaqItem : null;
  } catch {
    return null;
  }
}

export const dynamic = "force-dynamic";

export default async function FaqPreview({ searchParams }: { searchParams: Promise<{ dil?: string }> }) {
  await requireCmsManager("/icerik/onizleme/sss");
  const params = await searchParams;
  const locale = normalizeCmsLocale(params.dil);
  const namespace = cmsLocaleNamespace("faq", locale);

  const result = await Promise.all([
    prisma.$queryRaw<FaqRow[]>`
      SELECT contentKey, valueJson, status
      FROM SiteContent
      WHERE namespace = ${namespace}
        AND status <> 'archived'
    `,
    getCmsDraftsByPrefix<FaqItem>(`faq:${locale}:`),
  ]).then(
    ([rows, drafts]) => ({ rows, drafts, error: false as const }),
    () => ({ rows: [] as FaqRow[], drafts: [], error: true as const }),
  );

  const corruptLive = !result.error && result.rows.some((row) => !parse(row.valueJson));
  if (result.error || corruptLive) {
    return <section className="content-editor-page"><div className="content-panel" role="alert"><strong>SSS taslak önizlemesi oluşturulamadı.</strong><p>Canlı SSS kayıtları veya staged taslak katmanının tamamı güvenilir biçimde okunamadı. Eksik/bozuk veriyi normal içerik gibi göstermemek için önizleme durduruldu.</p><div className="content-form-actions"><Link href={`/icerik/sss?dil=${locale}`}>← Düzenlemeye dön</Link><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div></div></section>;
  }

  const draftMap = new Map(result.drafts.map((draft) => [draft.contentKey.replace(`faq:${locale}:`, ""), draft.payload]));
  const items = result.rows.map((row) => ({
    contentKey: row.contentKey,
    status: row.status,
    item: draftMap.get(row.contentKey) ?? parse(row.valueJson)!,
    staged: draftMap.has(row.contentKey),
  })).sort((a, b) => (a.item.position ?? 0) - (b.item.position ?? 0) || (a.item.question ?? "").localeCompare(b.item.question ?? "", locale === "tr" ? "tr" : "en"));

  return (
    <section className="content-editor-page">
      <div className="content-page-heading"><div><span>Önizleme · {locale.toUpperCase()}</span><h1>SSS & Yardım taslak önizlemesi</h1><p>Bekleyen SSS taslakları mevcut canlı kayıtların üzerine uygulanmış gibi gösterilir. Public Yardım Merkezi değişmez.</p></div><div className="content-form-actions"><Link href={`/icerik/sss?dil=${locale}`}>← Düzenlemeye dön</Link></div></div>
      <div className="cms-preview-shell"><div className="cms-preview-banner"><span>Taslak Önizleme · Public Değil</span><span>{result.drafts.length} bekleyen düzenleme</span></div><div className="cms-preview-faq">{items.length === 0 ? <div className="content-empty"><strong>Önizlenecek SSS yok.</strong><p>Bu boş durum yalnız tüm veri kaynakları başarıyla doğrulandığında gösterilir.</p></div> : items.map(({ contentKey, item, staged, status }) => <article className="cms-preview-faq-item" key={contentKey}><small>{item.category || "Genel"} · {staged ? "TASLAK" : status.toUpperCase()}</small><h2>{item.question || "İsimsiz soru"}</h2><p>{item.answer || "Cevap girilmemiş."}</p></article>)}</div></div>
    </section>
  );
}
