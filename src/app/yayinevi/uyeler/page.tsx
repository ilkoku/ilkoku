import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { PublisherMemberCenter } from "@/features/publisher-workspace/components/PublisherMemberCenter";
import { getPublisherMemberCenter } from "@/features/publisher-workspace/queries";

export const metadata: Metadata = { title: "Yayınevi Üyeleri | İlkOku" };
export const dynamic = "force-dynamic";

export default async function PublisherMembersPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/giris?sonraki=/yayinevi/uyeler");
  const center = await getPublisherMemberCenter(profile.id);
  if (!center) notFound();
  return <AppShell profile={profile}><PublisherMemberCenter {...center} /></AppShell>;
}
