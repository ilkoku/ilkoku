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
    <main className="profile-page">
      <div className="profile-page__container">
        <Brand />
        <section className="profile-card">
          <div className="profile-card__heading">
            <div>
              <p>1. doğrulama</p>
              <h1>Yaş bilginizi doğrulayın</h1>
            </div>
          </div>
          <p>
            İlkOku içerik yaş sınıflarını doğru uygulayabilmek için doğum tarihinizi bir kez ister.
            Bu bilgi public profilinizde gösterilmez. 18+ içerik erişimi ayrıca ikinci bir açık onay gerektirir.
          </p>
          <AgeVerificationForm returnTo={returnTo} />
          <p>
            <Link href="/">Ana sayfaya dön</Link>
          </p>
        </section>
      </div>
    </main>
  );
}
