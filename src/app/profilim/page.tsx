import type { Metadata } from "next";
import Image from "next/image";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { logoutAction } from "@/features/auth/actions";
import { getCurrentProfile } from "@/features/auth/profile";
import { PasswordForm } from "@/features/profile/components/PasswordForm";
import { ProfileForm } from "@/features/profile/components/ProfileForm";
import { getProfilePageData } from "@/features/profile/queries";
import "@/features/profile/profile.css";

export const metadata: Metadata = {
  title: "Profilim | İlkOku",
  description: "İlkOku profil, rumuz ve yazarlık bilgilerinizi yönetin.",
};

export const dynamic = "force-dynamic";

const roleLabels: Record<string, string> = {
  admin: "Yönetici",
  editor: "Editör",
  editor_pending: "Editör adayı",
  publisher: "Yayınevi",
  reader: "Okur",
  writer: "Yazar",
};

export default async function ProfilePage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/giris?sonraki=/profilim");

  const data = await getProfilePageData(profile.id);
  if (!data) redirect("/giris?sonraki=/profilim");

  const initial = (data.username || profile.fullName).charAt(0).toLocaleUpperCase("tr");

  return (
    <AppShell profile={profile}>
      <div className="profile-page">
        <header className="profile-page__header">
          <div>
            <p className="profile-page__eyebrow">Hesap ve yazar kimliği</p>
            <h1>Profilim</h1>
            <p>Rumuzunuzu, biyografinizi ve yazdığınız türleri yönetin.</p>
          </div>
          <div className="profile-identity">
            {data.avatarUrl ? (
              <Image alt={`${profile.fullName} profil fotoğrafı`} className="profile-identity__avatar" height={72} src={data.avatarUrl} width={72} />
            ) : (
              <span className="profile-identity__avatar" aria-hidden="true">{initial}</span>
            )}
            <div>
              <strong>{data.username ? `@${data.username}` : profile.fullName}</strong>
              <span>{roleLabels[data.role] ?? data.role}</span>
              <small>Üyelik: {new Intl.DateTimeFormat("tr-TR", { dateStyle: "long" }).format(data.createdAt)}</small>
            </div>
          </div>
        </header>

        <section className="profile-card">
          <div className="profile-card__heading">
            <div>
              <p>Genel bilgiler</p>
              <h2>Profil ve yazarlık bilgileri</h2>
            </div>
          </div>
          <ProfileForm data={data} />
        </section>

        <div className="profile-page__lower-grid">
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
              <button className="button button--outline" type="submit"><span className="button__label">Oturumu kapat</span></button>
            </form>
          </section>
        </div>
      </div>
    </AppShell>
  );
}
