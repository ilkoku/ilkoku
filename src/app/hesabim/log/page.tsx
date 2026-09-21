import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { UserArea } from "@/components/layout/UserArea";
import { Brand } from "@/components/ui/Brand";
import { getRoleNavigation } from "@/features/auth/destination";
import { getCurrentProfile } from "@/features/auth/profile";
import { listWriterCommerceLog } from "@/features/commerce/repository";
import "@/features/profile/profile.css";
import "@/features/profile/account-navigation.css";

export const metadata: Metadata = {
  title: "Log | Hesabım | İlkOku",
  description: "Yazar yayın modeli değişiklik ve yürürlük geçmişinizi görüntüleyin.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

function formatMoney(value: bigint | null, currency: string) {
  if (value === null) return "—";
  return new Intl.NumberFormat("tr-TR", {
    style: "currency",
    currency,
  }).format(Number(value) / 100);
}

function formatDateTime(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

export default async function WriterAccountLogPage() {
  const profile = await getCurrentProfile({ ignoreAdminRoleView: true });

  if (!profile) {
    redirect("/giris?sonraki=/hesabim/log");
  }

  if (profile.role !== "writer") {
    redirect("/erisim-reddedildi?kaynak=writer");
  }

  const [navigation, records] = await Promise.all([
    getRoleNavigation(profile),
    listWriterCommerceLog(profile.id),
  ]);

  return (
    <div className="account-shell">
      <header className="account-shell__header">
        <Brand />
        <UserArea profile={profile} workspaceHref={navigation.workspaceHref} />
      </header>

      <main className="account-page">
        <div className="account-content">
          <header className="profile-page__header">
            <div>
              <p className="profile-page__eyebrow">Hesabım</p>
              <h1>Log</h1>
              <p>
                Eserlerinin yayın modeli değişikliklerini ve yürürlüğe giren son
                onaylarını tarih-saat sırasıyla burada görebilirsin.
              </p>
            </div>

            <Link className="button button--outline" href="/hesabim">
              Hesabıma dön
            </Link>
          </header>

          <section className="profile-card">
            <div className="profile-card__heading">
              <div>
                <p>Yazar hareketleri</p>
                <h2>Yayın modeli geçmişi</h2>
              </div>
              <span className="account-log__count">{records.length} kayıt</span>
            </div>

            {records.length === 0 ? (
              <div className="account-log__empty">
                Henüz yayın modeli geçmişinde gösterilecek bir kayıt yok.
              </div>
            ) : (
              <div className="account-log__list">
                {records.map((record) => (
                  <article className="account-log__row" key={record.id}>
                    <div className="account-log__main">
                      <Link href={`/satis-erisim/${record.workId}`}>
                        {record.workTitle}
                      </Link>
                      <span>
                        {record.kind === "effective"
                          ? "Yürürlük onayı"
                          : "Taslak değişikliği"}
                      </span>
                    </div>

                    <div className="account-log__state">
                      <strong>
                        {record.saleModel === "paid" ? "Ücretli" : "Ücretsiz"}
                      </strong>
                      <span>
                        {record.saleModel === "paid"
                          ? formatMoney(record.priceAmount, record.currency)
                          : "—"}
                      </span>
                    </div>

                    <time
                      className="account-log__time"
                      dateTime={record.happenedAt.toISOString()}
                    >
                      {formatDateTime(record.happenedAt)}
                    </time>
                  </article>
                ))}
              </div>
            )}
          </section>
        </div>
      </main>
    </div>
  );
}
