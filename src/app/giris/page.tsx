import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { authContent, notificationContent } from "@/content";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { LoginForm } from "@/features/auth/components/LoginForm";
import { roleDestinations } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";

export const metadata: Metadata = { title: authContent.login.metadataTitle, description: authContent.login.metadataDescription };

const statusMessages: Record<string, string> = {
  "baglanti-gecersiz": notificationContent.routeStatus.invalidLink,
  "sifre-guncellendi": notificationContent.routeStatus.passwordUpdated,
  yapilandirma: notificationContent.routeStatus.configurationPending,
};

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ durum?: string; sonraki?: string }> }) {
  const profile = await getCurrentProfile();
  if (profile) redirect(roleDestinations[profile.role]);
  const { durum, sonraki } = await searchParams;
  return (
    <AuthShell eyebrow={authContent.login.eyebrow} title={authContent.login.title} description={authContent.login.description}>
      {durum && statusMessages[durum] && <p className="auth-route-status" role="status">{statusMessages[durum]}</p>}
      <LoginForm nextPath={sonraki} />
    </AuthShell>
  );
}
