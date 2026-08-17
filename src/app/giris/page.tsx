import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { authContent, notificationContent } from "@/content";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { getAuthenticatedDestination } from "@/features/auth/destination";
import { getCurrentProfile } from "@/features/auth/profile";

export const metadata: Metadata = { title: authContent.login.metadataTitle, description: authContent.login.metadataDescription };

const statusMessages: Record<string, string> = {
  "baglanti-gecersiz": notificationContent.routeStatus.invalidLink,
  "email-dogrulandi": "E-posta adresiniz doğrulandı. Hesabınıza güvenle giriş yapabilirsiniz.",
  "sifre-guncellendi": notificationContent.routeStatus.passwordUpdated,
  yapilandirma: notificationContent.routeStatus.configurationPending,
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ durum?: string; sonraki?: string }> }) {
  const profile = await getCurrentProfile();
  if (profile) redirect(await getAuthenticatedDestination(profile));
  const { durum, sonraki } = await searchParams;
  return (
    <AuthShell eyebrow={authContent.login.eyebrow} title={authContent.login.title} description={authContent.login.description} purple>
      {durum && statusMessages[durum] && <p className="auth-route-status" role="status">{statusMessages[durum]}</p>}
      <LoginForm nextPath={sonraki} />
    </AuthShell>
  );
}
