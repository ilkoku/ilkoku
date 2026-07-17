import type { Metadata } from "next";
import { authContent } from "@/content";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { PasswordResetForm } from "@/features/auth/components/PasswordResetForm";

export const metadata: Metadata = { title: authContent.forgotPassword.metadataTitle, description: authContent.forgotPassword.metadataDescription };

export default function ForgotPasswordPage() {
  return <AuthShell eyebrow={authContent.forgotPassword.eyebrow} title={authContent.forgotPassword.title} description={authContent.forgotPassword.description}><PasswordResetForm /></AuthShell>;
}
