import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { feedbackContent } from "@/content";
import { getCurrentProfile } from "@/features/auth/profile";
import { FeedbackWorkspace } from "@/features/feedback/components/FeedbackWorkspace";
import { getAuthorFeedback } from "@/features/feedback/queries/feedback.queries";

export const metadata: Metadata = {
  title: feedbackContent.metadataTitle,
  description: feedbackContent.metadataDescription,
};

export const dynamic = "force-dynamic";

type FeedbackPageProps = {
  searchParams: Promise<{
    eser?: string | string[];
  }>;
};

export default async function FeedbackPage({
  searchParams,
}: FeedbackPageProps) {
  const [profile, parameters] = await Promise.all([
    getCurrentProfile(),
    searchParams,
  ]);

  if (!profile) {
    redirect("/giris?sonraki=/geri-bildirimler");
  }

  if (profile.role !== "writer") {
    redirect("/erisim-reddedildi");
  }

  const requestedWorkId =
    typeof parameters.eser === "string"
      ? parameters.eser
      : null;

  const feedback = await getAuthorFeedback(profile.id);

  const initialWorkId =
    requestedWorkId &&
    feedback.some(
      (item) =>
        item.isProfessionalReview &&
        item.work.id === requestedWorkId,
    )
      ? requestedWorkId
      : null;

  return (
    <FeedbackWorkspace
      initialItems={feedback}
      initialWorkId={initialWorkId}
    />
  );
}
