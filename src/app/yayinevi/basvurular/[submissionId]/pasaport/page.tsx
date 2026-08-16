import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { OwnershipPassport } from "@/features/ownership/components/OwnershipPassport";
import { getOwnershipPassport } from "@/features/ownership/queries";
import { getPublisherSubmissionDetail } from "@/features/publisher-workspace/queries";

export const metadata: Metadata = {
  title: "Eser Pasaportu | İlkOku Yayınevi",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-dynamic";

export default async function PublisherOwnershipPassportPage({
  params,
}: {
  params: Promise<{ submissionId: string }>;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/giris?sonraki=/yayinevi");
  }

  const { submissionId } = await params;

  const submission =
    await getPublisherSubmissionDetail(
      profile.id,
      submissionId,
    );

  if (
    !submission ||
    !submission.permissions.viewAuthorizedPassport
  ) {
    notFound();
  }

  const passport = profile.adminPublisherView
    ? await getOwnershipPassport(
        submission.work.id,
        {
          kind: "admin",
        },
      )
    : await getOwnershipPassport(
        submission.work.id,
        {
          kind: "publisher",
          submissionId,
          userId: profile.id,
        },
      );

  if (!passport) {
    notFound();
  }

  return (
    <AppShell profile={profile}>
      <OwnershipPassport
        backHref={`/yayinevi/basvurular/${submissionId}`}
        backLabel="Başvuruya dön"
        data={passport}
      />
    </AppShell>
  );
}
