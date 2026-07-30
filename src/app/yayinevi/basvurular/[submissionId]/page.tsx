import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { PublisherSubmissionDetailView } from "@/features/publisher-workspace/components/PublisherSubmissionDetail";
import { getPublisherSubmissionDetail } from "@/features/publisher-workspace/queries";

export const metadata: Metadata = {
  title: "Yayınevi Başvuru İncelemesi | İlkOku",
  description: "Eser başvurusunu, editör raporlarını ve yayınevi kararını yönetin.",
};
export const dynamic = "force-dynamic";

export default async function PublisherSubmissionPage({ params }: { params: Promise<{ submissionId: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/giris?sonraki=/yayinevi");

  const { submissionId } = await params;
  const submission = await getPublisherSubmissionDetail(profile.id, submissionId);
  if (!submission) notFound();

  return <AppShell profile={profile}><PublisherSubmissionDetailView data={submission} /></AppShell>;
}
