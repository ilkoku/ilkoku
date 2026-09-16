import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { enforceAdultWorkGate } from "@/features/adult-content/work-gate";
import { BookCover } from "@/features/showcase/components/BookCover";
import { publishedBookItemHref } from "@/features/works/book-publication";
import { getMemberPublicWorkBySlug } from "@/features/works/member-public-queries";
import { getCurrentSessionContext } from "@/lib/auth/current-user";

import "@/features/showcase/book-showcase.css";
import "./live-book-cover.css";

const MAX_RETURN_PATH_LENGTH = 1500;

export const dynamic = "force-dynamic";

function getSafeReturnPath(value: string | undefined, slug: string) {
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

export default async function LiveBookCoverPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const returnTo = getSafeReturnPath(query.from, slug);
  const returnPath = `/oku/${slug}/kapak?from=${encodeURIComponent(returnTo)}`;
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
  if (!work) notFound();

  const firstPublishedBookItem = work.publicationBook?.items[0] ?? null;
  const firstChapter = work.chapters[0] ?? null;
  const encodedReturnTo = encodeURIComponent(returnTo);
  const firstPageHref = firstPublishedBookItem
    ? `${publishedBookItemHref(work.slug, firstPublishedBookItem)}?from=${encodedReturnTo}`
    : firstChapter
      ? `/oku/${work.slug}/bolum-${firstChapter.position}?from=${encodedReturnTo}`
      : null;

  return (
    <main
      className="live-book-cover"
      data-book-surface="front-cover"
      aria-labelledby="live-book-title"
    >
      <div className="live-book-cover__toolbar">
        <Link href={returnTo}>← Eser bilgilerine dön</Link>
        <span>Numarasız ön kapak</span>
      </div>

      <section className="live-book-cover__stage">
        <BookCover coverUrl={work.coverUrl} title={work.title} />

        <div className="live-book-cover__meta">
          <p>CANLI KİTAP · ÖN KAPAK</p>
          <h1 id="live-book-title">{work.title}</h1>
          <span>{work.authorName}</span>

          {firstPageHref ? (
            <Link
              className="button button--primary live-book-cover__open"
              href={firstPageHref}
            >
              Kitabı Aç →
            </Link>
          ) : (
            <p className="live-book-cover__empty">
              Bu eserde henüz okunabilir bir kitap sayfası bulunmuyor.
            </p>
          )}
        </div>
      </section>

      <p className="live-book-cover__page-note">
        Kapak kitap sayfa numarasına dahil değildir. İçerik sayfa 1’den başlar.
      </p>
    </main>
  );
}
