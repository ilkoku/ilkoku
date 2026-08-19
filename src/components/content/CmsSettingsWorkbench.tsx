"use client";

import { useMemo, useState } from "react";
import type { CmsSettings } from "@/lib/cms-settings";
import styles from "@/app/icerik/SystemControlWorkbench.module.css";

type Props = {
  initialSettings: CmsSettings;
  firstRun: boolean;
};

function same(a: CmsSettings, b: CmsSettings) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function CmsSettingsWorkbench({ initialSettings, firstRun }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const dirty = useMemo(() => !same(settings, initialSettings), [settings, initialSettings]);
  const riskCount = [
    settings.defaultStatus === "published",
    settings.revisionRetention !== "all",
    settings.defaultIndexing === "noindex",
    !settings.requirePublishPermission,
  ].filter(Boolean).length;

  return (
    <form action="/api/cms-settings" method="post" className={styles.workbench}>
      <div className={styles.summaryBar}>
        <article className={styles.summaryCard}><span>Yeni içerik</span><strong>{settings.defaultStatus === "draft" ? "Taslak" : "Doğrudan yayın"}</strong><small>varsayılan oluşturma durumu</small></article>
        <article className={styles.summaryCard}><span>Revision</span><strong>{settings.revisionRetention === "all" ? "Tümü" : `Son ${settings.revisionRetention}`}</strong><small>saklama politikası</small></article>
        <article className={styles.summaryCard}><span>SEO</span><strong>{settings.defaultIndexing === "index" ? "Index" : "Noindex"}</strong><small>yeni sayfa varsayılanı</small></article>
        <article className={styles.summaryCard}><span>Riskli tercih</span><strong>{riskCount}</strong><small>operasyon etkisi yüksek ayar</small></article>
      </div>

      <div className={styles.settingsGrid}>
        <section className={styles.settingCard} data-changed={settings.defaultStatus !== initialSettings.defaultStatus}>
          <div className={styles.settingTop}><div><span className={styles.kicker}>Yayın akışı</span><h3>Yeni içerik varsayılanı</h3></div><span className={styles.badge} data-tone={settings.defaultStatus === "draft" ? "success" : "warning"}>{settings.defaultStatus === "draft" ? "Güvenli" : "Yüksek etki"}</span></div>
          <p>Yeni CMS içeriğinin ilk oluşturulduğunda hangi durumda başlayacağını belirler.</p>
          <div className={styles.options}>
            <label className={styles.option}><input type="radio" name="defaultStatus" value="draft" checked={settings.defaultStatus === "draft"} onChange={() => setSettings((s) => ({ ...s, defaultStatus: "draft" }))} /><span><strong>Taslak</strong><small>İçerik önce hazırlanır, canlı yayın ayrıca yapılır.</small></span></label>
            <label className={styles.option}><input type="radio" name="defaultStatus" value="published" checked={settings.defaultStatus === "published"} onChange={() => setSettings((s) => ({ ...s, defaultStatus: "published" }))} /><span><strong>Yayında</strong><small>Destekleyen akışlarda yeni içerik doğrudan public duruma geçebilir.</small></span></label>
          </div>
        </section>

        <section className={styles.settingCard} data-changed={settings.requirePublishPermission !== initialSettings.requirePublishPermission}>
          <div className={styles.settingTop}><div><span className={styles.kicker}>Yetki sınırı</span><h3>Ayrı yayın yetkisi</h3></div><span className={styles.badge} data-tone={settings.requirePublishPermission ? "success" : "danger"}>{settings.requirePublishPermission ? "Koruma açık" : "Koruma kapalı"}</span></div>
          <p>İçerik yöneticisi ile canlı yayın kararı veren kullanıcı arasındaki ayrımı belirler.</p>
          <label className={styles.toggleRow}><span><strong>Yayınlama için ayrı yetki zorunlu</strong><small>Kapatılması yetki sınırını gevşetir.</small></span><span className={styles.toggle}><input type="checkbox" name="requirePublishPermission" checked={settings.requirePublishPermission} onChange={(event) => setSettings((s) => ({ ...s, requirePublishPermission: event.target.checked }))} /><i /></span></label>
        </section>

        <section className={styles.settingCard} data-changed={settings.revisionRetention !== initialSettings.revisionRetention}>
          <div className={styles.settingTop}><div><span className={styles.kicker}>Sürüm geçmişi</span><h3>Revision saklama</h3></div><span className={styles.badge} data-tone={settings.revisionRetention === "all" ? "success" : "warning"}>{settings.revisionRetention === "all" ? "Tam geçmiş" : "Sınırlı geçmiş"}</span></div>
          <p>Revision merkezinde tutulacak geçmiş derinliğinin global varsayılanıdır.</p>
          <div className={styles.options}>
            {[{ value: "all", title: "Tüm sürümler", note: "Maksimum geri dönüş izi korunur." }, { value: "50", title: "Son 50 sürüm", note: "Uzun geçmişi sınırlar." }, { value: "20", title: "Son 20 sürüm", note: "En agresif saklama sınırıdır." }].map((option) => <label key={option.value} className={styles.option}><input type="radio" name="revisionRetention" value={option.value} checked={settings.revisionRetention === option.value} onChange={() => setSettings((s) => ({ ...s, revisionRetention: option.value as CmsSettings["revisionRetention"] }))} /><span><strong>{option.title}</strong><small>{option.note}</small></span></label>)}
          </div>
        </section>

        <section className={styles.settingCard} data-changed={settings.defaultIndexing !== initialSettings.defaultIndexing}>
          <div className={styles.settingTop}><div><span className={styles.kicker}>SEO varsayılanı</span><h3>Yeni sayfa indeksleme</h3></div><span className={styles.badge} data-tone={settings.defaultIndexing === "index" ? "success" : "warning"}>{settings.defaultIndexing === "index" ? "Index" : "Noindex"}</span></div>
          <p>Yeni oluşturulan sayfalarda arama motoru indeksleme varsayılanını belirler.</p>
          <div className={styles.options}>
            <label className={styles.option}><input type="radio" name="defaultIndexing" value="index" checked={settings.defaultIndexing === "index"} onChange={() => setSettings((s) => ({ ...s, defaultIndexing: "index" }))} /><span><strong>Index</strong><small>Yeni public sayfalar indekslenebilir başlar.</small></span></label>
            <label className={styles.option}><input type="radio" name="defaultIndexing" value="noindex" checked={settings.defaultIndexing === "noindex"} onChange={() => setSettings((s) => ({ ...s, defaultIndexing: "noindex" }))} /><span><strong>Noindex</strong><small>Yeni sayfalar açıkça değiştirilene kadar indeks dışı kalır.</small></span></label>
          </div>
        </section>

        <section className={styles.settingCard} data-changed={settings.showDisabledModules !== initialSettings.showDisabledModules}>
          <div className={styles.settingTop}><div><span className={styles.kicker}>Panel görünümü</span><h3>Pasif modülleri göster</h3></div><span className={styles.badge}>{settings.showDisabledModules ? "Göster" : "Gizle"}</span></div>
          <p>Etkin olmayan CMS modüllerinin yönetim navigasyonunda görünür olup olmayacağını belirler.</p>
          <label className={styles.toggleRow}><span><strong>Pasif modülleri navigasyonda göster</strong><small>Ürün davranışını değil, CMS görünürlüğünü etkiler.</small></span><span className={styles.toggle}><input type="checkbox" name="showDisabledModules" checked={settings.showDisabledModules} onChange={(event) => setSettings((s) => ({ ...s, showDisabledModules: event.target.checked }))} /><i /></span></label>
        </section>

        <section className={styles.settingCard}>
          <div className={styles.settingTop}><div><span className={styles.kicker}>Karar özeti</span><h3>Mevcut yapılandırmanın etkisi</h3></div><span className={styles.badge} data-tone={riskCount === 0 ? "success" : "warning"}>{riskCount === 0 ? "Düşük risk" : `${riskCount} dikkat noktası`}</span></div>
          <div className={styles.impactCard}><strong>Yayın akışı</strong><p>{settings.defaultStatus === "draft" ? "Yeni içerikler taslak odaklı başlıyor." : "Yeni içerik varsayılanı yayın durumuna ayarlı."} {settings.requirePublishPermission ? "Canlı yayın için ayrı yetki korunuyor." : "Ayrı yayın yetkisi zorunluluğu kapalı."}</p></div>
          <div className={styles.impactCard}><strong>İçerik geçmişi & SEO</strong><p>{settings.revisionRetention === "all" ? "Revision geçmişi sınırsız tutuluyor." : `Revision geçmişi son ${settings.revisionRetention} sürümle sınırlandırılmış.`} Yeni sayfalar {settings.defaultIndexing === "index" ? "index" : "noindex"} başlıyor.</p></div>
        </section>
      </div>

      <div className={styles.saveBar}>
        <div><strong>{dirty ? "Kaydedilmemiş ayar değişiklikleri var" : firstRun ? "İlk yapılandırma henüz kaydedilmedi" : "Kayıtlı yapılandırma güncel"}</strong><small>Kaydetme tüm global CMS ayar setini atomik olarak günceller.</small></div>
        <div className="content-form-actions"><button type="button" disabled={!dirty} onClick={() => setSettings(initialSettings)}>Değişiklikleri geri al</button><button type="submit" disabled={!dirty && !firstRun}>Ayarları Kaydet</button></div>
      </div>
    </form>
  );
}
