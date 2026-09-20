import Link from "next/link";

import {
  getPaymentMethodAvailability,
  hasOperationalPaymentProvider,
} from "@/features/commerce/payment-providers";
import { isCommerceCheckoutEnabled } from "@/features/commerce/runtime";

export default function CommerceProvidersPage() {
  const checkoutEnabled = isCommerceCheckoutEnabled();
  const paymentMethods = getPaymentMethodAvailability();
  const providerReady = hasOperationalPaymentProvider();
  const paidAccessReady = checkoutEnabled && providerReady;

  return (
    <>
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Ödeme Sistemi</span>
          <h1>Ödeme Sağlayıcıları</h1>
          <p>
            Kart ve telefon faturası kanallarının provider hazırlığını görün.
            Secret, kart verisi veya operatör kimlik bilgisi bu ekranda
            gösterilmez.
          </p>
        </div>
        <Link className="admin-button" href="/sistem-yonetimi/odeme-sistemi">
          Ödeme Sistemine dön
        </Link>
      </header>

      <section className="admin-settings-grid admin-commerce-summary">
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Commerce rollout</span>
          <h2>{checkoutEnabled ? "Açık" : "Kapalı"}</h2>
          <p>COMMERCE_CHECKOUT_ENABLED sunucu ayarı.</p>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Operasyonel provider</span>
          <h2>{providerReady ? "Var" : "Yok"}</h2>
          <p>Production-safe adapter kullanılabilirliği.</p>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Ücretli erişim kilidi</span>
          <h2>{paidAccessReady ? "Hazır" : "Devre dışı"}</h2>
          <p>
            Rollout ve provider birlikte hazır değilse okur erişimi
            kilitlenmez.
          </p>
        </article>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__heading">
          <div>
            <span>Adapter kayıtları</span>
            <h2>Ödeme yöntemleri</h2>
          </div>
          <b>{paymentMethods.length}</b>
        </div>

        <div className="admin-commerce-provider-grid">
          {paymentMethods.map((method) => (
            <article key={method.method}>
              <span className="admin-eyebrow">{method.method}</span>
              <h3>{method.label}</h3>
              <p>
                {method.available
                  ? "Operasyonel provider adapterı hazır."
                  : "Henüz operasyonel provider adapterı bağlı değil."}
              </p>
              <dl>
                <div>
                  <dt>Durum</dt>
                  <dd>{method.available ? "Aktif" : "Yapılandırılmadı"}</dd>
                </div>
                <div>
                  <dt>Provider kodu</dt>
                  <dd>{method.providerCode ?? "—"}</dd>
                </div>
              </dl>
            </article>
          ))}
        </div>
      </section>

      <div className="admin-readonly-notice admin-commerce-readonly">
        <strong>Provider aktivasyonu kod + secret dağıtımı gerektirir</strong>
        <p>
          Bu ekran yalnız readiness görünümüdür. Production provider secretları
          admin arayüzüne yazılmaz. Test-mode adapter production&apos;da ücretli
          erişimi aktive edemez; doğrulanmamış webhook entitlement açamaz.
        </p>
      </div>
    </>
  );
}
