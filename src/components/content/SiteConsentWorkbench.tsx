"use client";

import { useMemo, useState } from "react";
import type { SiteConsentSettings } from "@/lib/site-consent-settings";
import styles from "@/app/icerik/SystemControlWorkbench.module.css";

type Props = {
  initialSettings: SiteConsentSettings;
  firstRun: boolean;
};

function same(a: SiteConsentSettings, b: SiteConsentSettings) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function SiteConsentWorkbench({ initialSettings, firstRun }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const dirty = useMemo(() => !same(settings, initialSettings), [settings, initialSettings]);
  const optionalCategoryCount = [settings.analyticsEnabled, settings.marketingEnabled].filter(Boolean).length;

  return (
    <form action="/api/site-consent" method="post" className={styles.workbench}>
      <div className={styles.summaryBar}>
        <article className={styles.summaryCard}><span>Consent banner</span><strong>{settings.bannerEnabled ? "Açık" : "Kapalı"}</strong><small>public ziyaretçi görünümü</small></article>
        <article className={styles.summaryCard}><span>Consent Mode</span><strong>{settings.consentModeEnabled ? "Hazır" : "Kapalı"}</strong><small>analytics/ad sinyal modeli</small></article>
        <article className={styles.summaryCard}><span>Opsiyonel kategori</span><strong>{optionalCategoryCount}</strong><small>analitik + pazarlama</small></article>
        <article className={styles.summaryCard}><span>Tercih süresi</span><strong>{settings.retentionDays} gün</strong><small>ziyaretçi seçim saklama süresi</small></article>
      </div>

      <div className={styles.settingsGrid}>
        <section className={styles.settingCard} data-changed={settings.bannerEnabled !== initialSettings.bannerEnabled}>
          <div className={styles.settingTop}>
            <div><span className={styles.kicker}>Public deneyim</span><h3>Çerez tercih bannerı</h3></div>
            <span className={styles.badge} data-tone={settings.bannerEnabled ? "success" : "warning"}>{settings.bannerEnabled ? "Etkin" : "Kapalı"}</span>
          </div>
          <p>Kapalıyken canlı sitede yeni bir banner gösterilmez. Açılması ziyaretçiye zorunlu ve opsiyonel kategorileri seçme ekranını getirir.</p>
          <label className={styles.toggleRow}>
            <span><strong>Public consent bannerını göster</strong><small>Bu ayar açıkça kaydedilmeden canlı site davranışı değişmez.</small></span>
            <span className={styles.toggle}><input type="checkbox" name="bannerEnabled" checked={settings.bannerEnabled} onChange={(event) => setSettings((s) => ({ ...s, bannerEnabled: event.target.checked }))} /><i /></span>
          </label>
        </section>

        <section className={styles.settingCard} data-changed={settings.consentModeEnabled !== initialSettings.consentModeEnabled}>
          <div className={styles.settingTop}>
            <div><span className={styles.kicker}>Consent sinyali</span><h3>Consent Mode köprüsü</h3></div>
            <span className={styles.badge} data-tone={settings.consentModeEnabled ? "success" : "warning"}>{settings.consentModeEnabled ? "Hazır" : "Devre dışı"}</span>
          </div>
          <p>Sayfada bir gtag/GTM entegrasyonu bulunduğunda ziyaretçi tercihini denied/granted sinyallerine dönüştürmeye izin verir. Tek başına takip kodu yüklemez.</p>
          <label className={styles.toggleRow}>
            <span><strong>Consent Mode sinyallerini etkinleştir</strong><small>Opsiyonel kategoriler izin verilene kadar granted olmaz.</small></span>
            <span className={styles.toggle}><input type="checkbox" name="consentModeEnabled" checked={settings.consentModeEnabled} onChange={(event) => setSettings((s) => ({ ...s, consentModeEnabled: event.target.checked }))} /><i /></span>
          </label>
        </section>

        <section className={styles.settingCard} data-changed={settings.analyticsEnabled !== initialSettings.analyticsEnabled}>
          <div className={styles.settingTop}>
            <div><span className={styles.kicker}>Kategori</span><h3>Analitik çerezleri</h3></div>
            <span className={styles.badge} data-tone={settings.analyticsEnabled ? "success" : undefined}>{settings.analyticsEnabled ? "Seçilebilir" : "Kapalı"}</span>
          </div>
          <p>GA4 veya benzeri analitik araçlar eklendiğinde bu kategoriye bağlanacak. Kullanıcı onayı olmadan granted sinyali verilmez.</p>
          <label className={styles.toggleRow}>
            <span><strong>Analitik kategorisini sun</strong><small>Bu seçenek bir GA4 etiketi oluşturmaz veya otomatik takip başlatmaz.</small></span>
            <span className={styles.toggle}><input type="checkbox" name="analyticsEnabled" checked={settings.analyticsEnabled} onChange={(event) => setSettings((s) => ({ ...s, analyticsEnabled: event.target.checked }))} /><i /></span>
          </label>
        </section>

        <section className={styles.settingCard} data-changed={settings.marketingEnabled !== initialSettings.marketingEnabled}>
          <div className={styles.settingTop}>
            <div><span className={styles.kicker}>Kategori</span><h3>Pazarlama çerezleri</h3></div>
            <span className={styles.badge} data-tone={settings.marketingEnabled ? "warning" : undefined}>{settings.marketingEnabled ? "Seçilebilir" : "Kapalı"}</span>
          </div>
          <p>Reklam/pazarlama etiketleri ileride eklenecekse ayrı izin kategorisi olarak yönetilir. Varsayılan olarak kapalıdır.</p>
          <label className={styles.toggleRow}>
            <span><strong>Pazarlama kategorisini sun</strong><small>İzin verilene kadar ad_storage, ad_user_data ve ad_personalization granted olmaz.</small></span>
            <span className={styles.toggle}><input type="checkbox" name="marketingEnabled" checked={settings.marketingEnabled} onChange={(event) => setSettings((s) => ({ ...s, marketingEnabled: event.target.checked }))} /><i /></span>
          </label>
        </section>

        <section className={styles.settingCard} data-changed={settings.rejectAllEnabled !== initialSettings.rejectAllEnabled}>
          <div className={styles.settingTop}>
            <div><span className={styles.kicker}>Ziyaretçi kontrolü</span><h3>Tümünü reddet</h3></div>
            <span className={styles.badge} data-tone={settings.rejectAllEnabled ? "success" : "warning"}>{settings.rejectAllEnabled ? "Açık" : "Gizli"}</span>
          </div>
          <p>Banner üzerinde opsiyonel kategorilerin tek tıkla reddedilmesini sağlar. Zorunlu teknik saklama her zaman ayrı tutulur.</p>
          <label className={styles.toggleRow}>
            <span><strong>“Tümünü reddet” seçeneğini göster</strong><small>Şeffaf tercih deneyimi için açık tutulması önerilir.</small></span>
            <span className={styles.toggle}><input type="checkbox" name="rejectAllEnabled" checked={settings.rejectAllEnabled} onChange={(event) => setSettings((s) => ({ ...s, rejectAllEnabled: event.target.checked }))} /><i /></span>
          </label>
        </section>

        <section className={styles.settingCard}>
          <div className={styles.settingTop}>
            <div><span className={styles.kicker}>Politika & saklama</span><h3>Tercih kaydı</h3></div>
            <span className={styles.badge}>{settings.retentionDays} gün</span>
          </div>
          <p>Ziyaretçinin consent tercihi tarayıcıda saklanır; içerikte hassas veri veya kullanıcı kimliği tutulmaz.</p>
          <label className="content-field">
            <span>Çerez politikası yolu</span>
            <input name="policyPath" type="text" maxLength={240} value={settings.policyPath} onChange={(event) => setSettings((s) => ({ ...s, policyPath: event.target.value }))} />
          </label>
          <label className="content-field">
            <span>Tercih saklama süresi (gün)</span>
            <input name="retentionDays" type="number" min={1} max={365} value={settings.retentionDays} onChange={(event) => setSettings((s) => ({ ...s, retentionDays: Math.min(365, Math.max(1, Number(event.target.value) || 1)) }))} />
          </label>
        </section>
      </div>

      <div className={styles.saveBar}>
        <div><strong>{dirty ? "Kaydedilmemiş consent değişiklikleri var" : firstRun ? "Consent yapılandırması henüz kaydedilmedi" : "Kayıtlı consent yapılandırması güncel"}</strong><small>Kaydetme yalnız site consent ayar setini günceller; SEO içeriklerine ve public metadata alanlarına dokunmaz.</small></div>
        <div className="content-form-actions"><button type="button" disabled={!dirty} onClick={() => setSettings(initialSettings)}>Değişiklikleri geri al</button><button type="submit" disabled={!dirty && !firstRun}>Consent Ayarlarını Kaydet</button></div>
      </div>
    </form>
  );
}
