import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { enforceAdultWorkGate } from "@/features/adult-content/work-gate";
import {
  publishedBookItemHref,
} from "@/features/works/book-publication";
import { bookSectionDetails } from "@/features/works/book-structure";
import { getMemberPublicWorkBySlug } from "@/features/works/member-public-queries";
import { getCurrentSessionContext } from "@/lib/auth/current-user";

import "./book-contents.css";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "İçindekiler | İlkOku",
  description: "Yazarın yayınladığı kitap sırası ve bölümler arasında gezin.",
  robots: { index: false, follow: false },
};

function safeReturnPath(candidate: string | undefined, slug: string) {
  if (!candidate || candidate.length > 1500 || !candidate.startsWith("/") || candidate.startsWith("//")) {
    return `/kitap/${slug}`;
  }
  return candidate;
}

function isRepeatedBookLabel(label: string, title: string): boolean {
  const normalize = (value: string) =>
    value.trim().toLocaleLowerCase("tr-TR").replace(/\s+/g, " ");
  const normalizedLabel = normalize(label);
  const normalizedTitle = normalize(title);
  if (normalizedLabel === normalizedTitle) return true;

  // "1. Bölüm" and "Bölüm 1" are the same heading, not two subtitles.
  const chapterLabel = normalizedLabel.match(/^(\d+)\.\s*bölüm$/);
  return chapterLabel !== null && normalizedTitle === `bölüm ${chapterLabel[1]}`;
}

export default async function ReaderBookContents({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ from?: string }>;
}) {
  const [{ slug }, query] = await Promise.all([params, searchParams]);
  const returnTo = safeReturnPath(query.from, slug);
  const encodedReturnTo = encodeURIComponent(returnTo);
  const contentsPath = `/oku/${slug}/icindekiler?from=${encodedReturnTo}`;
  const bookInfoHref = `/kitap/${slug}?from=${encodedReturnTo}`;
  const session = await getCurrentSessionContext();
  if (!session) {
    redirect(`/giris?sonraki=${encodeURIComponent(contentsPath)}`);
  }
  await enforceAdultWorkGate({
    returnTo: contentsPath,
    slug,
    user: session.user,
  });
  const work = await getMemberPublicWorkBySlug(slug, session.user.id);
  if (!work) notFound();

  let globalPage = 1;
  const items = work.publicationBook
    ? work.publicationBook.items.map((item) => {
        const page = globalPage;
        globalPage += item.layout.pageEnds.length;
        const locked =
          item.type === "chapter" &&
          work.commerce?.enforcementActive &&
          !work.commerce.hasEntitlement &&
          work.commerce.chapterAccess[item.chapterId] !== "preview";
        return {
          href: publishedBookItemHref(work.slug, item),
          id: item.structureItemId,
          isContents: item.type === "special" && item.kind === "toc",
          label: item.type === "chapter"
            ? `${item.chapterPosition}. Bölüm`
            : bookSectionDetails[item.kind].label,
          locked,
          page,
          title: item.title,
        };
      }).filter((item) => !item.isContents)
    : work.chapters
        .filter((chapter) => chapter.status === "published" && chapter.archivedAt === null)
        .sort((a, b) => a.position - b.position)
        .map((chapter) => ({
          href: `/oku/${work.slug}/bolum-${chapter.position}`,
          id: chapter.id,
          label: `${chapter.position}. Bölüm`,
          locked:
            Boolean(work.commerce?.enforcementActive) &&
            !work.commerce?.hasEntitlement &&
            work.commerce?.chapterAccess[chapter.id] !== "preview",
          page: null,
          title: chapter.title,
        }));

  return (
    <main className="reader-book-contents">
      <nav className="reader-book-contents__top" aria-label="Kitap üst menüsü">
        <Link href={bookInfoHref}>← Eser sayfası</Link>
        <Link href={`/oku/${work.slug}/kapak?from=${encodedReturnTo}`}>Kapak</Link>
      </nav>
      <div className="reader-book-contents__paper">
        <p className="reader-book-contents__eyebrow">İlkOku · Yazar yayını</p>
        <h1>İçindekiler</h1>
        <p className="reader-book-contents__work">{work.title}</p>
        <nav aria-label="Kitap bölümleri ve özel sayfalar">
          <ol className="reader-book-contents__list">
            {items.map((item) => (
              <li key={item.id}>
                <Link href={`${item.href}?from=${encodedReturnTo}`}>
                  {!isRepeatedBookLabel(item.label, item.title) && (
                    <span className="reader-book-contents__label">{item.label}</span>
                  )}
                  <strong>{item.title}</strong>
                  <span className="reader-book-contents__page">
                    {item.locked ? "Kilitli" : item.page === null ? "Oku" : `${item.page}`}
                  </span>
                </Link>
              </li>
            ))}
          </ol>
        </nav>
      </div>
    </main>
  );
}
