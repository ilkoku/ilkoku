import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { authContent, notificationContent, validationContent } from "@/content";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { getRoleNavigation } from "@/features/auth/destination";
import { getCurrentProfile } from "@/features/auth/profile";
import { RoleSelection } from "@/features/auth/components/RoleSelection";
import type { UserRole } from "@/features/auth/types";

export const metadata: Metadata = { title: authContent.roleSelection.metadataTitle, description: authContent.roleSelection.metadataDescription };

const roles: UserRole[] = ["reader", "writer", "editor", "publisher"];

export default async function RoleSelectionPage({ searchParams }: { searchParams: Promise<{ durum?: string; rol?: string }> }) {
  const profile = await getCurrentProfile();
  const navigation = profile ? await getRoleNavigation(profile) : null;
  if (profile) {
    if (navigation?.hasPendingRequest) redirect("/hesabim?sekme=rol-basvurusu");
  }
  const { durum, rol } = await searchParams;
  const selectedRole = roles.includes(rol as UserRole) ? rol as UserRole : "writer";
  const statusMessage = durum === "talep-alindi"
    ? selectedRole === "editor" ? notificationContent.editorRoleRequested : notificationContent.publisherRoleRequested
    : durum === "rol-kaydedilemedi" ? validationContent.roleSaveFailed : null;

  return (
    <AuthShell wide eyebrow={authContent.roleSelection.eyebrow} title={authContent.roleSelection.title} description={authContent.roleSelection.description}>
      {statusMessage && <p className="auth-route-status" role={durum === "rol-kaydedilemedi" ? "alert" : "status"}>{statusMessage}</p>}
      {profile && navigation ? <div className="role-selection-context" role="status"><p>Mevcut rolünüz korunur. Buradan yeni bir rol seçebilir veya rol başvurusu oluşturabilirsiniz.</p><div><Link className="button button--outline" href="/hesabim">Hesabım</Link><Link className="button button--outline" href={navigation.workspaceHref}>Çalışma Alanım</Link></div></div> : null}
      <RoleSelection initialRole={selectedRole} />
    </AuthShell>
  );
}
