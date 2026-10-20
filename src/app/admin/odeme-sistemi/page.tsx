import Link from "next/link";

import { getPaymentMethodAvailability } from "@/features/commerce/payment-providers";
import { isCommerceCheckoutEnabled } from "@/features/commerce/runtime";
import { prisma } from "@/lib/prisma";

export default async function PaymentSystemPage() {
  const checkoutEnabled = isCommerceCheckoutEnabled();
  const paymentMethods = getPaymentMethodAvailability();
  const operationalProviderCount = paymentMethods.filter(
    (method) => method.available,
  ).length;

  const [orders, payments, refunds, entitlements, platformCoupons] =
    await Promise.all([
      prisma.order.count(),
      prisma.payment.count(),
      prisma.refund.count(),
      prisma.workEntitlement.count(),
      prisma.coupon.count({ where: { owner: "platform" } }),
    ]);

  const metrics = [
    {
      label: "Siparişler",
      count: orders,
      detail: "Satın alma siparişleri",
      href: "/sistem-yonetimi/odeme-sistemi/siparisler",
      action: "Siparişleri görüntüle",
    },
    {
      label: "Ödemeler",
      count: payments,
      detail: "Ödeme denemeleri",
      href: "/sistem-yonetimi/odeme-sistemi/odemeler",
      action: "Ödemeleri görüntüle",
    },
    {
      label: "İadeler",
      count: refunds,
      detail: "İade kayıtları",
      href: "/sistem-yonetimi/odeme-sistemi/iadeler",
      action: "İadeleri görüntüle",
    },
    {
      label: "Erişim hakları",
      count: entitlements,
      detail: "Okur–eser erişimleri",
      href: "/sistem-yonetimi/odeme-sistemi/erisim-haklari",
      action: "Erişim haklarını görüntüle",
    },
    {
      label: "İlkOku kuponları",
      count: platformCoupons,
      detail: "Platform kuponları",
      href: "/sistem-yonetimi/odeme-sistemi/kuponlar",
      action: "Kuponları görüntüle",
    },
  ];

  return (
    <div className="admin-commerce-overview">
      <header className="admin-page-heading admin-commerce-overview__heading">
        <div>
          <span className="admin-eyebrow">Ticaret ve finans / Operasyon özeti</span>
          <h1>Ödeme Sistemi</h1>
          <p>
            Siparişleri, ödeme denemelerini, iadeleri ve okur erişimlerini
            tek ekranda takip edin.
          </p>
        </div>
        <span
          className="admin-table-badge"
          data-status={checkoutEnabled ? "active" : "pending"}
        >
          {checkoutEnabled ? "Checkout açık" : "Checkout kapalı"}
        </span>
      </header>

      <section className="admin-commerce-overview__section" aria-labelledby="commerce-metrics-heading">
        <div className="admin-commerce-overview__section-heading">
          <div>
            <h2 id="commerce-metrics-heading">Operasyon özeti</h2>
            <p>Toplam kayıt sayıları · tüm zamanlar</p>
          </div>
        </div>
        <div className="admin-commerce-overview__metrics">
          {metrics.map((metric) => (
            <article className="admin-panel admin-commerce-overview__metric" key={metric.href}>
              <span>{metric.label}</span>
              <strong>{metric.count.toLocaleString("tr-TR")}</strong>
              <p>{metric.detail}</p>
              <Link href={metric.href}>
                {metric.action} <span aria-hidden="true">→</span>
              </Link>
            </article>
          ))}
        </div>
      </section>

      <section className="admin-commerce-overview__details" aria-label="Ödeme sistemi hazırlık ve yapılandırma durumu">
        <article className="admin-panel admin-commerce-overview__providers">
          <div className="admin-commerce-overview__panel-heading">
            <div>
              <span className="admin-eyebrow">Altyapı</span>
              <h2>Ödeme kanalları</h2>
            </div>
            <Link href="/sistem-yonetimi/odeme-sistemi/saglayicilar">
              Sağlayıcıları aç <span aria-hidden="true">→</span>
            </Link>
          </div>
          <p className="admin-commerce-overview__subtext">
            {operationalProviderCount} / {paymentMethods.length} kanal operasyonel
          </p>
          <ul className="admin-commerce-overview__provider-list">
            {paymentMethods.map((method) => (
              <li key={method.method}>
                <div>
                  <strong>{method.label}</strong>
                  {method.available && method.providerCode ? (
                    <small>{method.providerCode}</small>
                  ) : null}
                </div>
                <span data-ready={method.available ? "yes" : "no"}>
                  {method.available ? "Operasyonel" : "Yapılandırılmadı"}
                </span>
              </li>
            ))}
          </ul>
        </article>

        <article className="admin-panel admin-commerce-overview__settings">
          <span className="admin-eyebrow">Kontrol merkezi</span>
          <h2>Yapılandırma ve hazırlık</h2>
          <p>
            Checkout, sözleşmeler ve ödeme altyapısının hazır olma koşullarını
            ayarlar ekranından birlikte kontrol edin.
          </p>
          <p className="admin-commerce-overview__notice">
            {checkoutEnabled && operationalProviderCount === 0
              ? "Checkout açık olsa da operasyonel ödeme sağlayıcısı yok; gerçek tahsilat hazır değil."
              : !checkoutEnabled
                ? "Checkout kapalı. Buradaki sayılar geçmiş veya hazırlık kayıtlarını gösterir."
                : "Sağlayıcı durumu tek başına ücretli erişimin hazır olduğunu göstermez; sözleşme koşullarını da kontrol edin."}
          </p>
          <Link className="admin-commerce-overview__settings-link" href="/sistem-yonetimi/odeme-sistemi/ayarlar">
            Ayar durumunu görüntüle <span aria-hidden="true">→</span>
          </Link>
          <p className="admin-commerce-overview__policy">
            İlkOku kupon indirimleri yazarın hakedişini azaltmaz; kampanya
            maliyeti platform tarafından karşılanır.
          </p>
        </article>
      </section>
    </div>
  );
}
