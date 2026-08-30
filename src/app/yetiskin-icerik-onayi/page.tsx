import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/ui/Brand";
import { acceptAdultContentAction } from "@/features/adult-content/actions";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getAdultContentAccess,
  safeAdultGateReturnPath,
} from "@/lib/adult-content-access";
import "@/features/profile/profile.css";

export const metadata: Metadata = {
  title: "18+ İçerik Onayı | İlkOku",
  description: "18+ içerikleri görmek ve okumak için açık onayınızı yönetin.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AdultContentConsentPage({
  searchParams,
}: {
  searchParams: Promise<{ sonraki?: string }>;
}) {
  const user = await getCurrentUser();
  const { sonraki } = await searchParams;
  const returnTo = safeAdultGateReturnPath(sonraki);

  if (!user) {
    redirect(`/giris?sonraki=${encodeURIComponent(`/yetiskin-icerik-onayi?sonraki=${encodeURIComponent(returnTo)}`)}`);
  }
  if (user.role === "admin") redirect(returnTo);

  const access = await getAdultContentAccess(user.id);
  if (access.needsBirthDate) {
    redirect(`/yas-dogrulama?sonraki=${encodeURIComponent(`/yetiskin-icerik-onayi?sonraki=${encodeURIComponent(returnTo)}`)}`);
  }
  if (!access.isAdult) {
    redirect("/erisim-reddedildi?kaynak=18-plus");
  }
  if (access.canAccessAdultContent) redirect(returnTo);

  return (
    <main className="profile-page">
      <div className="profile-page__container">
        <Brand />
        <section className="profile-card">
          <div className="profile-card__heading">
            <div>
              <p>2. doğrulama</p>
              <h1>18+ içerik erişimi</h1>
            </div>
          </div>
          <p>
            Hesap yaşınız 18+ erişim için uygundur. 18+ olarak sınıflandırılmış eserleri
            Keşfet&apos;te görmek ve okumak için ayrıca açık onay vermeniz gerekir.
          </p>
          <p>
            Bu tercih hesabınıza bağlıdır ve Hesabım alanından istediğiniz zaman kapatılabilir.
          </p>
          <form action={acceptAdultContentAction}>
            <input name="returnTo" type="hidden" value={returnTo} />
            <label>
              <input name="adultConsent" required type="checkbox" value="accepted" />{" "}
              18+ içerikleri görmek ve okumak istiyorum.
            </label>
            <div className="profile-form__actions">
              <button className="button button--primary" type="submit">
                Onayla ve devam et
              </button>
              <Link className="button button--ghost" href="/kesfet">
                Şimdi değil
              </Link>
            </div>
          </form>
        </section>
      </div>
    </main>
  );
}
