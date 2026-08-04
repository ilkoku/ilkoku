import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { UserArea } from "@/components/layout/UserArea";
import { AdminRoleViewControl } from "@/components/account/AdminRoleViewControl";
import { Brand } from "@/components/ui/Brand";
import { logoutAction } from "@/features/auth/actions";
import { roleDestinations } from "@/features/auth/data";
import { getRoleNavigation } from "@/features/auth/destination";
import { getCurrentAdminRoleView } from "@/features/admin-role-view/cookie";
import { getCurrentProfile } from "@/features/auth/profile";
import { PublisherApplicationCompletionForm } from "@/features/publisher-applications/components/PublisherApplicationCompletionForm";
import { getPublisherApplicationDefaults } from "@/features/publisher-applications/schema";
import { NotificationPreferencesForm } from "@/features/profile/components/NotificationPreferencesForm";
import { PasswordForm } from "@/features/profile/components/PasswordForm";
import { ProfileForm } from "@/features/profile/components/ProfileForm";
import { getProfilePageData } from "@/features/profile/queries";
import { getNotificationPreferences } from "@/lib/notification-preferences";
import "@/features/profile/profile.css";
import "@/features/profile/notification-preferences.css";

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

const formatDate = (value: Date | null) => value
  ? new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short" }).format(value)
  : "—";

export default async function AccountPage({ searchParams }: { searchParams: Promise<{ sekme?: string }> }) {
  const profile = await getCurrentProfile({ ignoreAdminRoleView: true });
  if (!profile) redirect("/giris?sonraki=/hesabim");
  const [data, notificationPreferences] = await Promise.all([
    getProfilePageData(profile.id),
    getNotificationPreferences(profile.id),
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

  return <div className="account-shell">
    <header className="account-shell__header"><Brand /><UserArea profile={profile} workspaceHref={navigation.workspaceHref} /></header>
    <main className="profile-page">
      <nav className="account-breadcrumb" aria-label="Hesap bağlantıları"><Link href="/">Ana Sayfa</Link><Link href={navigation.workspaceHref}>Çalışma Alanıma Dön</Link><form action={logoutAction}><button type="submit">Çıkış Yap</button></form></nav>
      <header className="profile-page__header">
        <div><p className="profile-page__eyebrow">Hesap ve güvenlik</p><h1>Hesabım</h1><p>Kişisel bilgilerinizi, aktif rolünüzü, şifrenizi ve rol başvurularınızı tek yerden yönetin.</p></div>
        <div className="profile-identity">{data.avatarUrl ? <Image alt={`${profile.fullName} profil fotoğrafı`} className="profile-identity__avatar" height={72} src={data.avatarUrl} width={72} /> : <span className="profile-identity__avatar" aria-hidden="true">{initial}</span>}<div><strong>{data.username ? `@${data.username}` : profile.fullName}</strong><span>Aktif rol: {roleLabels[data.role]}</span><small>Üyelik: {formatDate(data.createdAt)}</small></div></div>
      </header>

      {profile.role === "admin" ? (
        <AdminRoleViewControl currentRole={adminRoleView?.role ?? null} />
      ) : null}

      <section className="profile-card account-role-request" data-highlight={sekme === "rol-basvurusu" || undefined} id="rol-basvurusu">
        <div className="profile-card__heading"><div><p>Rol başvurusu</p><h2>Son başvuru durumu</h2></div></div>
        {data.latestRoleRequest ? (
          <>
            <dl className="account-role-request__details">
              <div><dt>Talep edilen rol</dt><dd>{roleLabels[data.latestRoleRequest.requestedRole]}</dd></div>
              <div><dt>Durum</dt><dd data-status={data.latestRoleRequest.status}>{requestStatusLabels[data.latestRoleRequest.status]}</dd></div>
              <div><dt>Başvuru tarihi</dt><dd>{formatDate(data.latestRoleRequest.createdAt)}</dd></div>
              <div><dt>Değerlendirme</dt><dd>{formatDate(data.latestRoleRequest.reviewedAt)}</dd></div>
              <div><dt>Değerlendiren</dt><dd>{data.latestRoleRequest.adminName || "—"}</dd></div>
              <div><dt>Admin notu</dt><dd>{data.latestRoleRequest.reviewNote || "Henüz değerlendirme notu yok."}</dd></div>
              {data.latestRoleRequest.requestedRole === "publisher" ? (
                <>
                  <div><dt>Başvurulan yayınevi</dt><dd>{publisherApplication?.publisherName || "Kurumsal bilgi eksik"}</dd></div>
                  <div><dt>Kurumsal doğrulama</dt><dd data-status={publisherApplication?.verificationStatus || "draft"}>{publisherApplication ? publisherApplicationStatusLabels[publisherApplication.verificationStatus] : "Bilgilerinizi tamamlayın"}</dd></div>
                  <div><dt>Düzeltme açıklaması</dt><dd>{publisherApplication?.correctionNote || "—"}</dd></div>
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
            {approvedRoleHref ? <Link className="button button--primary account-role-request__workspace" href={approvedRoleHref}>Onaylanan çalışma alanına geç</Link> : null}
          </>
        ) : <p className="account-role-request__empty">Henüz bir rol başvurunuz bulunmuyor.</p>}
      </section>

      <section className="profile-card"><div className="profile-card__heading"><div><p>Kişisel bilgiler</p><h2>Profil bilgileri</h2></div></div><ProfileForm data={data} /></section>
      <section className="profile-card" id="bildirim-tercihleri"><div className="profile-card__heading"><div><p>E-posta bildirimleri</p><h2>Bildirim tercihleri</h2></div></div><NotificationPreferencesForm preferences={notificationPreferences} /></section>
      <div className="profile-page__lower-grid"><section className="profile-card"><div className="profile-card__heading"><div><p>Güvenlik</p><h2>Şifre değiştir</h2></div></div><PasswordForm /></section><section className="profile-card profile-card--session"><div className="profile-card__heading"><div><p>Oturum</p><h2>Hesaptan çıkış</h2></div></div><p>Bu cihazdaki İlkOku oturumunuzu güvenli şekilde sonlandırır.</p><form action={logoutAction}><button className="button button--outline" type="submit"><span className="button__label">Oturumu kapat</span></button></form></section></div>
    </main>
  </div>;
}
