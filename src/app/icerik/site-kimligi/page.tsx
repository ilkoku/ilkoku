import Image from "next/image";
import Link from "next/link";
import logo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { saveSiteIdentityAction } from "@/features/cms/site-identity-actions";
import { requireCmsAdmin } from "@/lib/cms-access";
import { prisma } from "@/lib/prisma";
import { loadSiteIdentityForCms } from "@/lib/site-identity";

type MediaRow = { valueJson: string };
type MediaOption = { title: string; url: string; altText: string };

export const dynamic = "force-dynamic";

function parseImageOption(valueJson: string): MediaOption | null {
  try {
    const value = JSON.parse(valueJson) as Record<string, unknown>;
    if (value.kind !== "image" || typeof value.url !== "string" || !value.url.startsWith("/api/media/")) return null;
    return {
      title: typeof value.title === "string" && value.title.trim() ? value.title.trim() : "CMS görseli",
      url: value.url,
      altText: typeof value.altText === "string" ? value.altText : "",
    };
  } catch {
    return null;
  }
}

export default async function SiteIdentityPage({ searchParams }: { searchParams: Promise<{ kaydedildi?: string; hata?: string }> }) {
  await requireCmsAdmin("/icerik/site-kimligi");
  const params = await searchParams;
  const loaded = await loadSiteIdentityForCms();

  if (loaded.state !== "ready") {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading">
          <div><span>Site · Admin</span><h1>Site Kimliği</h1><p>Marka kaydı güvenilir biçimde okunmadan canlı header/footer kimliği değiştirilemez.</p></div>
        </div>
        <div className="content-panel cms-editor-notice is-danger" role="alert">
          <strong>{loaded.state === "read-error" ? "Site kimliği kaydı okunamadı." : "Site kimliği kaydı geçersiz."}</strong>
          <p>Varsayılan değerlerle sessizce üzerine yazmak yerine mevcut kayıt korunuyor. Sistem Sağlığı üzerinden veri kaynağını kontrol edin.</p>
          <div className="content-form-actions"><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/site-kimligi">Tekrar dene</Link></div>
        </div>
      </section>
    );
  }

  let mediaOptions: MediaOption[] = [];
  try {
    const rows = await prisma.$queryRaw<MediaRow[]>`
      SELECT valueJson
      FROM SiteContent
      WHERE namespace = 'media' AND status = 'published'
      ORDER BY updatedAt DESC
      LIMIT 150
    `;
    mediaOptions = rows.map((row) => parseImageOption(row.valueJson)).filter((item): item is MediaOption => Boolean(item));
  } catch {
    mediaOptions = [];
  }

  const { identity, firstRun } = loaded;
  const currentMedia = mediaOptions.find((item) => item.url === identity.logoUrl);

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div>
          <span>Site · Admin</span>
          <h1>Site Kimliği</h1>
          <p>Yeni sayfalar dahil tüm ortak public header/footer yüzeyinde kullanılan güvenli marka alanlarını tek yerden yönetin.</p>
        </div>
        <aside className="cms-editor-status-card" data-tone="success" aria-label="Site kimliği durumu">
          <span className="cms-editor-status-card__label">Kimlik kaynağı</span>
          <strong>{firstRun ? "Kod varsayılanı" : "CMS yönetimli"}</strong>
          <div className="cms-editor-status-card__meta"><span className="cms-editor-chip is-positive">İlkOku geometri kilitli</span><span className="cms-editor-chip">Canlı header/footer</span></div>
        </aside>
      </div>

      <nav className="cms-editor-toolbar" aria-label="Site kimliği hızlı işlemleri">
        <div className="cms-editor-toolbar__cluster"><Link href="/icerik">← İçerik Yönetimi</Link><Link href="/icerik/sayfalar/sablonlar">Sayfa Şablonları</Link></div>
        <div className="cms-editor-toolbar__cluster"><Link href="/icerik/medya">Medya</Link><Link href="/" target="_blank">Canlı ana sayfa ↗</Link></div>
      </nav>

      {params.kaydedildi ? <div className="content-panel cms-editor-notice is-info" role="status"><strong>Site kimliği güncellendi.</strong><p>Yeni değerler ortak public header/footer ve yeni CMS sayfalarında kullanılacak.</p></div> : null}
      {params.hata ? <div className="content-panel cms-editor-notice is-danger" role="alert"><strong>Site kimliği kaydedilemedi.</strong><p>{params.hata === "logo" ? "Seçilen logo yayınlanmış bir CMS görseli değil." : params.hata === "alan" ? "Kimlik alanlarından biri boş, çok uzun veya geçersiz." : "Veritabanı kaydı tamamlanamadı; mevcut kimlik korunuyor."}</p></div> : null}

      <div className="content-panel cms-editor-notice is-info">
        <strong>Tasarım sistemi korunur.</strong>
        <p>Logo, kısa marka metinleri ve varsayılan sayfa etiketi değiştirilebilir. Renk paleti, font sistemi, header/footer yerleşimi ve responsive geometri bu panelden serbestleştirilmez; yeni sayfaların site bütünlüğünden çıkması engellenir.</p>
      </div>

      <div className="content-panel" style={{ marginTop: "1rem" }}>
        <form action={saveSiteIdentityAction} className="content-form">
          <div className="cms-editor-section-label"><span>Logo</span><small>Varsayılan paket logosu veya Medya alanına yüklenen yayınlanmış bir görsel</small></div>
          <div style={{ display: "flex", alignItems: "center", gap: "1rem", flexWrap: "wrap", marginBottom: "1rem" }}>
            {identity.logoUrl ? (
              <Image src={identity.logoUrl} alt={identity.logoAlt} width={308} height={76} style={{ maxWidth: 220, height: "auto" }} />
            ) : (
              <Image src={logo} alt={identity.logoAlt} sizes="220px" style={{ maxWidth: 220, height: "auto" }} />
            )}
            <div><strong>Mevcut logo</strong><p style={{ margin: ".25rem 0 0" }}>{identity.logoUrl ? currentMedia?.title ?? "CMS medya görseli" : "İlkOku paket logosu"}</p></div>
          </div>
          <label>
            <span>Logo kaynağı</span>
            <select name="logoUrl" defaultValue={identity.logoUrl}>
              <option value="">İlkOku paket logosu (önerilen)</option>
              {mediaOptions.map((item) => <option value={item.url} key={item.url}>{item.title}{item.altText ? ` · ${item.altText}` : ""}</option>)}
            </select>
          </label>
          <p className="content-form-help">Yeni logo yüklemek için önce Medya alanına gidin. Yalnız yayınlanmış CMS image kayıtları burada seçilebilir.</p>
          <label><span>Logo alt metni</span><input name="logoAlt" maxLength={120} defaultValue={identity.logoAlt} required /></label>

          <div className="cms-editor-section-label"><span>Header kimliği</span><small>Public header'ın logo yanındaki kısa platform tanımı</small></div>
          <label><span>Header kicker</span><input name="headerKicker" maxLength={100} defaultValue={identity.headerKicker} required /></label>

          <div className="cms-editor-section-label"><span>Yeni sayfa kimliği</span><small>CMS ile oluşturulan standart public sayfalardaki üst etiket</small></div>
          <label><span>Varsayılan eyebrow</span><input name="defaultEyebrow" maxLength={60} defaultValue={identity.defaultEyebrow} required /></label>

          <div className="cms-editor-section-label"><span>Footer sloganı</span><small>Vurgulu ikinci parça mevcut tipografiyle otomatik gösterilir</small></div>
          <label><span>Slogan başlangıcı</span><input name="footerTaglineLead" maxLength={120} defaultValue={identity.footerTaglineLead} required /></label>
          <label><span>Vurgulu kapanış</span><input name="footerTaglineEmphasis" maxLength={80} defaultValue={identity.footerTaglineEmphasis} required /></label>

          <div className="cms-editor-savebar">
            <Link href="/icerik">← Genel Bakış</Link>
            <div className="cms-editor-savebar__actions"><button type="submit">Kimliği kaydet ve canlıya uygula</button></div>
          </div>
        </form>
      </div>
    </section>
  );
}
