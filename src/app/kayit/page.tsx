import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { authContent } from "@/content";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { RegisterForm } from "@/features/auth/components/RegisterForm";
import { roleDestinations } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";

export const metadata: Metadata = { title: authContent.register.metadataTitle, description: authContent.register.metadataDescription };

export default async function RegisterPage({
  searchParams,
}: {
  searchParams: Promise<{ davet?: string }>;
}) {
  const { davet } = await searchParams;
  const profile = await getCurrentProfile();
  if (profile) redirect(roleDestinations[profile.role]);
  return <AuthShell eyebrow={authContent.register.eyebrow} title={authContent.register.title} description={authContent.register.description}><RegisterForm editorInviteToken={davet} /></AuthShell>;
}
