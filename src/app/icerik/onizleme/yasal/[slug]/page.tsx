import Link from "next/link";
import { notFound } from "next/navigation";
import { requireCmsManager } from "@/lib/cms-access";
import { getCmsDraftState, pageDraftKey } from "@/lib/cms-drafts";
import { cmsLegalContentKey, getCmsLegalDocument } from "@/lib/cms-legal";
import { normalizeCmsLocale } from "@/lib/cms-locales";
import { prisma } from "@/lib/prisma";

type PageRow = { id: string; title: string; bodyJson: string; seoDescription: string | null; status: string };
type Stored = { description?: string; updatedLabel?: string; body?: string };
type Draft = { title?: string; description?: string; updatedLabel?: string; body?: string };

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

export default async function LegalPreview({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ dil?: string }> }) {
  const { slug } = await params;
  const query = await searchParams;
  const locale = normalizeCmsLocale(query.dil);
  await requireCmsManager(`/icerik/onizleme/yasal/${slug}`);
  const document = getCmsLegalDocument(slug);
  if (!document) notFound();

  const contentKey = cmsLegalContentKey(document.slug, locale);
  const rows = await prisma.$queryRaw<PageRow[]>`
    SELECT id, title, bodyJson, seoDescription, status
    FROM ContentPage WHERE contentKey = ${contentKey} LIMIT 1
  `;
  const page = rows[0] ?? null;
  if (!page) notFound();

  let stored: Stored = {};
  try { stored = JSON.parse(page.bodyJson) as Stored; } catch {}
  const state = page.status === "published"
    ? await getCmsDraftState<Draft>(pageDraftKey(page.id))
    : { state: "missing" as const };

  if (state.state === "corrupt") {
    return <section className="content-editor-page"><div className="content-panel" role="alert"><strong>Taslak önizlenemiyor.</strong><p>Yasal belge çalışma taslağının JSON bütünlüğü bozuk. Ham kayıt korunuyor ve canlı belge değiştirilmedi.</p><div className="content-form-actions"><Link href={`/icerik/yasal/${slug}?dil=${locale}`}>← Düzenlemeye dön</Link><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div></div></section>;
  }

  const draft = state.state === "valid" ? state.record.payload : undefined;
  const title = draft?.title ?? page.title;
  const description = draft?.description ?? stored.description ?? page.seoDescription ?? "";
  const updatedLabel = draft?.updatedLabel ?? stored.updatedLabel ?? "";
  const body = draft?.body ?? stored.body ?? "";

  return (
    <section className="content-editor-page">
      <div className="content-page-heading"><div><span>Önizleme · {locale.toUpperCase()}</span><h1>{document.title}</h1><p>Taslak görünümü CMS oturumuna özeldir; public yasal sayfayı değiştirmez.</p></div><div className="content-form-actions"><Link href={`/icerik/yasal/${slug}?dil=${locale}`}>← Düzenlemeye dön</Link></div></div>
      <div className="cms-preview-shell"><div className="cms-preview-banner"><span>Taslak Önizleme · Public Değil</span><span>{draft ? "Bekleyen çalışma taslağı" : `Kayıt durumu: ${page.status}`}</span></div><article className="cms-preview-article"><header><span className="cms-preview-eyebrow">İlkOku · Yasal</span><h1>{title}</h1>{description ? <p>{description}</p> : null}{updatedLabel ? <p><small>Son güncelleme: {updatedLabel}</small></p> : null}</header><Body body={body} /></article></div>
    </section>
  );
}
