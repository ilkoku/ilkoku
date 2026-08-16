import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCmsManager } from "@/lib/cms-access";
import { getCmsDraftState, pageDraftKey } from "@/lib/cms-drafts";
import { cmsGuideLocaleFromContentKey, parseGuideBody } from "@/lib/cms-guides";
import { prisma } from "@/lib/prisma";

type GuideRow = { id: string; contentKey: string; title: string; bodyJson: string; status: string; updatedAt: Date };
type Draft = { title?: string; summary?: string; body?: string };

function Body({ body }: { body: string }) {
  const blocks = body.split(/\r?\n\r?\n/).map((block) => block.trim()).filter(Boolean);
  return <div className="cms-preview-body">{blocks.map((block, index) => {
    if (block.startsWith("## ")) return <h2 key={`${index}-${block}`}>{block.slice(3)}</h2>;
    const lines = block.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
    if (lines.length && lines.every((line) => line.startsWith("- "))) return <ul key={`${index}-${block.slice(0, 20)}`}>{lines.map((line) => <li key={line}>{line.slice(2)}</li>)}</ul>;
    return <p key={`${index}-${block.slice(0, 24)}`}>{block}</p>;
  })}</div>;
}

export const dynamic = "force-dynamic";

export default async function GuidePreview({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  await requireCmsManager(`/icerik/onizleme/rehber/${id}`);
  const rows = await prisma.$queryRaw<GuideRow[]>`
    SELECT id, contentKey, title, bodyJson, status, updatedAt
    FROM ContentPage
    WHERE id = ${id} AND contentKey LIKE 'guide:%'
    LIMIT 1
  `;
  const guide = rows[0];
  if (!guide) notFound();

  const locale = cmsGuideLocaleFromContentKey(guide.contentKey);
  const stored = parseGuideBody(guide.bodyJson);
  const state = guide.status === "published"
    ? await getCmsDraftState<Draft>(pageDraftKey(guide.id))
    : { state: "missing" as const };

  if (state.state === "corrupt") {
    return <section className="content-editor-page"><div className="content-panel" role="alert"><strong>Taslak önizlenemiyor.</strong><p>Rehber çalışma taslağının JSON bütünlüğü bozuk. Ham kayıt korunuyor ve canlı rehber değiştirilmedi.</p><div className="content-form-actions"><Link href={`/icerik/rehber/${guide.id}?dil=${locale}`}>← Düzenlemeye dön</Link><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div></div></section>;
  }

  const draft = state.state === "valid" ? state.record.payload : undefined;
  const title = draft?.title ?? guide.title;
  const summary = draft?.summary ?? stored.summary ?? "";
  const body = draft?.body ?? stored.body ?? "";

  return (
    <section className="content-editor-page">
      <div className="content-page-heading"><div><span>Önizleme · {locale.toUpperCase()}</span><h1>{title}</h1><p>Rehber taslağı yalnız CMS içinde gösterilir. Public rehber son yayınlanmış sürümde kalır.</p></div><div className="content-form-actions"><Link href={`/icerik/rehber/${guide.id}?dil=${locale}`}>← Düzenlemeye dön</Link></div></div>
      <div className="cms-preview-shell"><div className="cms-preview-banner"><span>Taslak Önizleme · Public Değil</span><span>{draft ? "Bekleyen çalışma taslağı" : `Kayıt durumu: ${guide.status}`}</span></div><article className="cms-preview-article"><header><span className="cms-preview-eyebrow">İlkOku Rehber</span><h1>{title}</h1>{summary ? <p>{summary}</p> : null}</header><Body body={body} /></article></div>
    </section>
  );
}
