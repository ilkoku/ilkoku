import Link from "next/link";
import { requireCmsAdmin } from "@/lib/cms-access";
import { defaultCmsSettings, parseCmsSettingsStrict, type CmsSettings } from "@/lib/cms-settings";
import { prisma } from "@/lib/prisma";

type Row = { valueJson: string };
type SettingsLoad = { state: "ready"; settings: CmsSettings; firstRun: boolean } | { state: "read-error" } | { state: "invalid" };

export const dynamic = "force-dynamic";

async function loadSettings(): Promise<SettingsLoad> {
  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT valueJson FROM SiteContent
      WHERE namespace = 'cms_settings' AND contentKey = 'global'
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return { state: "ready", settings: defaultCmsSettings, firstRun: true };
    const settings = parseCmsSettingsStrict(row.valueJson);
    return settings ? { state: "ready", settings, firstRun: false } : { state: "invalid" };
  } catch {
    return { state: "read-error" };
  }
}

export default async function Page({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  await requireCmsAdmin("/icerik/ayarlar");
  const params = await searchParams;
  const loaded = await loadSettings();

  if (loaded.state !== "ready") {
    return (
      <section className="content-editor-page">
        <div className="content-page-heading"><div><span>Sistem</span><h1>İçerik Ayarları</h1><p>Mevcut yapılandırma güvenilir biçimde okunmadan global CMS ayarları değiştirilmez.</p></div></div>
        <div className="content-panel" role="alert">
          <strong>{loaded.state === "read-error" ? "CMS ayarları okunamadı." : "CMS ayar kaydı geçersiz."}</strong>
          <p>{loaded.state === "read-error" ? "Bu durum varsayılan ayarların aktif olduğu anlamına gelmez. Mevcut kayıt doğrulanamadığı için kaydetme formu güvenli biçimde kapatıldı." : "Kayıt var ancak beklenen ayar şemasını karşılamıyor. Varsayılan değerlerle üzerine yazmak veri kaybı yaratabileceği için manuel inceleme gerekiyor."}</p>
          <div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/ayarlar">Tekrar dene</Link></div>
        </div>
      </section>
    );
  }

  const { settings, firstRun } = loaded;
  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Sistem</span><h1>İçerik Ayarları</h1><p>CMS’in varsayılan yayın, revision ve SEO davranışlarını yönetin.</p></div>
        <div className="content-profile"><strong>{firstRun ? "İlk kurulum" : "Kayıtlı yapılandırma"}</strong><small>{firstRun ? "Kod varsayılanları henüz DB'ye yazılmadı" : "DB kaydı doğrulandı"}</small></div>
      </div>
      {params.durum === "kaydedildi" ? <p className="content-status-success">Ayarlar kaydedildi.</p> : null}
      {params.durum === "hata" ? <p className="content-status-error">Ayarlar kaydedilemedi.</p> : null}
      {firstRun ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>Henüz global CMS ayar kaydı yok.</strong><p>Aşağıdaki değerler açıkça ilk-kurulum varsayılanlarıdır. Kaydettiğinizde ilk yapılandırma kaydı oluşturulur.</p></div> : null}
      <div className="content-panel">
        <form className="content-form" action="/api/cms-settings" method="post">
          <label><span>Yeni içerik varsayılan durumu</span><select name="defaultStatus" defaultValue={settings.defaultStatus}><option value="draft">Taslak</option><option value="published">Yayında</option></select></label>
          <label><span>Revision saklama</span><select name="revisionRetention" defaultValue={settings.revisionRetention}><option value="all">Tüm sürümler</option><option value="50">Son 50 sürüm</option><option value="20">Son 20 sürüm</option></select></label>
          <label><span>Yeni sayfa SEO varsayılanı</span><select name="defaultIndexing" defaultValue={settings.defaultIndexing}><option value="index">Index</option><option value="noindex">Noindex</option></select></label>
          <label><input type="checkbox" name="requirePublishPermission" defaultChecked={settings.requirePublishPermission} /> <span>Yayınlama için ayrı yayın yetkisi zorunlu olsun</span></label>
          <label><input type="checkbox" name="showDisabledModules" defaultChecked={settings.showDisabledModules} /> <span>Henüz etkin olmayan modülleri yönetim ekranında göster</span></label>
          <div className="content-form-actions"><button type="submit">Ayarları kaydet</button></div>
        </form>
      </div>
    </section>
  );
}
