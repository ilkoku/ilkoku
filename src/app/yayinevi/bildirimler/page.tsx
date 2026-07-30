import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { PublisherNotificationCenter } from "@/features/publisher-workspace/components/PublisherNotificationCenter";
import { getPublisherNotificationCenter } from "@/features/publisher-workspace/queries";
import { getPublisherMembership } from "@/features/publisher-workspace/repository";

export const metadata: Metadata = { title: "Yayınevi Bildirimleri | İlkOku" };
export const dynamic = "force-dynamic";

export default async function PublisherNotificationsPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/giris?sonraki=/yayinevi/bildirimler");
  const [notifications, membership] = await Promise.all([
    getPublisherNotificationCenter(profile.id),
    getPublisherMembership(profile.id),
  ]);
  if (!notifications || !membership) notFound();
  return <AppShell profile={profile}><PublisherNotificationCenter companyName={membership.publisher.companyName} notifications={notifications} /></AppShell>;
}
