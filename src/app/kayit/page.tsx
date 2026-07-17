import type { Metadata } from "next";
import { authContent } from "@/content";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { RegisterForm } from "@/features/auth/components/RegisterForm";

export const metadata: Metadata = { title: authContent.register.metadataTitle, description: authContent.register.metadataDescription };

export default function RegisterPage() {
  return <AuthShell eyebrow={authContent.register.eyebrow} title={authContent.register.title} description={authContent.register.description}><RegisterForm /></AuthShell>;
}
