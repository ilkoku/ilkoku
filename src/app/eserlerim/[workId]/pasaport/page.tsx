import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { OwnershipPassport } from "@/features/ownership/components/OwnershipPassport";
import { getOwnershipPassport } from "@/features/ownership/queries";

export const metadata: Metadata = {
  title: "Eser Pasaportu | İlkOku",
  description:
    "Eser kayıt, sürüm ve içerik bütünlüğü bilgileri",
};

export const dynamic = "force-dynamic";

export default async function AuthorOwnershipPassportPage({
  params,
}: {
  params: Promise<{ workId: string }>;
}) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/giris?sonraki=/eserlerim");
  }

  if (profile.role !== "writer") {
    redirect("/erisim-reddedildi");
  }

  const { workId } = await params;

  const passport = await getOwnershipPassport(
    workId,
    {
      kind: "author",
      userId: profile.id,
    },
  );

  if (!passport) {
    notFound();
  }

  return (
    <AppShell profile={profile}>
      <OwnershipPassport
        backHref="/eserlerim"
        backLabel="Eserlerime dön"
        data={passport}
      />
    </AppShell>
  );
}
