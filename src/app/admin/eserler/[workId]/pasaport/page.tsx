import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { OwnershipPassport } from "@/features/ownership/components/OwnershipPassport";
import { getOwnershipPassport } from "@/features/ownership/queries";
import { getCurrentUser } from "@/lib/auth/current-user";

export const metadata: Metadata = {
  title: "Eser Pasaportu | İlkOku Admin",
};

export const dynamic = "force-dynamic";

export default async function AdminOwnershipPassportPage({
  params,
}: {
  params: Promise<{ workId: string }>;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/giris?sonraki=/admin/eserler");
  }

  if (user.role !== "admin") {
    redirect("/erisim-reddedildi?kaynak=admin");
  }

  const { workId } = await params;

  const passport = await getOwnershipPassport(
    workId,
    {
      kind: "admin",
    },
  );

  if (!passport) {
    notFound();
  }

  return (
    <OwnershipPassport
      backHref={`/admin/eserler/${workId}`}
      backLabel="Eser kaydına dön"
      data={passport}
    />
  );
}
