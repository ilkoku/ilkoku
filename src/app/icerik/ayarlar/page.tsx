import { parseCmsSettings } from "@/lib/cms-settings";
import { prisma } from "@/lib/prisma";

type Row = { valueJson: string };

export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<{ durum?: string }> }) {
  const params = await searchParams;
  let valueJson: string | null = null;

  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT valueJson FROM SiteContent
      WHERE namespace = 'cms_settings' AND contentKey = 'global'
      LIMIT 1
    `;
    valueJson = rows[0]?.valueJson ?? null;
  } catch {}

  const settings = parseCmsSettings(valueJson);

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Sistem</span><h1>İçerik Ayarları</h1><p>CMS’in varsayılan yayın, revision ve SEO davranışlarını yönetin.</p></div>
      </div>
      {params.durum === "kaydedildi" ? <p className="content-status-success">Ayarlar kaydedildi.</p> : null}
      {params.durum === "hata" ? <p className="content-status-error">Ayarlar kaydedilemedi.</p> : null}
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
