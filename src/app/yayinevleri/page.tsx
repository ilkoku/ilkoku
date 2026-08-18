import type { Metadata } from "next";
import { redirect } from "next/navigation";

import "@/features/publishers/publishers-layout-fix.css";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { PublisherWorkspace } from "@/features/publishers/components/PublisherWorkspace";
import { getPublishersWorkspace } from "@/features/publishers/queries";

export const metadata: Metadata = {
  title: "Yayınevleri | İlkOku",
  description:
    "Yayınevlerini keşfedin ve daha önce başlayan yayınevi, sözleşme ve yayın planı süreçlerinizi takip edin.",
};

export const dynamic = "force-dynamic";

export default async function PublishersPage({
  searchParams,
}: {
  searchParams: Promise<{ basvuru?: string }>;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/giris?sonraki=/yayinevleri");
  }

  if (profile.role !== "writer") {
    redirect("/erisim-reddedildi?kaynak=writer-publishers");
  }

  const params = await searchParams;
  const focusedSubmissionId =
    typeof params.basvuru === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(params.basvuru)
      ? params.basvuru
      : null;
  const workspace = await getPublishersWorkspace(profile.id);

  return (
    <AppShell profile={profile}>
      <PublisherWorkspace
        focusedSubmissionId={focusedSubmissionId}
        initialPublishers={workspace.publishers}
        initialSubmissions={workspace.submissions}
      />
    </AppShell>
  );
}
