import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Brand } from "@/components/ui/Brand";
import { AgeVerificationForm } from "@/features/adult-content/AgeVerificationForm";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  getAdultContentAccess,
  safeAdultGateReturnPath,
} from "@/lib/adult-content-access";
import "@/features/profile/profile.css";
import "@/features/adult-content/age-verification.css";

export const metadata: Metadata = {
  title: "Yaş Doğrulama | İlkOku",
  description: "İlkOku hesabınız için yaş bilginizi doğrulayın.",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default async function AgeVerificationPage({
  searchParams,
}: {
  searchParams: Promise<{ sonraki?: string }>;
}) {
  const user = await getCurrentUser();
  const { sonraki } = await searchParams;
  const returnTo = safeAdultGateReturnPath(sonraki);

  if (!user) {
    redirect(`/giris?sonraki=${encodeURIComponent(`/yas-dogrulama?sonraki=${encodeURIComponent(returnTo)}`)}`);
  }
  if (user.role === "admin") redirect(returnTo);

  const access = await getAdultContentAccess(user.id);
  if (!access.needsBirthDate) redirect(returnTo);

  return (
    <main className="age-verification-page">
      <div className="age-verification-shell">
        <div className="age-verification-brand">
          <Brand />
        </div>

        <section className="age-verification-card">
          <header className="age-verification-heading">
            <p className="age-verification-step">1. doğrulama</p>
            <h1>Yaş bilginizi doğrulayın</h1>
          </header>

          <p className="age-verification-intro">
            İlkOku, içerik yaş sınıflarını doğru uygulayabilmek için doğum tarihinizi bir kez ister.
            Bu bilgi public profilinizde gösterilmez. 18+ içerik erişimi için ayrıca ikinci bir açık onay gerekir.
          </p>

          <AgeVerificationForm returnTo={returnTo} />

          <Link className="age-verification-back" href="/">
            ← Ana sayfaya dön
          </Link>
        </section>
      </div>
    </main>
  );
}
