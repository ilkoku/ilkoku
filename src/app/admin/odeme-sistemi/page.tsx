import Link from "next/link";

import { getPaymentMethodAvailability } from "@/features/commerce/payment-providers";
import { isCommerceCheckoutEnabled } from "@/features/commerce/runtime";
import { prisma } from "@/lib/prisma";

export default async function PaymentSystemPage() {
  const checkoutEnabled = isCommerceCheckoutEnabled();
  const paymentMethods = getPaymentMethodAvailability();
  const operationalProviderCount = paymentMethods.filter(
    (item) => item.available,
  ).length;

  const [orders, payments, refunds, platformCoupons] = await Promise.all([
    prisma.order.count(),
    prisma.payment.count(),
    prisma.refund.count(),
    prisma.coupon.count({ where: { owner: "platform" } }),
  ]);

  return (
    <>
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Commerce operasyonu</span>
          <h1>Ödeme Sistemi</h1>
          <p>
            Sipariş, ödeme denemesi, kupon, iade ve erişim altyapısının
            operasyon görünümü.
          </p>
        </div>
        <span
          className="admin-table-badge"
          data-status={checkoutEnabled ? "active" : "pending"}
        >
          {checkoutEnabled ? "Tahsilat aktif" : "Hazırlık modu"}
        </span>
      </header>

      <section className="admin-settings-grid">
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Siparişler</span>
          <h2>{orders.toLocaleString("tr-TR")}</h2>
          <p>Okur satın alma siparişleri.</p>
          <Link href="/sistem-yonetimi/odeme-sistemi/siparisler">
            Siparişleri aç →
          </Link>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Ödeme denemeleri</span>
          <h2>{payments.toLocaleString("tr-TR")}</h2>
          <p>Provider bağımsız ödeme kayıtları.</p>
          <Link href="/sistem-yonetimi/odeme-sistemi/odemeler">
            Ödemeleri aç →
          </Link>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">İadeler</span>
          <h2>{refunds.toLocaleString("tr-TR")}</h2>
          <p>İade operasyon kayıtları.</p>
          <Link href="/sistem-yonetimi/odeme-sistemi/iadeler">
            İadeleri aç →
          </Link>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">İlkOku kuponları</span>
          <h2>{platformCoupons.toLocaleString("tr-TR")}</h2>
          <p>Platform tarafından finanse edilen kampanyalar.</p>
          <Link href="/sistem-yonetimi/odeme-sistemi/kuponlar">
            Kuponları aç →
          </Link>
        </article>
      </section>

      <section className="admin-detail-grid">
        <article className="admin-panel">
          <h2>Kuponlar & Kampanyalar</h2>
          <p>
            İlkOku kuponları yazarın hakedişini azaltmaz. Kampanya indirimi
            platform maliyeti olarak finans kayıtlarına yazılır.
          </p>
          <Link
            className="admin-button admin-button--primary"
            href="/sistem-yonetimi/odeme-sistemi/kuponlar"
          >
            Kupon yönetimini aç
          </Link>
        </article>

        <article className="admin-panel">
          <h2>Ödeme sağlayıcıları</h2>
          <p>
            {operationalProviderCount > 0
              ? `${operationalProviderCount} ödeme sağlayıcısı operasyonel.`
              : "Gerçek kart ve mobil ödeme sağlayıcıları henüz aktif değildir."}
          </p>
          <div className="admin-stack">
            {paymentMethods.map((method) => (
              <div key={method.method}>
                <strong>{method.label}</strong>
                <span>
                  {method.available
                    ? ` · aktif · ${method.providerCode}`
                    : " · yapılandırılmadı"}
                </span>
              </div>
            ))}
          </div>
        </article>
      </section>
    </>
  );
}
