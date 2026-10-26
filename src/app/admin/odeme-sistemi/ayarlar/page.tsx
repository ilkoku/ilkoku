import Link from "next/link";

import { getAuthorPublicationAgreementStatus } from "@/features/commerce/agreement";
import { getReaderPurchaseTermsStatus } from "@/features/commerce/checkout-terms";
import {
  getPaymentMethodAvailability,
  hasOperationalPaymentProvider,
} from "@/features/commerce/payment-providers";
import { isCommerceCheckoutEnabled } from "@/features/commerce/runtime";
import { getVerifiedWorkSeller } from "@/features/commerce/verified-seller";
import { prisma } from "@/lib/prisma";

export default async function CommerceSettingsPage() {
  const [authorAgreement, readerTerms] = await Promise.all([
    getAuthorPublicationAgreementStatus(),
    getReaderPurchaseTermsStatus(),
  ]);

  const [zeroTotalWorks, sampleWork] = await Promise.all([
    prisma.workSaleConfiguration.count({
      where: { saleModel: "paid", status: "ready", priceAmount: BigInt(0), activatedAt: null,
        work: { isActive: true, archivedAt: null, status: "published", visibility: "public" } },
    }),
    prisma.work.findFirst({
      where: {
        slug: "yeni-test209-30820c6a",
        isActive: true,
        archivedAt: null,
        publishedAt: { not: null },
        status: "published",
        visibility: "public",
        author: { is: { deletedAt: null, status: "active" } },
      },
      select: {
        id: true,
        title: true,
        saleConfiguration: {
          select: {
            saleModel: true,
            status: true,
            priceAmount: true,
            activatedAt: true,
          },
        },
      },
    }),
  ]);
  const sampleSeller = sampleWork ? await getVerifiedWorkSeller(sampleWork.id) : null;
  const readerTermsReady = Boolean(
    readerTerms?.active && readerTerms.lifecycleStatus === "active" && !readerTerms.placeholder
  );
  // The dashboard must match completeZeroTotalCheckout's staged 0 TL gate.
  // A verified seller and active contract alone are not enough if the work
  // is free, in draft, already activated, or priced above zero.
  const sampleZeroTotalStaged = Boolean(
    sampleWork?.saleConfiguration?.saleModel === "paid" &&
    sampleWork.saleConfiguration.status === "ready" &&
    sampleWork.saleConfiguration.priceAmount === BigInt(0) &&
    !sampleWork.saleConfiguration.activatedAt
  );
  const zeroTotalExampleReady = Boolean(
    sampleZeroTotalStaged && sampleSeller && readerTermsReady
  );

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

      <section className="admin-panel" aria-labelledby="zero-total-readiness-title">
        <div className="admin-panel__heading">
          <div>
            <span className="admin-eyebrow">Gerçek tahsilat yok · 0 TL edinim</span>
            <h2 id="zero-total-readiness-title">0 TL Akış Aktivasyon Denetimi</h2>
          </div>
          <b>{zeroTotalExampleReady ? "İşleme hazır" : "Eksikler var"}</b>
        </div>
        <p>
          Bu akış banka/kart/ödeme sağlayıcısı gerektirmez. Yeni sipariş için
          aktif ve gerçek okur koşulları ile doğrulanmış eser satıcısı ve satış yetkisi zorunludur.
          Gerçek tahsilat bu ekran üzerinden açılmaz.
        </p>
        <div className="admin-settings-grid admin-commerce-summary">
          <article className="admin-settings-card">
            <span className="admin-eyebrow">0 TL eser hazırlığı</span>
            <h3>{zeroTotalWorks.toLocaleString("tr-TR")}</h3>
            <p>Ücretli modeli seçilmiş, yayımlanmış, henüz etkinleştirilmemiş 0 TL eser.</p>
          </article>
          <article className="admin-settings-card">
            <span className="admin-eyebrow">Okur koşulları</span>
            <h3>{readerTermsReady ? "Aktif" : "Aktif değil"}</h3>
            <p>{readerTerms?.placeholder ? "Mevcut metin çalışma taslağı; kullanılamaz." : "Güncel sürümün onayı ve aktivasyonu gerekir."}</p>
          </article>
          <article className="admin-settings-card">
            <span className="admin-eyebrow">YENİ TEST209 satıcısı</span>
            <h3>{sampleSeller ? "Doğrulandı" : "Doğrulanmadı"}</h3>
            <p>Hukukî taraf, eser bazlı satıcı ataması ve satış yetkisi birlikte doğrulanır.</p>
          </article>
        </div>
        <p>
          {zeroTotalExampleReady
            ? "YENİ TEST209 için gerekli 0 TL edinim kapıları doğrulandı. Son kabul testi okur rolüyle yapılmalıdır."
            : "Akış kendiliğinden açılmaz: eksik sözleşme veya doğrulanmamış satıcıyla yeni sipariş oluşturulamaz."}
        </p>
        <p>
          <Link href={readerTerms ? `/sozlesme/sablonlar/${readerTerms.id}` : "/sozlesme/sablonlar"}>
            Okur sözleşmesi çalışma masasını aç →
          </Link>
          {" · "}
          <Link href="/sistem-yonetimi/odeme-sistemi/satici-yetkileri">
            Satıcı ve satış yetkisi çalışma alanını aç →
          </Link>
          {" · "}
          <Link href="/sistem-yonetimi/eserler/6ebb633f-4356-459c-ac12-4fbd253a49e7">
            YENİ TEST209 eserini aç →
          </Link>
          {" · "}
          <Link href="/sistem-yonetimi/finans-gelirler/mutabakat">
            Finans mutabakatını aç →
          </Link>
        </p>
      </section>

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
