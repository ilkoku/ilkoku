import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { PublisherFileCenter } from "@/features/publisher-workspace/components/PublisherFileCenter";
import { getPublisherFileCenter } from "@/features/publisher-workspace/queries";
import {
  getPublisherMembership,
  isPublisherAdminReadOnlyMembership,
} from "@/features/publisher-workspace/repository";
import { hasPublisherPermission } from "@/features/publisher-workspace/permissions";

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

  const canDownload =
    !isPublisherAdminReadOnlyMembership(membership) &&
    hasPublisherPermission(
      membership.role,
      "download_files",
      membership.permissionOverrides,
    );

  return (
    <AppShell profile={profile}>
      <PublisherFileCenter
        canDownload={canDownload}
        companyName={membership.publisher.companyName}
        files={files}
      />
    </AppShell>
  );
}
