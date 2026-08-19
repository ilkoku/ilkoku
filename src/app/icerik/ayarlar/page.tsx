import Link from "next/link";
import { requireCmsAdmin } from "@/lib/cms-access";
import { cmsModules } from "@/lib/cms-modules";
import { defaultCmsSettings, parseCmsSettingsStrict, type CmsSettings } from "@/lib/cms-settings";
import { prisma } from "@/lib/prisma";
import ops from "../PublishingOperationsWorkbench.module.css";
import policy from "../PolicyOperationsWorkbench.module.css";

type Row = { valueJson: string; updatedAt: Date | null };
type SettingsLoad = { state: "ready"; settings: CmsSettings; firstRun: boolean; updatedAt: Date | null } | { state: "read-error" } | { state: "invalid" };
type SettingsArea = "publishing" | "revisions" | "seo" | "modules";

export const dynamic = "force-dynamic";

const areas: Array<{ key: SettingsArea; label: string; description: string }> = [
  { key: "publishing", label: "Yayın Politikası", description: "Yeni içerik tercihi ve zorunlu publish permission sınırı" },
  { key: "revisions", label: "Revision Saklama", description: "Saklama tercihi; otomatik pruning henüz bağlı değil" },
  { key: "seo", label: "SEO Varsayılanı", description: "Yeni sayfa indexing tercihi; create akışına henüz bağlı değil" },
  { key: "modules", label: "Modül Görünürlüğü", description: "Pasif modül tercihi; navigasyon henüz bu kaydı tüketmiyor" },
];

async function loadSettings(): Promise<SettingsLoad> {
  try {
    const rows = await prisma.$queryRaw<Row[]>`
      SELECT valueJson, updatedAt FROM SiteContent
      WHERE namespace = 'cms_settings' AND contentKey = 'global'
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return { state: "ready", settings: defaultCmsSettings, firstRun: true, updatedAt: null };
    const settings = parseCmsSettingsStrict(row.valueJson);
    return settings ? { state: "ready", settings, firstRun: false, updatedAt: row.updatedAt } : { state: "invalid" };
  } catch {
    return { state: "read-error" };
  }
}

function formatDate(value: Date | null) {
  if (!value) return "Henüz kaydedilmedi";
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Istanbul" }).format(new Date(value));
}

function runtimeState(area: SettingsArea) {
  if (area === "publishing") return "Karma: yayın yetkisi enforced, yeni içerik tercihi config-only";
  return "Config-only · runtime bağlantısı henüz yok";
}

function formPreservedFields(settings: CmsSettings, area: SettingsArea) {
  return {
    defaultStatus: area !== "publishing" ? settings.defaultStatus : null,
    revisionRetention: area !== "revisions" ? settings.revisionRetention : null,
    defaultIndexing: area !== "seo" ? settings.defaultIndexing : null,
    showDisabledModules: area !== "modules" && settings.showDisabledModules,
  };
}

export default async function Page({ searchParams }: { searchParams: Promise<{ durum?: string; alan?: string }> }) {
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

  const { settings, firstRun, updatedAt } = loaded;
  const selectedArea = areas.some((item) => item.key === params.alan) ? params.alan as SettingsArea : "publishing";
  const selectedMeta = areas.find((item) => item.key === selectedArea)!;
  const preserved = formPreservedFields(settings, selectedArea);
  const disabledModuleCount = cmsModules.filter((module) => !module.enabled).length;
  const policyDrift = settings.requirePublishPermission === false;

  return (
    <section className="content-editor-page">
      <div className="content-page-heading">
        <div><span>Sistem</span><h1>İçerik Ayarları</h1><p>Global CMS politikasını “hangi kayıt gerçekten runtime davranışını değiştiriyor?” ayrımıyla yönetin. İşlevsiz tercihleri aktif politika gibi göstermeyin.</p></div>
        <div className="content-profile"><strong>{firstRun ? "İlk kurulum" : "Kayıtlı yapılandırma"}</strong><small>{formatDate(updatedAt)}</small></div>
      </div>

      {params.durum === "kaydedildi" ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="status"><strong>Ayar kaydı güncellendi.</strong><p>Yayın yetkisi güvenlik politikası otomatik olarak açık tutuldu.</p></div> : null}
      {params.durum === "hata" ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>Ayarlar kaydedilemedi.</strong></div> : null}
      {firstRun ? <div className="content-panel" style={{ marginBottom: "1rem" }}><strong>Henüz global CMS ayar kaydı yok.</strong><p>Gösterilen değerler kod varsayılanlarıdır. İlk kayıtta güvenlik politikası `requirePublishPermission=true` olarak sabitlenir.</p></div> : null}
      {policyDrift ? <div className="content-panel" style={{ marginBottom: "1rem" }} role="alert"><strong>Stored policy drift algılandı.</strong><p>Eski kayıt `requirePublishPermission=false` diyor; ancak runtime publish aksiyonları yine `requireCmsPublisher` ile korunuyor. Bir ayarı kaydettiğinizde DB kaydı da güvenli politika olan `true` değerine normalize edilir.</p></div> : null}

      <div className={ops.workbench}>
        <div className={ops.summaryBar}>
          <article className={ops.summaryCard}><span>Enforced politika</span><strong>1</strong><small>ayrı yayın yetkisi</small></article>
          <article className={ops.summaryCard}><span>Config-only tercih</span><strong>4</strong><small>runtime’a henüz bağlı değil</small></article>
          <article className={ops.summaryCard}><span>Pasif modül</span><strong>{disabledModuleCount}</strong><small>cmsModules.enabled=false</small></article>
          <article className={ops.summaryCard}><span>Policy drift</span><strong>{policyDrift ? "1" : "0"}</strong><small>{policyDrift ? "normalize edilmeli" : "güvenli"}</small></article>
        </div>

        <div className={ops.layout}>
          <aside className={ops.rail}>
            <div className={ops.railHeader}><span className={ops.railLabel}>Politika alanları</span><strong>4 yapılandırma grubu</strong></div>
            <div className={policy.settingsRail}>{areas.map((area) => <Link key={area.key} href={`/icerik/ayarlar?alan=${area.key}`} className={policy.settingsLink} data-active={selectedArea === area.key}><strong>{area.label}</strong><small>{area.description}</small></Link>)}</div>
          </aside>

          <main className={ops.detail}>
            <div className={ops.detailHeader}>
              <div className={ops.detailTopline}><span className={policy.policyState} data-state={selectedArea === "publishing" ? "enforced" : "config"}>{selectedArea === "publishing" ? "Enforced + config" : "Config-only"}</span></div>
              <div><span className={ops.eyebrow}>Seçili ayar alanı</span><h2>{selectedMeta.label}</h2><p>{selectedMeta.description}</p></div>
              <div className={ops.detailMetaGrid}>
                <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Runtime durumu</span><strong>{selectedArea === "publishing" ? "Kısmi" : "Bağlı değil"}</strong><small>yanıltıcı etki yok</small></div>
                <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Kayıt kaynağı</span><strong>{firstRun ? "Kod varsayılanı" : "SiteContent"}</strong><small>cms_settings/global</small></div>
                <div className={ops.detailMetaCard}><span className={ops.detailLabel}>Güvenlik</span><strong>Admin-only</strong><small>same-origin POST</small></div>
              </div>
            </div>

            <div className={ops.detailBody}>
              <div className={policy.effectBox}><span>Gerçek etki</span><strong>{runtimeState(selectedArea)}</strong><p>{selectedArea === "publishing" ? "Canlı yayın/restore/schedule işlemleri mevcut requireCmsPublisher sınırıyla korunur. `defaultStatus` ise şu anda yeni içerik oluşturma akışlarında tüketilmiyor." : selectedArea === "revisions" ? "Revision kayıtları oluşturuluyor ancak otomatik retention/pruning worker’ı bu tercihi henüz tüketmiyor." : selectedArea === "seo" ? "Yeni ContentPage oluşturulurken bu değer henüz otomatik `noIndex` varsayılanı olarak kullanılmıyor." : "CMS navigasyonu `cmsModules.filter(item => item.enabled)` ile statik davranıyor; bu tercih henüz sidebar görünümünü değiştirmiyor."}</p></div>

              <form className={policy.settingForm} action="/api/cms-settings" method="post">
                {preserved.defaultStatus ? <input type="hidden" name="defaultStatus" value={preserved.defaultStatus} /> : null}
                {preserved.revisionRetention ? <input type="hidden" name="revisionRetention" value={preserved.revisionRetention} /> : null}
                {preserved.defaultIndexing ? <input type="hidden" name="defaultIndexing" value={preserved.defaultIndexing} /> : null}
                {preserved.showDisabledModules ? <input type="hidden" name="showDisabledModules" value="on" /> : null}

                {selectedArea === "publishing" ? <>
                  <label><span>Yeni içerik varsayılan durumu · config-only</span><select name="defaultStatus" defaultValue={settings.defaultStatus}><option value="draft">Taslak</option><option value="published">Yayında tercihi</option></select></label>
                  <div className={policy.policyCard}><span>Güvenlik politikası</span><h3>Yayınlama için ayrı yetki zorunlu</h3><span className={policy.policyState} data-state="enforced">Daima açık</span><p>Bu alan artık kullanıcı tarafından kapatılamaz. Settings API her kayıtta `requirePublishPermission=true` yazar; gerçek runtime sınırı da `requireCmsPublisher` tarafından uygulanır.</p></div>
                </> : null}

                {selectedArea === "revisions" ? <label><span>Revision saklama tercihi · config-only</span><select name="revisionRetention" defaultValue={settings.revisionRetention}><option value="all">Tüm sürümler</option><option value="50">Son 50 sürüm</option><option value="20">Son 20 sürüm</option></select></label> : null}
                {selectedArea === "seo" ? <label><span>Yeni sayfa SEO tercihi · config-only</span><select name="defaultIndexing" defaultValue={settings.defaultIndexing}><option value="index">Index</option><option value="noindex">Noindex</option></select></label> : null}
                {selectedArea === "modules" ? <label style={{ display: "flex", gap: ".55rem", alignItems: "flex-start" }}><input type="checkbox" name="showDisabledModules" defaultChecked={settings.showDisabledModules} /><span><strong>Pasif modülleri göster tercihi</strong><small style={{ display: "block", marginTop: ".15rem" }}>Config-only; mevcut navigation henüz bu kaydı tüketmiyor.</small></span></label> : null}

                <div className={ops.actionRow}><button type="submit">Yapılandırma Kaydını Güncelle</button></div>
              </form>
            </div>
          </main>

          <aside className={ops.sidePane}>
            <div className={ops.sideHeader}><span className={ops.railLabel}>Runtime gerçeği</span><strong>Config ile davranışı ayır</strong></div>
            <div className={ops.sideBody}>
              <div className={policy.runtimeList}>
                <div className={policy.runtimeItem} data-state="yes"><span>✓</span><div><strong>Yayın permission</strong><small>Gerçek runtime guardrail: requireCmsPublisher.</small></div></div>
                <div className={policy.runtimeItem} data-state="no"><span>!</span><div><strong>Yeni içerik defaultStatus</strong><small>DB’de tutuluyor, create flow henüz okumuyor.</small></div></div>
                <div className={policy.runtimeItem} data-state="no"><span>!</span><div><strong>Revision retention</strong><small>Pruning worker henüz bağlı değil; veri silme etkisi yok.</small></div></div>
                <div className={policy.runtimeItem} data-state="no"><span>!</span><div><strong>SEO defaultIndexing</strong><small>Yeni sayfa oluşturma akışına henüz bağlı değil.</small></div></div>
                <div className={policy.runtimeItem} data-state="no"><span>!</span><div><strong>Disabled modules</strong><small>Sidebar statik enabled filtresi kullanıyor.</small></div></div>
              </div>
              <div className={policy.riskNotice}>“Config-only” alanları değiştirmek bugünkü canlı davranışı değiştirmez. Bu ayrım, işlevsiz bir ayarı çalışıyormuş gibi göstermemek için özellikle görünür tutuluyor.</div>
              <div className={ops.actionRow}><Link href="/icerik/erisim">İçerik Yetkileri</Link><Link href="/icerik/saglik">Sistem Sağlığı</Link></div>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
