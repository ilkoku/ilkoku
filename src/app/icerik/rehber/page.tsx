import Link from "next/link";
import { prisma } from "@/lib/prisma";

type GuideRow = {
  id: string;
  slug: string;
  title: string;
  status: "draft" | "published" | "archived";
  seoTitle: string | null;
  seoDescription: string | null;
  updatedAt: Date;
};

export const dynamic = "force-dynamic";

export default async function GuideCmsPage() {
  let guides: GuideRow[] = [];
  try {
    guides = await prisma.$queryRaw<GuideRow[]>`
      SELECT id, slug, title, status, seoTitle, seoDescription, updatedAt
      FROM ContentPage
      WHERE contentKey LIKE 'guide:%'
      ORDER BY updatedAt DESC
      LIMIT 200
    `;
  } catch {
    guides = [];
  }

  const published = guides.filter((guide) => guide.status === "published").length;
  const drafts = guides.filter((guide) => guide.status === "draft").length;
  const seoMissing = guides.filter((guide) => !guide.seoTitle || !guide.seoDescription).length;

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>İçerik</span>
          <h1>Rehber & İçerikler</h1>
          <p>İlkOku adına yayınlanan editoryal rehberleri taslak, yayın ve SEO durumlarıyla yönetin.</p>
        </div>
        <div style={{ display: "flex", gap: ".7rem", flexWrap: "wrap" }}>
          <Link href="/rehber" target="_blank">Public rehberi aç ↗</Link>
          <Link href="/icerik/rehber/yeni">+ Yeni rehber</Link>
        </div>
      </div>

      <div className="content-grid" style={{ marginBottom: "1rem" }}>
        <article className="content-card"><small>TOPLAM</small><h2>{guides.length}</h2><p>CMS içindeki rehber kaydı</p></article>
        <article className="content-card"><small>YAYINDA</small><h2>{published}</h2><p>Public sitede görünen içerik</p></article>
        <article className="content-card"><small>TASLAK</small><h2>{drafts}</h2><p>Yayın bekleyen içerik</p></article>
        <article className="content-card"><small>SEO EKSİĞİ</small><h2>{seoMissing}</h2><p>Başlık veya açıklama eksik</p></article>
      </div>

      <div className="content-panel">
        {guides.length === 0 ? (
          <div className="content-empty">
            <strong>Henüz rehber içeriği yok.</strong>
            <p>“Yeni rehber” ile ilk editoryal içeriği oluşturabilirsiniz.</p>
          </div>
        ) : (
          <div className="content-list">
            <div className="content-list-row content-list-row--head">
              <span>Başlık</span><span>URL</span><span>Durum</span><span>İşlem</span>
            </div>
            {guides.map((guide) => (
              <div className="content-list-row" key={guide.id}>
                <div><strong>{guide.title}</strong><br /><small>{new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(new Date(guide.updatedAt))}</small></div>
                <span>{guide.slug}</span>
                <span>{guide.status === "published" ? "Yayında" : guide.status === "archived" ? "Arşiv" : "Taslak"}</span>
                <Link href={`/icerik/rehber/${guide.id}`}>Düzenle →</Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
