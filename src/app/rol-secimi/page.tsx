import type { Metadata } from "next";
import { authContent, notificationContent, validationContent } from "@/content";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { RoleSelection } from "@/features/auth/components/RoleSelection";
import type { UserRole } from "@/features/auth/types";

export const metadata: Metadata = { title: authContent.roleSelection.metadataTitle, description: authContent.roleSelection.metadataDescription };

const roles: UserRole[] = ["reader", "writer", "editor", "publisher"];

export default async function RoleSelectionPage({ searchParams }: { searchParams: Promise<{ durum?: string; rol?: string }> }) {
  const { durum, rol } = await searchParams;
  const selectedRole = roles.includes(rol as UserRole) ? rol as UserRole : "writer";
  const statusMessage = durum === "talep-alindi"
    ? selectedRole === "editor" ? notificationContent.editorRoleRequested : notificationContent.publisherRoleRequested
    : durum === "rol-kaydedilemedi" ? validationContent.roleSaveFailed : null;

  return (
    <AuthShell wide eyebrow={authContent.roleSelection.eyebrow} title={authContent.roleSelection.title} description={authContent.roleSelection.description}>
      {statusMessage && <p className="auth-route-status" role={durum === "rol-kaydedilemedi" ? "alert" : "status"}>{statusMessage}</p>}
      <RoleSelection initialRole={selectedRole} />
    </AuthShell>
  );
}
