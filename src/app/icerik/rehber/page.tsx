import Link from "next/link";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import { normalizeCmsLocale } from "@/lib/cms-locales";
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

export default async function GuideCmsPage({ searchParams }: { searchParams: Promise<{ dil?: string }> }) {
  const params = await searchParams;
  const locale = normalizeCmsLocale(params.dil);
  const isEn = locale === "en";
  let localeEnabled = false;
  let guides: GuideRow[] = [];
  let dataError = false;

  try {
    [localeEnabled, guides] = await Promise.all([
      isCmsLocaleEnabled(locale),
      locale === "en"
        ? prisma.$queryRaw<GuideRow[]>`
            SELECT id, slug, title, status, seoTitle, seoDescription, updatedAt
            FROM ContentPage
            WHERE contentKey LIKE 'guide:en:%'
            ORDER BY updatedAt DESC
            LIMIT 200
          `
        : prisma.$queryRaw<GuideRow[]>`
            SELECT id, slug, title, status, seoTitle, seoDescription, updatedAt
            FROM ContentPage
            WHERE contentKey LIKE 'guide:%'
              AND contentKey NOT LIKE 'guide:en:%'
            ORDER BY updatedAt DESC
            LIMIT 200
          `,
    ]);
  } catch {
    dataError = true;
  }

  const published = guides.filter((guide) => guide.status === "published").length;
  const drafts = guides.filter((guide) => guide.status === "draft").length;
  const seoMissing = guides.filter((guide) => !guide.seoTitle || !guide.seoDescription).length;

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>İçerik · {locale.toUpperCase()}</span>
          <h1>Rehber & İçerikler</h1>
          <p>{isEn ? "İngilizce rehberleri Türkçe içeriklerden bağımsız taslaklar olarak hazırlayın." : "İlkOku adına yayınlanan editoryal rehberleri taslak, yayın ve SEO durumlarıyla yönetin."}</p>
        </div>
        {!dataError ? (
          <div style={{ display: "flex", gap: ".7rem", flexWrap: "wrap" }}>
            {!isEn ? <Link href="/rehber" target="_blank">Public rehberi aç ↗</Link> : null}
            <Link href={`/icerik/rehber/yeni?dil=${locale}`}>+ Yeni rehber</Link>
          </div>
        ) : null}
      </div>

      <div className="content-form-actions" style={{ marginBottom: "1rem", flexWrap: "wrap" }}>
        <Link href="/icerik/rehber?dil=tr">Türkçe</Link>
        <Link href="/icerik/rehber?dil=en">English</Link>
        {isEn && !dataError ? <Link href="/icerik/diller">Dil Yönetimi</Link> : null}
      </div>

      {dataError ? (
        <div className="content-panel" role="alert">
          <strong>Rehber kayıtları veya dil durumu okunamadı.</strong>
          <p>Gerçek kayıtları “0 rehber” kabul edip yeni içerik ya da yanlış yayın aksiyonu önermemek için sayaç, liste ve oluşturma işlemleri güvenli biçimde durduruldu.</p>
          <div className="content-form-actions" style={{ flexWrap: "wrap" }}>
            <Link href="/icerik/saglik">Sistem Sağlığı →</Link>
            <Link href="/icerik/hazirlik">Yayın Hazırlığı →</Link>
            <Link href={`/icerik/rehber?dil=${locale}`}>Tekrar dene ↻</Link>
          </div>
        </div>
      ) : (
        <>
          {isEn && !localeEnabled ? (
            <div className="content-panel" style={{ marginBottom: "1rem" }}>
              <strong>İngilizce public yayın kapalı.</strong>
              <p>EN rehberleri hazırlanabilir ve sürümlenebilir; İngilizce dili etkinleştirilmeden yayınlanamaz.</p>
            </div>
          ) : null}

          <div className="content-grid" style={{ marginBottom: "1rem" }}>
            <article className="content-card"><small>TOPLAM</small><h2>{guides.length}</h2><p>{locale.toUpperCase()} rehber kaydı</p></article>
            <article className="content-card"><small>YAYINDA</small><h2>{published}</h2><p>{isEn && !localeEnabled ? "Dil kapalı; public erişim yok" : "Public sitede görünen içerik"}</p></article>
            <article className="content-card"><small>TASLAK</small><h2>{drafts}</h2><p>Yayın bekleyen içerik</p></article>
            <article className="content-card"><small>SEO EKSİĞİ</small><h2>{seoMissing}</h2><p>Başlık veya açıklama eksik</p></article>
          </div>

          <div className="content-panel">
            {guides.length === 0 ? (
              <div className="content-empty">
                <strong>Henüz {locale.toUpperCase()} rehber içeriği yok.</strong>
                <p>Bu boş durum yalnız veri kaynağı başarıyla okunduğunda gösterilir. “Yeni rehber” ile ilk içeriği oluşturabilirsiniz.</p>
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
                    <Link href={`/icerik/rehber/${guide.id}?dil=${locale}`}>Düzenle →</Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </section>
  );
}
