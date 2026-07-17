import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { dashboardContent } from "@/content";
import { AppShell } from "@/components/layout/AppShell";
import { WriterDashboard } from "@/features/dashboard/components/WriterDashboard";
import { getCurrentProfile } from "@/features/auth/profile";
import { getAuthorWorks } from "@/features/works/queries";
import { getDashboardFeedback } from "@/features/feedback/queries/feedback.queries";
import { getPublisherDashboard } from "@/features/publishers/queries";

export const metadata: Metadata = { title: dashboardContent.metadataTitle, description: dashboardContent.metadataDescription };
export const dynamic = "force-dynamic";

export default async function WriterPage() {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/giris?sonraki=/yazar");
  if (profile.role !== "writer") redirect("/erisim-reddedildi");
  const [works, feedback, publishers] = await Promise.all([getAuthorWorks(profile.id), getDashboardFeedback(profile.id), getPublisherDashboard(profile.id)]);
  return <AppShell profile={profile}><WriterDashboard feedback={feedback} publishers={publishers} works={works} /></AppShell>;
}
