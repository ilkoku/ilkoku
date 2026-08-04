import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import {
  requirePublisherWorkPassportAccess,
} from "@/features/publisher-discovery/access";
import "@/features/publisher-discovery/publisher-discovery.css";
import { OwnershipPassport } from "@/features/ownership/components/OwnershipPassport";
import { getOwnershipPassport } from "@/features/ownership/queries";

export const metadata: Metadata = {
  description:
    "Yetkili yayınevi ekip üyesi için eser kayıt, sürüm ve bütünlük bilgileri.",
  robots: {
    follow: false,
    index: false,
  },
  title:
    "Eser Pasaportu | İlkOku Yayınevi",
};

export const dynamic = "force-dynamic";

export default async function PublisherDiscoveryPassportPage({
  params,
}: {
  params: Promise<{
    workId: string;
  }>;
}) {
  const { workId } = await params;
  const path =
    `/yayinevi/kesfet/eserler/${workId}/pasaport`;
  const access =
    await requirePublisherWorkPassportAccess(
      path,
      workId,
    );

  const passport =
    await getOwnershipPassport(
      workId,
      {
        kind: "publisher_discovery",
        publisherId:
          access.publisherId,
        userId:
          access.profile.id,
      },
    );

  if (!passport) {
    notFound();
  }

  return (
    <AppShell profile={access.profile}>
      <section className="publisher-passport-access">
        <div>
          <span>
            {access.companyName}
          </span>
          <strong>
            Eser Pasaportu erişimi doğrulandı
          </strong>
        </div>

        <p>
          {access.canViewContent
            ? "Eser Pasaportu ile özel/tam içerik yetkileri ayrı ayrı aktiftir. Bu sayfa yalnızca pasaport kayıtlarını gösterir."
            : "Bu erişim yalnızca Eser Pasaportu kayıtlarını kapsar; özel veya tam eser metnine erişim vermez."}
        </p>

        <small>
          Erişim kaynağı:{" "}
          {access.source === "shared"
            ? "Ekip içinde paylaşılan kayıt"
            : "Genel eser keşfi"}
        </small>
      </section>

      <OwnershipPassport
        backHref="/yayinevi/kesfet/eserler"
        backLabel="Eser keşfine dön"
        data={passport}
      />
    </AppShell>
  );
}
