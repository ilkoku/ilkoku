import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { workspaceContent } from "@/content";
import { getCurrentProfile } from "@/features/auth/profile";
import { WorksWorkspace } from "@/features/works/components/WorksWorkspace";
import { getAuthorWorkspaceWorks } from "@/features/works/queries";

export const metadata: Metadata = {
  title: workspaceContent.metadataTitle,
  description: workspaceContent.metadataDescription,
};
export const dynamic = "force-dynamic";

export default async function WorksPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/giris?sonraki=/eserlerim");
  if (profile.role !== "writer") redirect("/erisim-reddedildi");
  const works = await getAuthorWorkspaceWorks(profile.id);
  return <AppShell profile={profile}><WorksWorkspace works={works} /></AppShell>;
}
