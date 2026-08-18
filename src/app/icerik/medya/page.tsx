import Image from "next/image";
import Link from "next/link";
import { CopyMediaUrlButton } from "@/components/content/CopyMediaUrlButton";
import { archiveMediaAssetAction, createMediaAssetAction } from "@/features/cms/media-actions";
import { requireCmsManager } from "@/lib/cms-access";
import { parseCmsMediaAssetMetadata } from "@/lib/cms-media";
import { getCmsMediaReferenceMap } from "@/lib/cms-media-references";
import { prisma } from "@/lib/prisma";

type MediaRow = {
  contentKey: string;
  valueJson: string;
  status: "draft" | "published" | "archived";
  updatedAt: Date;
};

type PageProps = { searchParams?: Promise<Record<string, string | string[] | undefined>> };

type MediaKindFilter = "all" | "image" | "document" | "icon" | "other";
type UsageFilter = "all" | "used" | "unused";

export const dynamic = "force-dynamic";

function formatBytes(input?: number) {
  const bytes = Number(input ?? 0);
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function queryString(value: string | string[] | undefined) {
  return typeof value === "string" ? value.trim() : "";
}

function kindFilter(value: string): MediaKindFilter {
  return ["image", "document", "icon", "other"].includes(value) ? value as MediaKindFilter : "all";
}

function usageFilter(value: string): UsageFilter {
  return value === "used" || value === "unused" ? value : "all";
}

const uploadErrors: Record<string, string> = {
  form: "Yükleme formu okunamadı.",
  dosya: "Lütfen bir dosya seçin.",
  boyut: "Dosya 3 MB sınırını aşıyor.",
  tip: "Bu dosya türü desteklenmiyor veya dosya imzası geçersiz.",
  okuma: "Dosya okunamadı.",
  kayit: "Dosya kaydedilemedi. Lütfen tekrar deneyin.",
  kullanimda: "Bu medya yayındaki CMS içeriğinde kullanılıyor. Önce aşağıdaki gerçek kullanım yerlerinden kaldırın veya başka bir medya ile değiştirin.",
  metadata: "Medya metadata kaydı bozuk veya geçerli URL içermiyor. Canlı referans güvenilir biçimde kontrol edilemediği için arşivleme durduruldu.",
};

export default async function MediaPage({ searchParams }: PageProps) {
  const access = await requireCmsManager("/icerik/medya");
  const query = (await searchParams) ?? {};
  const errorKey = queryString(query.hata);
  const uploaded = queryString(query.yuklendi) === "1";
  const search = queryString(query.q).slice(0, 120);
  const kind = kindFilter(queryString(query.tur));
  const usage = usageFilter(queryString(query.kullanim));

  let rows: MediaRow[] | null = null;
  try {
    rows = await prisma.$queryRaw<MediaRow[]>`
      SELECT contentKey, valueJson, status, updatedAt
      FROM SiteContent
      WHERE namespace = 'media' AND status <> 'archived'
      ORDER BY updatedAt DESC
      LIMIT 500
    `;
  } catch {
    rows = null;
  }

  if (!rows) {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading"><div><span>İçerik</span><h1>Medya Kütüphanesi</h1><p>Medya envanteri doğrulanamadığında yükleme veya arşivleme kararı verilmez.</p></div></div>
        <div className="content-panel" role="alert"><strong>Medya kayıtları okunamadı.</strong><p>Bu durum “medya kaydı yok” anlamına gelmez. Envanter görülmeden yeni kayıt veya arşivleme işlemleri durduruldu.</p><div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/medya">Tekrar dene</Link></div></div>
      </section>
    );
  }

  const prepared = rows.map((row) => ({ row, asset: parseCmsMediaAssetMetadata(row.valueJson) }));
  const invalid = prepared.filter((item) => !item.asset);
  const assets = prepared.flatMap(({ row, asset }) => asset ? [{ ...row, asset }] : []);
  const referenceMap = await getCmsMediaReferenceMap(assets.map((item) => item.asset.url)).catch(() => null);
  const referencesAvailable = Boolean(referenceMap);
  const usedCount = referenceMap ? assets.filter((item) => (referenceMap.get(item.asset.url)?.length ?? 0) > 0).length : 0;
  const unusedCount = referenceMap ? assets.length - usedCount : 0;

  const normalizedSearch = search.toLocaleLowerCase("tr-TR");
  const filteredAssets = assets.filter((item) => {
    const actualKind = item.asset.kind || "other";
    if (kind !== "all" && actualKind !== kind) return false;
    const refs = referenceMap?.get(item.asset.url) ?? [];
    if (referencesAvailable && usage === "used" && refs.length === 0) return false;
    if (referencesAvailable && usage === "unused" && refs.length > 0) return false;
    if (!normalizedSearch) return true;
    const haystack = [item.asset.title, item.asset.filename, item.asset.url, item.asset.usage, item.asset.altText, item.asset.notes, ...refs.map((ref) => `${ref.label} ${ref.detail}`)]
      .filter(Boolean)
      .join(" ")
      .toLocaleLowerCase("tr-TR");
    return haystack.includes(normalizedSearch);
  });

  const filterActive = Boolean(search || kind !== "all" || usage !== "all");

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>İçerik</span><h1>Medya Kütüphanesi</h1><p>Görsel ve dokümanları yükleyin; gerçek kullanım yerlerini, alt metni, dosya bilgisini ve güvenli arşiv durumunu tek merkezden görün.</p></div>
        <div className="content-profile"><strong>{assets.length} aktif medya</strong><small>{invalid.length} bozuk metadata · {access.canPublish ? "Yönet + güvenli arşiv" : "Yönetim yetkisi"}</small></div>
      </div>

      {!access.canPublish ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>Medya arşivleme yayın yetkisi gerektirir.</strong><p>Yeni dosya yükleyebilir ve kütüphaneyi yönetebilirsiniz. Aktif bir medya URL&apos;sini kapatmak public içerikleri etkileyebileceği için arşivleme yalnız yayın yetkili kullanıcıya açıktır.</p></div> : null}
      {uploaded ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>Dosya yüklendi.</strong> Kalıcı medya URL&apos;si aşağıdaki kütüphaneye eklendi.</div> : null}
      {errorKey && uploadErrors[errorKey] ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>İşlem tamamlanamadı:</strong> {uploadErrors[errorKey]}</div> : null}
      {invalid.length > 0 ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>{invalid.length} aktif medya metadata kaydı bozuk.</strong><p>Bu kayıtlar normal arşiv akışına sokulmaz. URL bilinmeden canlı referans kontrolü güvenilir değildir.</p><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div> : null}
      {!referencesAvailable ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>Medya kullanım haritası doğrulanamadı.</strong><p>“Kullanımda değil” sonucu üretilmedi. Referans görünürlüğü geri gelene kadar tüm arşivleme aksiyonları fail-closed olarak kilitlendi.</p><Link href="/icerik/saglik">Sistem Sağlığı →</Link></div> : null}

      <div className="content-metric-grid">
        <article className="content-metric-card"><span>Aktif medya</span><strong>{assets.length}</strong><small>geçerli metadata</small></article>
        <article className="content-metric-card"><span>Kullanımda</span><strong>{referencesAvailable ? usedCount : "—"}</strong><small>yayındaki içerikte referanslı</small></article>
        <article className="content-metric-card"><span>Boşta</span><strong>{referencesAvailable ? unusedCount : "—"}</strong><small>arşiv adayı</small></article>
        <article className="content-metric-card"><span>Bozuk</span><strong>{invalid.length}</strong><small>teşhis gerekiyor</small></article>
      </div>

      <div className="content-panel" style={{ marginTop: "1rem" }}>
        <div className="content-section-heading"><div><span>01</span><h2>Ara & filtrele</h2></div><p>Dosya adı, başlık, kullanım alanı, URL ve gerçek referanslarda arar.</p></div>
        <form method="get" action="/icerik/medya" className="content-form">
          <div className="content-form-grid">
            <label><span>Arama</span><input name="q" defaultValue={search} maxLength={120} placeholder="Örn. hero, logo, rehber..." /></label>
            <label><span>Tür</span><select name="tur" defaultValue={kind}><option value="all">Tüm türler</option><option value="image">Görsel</option><option value="document">Doküman</option><option value="icon">İkon</option><option value="other">Diğer</option></select></label>
            <label><span>Kullanım</span><select name="kullanim" defaultValue={usage} disabled={!referencesAvailable}><option value="all">Tümü</option><option value="used">Kullanımda</option><option value="unused">Boşta</option></select></label>
          </div>
          <div className="content-form-actions" style={{ flexWrap: "wrap" }}><button type="submit">Filtrele</button>{filterActive ? <Link href="/icerik/medya">Filtreleri Temizle</Link> : null}</div>
        </form>
      </div>

      <details className="content-panel" style={{ marginTop: "1rem" }}>
        <summary><strong>02 · Yeni dosya yükle</strong></summary>
        <p className="content-form-help">JPEG, PNG, WebP, GIF, AVIF, ICO veya PDF · en fazla 3 MB. SVG ve çalıştırılabilir dosyalar kabul edilmez.</p>
        <form action="/api/cms-media-upload" method="post" encType="multipart/form-data" className="content-form">
          <label><span>Dosya</span><input name="file" type="file" required accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/x-icon,image/vnd.microsoft.icon,application/pdf" /></label>
          <div className="content-grid"><label><span>Medya başlığı</span><input name="title" maxLength={180} placeholder="Boş bırakılırsa dosya adı kullanılır" /></label><label><span>Kullanım alanı</span><input name="usage" maxLength={180} placeholder="Örn. Ana Sayfa / Hero" /></label></div>
          <label><span>Alt metin</span><input name="altText" maxLength={300} placeholder="Görsel erişilebilirlik açıklaması" /></label><label><span>Not</span><textarea name="notes" maxLength={800} placeholder="Kaynak, lisans veya kullanım notu" /></label>
          <div className="content-form-actions"><button type="submit">Dosyayı Yükle</button></div>
        </form>
      </details>

      <details className="content-panel" style={{ marginTop: "1rem" }}><summary><strong>Mevcut public dosya yolunu kütüphaneye kaydet</strong></summary><form action={createMediaAssetAction} className="content-form" style={{ marginTop: "1rem" }}><div className="content-grid"><label><span>Medya başlığı</span><input name="title" required maxLength={180} placeholder="Örn. Ana sayfa hero görseli" /></label><label><span>Dosya yolu</span><input name="url" required maxLength={500} placeholder="/landing/ilkoku-hero.webp" /></label><label><span>Tür</span><select name="kind" defaultValue="image"><option value="image">Görsel</option><option value="document">Doküman</option><option value="icon">İkon</option><option value="other">Diğer</option></select></label><label><span>Kullanım alanı</span><input name="usage" maxLength={180} placeholder="Örn. Ana Sayfa / Hero" /></label></div><label><span>Alt metin</span><input name="altText" maxLength={300} /></label><label><span>Not</span><textarea name="notes" maxLength={800} /></label><div className="content-form-actions"><button type="submit">Dosya Yolunu Kaydet</button></div></form></details>

      <div className="content-panel" style={{ marginTop: "1rem" }}>
        <div className="content-page-heading" style={{ marginBottom: "1rem" }}><div><span>03 · Kütüphane</span><h2>{filterActive ? "Filtrelenen medya" : "Aktif medya"}</h2><p>{filteredAssets.length} kayıt gösteriliyor.</p></div></div>
        {filteredAssets.length === 0 && invalid.length === 0 ? <div className="content-empty"><strong>{filterActive ? "Filtreye uyan medya bulunamadı." : "Medya kaydı henüz yok."}</strong><p>{filterActive ? "Aramayı veya filtreleri değiştirin." : "İlk dosyayı yukarıdan yüklediğinizde burada önizlemesiyle birlikte görünecek."}</p></div> : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem" }}>
            {!filterActive ? invalid.map(({ row }) => <article className="content-panel" key={`invalid-${row.contentKey}`} style={{ margin: 0 }}><strong>Bozuk medya metadata</strong><p><small>{row.contentKey}</small></p><p>Geçerli URL çıkarılamıyor. Ham kayıt korunuyor; arşivleme kilitli.</p><small>Güncelleme: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(row.updatedAt))}</small></article>) : null}
            {filteredAssets.map(({ contentKey, asset, updatedAt }) => {
              const isImage = asset.kind === "image" || asset.kind === "icon";
              const refs = referenceMap?.get(asset.url) ?? [];
              const safeToArchive = referencesAvailable && refs.length === 0;
              return (
                <article className="content-panel" key={contentKey} style={{ margin: 0, display: "flex", flexDirection: "column", gap: ".8rem" }}>
                  <div style={{ minHeight: 150, display: "grid", placeItems: "center", borderRadius: 12, overflow: "hidden", border: "1px solid rgba(255,255,255,.08)" }}>{isImage ? <Image src={asset.url} alt={asset.altText || asset.title || "İlkOku medya"} width={640} height={360} unoptimized style={{ width: "100%", height: 150, objectFit: "contain" }} /> : <div style={{ textAlign: "center", padding: "2rem 1rem" }}><strong>{asset.kind === "document" ? "PDF / Doküman" : "Dosya"}</strong><br /><small>{asset.filename || asset.url}</small></div>}</div>
                  <div><strong>{asset.title || "İsimsiz medya"}</strong><p style={{ margin: ".35rem 0 0" }}><small>{asset.filename || asset.url}</small></p></div>
                  <div style={{ display: "grid", gap: ".3rem" }}><small>Tür: {asset.mimeType || asset.kind || "—"}</small><small>Boyut: {formatBytes(asset.sizeBytes)}</small><small>Tanımlı kullanım: {asset.usage || "Belirtilmedi"}</small><small>Depolama: {asset.storage === "database" ? "Veritabanı" : "Public dosya yolu"}</small><small>Güncelleme: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(updatedAt))}</small>{asset.altText ? <small>Alt: {asset.altText}</small> : null}</div>
                  <div className="content-panel" style={{ margin: 0 }}>
                    <strong>{referencesAvailable ? refs.length > 0 ? `${refs.length} gerçek kullanım` : "Yayındaki içerikte kullanılmıyor" : "Kullanım bilgisi doğrulanamadı"}</strong>
                    {refs.length > 0 ? <div style={{ display: "grid", gap: ".45rem", marginTop: ".6rem" }}>{refs.slice(0, 8).map((ref, index) => <div key={`${ref.editHref}-${index}`}><Link href={ref.editHref}>{ref.label} →</Link><br /><small>{ref.detail}</small></div>)}</div> : null}
                    {refs.length > 8 ? <small>+ {refs.length - 8} ek kullanım</small> : null}
                  </div>
                  <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}><CopyMediaUrlButton url={asset.url} /><Link href={asset.url} target="_blank">Dosyayı aç</Link></div>
                  {access.canPublish && safeToArchive ? <form action={archiveMediaAssetAction} style={{ marginTop: "auto" }}><input type="hidden" name="contentKey" value={contentKey} /><button type="submit">Arşivle</button></form> : <small style={{ marginTop: "auto" }}>{!access.canPublish ? "Arşivleme için yayın yetkisi gerekir." : refs.length > 0 ? "Kullanımda olduğu için arşivleme kilitli." : "Kullanım haritası doğrulanmadığı için arşivleme kilitli."}</small>}
                </article>
              );
            })}
          </div>
        )}
      </div>
    </section>
  );
}
