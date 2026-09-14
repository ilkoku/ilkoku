"use client";

import { useMemo, useState } from "react";
import {
  isValidGa4MeasurementId,
  isValidGtmId,
  type SiteAnalyticsSettings,
} from "@/lib/site-analytics-settings";
import styles from "@/app/icerik/SystemControlWorkbench.module.css";

type Props = {
  initialSettings: SiteAnalyticsSettings;
  firstRun: boolean;
};

function same(a: SiteAnalyticsSettings, b: SiteAnalyticsSettings) {
  return JSON.stringify(a) === JSON.stringify(b);
}

export function SiteAnalyticsWorkbench({ initialSettings, firstRun }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const dirty = useMemo(() => !same(settings, initialSettings), [settings, initialSettings]);
  const gtmValid = isValidGtmId(settings.gtmId) && (!settings.gtmEnabled || Boolean(settings.gtmId));
  const ga4Valid = isValidGa4MeasurementId(settings.ga4MeasurementId) && (!settings.ga4Enabled || Boolean(settings.ga4MeasurementId));
  const activeProviderCount = [settings.gtmEnabled, settings.ga4Enabled].filter(Boolean).length;
  const canSave = gtmValid && ga4Valid && (!settings.enabled || activeProviderCount > 0);

  return (
    <form action="/api/site-analytics" method="post" className={styles.workbench}>
      <div className={styles.summaryBar}>
        <article className={styles.summaryCard}><span>Analytics</span><strong>{settings.enabled ? "Açık" : "Kapalı"}</strong><small>global yükleme anahtarı</small></article>
        <article className={styles.summaryCard}><span>GTM</span><strong>{settings.gtmEnabled ? "Etkin" : "Kapalı"}</strong><small>{settings.gtmId || "Container ID yok"}</small></article>
        <article className={styles.summaryCard}><span>GA4</span><strong>{settings.ga4Enabled ? "Etkin" : "Kapalı"}</strong><small>{settings.ga4MeasurementId || "Measurement ID yok"}</small></article>
        <article className={styles.summaryCard}><span>Consent</span><strong>{settings.consentRequired ? "Zorunlu" : "Beklemeden"}</strong><small>etiket yükleme politikası</small></article>
      </div>

      {settings.gtmEnabled && settings.ga4Enabled ? (
        <div className="content-notice content-notice-warning">
          <strong>Çift ölçüm riskini kontrol edin.</strong>
          <p>GTM containerınız zaten GA4 etiketi çalıştırıyorsa ayrıca doğrudan GA4 açmak aynı page_view olayını iki kez gönderebilir.</p>
        </div>
      ) : null}

      <div className={styles.settingsGrid}>
        <section className={styles.settingCard} data-changed={settings.enabled !== initialSettings.enabled}>
          <div className={styles.settingTop}>
            <div><span className={styles.kicker}>Ana kontrol</span><h3>Analytics yükleme</h3></div>
            <span className={styles.badge} data-tone={settings.enabled ? "success" : "warning"}>{settings.enabled ? "Etkin" : "Kapalı"}</span>
          </div>
          <p>Bu anahtar kapalıysa GTM ve GA4 kimlikleri kayıtlı kalsa bile public sitede hiçbir analytics etiketi yüklenmez.</p>
          <label className={styles.toggleRow}>
            <span><strong>Analytics / Tag yüklemeyi etkinleştir</strong><small>Canlı davranışı tek noktadan kapatır veya açar.</small></span>
            <span className={styles.toggle}><input type="checkbox" name="enabled" checked={settings.enabled} onChange={(event) => setSettings((s) => ({ ...s, enabled: event.target.checked }))} /><i /></span>
          </label>
        </section>

        <section className={styles.settingCard} data-changed={settings.consentRequired !== initialSettings.consentRequired}>
          <div className={styles.settingTop}>
            <div><span className={styles.kicker}>Gizlilik</span><h3>Consent kapısı</h3></div>
            <span className={styles.badge} data-tone={settings.consentRequired ? "success" : "warning"}>{settings.consentRequired ? "Consent-first" : "Doğrudan"}</span>
          </div>
          <p>Açıkken analytics scriptleri ziyaretçi Analitik kategorisine izin verene kadar yüklenmez. İlkOku için önerilen güvenli mod budur.</p>
          <label className={styles.toggleRow}>
            <span><strong>Analitik izni verilene kadar etiketleri beklet</strong><small>Açık tutulması önerilir.</small></span>
            <span className={styles.toggle}><input type="checkbox" name="consentRequired" checked={settings.consentRequired} onChange={(event) => setSettings((s) => ({ ...s, consentRequired: event.target.checked }))} /><i /></span>
          </label>
        </section>

        <section className={styles.settingCard} data-changed={settings.gtmEnabled !== initialSettings.gtmEnabled || settings.gtmId !== initialSettings.gtmId}>
          <div className={styles.settingTop}>
            <div><span className={styles.kicker}>Google Tag Manager</span><h3>GTM Container</h3></div>
            <span className={styles.badge} data-tone={gtmValid && settings.gtmEnabled ? "success" : settings.gtmEnabled ? "warning" : undefined}>{settings.gtmEnabled ? (gtmValid ? "Hazır" : "ID gerekli") : "Kapalı"}</span>
          </div>
          <p>Google Tag Manager kullanıyorsanız container kimliğini buraya girin. Örnek biçim: GTM-XXXXXXX.</p>
          <label className="content-field">
            <span>GTM Container ID</span>
            <input name="gtmId" type="text" maxLength={32} placeholder="GTM-XXXXXXX" value={settings.gtmId} onChange={(event) => setSettings((s) => ({ ...s, gtmId: event.target.value.toUpperCase().trim() }))} aria-invalid={!gtmValid} />
          </label>
          {!gtmValid ? <small>GTM ID boş veya biçimi geçersiz.</small> : null}
          <label className={styles.toggleRow}>
            <span><strong>GTM containerını kullan</strong><small>Container içindeki tag kurallarını GTM hesabınız yönetir.</small></span>
            <span className={styles.toggle}><input type="checkbox" name="gtmEnabled" checked={settings.gtmEnabled} onChange={(event) => setSettings((s) => ({ ...s, gtmEnabled: event.target.checked }))} /><i /></span>
          </label>
        </section>

        <section className={styles.settingCard} data-changed={settings.ga4Enabled !== initialSettings.ga4Enabled || settings.ga4MeasurementId !== initialSettings.ga4MeasurementId}>
          <div className={styles.settingTop}>
            <div><span className={styles.kicker}>Google Analytics 4</span><h3>GA4 Measurement</h3></div>
            <span className={styles.badge} data-tone={ga4Valid && settings.ga4Enabled ? "success" : settings.ga4Enabled ? "warning" : undefined}>{settings.ga4Enabled ? (ga4Valid ? "Hazır" : "ID gerekli") : "Kapalı"}</span>
          </div>
          <p>GTM kullanmadan doğrudan GA4 ölçümü isterseniz Measurement ID girin. Örnek biçim: G-XXXXXXXXXX.</p>
          <label className="content-field">
            <span>GA4 Measurement ID</span>
            <input name="ga4MeasurementId" type="text" maxLength={32} placeholder="G-XXXXXXXXXX" value={settings.ga4MeasurementId} onChange={(event) => setSettings((s) => ({ ...s, ga4MeasurementId: event.target.value.toUpperCase().trim() }))} aria-invalid={!ga4Valid} />
          </label>
          {!ga4Valid ? <small>GA4 Measurement ID boş veya biçimi geçersiz.</small> : null}
          <label className={styles.toggleRow}>
            <span><strong>Doğrudan GA4 ölçümünü kullan</strong><small>GTM içinde zaten GA4 varsa çift ölçüm yapmadığınızdan emin olun.</small></span>
            <span className={styles.toggle}><input type="checkbox" name="ga4Enabled" checked={settings.ga4Enabled} onChange={(event) => setSettings((s) => ({ ...s, ga4Enabled: event.target.checked }))} /><i /></span>
          </label>
        </section>

        <section className={styles.settingCard} data-changed={settings.debugMode !== initialSettings.debugMode}>
          <div className={styles.settingTop}>
            <div><span className={styles.kicker}>Doğrulama</span><h3>GA4 Debug modu</h3></div>
            <span className={styles.badge} data-tone={settings.debugMode ? "warning" : undefined}>{settings.debugMode ? "Test açık" : "Kapalı"}</span>
          </div>
          <p>Doğrudan GA4 entegrasyonunda debug_mode parametresini gönderir. Kurulum kontrolünden sonra kapatılması önerilir.</p>
          <label className={styles.toggleRow}>
            <span><strong>DebugView için test sinyali gönder</strong><small>Yalnız doğrudan GA4 yapılandırmasını etkiler.</small></span>
            <span className={styles.toggle}><input type="checkbox" name="debugMode" checked={settings.debugMode} onChange={(event) => setSettings((s) => ({ ...s, debugMode: event.target.checked }))} /><i /></span>
          </label>
        </section>

        <section className={styles.settingCard}>
          <div className={styles.settingTop}>
            <div><span className={styles.kicker}>Kurulum kontrolü</span><h3>Yayın öncesi kontrol listesi</h3></div>
            <span className={styles.badge} data-tone={canSave ? "success" : "warning"}>{canSave ? "Geçerli" : "Eksik"}</span>
          </div>
          <p>Panel yalnız kimlik biçimi ve yapılandırma tutarlılığını doğrular. Google hesabındaki container/property sahipliğini değiştirmez.</p>
          <ul>
            <li>GTM kimliği: {gtmValid ? "geçerli" : "kontrol gerekli"}</li>
            <li>GA4 kimliği: {ga4Valid ? "geçerli" : "kontrol gerekli"}</li>
            <li>Consent-first: {settings.consentRequired ? "aktif" : "kapalı"}</li>
            <li>Aktif sağlayıcı: {activeProviderCount}</li>
          </ul>
        </section>
      </div>

      <div className={styles.saveBar}>
        <div><strong>{dirty ? "Kaydedilmemiş Analytics değişiklikleri var" : firstRun ? "Analytics yapılandırması henüz kaydedilmedi" : "Analytics yapılandırması güncel"}</strong><small>Kimlikler public tag yüklemek için kullanılır; parola veya servis hesabı anahtarı değildir.</small></div>
        <div className="content-form-actions"><button type="button" disabled={!dirty} onClick={() => setSettings(initialSettings)}>Değişiklikleri geri al</button><button type="submit" disabled={!canSave || (!dirty && !firstRun)}>Analytics Ayarlarını Kaydet</button></div>
      </div>
    </form>
  );
}
