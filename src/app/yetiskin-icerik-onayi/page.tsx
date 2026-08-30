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
import "@/features/adult-content/age-verification.css";

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
    <main className="age-verification-page">
      <div className="age-verification-shell">
        <div className="age-verification-brand">
          <Brand />
        </div>

        <section className="age-verification-card">
          <header className="age-verification-heading">
            <p className="age-verification-step">2. doğrulama</p>
            <h1>18+ içerik erişimi</h1>
          </header>

          <div className="adult-consent-copy">
            <p>
              Hesap yaşınız 18+ erişim için uygundur. 18+ olarak sınıflandırılmış eserleri
              Keşfet&apos;te görmek ve okumak için ayrıca açık onay vermeniz gerekir.
            </p>
            <p>
              Bu tercih hesabınıza bağlıdır ve Hesabım alanından istediğiniz zaman kapatılabilir.
            </p>
          </div>

          <form action={acceptAdultContentAction} className="adult-consent-form">
            <input name="returnTo" type="hidden" value={returnTo} />

            <label className="adult-consent-choice">
              <input name="adultConsent" required type="checkbox" value="accepted" />
              <span>
                <strong>18+ içerikleri görmek ve okumak istiyorum.</strong>
                <small>Bu onayı verdiğinizde 18+ eserler ortak Keşfet havuzunda görünür.</small>
              </span>
            </label>

            <div className="adult-consent-actions">
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
