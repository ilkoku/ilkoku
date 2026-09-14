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

type ProbeResult = {
  ok: boolean;
  status: number | null;
  contentType: string | null;
  error?: string;
} | null;

type VerifyPayload = {
  ok?: boolean;
  state?: string;
  checks?: {
    gtm?: ProbeResult;
    ga4?: ProbeResult;
  };
};

type Verification = {
  tone: "success" | "warning" | "danger";
  title: string;
  detail: string;
  checkedAt: string;
};

function same(a: SiteAnalyticsSettings, b: SiteAnalyticsSettings) {
  return JSON.stringify(a) === JSON.stringify(b);
}

function readAnalyticsConsent() {
  try {
    const raw = window.localStorage.getItem("ilkoku:consent:v1");
    if (!raw) return false;
    const parsed = JSON.parse(raw) as { version?: number; analytics?: boolean; expiresAt?: number };
    return parsed.version === 1 && parsed.analytics === true && typeof parsed.expiresAt === "number" && parsed.expiresAt > Date.now();
  } catch {
    return false;
  }
}

function readRuntimeState(provider: "Gtm" | "Ga4") {
  return document.documentElement.dataset[`ilkokuAnalytics${provider}`] || "unknown";
}

function formatTime() {
  return new Intl.DateTimeFormat("tr-TR", { hour: "2-digit", minute: "2-digit", second: "2-digit" }).format(new Date());
}

function wait(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

async function waitForProviderRuntime(settings: SiteAnalyticsSettings) {
  const deadline = Date.now() + 6000;
  let gtmRuntime = readRuntimeState("Gtm");
  let ga4Runtime = readRuntimeState("Ga4");

  while (Date.now() < deadline) {
    const gtmReady = !settings.gtmEnabled || gtmRuntime === "loaded";
    const ga4Ready = !settings.ga4Enabled || ga4Runtime === "loaded";
    const providerFailed =
      (settings.gtmEnabled && gtmRuntime === "error") ||
      (settings.ga4Enabled && ga4Runtime === "error");

    if ((gtmReady && ga4Ready) || providerFailed) break;
    await wait(250);
    gtmRuntime = readRuntimeState("Gtm");
    ga4Runtime = readRuntimeState("Ga4");
  }

  return { gtmRuntime, ga4Runtime };
}

export function SiteAnalyticsWorkbench({ initialSettings, firstRun }: Props) {
  const [settings, setSettings] = useState(initialSettings);
  const [verifying, setVerifying] = useState(false);
  const [verification, setVerification] = useState<Verification | null>(null);
  const dirty = useMemo(() => !same(settings, initialSettings), [settings, initialSettings]);
  const gtmValid = isValidGtmId(settings.gtmId) && (!settings.gtmEnabled || Boolean(settings.gtmId));
  const ga4Valid = isValidGa4MeasurementId(settings.ga4MeasurementId) && (!settings.ga4Enabled || Boolean(settings.ga4MeasurementId));
  const activeProviderCount = [settings.gtmEnabled, settings.ga4Enabled].filter(Boolean).length;
  const canSave = gtmValid && ga4Valid && (!settings.enabled || activeProviderCount > 0);

  async function verifyLiveConnection() {
    if (dirty) {
      setVerification({
        tone: "warning",
        title: "Önce değişiklikleri kaydedin.",
        detail: "Canlı doğrulama yalnız veritabanında kayıtlı ve public loader tarafından kullanılan yapılandırmayı test eder.",
        checkedAt: formatTime(),
      });
      return;
    }

    if (!settings.enabled) {
      setVerification({
        tone: "warning",
        title: "Analytics global olarak kapalı.",
        detail: "Önce Analytics / Tag yüklemeyi etkinleştirip ayarları kaydedin.",
        checkedAt: formatTime(),
      });
      return;
    }

    if (!canSave) {
      setVerification({
        tone: "warning",
        title: "Analytics yapılandırması eksik.",
        detail: "Etkin sağlayıcının GTM veya GA4 kimliğini düzeltip ayarları kaydedin.",
        checkedAt: formatTime(),
      });
      return;
    }

    setVerifying(true);
    setVerification(null);

    try {
      const response = await fetch("/api/site-analytics/verify", {
        cache: "no-store",
        headers: { Accept: "application/json" },
      });
      const payload = (await response.json().catch(() => null)) as VerifyPayload | null;

      if (!response.ok || !payload) {
        setVerification({
          tone: "danger",
          title: "Canlı doğrulama servisi yanıt vermedi.",
          detail: "Admin oturumu, kayıtlı yapılandırma veya doğrulama endpointi kontrol edilmeli.",
          checkedAt: formatTime(),
        });
        return;
      }

      if (payload.state === "disabled") {
        setVerification({
          tone: "warning",
          title: "Analytics global olarak kapalı.",
          detail: "Google bağlantısı test edilmedi; önce Analytics / Tag yüklemeyi etkinleştirip kaydedin.",
          checkedAt: formatTime(),
        });
        return;
      }

      if (!payload.ok) {
        const failed: string[] = [];
        if (settings.gtmEnabled && payload.checks?.gtm && !payload.checks.gtm.ok) failed.push(`GTM (${payload.checks.gtm.status ?? payload.checks.gtm.error ?? "erişim hatası"})`);
        if (settings.ga4Enabled && payload.checks?.ga4 && !payload.checks.ga4.ok) failed.push(`GA4 (${payload.checks.ga4.status ?? payload.checks.ga4.error ?? "erişim hatası"})`);
        setVerification({
          tone: "danger",
          title: "Google tag erişim kontrolü başarısız.",
          detail: failed.length > 0 ? `${failed.join(", ")} kontrol edilemedi.` : "Google tag script uçlarına erişilemedi.",
          checkedAt: formatTime(),
        });
        return;
      }

      const consentGranted = settings.consentRequired ? readAnalyticsConsent() : true;
      const { gtmRuntime, ga4Runtime } = await waitForProviderRuntime(settings);
      const runtimeFailures: string[] = [];
      if (settings.gtmEnabled && gtmRuntime !== "loaded") runtimeFailures.push(`GTM runtime=${gtmRuntime}`);
      if (settings.ga4Enabled && ga4Runtime !== "loaded") runtimeFailures.push(`GA4 runtime=${ga4Runtime}`);

      if (runtimeFailures.length > 0) {
        setVerification({
          tone: "danger",
          title: "Google erişimi var fakat public loader tamamlanmadı.",
          detail: `${runtimeFailures.join(", ")}. Tarayıcı Google Tag Manager isteğini engelliyor olabilir; sayfayı yenileyip tekrar deneyin.`,
          checkedAt: formatTime(),
        });
        return;
      }

      if (settings.consentRequired && !consentGranted) {
        setVerification({
          tone: "success",
          title: "Google tag teknik olarak doğrulandı.",
          detail: `GTM/GA4 script erişimi ve tarayıcı runtime yüklemesi geçti. Consent Mode şu anda analytics_storage=denied durumunda; ziyaretçi Analitik izni verirse granted olur. Runtime: GTM ${gtmRuntime}, GA4 ${ga4Runtime}. Bu kontrol eventin Google Analytics tarafından işlendiğini doğrulamaz.`,
          checkedAt: formatTime(),
        });
        return;
      }

      setVerification({
        tone: "success",
        title: "Canlı Analytics bağlantısı doğrulandı.",
        detail: `Google tag endpoint erişimi ve tarayıcı runtime yüklemesi geçti. GTM ${gtmRuntime}, GA4 ${ga4Runtime}. Bu kontrol property sahipliğini veya eventin Google tarafından işlendiğini doğrulamaz.`,
        checkedAt: formatTime(),
      });
    } catch {
      setVerification({
        tone: "danger",
        title: "Canlı doğrulama sırasında ağ hatası oluştu.",
        detail: "Yapılandırma değiştirilmedi. Tekrar deneyebilir veya tarayıcı/network engellerini kontrol edebilirsiniz.",
        checkedAt: formatTime(),
      });
    } finally {
      setVerifying(false);
    }
  }

  return (
    <form action="/api/site-analytics" method="post" className={styles.workbench}>
      <div className={styles.summaryBar}>
        <article className={styles.summaryCard}><span>Analytics</span><strong>{settings.enabled ? "Açık" : "Kapalı"}</strong><small>global yükleme anahtarı</small></article>
        <article className={styles.summaryCard}><span>GTM</span><strong>{settings.gtmEnabled ? "Etkin" : "Kapalı"}</strong><small>{settings.gtmId || "Container ID yok"}</small></article>
        <article className={styles.summaryCard}><span>GA4</span><strong>{settings.ga4Enabled ? "Etkin" : "Kapalı"}</strong><small>{settings.ga4MeasurementId || "Measurement ID yok"}</small></article>
        <article className={styles.summaryCard}><span>Consent</span><strong>{settings.consentRequired ? "Consent Mode" : "Doğrudan"}</strong><small>Google tag gizlilik politikası</small></article>
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
            <span className={styles.toggle}><input type="checkbox" name="enabled" checked={settings.enabled} onChange={(event) => { setSettings((s) => ({ ...s, enabled: event.target.checked })); setVerification(null); }} /><i /></span>
          </label>
        </section>

        <section className={styles.settingCard} data-changed={settings.consentRequired !== initialSettings.consentRequired}>
          <div className={styles.settingTop}>
            <div><span className={styles.kicker}>Gizlilik</span><h3>Google Consent Mode</h3></div>
            <span className={styles.badge} data-tone={settings.consentRequired ? "success" : "warning"}>{settings.consentRequired ? "Consent-first" : "Doğrudan"}</span>
          </div>
          <p>Açıkken Google tag teknik olarak yüklenebilir; fakat analytics_storage varsayılan olarak denied başlar. Ziyaretçi Analitik izni verirse granted olur.</p>
          <label className={styles.toggleRow}>
            <span><strong>Google tag varsayılan denied consent ile başlasın</strong><small>GTM/GA4 doğrulanabilir kalırken izinsiz analytics storage verilmez.</small></span>
            <span className={styles.toggle}><input type="checkbox" name="consentRequired" checked={settings.consentRequired} onChange={(event) => { setSettings((s) => ({ ...s, consentRequired: event.target.checked })); setVerification(null); }} /><i /></span>
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
            <input name="gtmId" type="text" maxLength={32} placeholder="GTM-XXXXXXX" value={settings.gtmId} onChange={(event) => { setSettings((s) => ({ ...s, gtmId: event.target.value.toUpperCase().trim() })); setVerification(null); }} aria-invalid={!gtmValid} />
          </label>
          {!gtmValid ? <small>GTM ID boş veya biçimi geçersiz.</small> : null}
          <label className={styles.toggleRow}>
            <span><strong>GTM containerını kullan</strong><small>Container içindeki tag kurallarını GTM hesabınız yönetir.</small></span>
            <span className={styles.toggle}><input type="checkbox" name="gtmEnabled" checked={settings.gtmEnabled} onChange={(event) => { setSettings((s) => ({ ...s, gtmEnabled: event.target.checked })); setVerification(null); }} /><i /></span>
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
            <input name="ga4MeasurementId" type="text" maxLength={32} placeholder="G-XXXXXXXXXX" value={settings.ga4MeasurementId} onChange={(event) => { setSettings((s) => ({ ...s, ga4MeasurementId: event.target.value.toUpperCase().trim() })); setVerification(null); }} aria-invalid={!ga4Valid} />
          </label>
          {!ga4Valid ? <small>GA4 Measurement ID boş veya biçimi geçersiz.</small> : null}
          <label className={styles.toggleRow}>
            <span><strong>Doğrudan GA4 ölçümünü kullan</strong><small>GTM içinde zaten GA4 varsa çift ölçüm yapmadığınızdan emin olun.</small></span>
            <span className={styles.toggle}><input type="checkbox" name="ga4Enabled" checked={settings.ga4Enabled} onChange={(event) => { setSettings((s) => ({ ...s, ga4Enabled: event.target.checked })); setVerification(null); }} /><i /></span>
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
            <span className={styles.toggle}><input type="checkbox" name="debugMode" checked={settings.debugMode} onChange={(event) => { setSettings((s) => ({ ...s, debugMode: event.target.checked })); setVerification(null); }} /><i /></span>
          </label>
        </section>

        <section className={styles.settingCard}>
          <div className={styles.settingTop}>
            <div><span className={styles.kicker}>Kurulum kontrolü</span><h3>Canlı bağlantı doğrulaması</h3></div>
            <span className={styles.badge} data-tone={verification?.tone === "success" ? "success" : verification?.tone ? "warning" : undefined}>
              {verifying ? "Kontrol ediliyor" : verification?.tone === "success" ? "Doğrulandı" : verification?.tone === "danger" ? "Hata" : verification?.tone === "warning" ? "Bekliyor" : "Çalıştırılmadı"}
            </span>
          </div>
          <p>Biçim kontrolünden farklı olarak kayıtlı ayarı, Google tag script erişimini ve bu tarayıcıdaki public loader durumunu test eder.</p>
          <ul>
            <li>GTM kimliği biçimi: {gtmValid ? "geçerli" : "kontrol gerekli"}</li>
            <li>GA4 kimliği biçimi: {ga4Valid ? "geçerli" : "kontrol gerekli"}</li>
            <li>Consent Mode: {settings.consentRequired ? "aktif" : "kapalı"}</li>
            <li>Aktif sağlayıcı: {activeProviderCount}</li>
          </ul>
          <div className="content-form-actions">
            <button type="button" onClick={verifyLiveConnection} disabled={verifying}>
              {verifying ? "Doğrulanıyor…" : dirty ? "Önce ayarları kaydet" : "Canlı bağlantıyı doğrula"}
            </button>
          </div>
          {verification ? (
            <div className={`content-notice ${verification.tone === "success" ? "content-notice-success" : verification.tone === "danger" ? "content-notice-danger" : "content-notice-warning"}`}>
              <strong>{verification.title}</strong>
              <p>{verification.detail}</p>
              <small>Son kontrol: {verification.checkedAt}</small>
            </div>
          ) : (
            <small>Henüz canlı doğrulama çalıştırılmadı. “Geçerli” kimlik biçimi tek başına Google bağlantısının çalıştığı anlamına gelmez.</small>
          )}
        </section>
      </div>

      <div className={styles.saveBar}>
        <div><strong>{dirty ? "Kaydedilmemiş Analytics değişiklikleri var" : firstRun ? "Analytics yapılandırması henüz kaydedilmedi" : "Analytics yapılandırması güncel"}</strong><small>Kimlikler public tag yüklemek için kullanılır; parola veya servis hesabı anahtarı değildir.</small></div>
        <div className="content-form-actions"><button type="button" disabled={!dirty} onClick={() => { setSettings(initialSettings); setVerification(null); }}>Değişiklikleri geri al</button><button type="submit" disabled={!canSave || (!dirty && !firstRun)}>Analytics Ayarlarını Kaydet</button></div>
      </div>
    </form>
  );
}
