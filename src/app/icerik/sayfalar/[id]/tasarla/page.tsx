import Link from "next/link";
import { notFound } from "next/navigation";
import { CmsVisualPageBuilder, type CmsVisualBuilderMediaOption } from "@/components/content/CmsVisualPageBuilder";
import { requireCmsManager } from "@/lib/cms-access";
import { normalizeCmsPageBlocks, type CmsPageBlock } from "@/lib/cms-page-blocks";
import { getCmsDraftState, pageDraftKey } from "@/lib/cms-drafts";
import { parseCmsPageBody } from "@/lib/cms-pages";
import { prisma } from "@/lib/prisma";
import { getPublicSiteIdentity } from "@/lib/site-identity";

type PageRow = { id: string; slug: string; title: string; status: "draft" | "published" | "archived"; bodyJson: string; seoTitle: string | null; seoDescription: string | null; noIndex: boolean };
type MediaRow = { valueJson: string };
type Draft = { title?: string; summary?: string; body?: string; blocks?: unknown; seoTitle?: string; seoDescription?: string; noIndex?: boolean };

export const dynamic = "force-dynamic";

function parseMedia(row: MediaRow): CmsVisualBuilderMediaOption | null {
  try {
    const value = JSON.parse(row.valueJson) as Record<string, unknown>;
    if (value.kind !== "image" || typeof value.url !== "string" || !value.url.startsWith("/api/media/")) return null;
    return { title: typeof value.title === "string" && value.title.trim() ? value.title.trim() : "CMS görseli", url: value.url, altText: typeof value.altText === "string" ? value.altText : "" };
  } catch { return null; }
}

function draftBlocks(value: unknown, fallback: CmsPageBlock[]) {
  if (!Array.isArray(value)) return fallback;
  try { return normalizeCmsPageBlocks(value); } catch { return fallback; }
}

export default async function VisualCmsPageEditor({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ hata?: string; kayit?: string; taslak?: string }> }) {
  const [{ id }, query] = await Promise.all([params, searchParams]);
  const access = await requireCmsManager(`/icerik/sayfalar/${id}/tasarla`);
  const rows = await prisma.$queryRaw<PageRow[]>`
    SELECT id, slug, title, status, bodyJson, seoTitle, seoDescription, noIndex
    FROM ContentPage
    WHERE id = ${id} AND contentKey LIKE 'page:tr:%'
    LIMIT 1
  `;
  const page = rows[0];
  if (!page) notFound();

  const stored = parseCmsPageBody(page.bodyJson);
  const stagedState = page.status === "published" ? await getCmsDraftState<Draft>(pageDraftKey(page.id)) : { state: "missing" as const };
  if (stagedState.state === "corrupt") {
    return <section className="content-editor-page"><div className="content-panel cms-editor-notice is-danger" role="alert"><strong>Görsel taslak bütünlüğü bozuk.</strong><p>Ham taslak korunuyor; görsel oluşturucu kayıt üzerine yazmıyor.</p><div className="content-form-actions"><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/sayfalar">← Sayfa listesi</Link></div></div></section>;
  }
  const draft = stagedState.state === "valid" ? stagedState.record.payload : undefined;
  const blocks = draftBlocks(draft?.blocks, stored.blocks);
  if (blocks.length === 0) notFound();

  const [mediaRows, identity] = await Promise.all([
    prisma.$queryRaw<MediaRow[]>`SELECT valueJson FROM SiteContent WHERE namespace = 'media' AND status = 'published' ORDER BY updatedAt DESC LIMIT 300`.catch(() => [] as MediaRow[]),
    getPublicSiteIdentity(),
  ]);
  const media = mediaRows.map(parseMedia).filter((item): item is CmsVisualBuilderMediaOption => Boolean(item));

  return (
    <section className="content-editor-page" style={{ maxWidth: "none" }}>
      <div className="content-page-heading"><div><span>Kurumsal Sayfa · Görsel Oluşturucu</span><h1>{draft?.title ?? page.title}</h1><p>Blokları sürükleyin, içerikleri düzenleyin ve aynı ekranda canlı sonucu izleyin. Header/footer ve site kimliği ortak sistemden gelir.</p></div><aside className="cms-editor-status-card" data-tone={page.status === "published" ? "success" : "info"}><span className="cms-editor-status-card__label">Durum</span><strong>{page.status === "published" ? (draft ? "Yayında · taslak düzenleniyor" : "Yayında") : page.status === "archived" ? "Arşiv" : "Taslak"}</strong><div className="cms-editor-status-card__meta"><span className="cms-editor-chip is-positive">{blocks.length} blok</span><span className={`cms-editor-chip ${access.canPublish ? "is-positive" : "is-warning"}`}>{access.canPublish ? "Yayın yetkisi" : "Taslak yetkisi"}</span></div></aside></div>
      <nav className="cms-editor-toolbar"><div className="cms-editor-toolbar__cluster"><Link href="/icerik/sayfalar">← Sayfa listesi</Link><Link href={`/icerik/onizleme/sayfa/${page.id}`}>Tam ekran önizleme ↗</Link></div><div className="cms-editor-toolbar__cluster">{page.status === "published" ? <Link href={page.slug} target="_blank">Canlı sayfa ↗</Link> : null}<Link href="/icerik/medya">Medya</Link><Link href="/icerik/seo">SEO</Link></div></nav>
      {query.hata === "kalite" ? <div className="content-panel cms-editor-notice is-danger"><strong>Yayın kalite kapısı geçilemedi.</strong><p>Canlı sürüm değiştirilmedi. İçerik/özet/SEO eksiklerini tamamlayıp yeniden yayınlayın.</p></div> : null}
      {query.hata === "blok" ? <div className="content-panel cms-editor-notice is-danger"><strong>Blok verisi kaydedilemedi.</strong><p>Geçersiz blok, bağlantı veya Medya kütüphanesinde yayınlanmamış bir görsel bulundu.</p></div> : null}
      {query.kayit || query.taslak ? <div className="content-panel cms-editor-notice is-info"><strong>{query.taslak ? "Çalışma taslağı kaydedildi." : "Sayfa kaydedildi."}</strong><p>{page.status === "published" && query.taslak ? "Canlı sürüm korunuyor; bu çalışma açıkça yayınlanana kadar ziyaretçilere gösterilmez." : "Görsel sayfa verisi ve sürüm geçmişi güncellendi."}</p></div> : null}
      <div style={{ marginTop: "1rem" }}><CmsVisualPageBuilder id={page.id} slug={page.slug.replace(/^\//, "")} title={draft?.title ?? page.title} summary={draft?.summary ?? stored.summary} blocks={blocks} seoTitle={draft?.seoTitle ?? page.seoTitle ?? ""} seoDescription={draft?.seoDescription ?? page.seoDescription ?? ""} noIndex={draft?.noIndex ?? page.noIndex} canPublish={access.canPublish} defaultEyebrow={identity.defaultEyebrow} media={media} /></div>
    </section>
  );
}
