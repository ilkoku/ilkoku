import Link from "next/link";

import { getAuthorPublicationAgreementStatus } from "@/features/commerce/agreement";
import { getReaderPurchaseTermsStatus } from "@/features/commerce/checkout-terms";
import {
  getPaymentMethodAvailability,
  hasOperationalPaymentProvider,
} from "@/features/commerce/payment-providers";
import { isCommerceCheckoutEnabled } from "@/features/commerce/runtime";

export default async function CommerceSettingsPage() {
  const [authorAgreement, readerTerms] = await Promise.all([
    getAuthorPublicationAgreementStatus(),
    getReaderPurchaseTermsStatus(),
  ]);

  const checkoutEnabled = isCommerceCheckoutEnabled();
  const providerReady = hasOperationalPaymentProvider();
  const paymentMethods = getPaymentMethodAvailability();
  const paidAccessReady =
    checkoutEnabled &&
    providerReady &&
    Boolean(authorAgreement?.active) &&
    authorAgreement?.lifecycleStatus === "active" &&
    Boolean(readerTerms?.active) &&
    readerTerms?.lifecycleStatus === "active";

  return (
    <>
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Ödeme Sistemi</span>
          <h1>Ayarlar</h1>
          <p>
            Commerce rollout, sözleşme yaşam döngüsü, para birimi ve provider
            readiness durumunu tek noktadan kontrol edin.
          </p>
        </div>
        <Link className="admin-button" href="/sistem-yonetimi/odeme-sistemi">
          Ödeme Sistemine dön
        </Link>
      </header>

      <section className="admin-settings-grid admin-commerce-summary">
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Checkout rollout</span>
          <h2>{checkoutEnabled ? "Açık" : "Kapalı"}</h2>
          <p>COMMERCE_CHECKOUT_ENABLED sunucu ayarı.</p>
        </article>

        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Operasyonel provider</span>
          <h2>{providerReady ? "Hazır" : "Hazır değil"}</h2>
          <p>Production-safe adapter bulunma durumu.</p>
        </article>

        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Para birimi</span>
          <h2>TRY</h2>
          <p>Commerce Foundation v1 ilk aktif para birimi.</p>
        </article>

        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Paid access readiness</span>
          <h2>{paidAccessReady ? "Hazır" : "Hazır değil"}</h2>
          <p>
            Rollout, provider ve aktif sözleşme koşulları birlikte sağlanmalı.
          </p>
        </article>
      </section>

      <section className="admin-detail-grid">
        <article className="admin-panel">
          <h2>Yazar yayın sözleşmesi</h2>
          {authorAgreement ? (
            <dl className="admin-profile-details">
              <div>
                <dt>Başlık</dt>
                <dd>{authorAgreement.title}</dd>
              </div>
              <div>
                <dt>Sürüm</dt>
                <dd>{authorAgreement.version}</dd>
              </div>
              <div>
                <dt>Lifecycle</dt>
                <dd>{authorAgreement.lifecycleStatus}</dd>
              </div>
              <div>
                <dt>Aktif</dt>
                <dd>{authorAgreement.active ? "Evet" : "Hayır"}</dd>
              </div>
            </dl>
          ) : (
            <p>Yazar yayın sözleşmesi kaydı bulunamadı.</p>
          )}
        </article>

        <article className="admin-panel">
          <h2>Okur satın alma koşulları</h2>
          {readerTerms ? (
            <dl className="admin-profile-details">
              <div>
                <dt>Başlık</dt>
                <dd>{readerTerms.title}</dd>
              </div>
              <div>
                <dt>Sürüm</dt>
                <dd>{readerTerms.version}</dd>
              </div>
              <div>
                <dt>Lifecycle</dt>
                <dd>{readerTerms.lifecycleStatus}</dd>
              </div>
              <div>
                <dt>Aktif</dt>
                <dd>{readerTerms.active ? "Evet" : "Hayır"}</dd>
              </div>
            </dl>
          ) : (
            <p>Okur satın alma koşulları kaydı bulunamadı.</p>
          )}
        </article>
      </section>

      <section className="admin-panel">
        <div className="admin-panel__heading">
          <div>
            <span>Provider kanalları</span>
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
                  ? `Aktif provider: ${method.providerCode}`
                  : "Operasyonel provider bağlı değil."}
              </p>
            </article>
          ))}
        </div>
      </section>

      <div className="admin-readonly-notice admin-commerce-readonly">
        <strong>Bu ekran durum görünümüdür</strong>
        <p>
          Environment flag, provider secret, komisyon, vergi veya payout
          kuralları admin formundan değiştirilmez. Bu değerler güvenli
          deployment ve ilgili onay süreçleri üzerinden yönetilir.
        </p>
      </div>
    </>
  );
}
