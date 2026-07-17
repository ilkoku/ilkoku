import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { feedbackContent } from "@/content";
import { getCurrentProfile } from "@/features/auth/profile";
import { FeedbackWorkspace } from "@/features/feedback/components/FeedbackWorkspace";
import { getAuthorFeedback } from "@/features/feedback/queries/feedback.queries";

export const metadata: Metadata = { title: feedbackContent.metadataTitle, description: feedbackContent.metadataDescription };
export const dynamic = "force-dynamic";

export default async function FeedbackPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/giris?sonraki=/geri-bildirimler");
  if (profile.role !== "writer") redirect("/erisim-reddedildi");
  const feedback = await getAuthorFeedback(profile.id);
  return <AppShell profile={profile}><FeedbackWorkspace initialItems={feedback} /></AppShell>;
}
