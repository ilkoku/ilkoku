import type { Metadata } from "next";
import { authContent } from "@/content";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { UpdatePasswordForm } from "@/features/auth/components/UpdatePasswordForm";

export const metadata: Metadata = { title: authContent.updatePassword.metadataTitle, description: authContent.updatePassword.metadataDescription };

export default async function UpdatePasswordPage({ searchParams }: { searchParams: Promise<{ token?: string | string[] }> }) {
  const { token } = await searchParams;
  const resetToken = typeof token === "string" ? token : "";

  return <AuthShell eyebrow={authContent.updatePassword.eyebrow} title={authContent.updatePassword.title} description={authContent.updatePassword.description}><UpdatePasswordForm token={resetToken} /></AuthShell>;
}
