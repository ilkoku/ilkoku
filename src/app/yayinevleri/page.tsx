import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { publishersContent } from "@/content";
import { getCurrentProfile } from "@/features/auth/profile";
import { PublisherWorkspace } from "@/features/publishers/components/PublisherWorkspace";
import { getPublishersWorkspace } from "@/features/publishers/queries";

export const metadata: Metadata = { title: publishersContent.metadataTitle, description: publishersContent.metadataDescription };
export const dynamic = "force-dynamic";

export default async function PublishersPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/giris?sonraki=/yayinevleri");
  if (profile.role !== "writer") redirect("/erisim-reddedildi");
  const data = await getPublishersWorkspace(profile.id);
  return <AppShell profile={profile}><PublisherWorkspace initialPublishers={data.publishers} initialSubmissions={data.submissions} works={data.works} /></AppShell>;
}
