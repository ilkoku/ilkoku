import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { OwnershipPassport } from "@/features/ownership/components/OwnershipPassport";
import { getPublicOwnershipPassportBySlug } from "@/features/ownership/public-passport";
import { isBlockedPublicWorkSlug } from "@/lib/public-content-safety";

export const metadata: Metadata = {
  title: "Eser Pasaportu | İlkOku",
  description:
    "Eserin İlkOku kayıt, sürüm ve içerik bütünlüğü bilgileri.",
  robots: {
    index: false,
    follow: true,
  },
};

export const dynamic = "force-dynamic";

const MAX_RETURN_PATH_LENGTH = 1500;

function safeReturnPath(value: string | undefined, slug: string) {
  if (
    !value ||
    value.length > MAX_RETURN_PATH_LENGTH ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return `/kitap/${slug}`;
  }

  return value;
}

export default async function PublicOwnershipPassportPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([
    params,
    searchParams,
  ]);

  if (isBlockedPublicWorkSlug(slug)) {
    notFound();
  }

  const passport = await getPublicOwnershipPassportBySlug(slug);

  if (!passport) {
    notFound();
  }

  const backHref = safeReturnPath(query.from, slug);

  return (
    <main
      style={{
        background: "#090c12",
        minHeight: "100vh",
        padding: "clamp(1rem, 3vw, 2.5rem)",
      }}
    >
      <div
        style={{
          margin: "0 auto",
          maxWidth: "1180px",
        }}
      >
        <OwnershipPassport
          backHref={backHref}
          backLabel="Eser sayfasına dön"
          data={passport}
        />
      </div>
    </main>
  );
}
