import Link from "next/link";
import { CmsSettingsWorkbench } from "@/components/content/CmsSettingsWorkbench";
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
        <div className="content-page-heading"><div><span>Sistem · Admin</span><h1>İçerik Ayarları</h1><p>Mevcut yapılandırma güvenilir biçimde okunmadan global CMS ayarları değiştirilmez.</p></div></div>
        <div className="content-panel" role="alert">
          <strong>{loaded.state === "read-error" ? "CMS ayarları okunamadı." : "CMS ayar kaydı geçersiz."}</strong>
          <p>{loaded.state === "read-error" ? "Bu durum varsayılan ayarların aktif olduğu anlamına gelmez. Mevcut kayıt doğrulanamadığı için çalışma masası güvenli biçimde kapatıldı." : "Kayıt var ancak beklenen ayar şemasını karşılamıyor. Varsayılan değerlerle üzerine yazmak veri kaybı yaratabileceği için manuel inceleme gerekiyor."}</p>
          <div className="content-form-actions" style={{ flexWrap: "wrap" }}><Link href="/icerik/saglik">Sistem Sağlığı →</Link><Link href="/icerik/ayarlar">Tekrar dene</Link></div>
        </div>
      </section>
    );
  }

  const { settings, firstRun } = loaded;
  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Sistem · Admin</span><h1>İçerik Ayarları</h1><p>Global CMS davranışlarını form alanı olarak değil, etkisi görünen operasyon kararları olarak yönetin.</p></div>
        <div className="content-profile"><strong>{firstRun ? "İlk kurulum" : "Kayıtlı yapılandırma"}</strong><small>{firstRun ? "Kod varsayılanları henüz DB'ye yazılmadı" : "DB kaydı strict şemayla doğrulandı"}</small></div>
      </div>

      {params.durum === "kaydedildi" ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="status"><strong>CMS ayarları kaydedildi.</strong><p>Yeni global yapılandırma sonraki CMS işlemlerinde kullanılacak.</p></div> : null}
      {params.durum === "hata" ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>Ayarlar kaydedilemedi.</strong><p>Mevcut kayıt korunmuştur; Sistem Sağlığı üzerinden veri kaynağını kontrol edin.</p></div> : null}
      {firstRun ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>İlk yapılandırma.</strong><p>Aşağıdaki değerler kod varsayılanlarıdır. Açıkça kaydetmeden kalıcı CMS ayar kaydı oluşturulmaz.</p></div> : null}

      <CmsSettingsWorkbench initialSettings={settings} firstRun={firstRun} />

      <div className="content-form-actions" style={{ marginTop: "1rem", flexWrap: "wrap" }}><Link href="/icerik/erisim">İçerik Yetkileri</Link><Link href="/icerik/gecmis">Sürüm Geçmişi</Link><Link href="/icerik/saglik">Sistem Sağlığı</Link></div>
    </section>
  );
}
