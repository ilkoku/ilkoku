import Link from "next/link";
import { getCmsDraftsByPrefix } from "@/lib/cms-drafts";
import { cmsLocaleNamespace, normalizeCmsLocale } from "@/lib/cms-locales";
import { prisma } from "@/lib/prisma";

type FaqRow = { contentKey: string; valueJson: string; status: "draft" | "published" | "archived" };
type FaqItem = { question?: string; answer?: string; category?: string; audience?: string; position?: number };

function parse(valueJson: string): FaqItem {
  try { return JSON.parse(valueJson) as FaqItem; } catch { return {}; }
}

export const dynamic = "force-dynamic";

export default async function FaqPreview({ searchParams }: { searchParams: Promise<{ dil?: string }> }) {
  const params = await searchParams;
  const locale = normalizeCmsLocale(params.dil);
  const namespace = cmsLocaleNamespace("faq", locale);
  let rows: FaqRow[] = [];
  try {
    rows = await prisma.$queryRaw<FaqRow[]>`
      SELECT contentKey, valueJson, status
      FROM SiteContent
      WHERE namespace = ${namespace}
        AND status <> 'archived'
    `;
  } catch {}

  const drafts = await getCmsDraftsByPrefix<FaqItem>(`faq:${locale}:`).catch(() => []);
  const draftMap = new Map(drafts.map((draft) => [draft.contentKey.replace(`faq:${locale}:`, ""), draft.payload]));
  const items = rows.map((row) => ({
    contentKey: row.contentKey,
    status: row.status,
    item: draftMap.get(row.contentKey) ?? parse(row.valueJson),
    staged: draftMap.has(row.contentKey),
  })).sort((a, b) => (a.item.position ?? 0) - (b.item.position ?? 0) || (a.item.question ?? "").localeCompare(b.item.question ?? "", locale === "tr" ? "tr" : "en"));

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Önizleme · {locale.toUpperCase()}</span><h1>SSS & Yardım taslak önizlemesi</h1><p>Bekleyen SSS taslakları mevcut canlı kayıtların üzerine uygulanmış gibi gösterilir. Public Yardım Merkezi değişmez.</p></div>
        <div className="content-form-actions"><Link href={`/icerik/sss?dil=${locale}`}>← Düzenlemeye dön</Link></div>
      </div>
      <div className="cms-preview-shell">
        <div className="cms-preview-banner"><span>Taslak Önizleme · Public Değil</span><span>{drafts.length} bekleyen düzenleme</span></div>
        <div className="cms-preview-faq">
          {items.length === 0 ? <div className="content-empty"><strong>Önizlenecek SSS yok.</strong><p>Önce CMS içinde bir SSS taslağı oluşturun.</p></div> : items.map(({ contentKey, item, staged, status }) => (
            <article className="cms-preview-faq-item" key={contentKey}>
              <small>{item.category || "Genel"} · {staged ? "TASLAK" : status.toUpperCase()}</small>
              <h2>{item.question || "İsimsiz soru"}</h2>
              <p>{item.answer || "Cevap girilmemiş."}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
