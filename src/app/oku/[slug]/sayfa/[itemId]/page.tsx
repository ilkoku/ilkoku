import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { enforceAdultWorkGate } from "@/features/adult-content/work-gate";
import { PublishedBookSpecialPageExperience } from "@/features/reading/components/PublishedBookSpecialPageExperience";
import { getMemberPublicWorkBySlug } from "@/features/works/member-public-queries";
import { getCurrentSessionContext } from "@/lib/auth/current-user";

const MAX_RETURN_PATH_LENGTH = 1500;

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Kitap Sayfası | İlkOku",
  description: "Yazarın yayımladığı fiziksel kitap sayfasını okuyun.",
  robots: { index: false, follow: false },
};

function getSafeReturnPath(value: string | undefined) {
  if (
    !value ||
    value.length > MAX_RETURN_PATH_LENGTH ||
    !value.startsWith("/") ||
    value.startsWith("//")
  ) {
    return "/eserler";
  }

  return value;
}

export default async function PublishedSpecialBookPage({
  params,
  searchParams,
}: {
  params: Promise<{ itemId: string; slug: string }>;
  searchParams: Promise<{ from?: string; sayfa?: string }>;
}) {
  const { itemId, slug } = await params;
  const query = await searchParams;
  const returnTo = getSafeReturnPath(query.from);
  const pageEdgeParameter = query.sayfa === "son" ? "&sayfa=son" : "";
  const returnPath =
    `/oku/${slug}/sayfa/${encodeURIComponent(itemId)}?from=${encodeURIComponent(returnTo)}${pageEdgeParameter}`;
  const auth = await getCurrentSessionContext();

  if (!auth) {
    redirect(`/giris?sonraki=${encodeURIComponent(returnPath)}`);
  }

  const { user } = auth;
  await enforceAdultWorkGate({
    returnTo: returnPath,
    slug,
    user,
  });

  const work = await getMemberPublicWorkBySlug(slug, user.id);
  if (!work?.publicationBook) notFound();

  const item = work.publicationBook.items.find(
    (candidate) =>
      candidate.type === "special" && candidate.structureItemId === itemId,
  );

  if (!item || item.type !== "special") notFound();

  return (
    <PublishedBookSpecialPageExperience
      item={item}
      protectionIdentity={user.publicId}
      returnTo={returnTo}
      startAtLastPage={query.sayfa === "son"}
      work={work}
    />
  );
}
