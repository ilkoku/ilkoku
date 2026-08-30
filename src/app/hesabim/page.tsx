import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AdminRoleViewControl } from "@/components/account/AdminRoleViewControl";
import { UserArea } from "@/components/layout/UserArea";
import { Brand } from "@/components/ui/Brand";
import { getCurrentAdminRoleView } from "@/features/admin-role-view/cookie";
import { revokeAdultContentAction } from "@/features/adult-content/actions";
import { logoutAction } from "@/features/auth/actions";
import { roleDestinations } from "@/features/auth/data";
import { getRoleNavigation } from "@/features/auth/destination";
import { getCurrentProfile } from "@/features/auth/profile";
import { PublisherApplicationCompletionForm } from "@/features/publisher-applications/components/PublisherApplicationCompletionForm";
import { getPublisherApplicationDefaults } from "@/features/publisher-applications/schema";
import { NotificationPreferencesForm } from "@/features/profile/components/NotificationPreferencesForm";
import { PasswordForm } from "@/features/profile/components/PasswordForm";
import { ProfileForm } from "@/features/profile/components/ProfileForm";
import { getProfilePageData } from "@/features/profile/queries";
import { getAdultContentAccess } from "@/lib/adult-content-access";
import { getNotificationPreferences } from "@/lib/notification-preferences";
import "@/features/profile/profile.css";
import "@/features/profile/notification-preferences.css";
import "@/features/profile/account-navigation.css";

export const metadata: Metadata = {
  title: "Hesabım | İlkOku",
  description: "İlkOku kişisel bilgilerinizi, güvenliğinizi ve rol başvurularınızı yönetin.",
};
export const dynamic = "force-dynamic";

const roleLabels = {
  admin: "Yönetici",
  editor: "Editör",
  editor_pending: "Editör adayı",
  publisher: "Yayınevi",
  reader: "Okur",
  writer: "Yazar",
} as const;

const requestStatusLabels = {
  approved: "Onaylandı",
  cancelled: "İptal edildi",
  pending: "Yönetici incelemesinde",
  rejected: "Reddedildi",
} as const;

const publisherApplicationStatusLabels = {
  approved: "Doğrulandı",
  changes_requested: "Düzeltme bekleniyor",
  draft: "Eksik bilgi",
  rejected: "Reddedildi",
  submitted: "İncelemeye gönderildi",
} as const;

const accountSections = [
  { href: "#genel-bakis", label: "Genel Bakış", helper: "Hesap ve rol özeti" },
  { href: "#kisisel-bilgiler", label: "Kişisel Bilgiler", helper: "Profil ve yazar bilgileri" },
  { href: "#yazdiginiz-turler", label: "Yazdığınız Türler", helper: "Yazarlık türlerinizi seçin" },
  { href: "#rol-basvurusu", label: "Rol & Başvurular", helper: "Başvuru ve doğrulama durumu" },
  { href: "#yetiskin-icerik", label: "18+ İçerik Erişimi", helper: "Yaş ve içerik tercihi" },
  { href: "#bildirim-tercihleri", label: "Bildirim Tercihleri", helper: "E-posta ve bildirim ayarları" },
  { href: "#guvenlik", label: "Güvenlik", helper: "Şifre ve oturum işlemleri" },
] as const;

const formatDate = (value: Date | null) => value
  ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short" }).format(value)
  : "—";

export default async function AccountPage({
  searchParams,
}: {
  searchParams: Promise<{ sekme?: string }>;
}) {
  const profile = await getCurrentProfile({ ignoreAdminRoleView: true });
  if (!profile) redirect("/giris?sonraki=/hesabim");

  const [data, notificationPreferences, adultAccess] = await Promise.all([
    getProfilePageData(profile.id),
    getNotificationPreferences(profile.id),
    profile.role === "admin"
      ? Promise.resolve(null)
      : getAdultContentAccess(profile.id),
  ]);
  if (!data) redirect("/giris?sonraki=/hesabim");

  const adminRoleView = profile.role === "admin"
    ? await getCurrentAdminRoleView()
    : null;
  const { sekme } = await searchParams;
  const initial = (data.username || profile.fullName).charAt(0).toLocaleUpperCase("tr");
  const navigation = await getRoleNavigation(profile);
  const approvedRoleHref = data.latestRoleRequest?.status === "approved"
    ? roleDestinations[data.latestRoleRequest.requestedRole]
    : null;
  const publisherApplication = data.latestRoleRequest?.publisherApplication;
  const needsPublisherApplication = data.latestRoleRequest?.requestedRole === "publisher"
    && data.latestRoleRequest.status === "pending"
    && (!publisherApplication
      || publisherApplication.verificationStatus === "draft"
      || publisherApplication.verificationStatus === "changes_requested");
  const publisherApplicationDefaults = getPublisherApplicationDefaults(
    publisherApplication,
  );
  const accountName = data.username ? `@${data.username}` : profile.fullName;

  return (
    <div className="account-shell">
      <header className="account-shell__header">
        <Brand />
        <UserArea profile={profile} workspaceHref={navigation.workspaceHref} />
      </header>

      <main className="account-page">
        <div className="account-layout">
          <aside className="account-sidebar" aria-label="Hesap menüsü">
            <p className="account-sidebar__label">Hesap ayarları</p>

            <div className="account-sidebar__profile">
              {data.avatarUrl ? (
                <Image
                  alt={`${profile.fullName} profil fotoğrafı`}
                  className="account-sidebar__avatar"
                  height={48}
                  src={data.avatarUrl}
                  width={48}
                />
              ) : (
                <span className="account-sidebar__avatar" aria-hidden="true">
                  {initial}
                </span>
              )}
              <div className="account-sidebar__profile-copy">
                <strong>{accountName}</strong>
                <span>{roleLabels[data.role]}</span>
                <small>Üyelik: {formatDate(data.createdAt)}</small>
              </div>
            </div>

            <nav className="account-sidebar__nav" aria-label="Hesap bölümleri">
              {accountSections.map((item) => (
                <a href={item.href} key={item.href}>
                  <strong>{item.label}</strong>
                  <small>{item.helper}</small>
                </a>
              ))}
            </nav>

            <div className="account-sidebar__footer">
              <Link href={navigation.workspaceHref}>← Çalışma Alanıma Dön</Link>
              <Link href="/">Ana Sayfa</Link>
              <form action={logoutAction}>
                <button type="submit">Çıkış Yap</button>
              </form>
            </div>
          </aside>

          <div className="account-content">
            <header className="profile-page__header" id="genel-bakis">
              <div>
                <p className="profile-page__eyebrow">Hesap ve güvenlik</p>
                <h1>Hesabım</h1>
                <p>
                  Kişisel bilgilerinizi, aktif rolünüzü, bildirimlerinizi ve
                  güvenlik ayarlarınızı tek yerden yönetin.
                </p>
              </div>

              <div className="account-overview" aria-label="Hesap özeti">
                <div className="account-overview__item">
                  <span>Kullanıcı</span>
                  <strong>{accountName}</strong>
                </div>
                <div className="account-overview__item">
                  <span>Aktif rol</span>
                  <strong>{roleLabels[data.role]}</strong>
                </div>
                <div className="account-overview__item">
                  <span>Üyelik</span>
                  <strong>{formatDate(data.createdAt)}</strong>
                </div>
              </div>
            </header>

            {profile.role === "admin" ? (
              <AdminRoleViewControl currentRole={adminRoleView?.role ?? null} />
            ) : null}

            <section className="profile-card" id="kisisel-bilgiler">
              <div className="profile-card__heading">
                <div>
                  <p>Kişisel bilgiler</p>
                  <h2>Profil bilgileri</h2>
                </div>
              </div>
              <ProfileForm data={data} />
            </section>

            <section
              className="profile-card account-role-request"
              data-highlight={sekme === "rol-basvurusu" || undefined}
              id="rol-basvurusu"
            >
              <div className="profile-card__heading">
                <div>
                  <p>Rol başvurusu</p>
                  <h2>Son başvuru durumu</h2>
                </div>
              </div>

              {data.latestRoleRequest ? (
                <>
                  <dl className="account-role-request__details">
                    <div>
                      <dt>Talep edilen rol</dt>
                      <dd>{roleLabels[data.latestRoleRequest.requestedRole]}</dd>
                    </div>
                    <div>
                      <dt>Durum</dt>
                      <dd data-status={data.latestRoleRequest.status}>
                        {requestStatusLabels[data.latestRoleRequest.status]}
                      </dd>
                    </div>
                    <div>
                      <dt>Başvuru tarihi</dt>
                      <dd>{formatDate(data.latestRoleRequest.createdAt)}</dd>
                    </div>
                    <div>
                      <dt>Değerlendirme</dt>
                      <dd>{formatDate(data.latestRoleRequest.reviewedAt)}</dd>
                    </div>
                    <div>
                      <dt>Değerlendiren</dt>
                      <dd>{data.latestRoleRequest.adminName || "—"}</dd>
                    </div>
                    <div>
                      <dt>Admin notu</dt>
                      <dd>
                        {data.latestRoleRequest.reviewNote || "Henüz değerlendirme notu yok."}
                      </dd>
                    </div>
                    {data.latestRoleRequest.requestedRole === "publisher" ? (
                      <>
                        <div>
                          <dt>Başvurulan yayınevi</dt>
                          <dd>{publisherApplication?.publisherName || "Kurumsal bilgi eksik"}</dd>
                        </div>
                        <div>
                          <dt>Kurumsal doğrulama</dt>
                          <dd data-status={publisherApplication?.verificationStatus || "draft"}>
                            {publisherApplication
                              ? publisherApplicationStatusLabels[publisherApplication.verificationStatus]
                              : "Bilgilerinizi tamamlayın"}
                          </dd>
                        </div>
                        <div>
                          <dt>Düzeltme açıklaması</dt>
                          <dd>{publisherApplication?.correctionNote || "—"}</dd>
                        </div>
                      </>
                    ) : null}
                  </dl>

                  {needsPublisherApplication ? (
                    <div className="account-publisher-application">
                      <div className="profile-card__heading">
                        <div>
                          <p>Kurumsal doğrulama</p>
                          <h2>Yayınevi bilgilerini tamamlayın</h2>
                        </div>
                      </div>
                      <PublisherApplicationCompletionForm
                        defaults={publisherApplicationDefaults}
                      />
                    </div>
                  ) : null}

                  {approvedRoleHref ? (
                    <Link
                      className="button button--primary account-role-request__workspace"
                      href={approvedRoleHref}
                    >
                      Onaylanan çalışma alanına geç
                    </Link>
                  ) : null}
                </>
              ) : (
                <p className="account-role-request__empty">
                  Henüz bir rol başvurunuz bulunmuyor.
                </p>
              )}
            </section>

            <section className="profile-card" id="yetiskin-icerik">
              <div className="profile-card__heading">
                <div>
                  <p>İçerik erişimi</p>
                  <h2>18+ içerik erişimi</h2>
                </div>
              </div>

              {profile.role === "admin" ? (
                <p>
                  Yönetici hesabı içerik denetimi için yaş filtresinden bağımsızdır.
                </p>
              ) : adultAccess?.needsBirthDate ? (
                <>
                  <p>
                    İçerik yaş sınıflarını doğru uygulayabilmek için yaş bilginizi bir kez doğrulayın.
                    Tam doğum tarihiniz public profilinizde gösterilmez.
                  </p>
                  <Link
                    className="button button--primary"
                    href="/yas-dogrulama?sonraki=%2Fhesabim%23yetiskin-icerik"
                  >
                    Yaş bilgimi doğrula
                  </Link>
                </>
              ) : !adultAccess?.isAdult ? (
                <>
                  <p>Yaş bilgisi doğrulandı.</p>
                  <p>
                    Bu hesap 18+ içerik erişimine uygun değildir. 18+ eserler Keşfet ve okuma alanlarında gösterilmez.
                  </p>
                </>
              ) : adultAccess.canAccessAdultContent ? (
                <>
                  <p>
                    Yaş bilgisi doğrulandı. 18+ içerik tercihiniz açık; 18+ eserler ortak Keşfet havuzunda gösterilir.
                  </p>
                  <form action={revokeAdultContentAction}>
                    <input
                      name="returnTo"
                      type="hidden"
                      value="/hesabim#yetiskin-icerik"
                    />
                    <button className="button button--outline" type="submit">
                      18+ içerikleri kapat
                    </button>
                  </form>
                </>
              ) : (
                <>
                  <p>
                    Yaş bilgisi doğrulandı ve hesabınız 18+ erişime uygundur. 18+ eserleri görmek için ikinci açık onay gereklidir.
                  </p>
                  <Link
                    className="button button--primary"
                    href="/yetiskin-icerik-onayi?sonraki=%2Fhesabim%23yetiskin-icerik"
                  >
                    18+ içerikleri aç
                  </Link>
                </>
              )}
            </section>

            <section className="profile-card" id="bildirim-tercihleri">
              <div className="profile-card__heading">
                <div>
                  <p>E-posta bildirimleri</p>
                  <h2>Bildirim tercihleri</h2>
                </div>
              </div>
              <NotificationPreferencesForm preferences={notificationPreferences} />
            </section>

            <div className="profile-page__lower-grid" id="guvenlik">
              <section className="profile-card">
                <div className="profile-card__heading">
                  <div>
                    <p>Güvenlik</p>
                    <h2>Şifre değiştir</h2>
                  </div>
                </div>
                <PasswordForm />
              </section>

              <section className="profile-card profile-card--session">
                <div className="profile-card__heading">
                  <div>
                    <p>Oturum</p>
                    <h2>Hesaptan çıkış</h2>
                  </div>
                </div>
                <p>Bu cihazdaki İlkOku oturumunuzu güvenli şekilde sonlandırır.</p>
                <form action={logoutAction}>
                  <button className="button button--outline" type="submit">
                    <span className="button__label">Oturumu kapat</span>
                  </button>
                </form>
              </section>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
