import type { Metadata } from "next";
import { authContent } from "@/content";
import { AuthShell } from "@/features/auth/components/AuthShell";
import { RoleSelection } from "@/features/auth/components/RoleSelection";

export const metadata: Metadata = { title: authContent.roleSelection.metadataTitle, description: authContent.roleSelection.metadataDescription };

export default function RoleSelectionPage() {
  return <AuthShell wide eyebrow={authContent.roleSelection.eyebrow} title={authContent.roleSelection.title} description={authContent.roleSelection.description}><RoleSelection /></AuthShell>;
}
