import type { Metadata } from "next";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";
import { authContent } from "@/content";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { PasswordResetForm } from "@/features/auth/components/PasswordResetForm";

export const metadata: Metadata = createPublicPageMetadata({
  title: authContent.forgotPassword.metadataTitle,
  description: authContent.forgotPassword.metadataDescription,
  canonical: "/sifremi-unuttum",
  noIndex: true,
});

export default function ForgotPasswordPage() {
  return <AuthShell eyebrow={authContent.forgotPassword.eyebrow} title={authContent.forgotPassword.title} description={authContent.forgotPassword.description}><PasswordResetForm /></AuthShell>;
}
