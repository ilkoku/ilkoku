import type { Metadata } from "next";
import { authContent } from "@/content";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { UpdatePasswordForm } from "@/features/auth/components/UpdatePasswordForm";

export const metadata: Metadata = { title: authContent.updatePassword.metadataTitle, description: authContent.updatePassword.metadataDescription };

export default function UpdatePasswordPage() {
  return <AuthShell eyebrow={authContent.updatePassword.eyebrow} title={authContent.updatePassword.title} description={authContent.updatePassword.description}><UpdatePasswordForm /></AuthShell>;
}
