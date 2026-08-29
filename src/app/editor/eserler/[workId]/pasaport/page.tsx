import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import { OwnershipPassport } from "@/features/ownership/components/OwnershipPassport";
import { getOwnershipPassport } from "@/features/ownership/queries";
import { getAdultContentAccess } from "@/lib/adult-content-access";

export const metadata: Metadata = {
  title: "Eser Pasaportu | İlkOku",
  description:
    "Editörün erişebildiği eserin kayıt, sürüm ve içerik bütünlüğü bilgileri.",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

export default async function EditorOwnershipPassportPage({
  params,
}: {
  params: Promise<{ workId: string }>;
}) {
  const profile = await requireEditorProfile("/editor/incelemeler");
  const { workId } = await params;
  const path = `/editor/eserler/${workId}/pasaport`;
  const passport = await getOwnershipPassport(workId, {
    kind: "editor",
    userId: profile.id,
  });

  if (!passport) notFound();

  if (passport.work.contentRating === "adult_18") {
    const adultAccess = await getAdultContentAccess(profile.id);
    if (adultAccess.needsBirthDate) {
      redirect(`/yas-dogrulama?sonraki=${encodeURIComponent(path)}`);
    }
    if (!adultAccess.isAdult) {
      redirect("/erisim-reddedildi?kaynak=18-plus");
    }
    if (!adultAccess.canAccessAdultContent) {
      redirect(`/yetiskin-icerik-onayi?sonraki=${encodeURIComponent(path)}`);
    }
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
