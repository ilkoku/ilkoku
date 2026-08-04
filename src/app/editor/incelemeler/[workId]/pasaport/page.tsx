import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import { OwnershipPassport } from "@/features/ownership/components/OwnershipPassport";
import { getOwnershipPassport } from "@/features/ownership/queries";

export const metadata: Metadata = {
  title: "Eser Pasaportu | İlkOku Editör",
  robots: {
    follow: false,
    index: false,
  },
};

export const dynamic = "force-dynamic";

export default async function EditorOwnershipPassportPage({
  params,
}: {
  params: Promise<{ workId: string }>;
}) {
  const { workId } = await params;

  const profile = await requireEditorProfile(
    `/editor/incelemeler/${workId}/pasaport`,
  );

  const passport = await getOwnershipPassport(
    workId,
    {
      kind: "editor",
      userId: profile.id,
    },
  );

  if (!passport) {
    notFound();
  }

  return (
    <AppShell profile={profile}>
      <OwnershipPassport
        backHref="/editor/incelemeler"
        backLabel="İncelemelerime dön"
        data={passport}
      />
    </AppShell>
  );
}
