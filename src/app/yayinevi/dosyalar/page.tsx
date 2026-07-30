import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { PublisherFileCenter } from "@/features/publisher-workspace/components/PublisherFileCenter";
import { getPublisherFileCenter } from "@/features/publisher-workspace/queries";
import { getPublisherMembership } from "@/features/publisher-workspace/repository";

export const metadata: Metadata = { title: "Dosya Merkezi | İlkOku" };
export const dynamic = "force-dynamic";

export default async function PublisherFilesPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/giris?sonraki=/yayinevi/dosyalar");
  const [files, membership] = await Promise.all([
    getPublisherFileCenter(profile.id),
    getPublisherMembership(profile.id),
  ]);
  if (!files || !membership) notFound();
  return <AppShell profile={profile}><PublisherFileCenter companyName={membership.publisher.companyName} files={files} /></AppShell>;
}
