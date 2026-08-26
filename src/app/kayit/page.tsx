import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { authContent } from "@/content";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { getAuthenticatedDestination } from "@/features/auth/destination";
import { getCurrentProfile } from "@/features/auth/profile";
import type { RegistrationRole } from "@/features/auth/types";

export const metadata: Metadata = { title: authContent.register.metadataTitle, description: authContent.register.metadataDescription };

const registrationRoles: RegistrationRole[] = [
  "reader",
  "writer",
  "editor",
  "publisher",
];

function registrationRole(value: string | undefined) {
  return registrationRoles.includes(value as RegistrationRole)
    ? (value as RegistrationRole)
    : undefined;
}

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{
    davet?: string;
    rol?: string;
    sonraki?: string;
  }>;
}) {
  const { davet, rol, sonraki } = await searchParams;
  const profile = await getCurrentProfile();
  if (profile) redirect(await getAuthenticatedDestination(profile));

  return (
    <AuthShell eyebrow={authContent.register.eyebrow} title={authContent.register.title} description={authContent.register.description}>
      <RegisterForm
        editorInviteToken={davet}
        initialRole={registrationRole(rol)}
        nextPath={sonraki}
      />
    </AuthShell>
  );
}
