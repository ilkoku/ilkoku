import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import type { Prisma } from "@/generated/prisma/client";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { discoveryAuthorWhereFromWorkPool } from "@/features/discovery/common-author-scope";
import { readerAuthorDiscoveryWorkWhere } from "@/features/reader/author-discovery-scope";
import { toggleReaderAuthorFavoriteAction } from "@/features/reader/author-favorites";
import {
  READER_LIST_PAGE_SIZE,
  ReaderFilterDesk,
  ReaderPagination,
  ReaderResultSummary,
  parseReaderStandardFilters,
  readerListHref,
  readerReviewLabel,
  type ReaderActiveFilter,
  type ReaderReviewFilter,
  type ReaderSortOption,
} from "@/features/reader/discovery-standard";
import "@/features/reader/reader-discovery.css";
import { prisma } from "@/lib/prisma";
import {
  publicStoredWorkContentRatings,
  workContentRatingDetails,
} from "@/lib/work-content-classification";
import "./reader-author-discovery.css";

export const metadata: Metadata = {
  description: "İlkOku yazarlarını keşfe açık eserlerine göre süzerek keşfedin.",
  title: "Yazar Keşfet | İlkOku",
};

export const dynamic = "force-dynamic";

const sortOptions = [
  { label: "Son eser yayımlayan", value: "recent" },
  { label: "En çok eşleşen eser", value: "most_works" },
  { label: "A–Z", value: "az" },
] as const satisfies readonly ReaderSortOption[];

function authorName(author: {
  displayName: string | null;
  fullName: string;
}) {
  return author.displayName ?? author.fullName;
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/u).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part[0]?.toLocaleUpperCase("tr-TR") ?? "")
      .join("") || "Y"
  );
}

export default async function ReaderAuthorDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{
    arama?: string;
    editor?: string;
    hitapYasi?: string;
    sayfa?: string;
    siralama?: string;
    tur?: string;
  }>;
}) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/giris?sonraki=/yazar-kesfet");
  if (!canAccessReaderWorkspace(profile.role)) {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  const filters = parseReaderStandardFilters(
    await searchParams,
    publicStoredWorkContentRatings,
    sortOptions,
    "recent",
  );

  const workWhere: Prisma.WorkWhereInput = {
    ...readerAuthorDiscoveryWorkWhere,
    ...(filters.search
      ? {
          OR: [
            { title: { contains: filters.search } },
            { subtitle: { contains: filters.search } },
            {
              author: {
                is: {
                  OR: [
                    { displayName: { contains: filters.search } },
                    { fullName: { contains: filters.search } },
                    { username: { contains: filters.search } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
    ...(filters.genre ? { genre: filters.genre } : {}),
    ...(filters.contentRating ? { contentRating: filters.contentRating } : {}),
    ...(filters.reviewStatus
      ? { editorReviewStatus: filters.reviewStatus }
      : {}),
  };

  const [authors, favoriteAuthorCount] = await Promise.all([
    prisma.user.findMany({
      where: discoveryAuthorWhereFromWorkPool(workWhere),
      select: {
        _count: {
          select: {
            works: { where: workWhere },
          },
        },
        bio: true,
        displayName: true,
        fullName: true,
        id: true,
        publicId: true,
        username: true,
        works: {
          where: workWhere,
          orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
          select: {
            contentRating: true,
            editorReviewStatus: true,
            genre: true,
            publishedAt: true,
            slug: true,
            title: true,
          },
          take: 3,
        },
      },
    }),
    prisma.readerAuthorFavorite.count({ where: { userId: profile.id } }),
  ]);

  const collator = new Intl.Collator("tr-TR", { sensitivity: "base" });
  const sortedAuthors = [...authors].sort((left, right) => {
    if (filters.sort === "most_works") {
      const countDifference = right._count.works - left._count.works;
      if (countDifference !== 0) return countDifference;
    }

    if (filters.sort === "recent") {
      const leftTime = left.works[0]?.publishedAt?.getTime() ?? 0;
      const rightTime = right.works[0]?.publishedAt?.getTime() ?? 0;
      if (rightTime !== leftTime) return rightTime - leftTime;
    }

    return collator.compare(authorName(left), authorName(right));
  });

  const totalCount = sortedAuthors.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / READER_LIST_PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);
  const pageAuthors = sortedAuthors.slice(
    (currentPage - 1) * READER_LIST_PAGE_SIZE,
    currentPage * READER_LIST_PAGE_SIZE,
  );
  const favoriteRows = pageAuthors.length
    ? await prisma.readerAuthorFavorite.findMany({
        where: {
          userId: profile.id,
          authorId: { in: pageAuthors.map((author) => author.id) },
        },
        select: { authorId: true },
      })
    : [];
  const favoriteAuthorIds = new Set(
    favoriteRows.map((favorite) => favorite.authorId),
  );
  const normalizedFilters = { ...filters, page: currentPage };
  const pageHref = (page: number) =>
    readerListHref("/yazar-kesfet", normalizedFilters, page);
  const activeFilters: ReaderActiveFilter[] = [
    filters.search
      ? {
          href: readerListHref(
            "/yazar-kesfet",
            { ...normalizedFilters, search: undefined },
            1,
          ),
          label: `Arama: ${filters.search}`,
        }
      : null,
    filters.genre
      ? {
          href: readerListHref(
            "/yazar-kesfet",
            { ...normalizedFilters, genre: undefined },
            1,
          ),
          label: `Tür: ${filters.genre}`,
        }
      : null,
    filters.contentRating
      ? {
          href: readerListHref(
            "/yazar-kesfet",
            { ...normalizedFilters, contentRating: undefined },
            1,
          ),
          label: `Hitap: ${workContentRatingDetails[filters.contentRating].shortLabel}`,
        }
      : null,
    filters.reviewStatus
      ? {
          href: readerListHref(
            "/yazar-kesfet",
            { ...normalizedFilters, reviewStatus: undefined },
            1,
          ),
          label: readerReviewLabel(filters.reviewStatus),
        }
      : null,
    filters.sort !== "recent"
      ? {
          href: readerListHref(
            "/yazar-kesfet",
            { ...normalizedFilters, sort: "recent" },
            1,
          ),
          label: `Sıralama: ${sortOptions.find((option) => option.value === filters.sort)?.label ?? filters.sort}`,
        }
      : null,
  ].filter((item): item is ReaderActiveFilter => item !== null);
  const returnTo = pageHref(currentPage);

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace reader-discovery-workdesk">
        <section className="reader-discovery-desk">
          <div className="reader-discovery-desk__intro">
            <p className="reader-discovery-desk__eyebrow">Keşif masası</p>
            <h1>Yazarları masaya yatır</h1>
            <p className="reader-discovery-desk__lead">
              Yazarları yalnız keşfe açık eserlerinden türeterek karşılaştırın; tür, hitap yaşı
              ve editör durumuyla daraltıp favorilerinizi aynı masada yönetin.
            </p>
            <nav aria-label="Keşif çalışma alanı" className="reader-discovery-desk__quick-links">
              <Link href="/kesfet">Eserler</Link>
              <span aria-current="page">Yazarlar</span>
              <Link href="/favorilerim?tip=yazar">Favori Yazarlarım</Link>
              <Link href="/okumaya-devam">Okumaya Devam</Link>
            </nav>
          </div>

          <div className="reader-discovery-desk__stats" aria-label="Yazar keşif özeti">
            <div>
              <strong>{totalCount}</strong>
              <span>Eşleşen yazar</span>
            </div>
            <div>
              <strong>{activeFilters.length}</strong>
              <span>Aktif filtre</span>
            </div>
            <div>
              <strong>{favoriteAuthorCount}</strong>
              <span>Favori yazar</span>
            </div>
          </div>
        </section>

        <ReaderFilterDesk
          activeFilters={activeFilters}
          clearHref="/yazar-kesfet"
          contentRating={filters.contentRating}
          genre={filters.genre}
          heading="Aradığınız yazarı daraltın"
          hint="Filtre seçmeden keşfe açık bütün uygun yazarları görüyorsunuz."
          ratingOptions={publicStoredWorkContentRatings}
          reviewStatus={filters.reviewStatus}
          search={filters.search}
          searchPlaceholder="Yazar, rumuz veya eser ara"
          sort={filters.sort}
          sortOptions={sortOptions}
        />

        <ReaderResultSummary
          currentPage={currentPage}
          noun="yazar"
          totalCount={totalCount}
          visibleCount={pageAuthors.length}
        />

        {pageAuthors.length > 0 ? (
          <section aria-label="Keşfedilen yazarlar" className="reader-author-discovery-grid">
            {pageAuthors.map((author) => {
              const name = authorName(author);
              const latest = author.works[0] ?? null;
              const isFavorite = favoriteAuthorIds.has(author.id);
              const profileHref = `/yazarlar/${author.publicId}?from=${encodeURIComponent(returnTo)}`;

              return (
                <article className="reader-author-discovery-card" key={author.publicId}>
                  <div className="reader-author-discovery-card__topline">
                    <span className="reader-author-discovery-card__avatar">{initials(name)}</span>
                    <span>{author._count.works} eşleşen eser</span>
                  </div>

                  <div className="reader-author-discovery-card__identity">
                    <h2>{name}</h2>
                    <p>
                      {author.username
                        ? `@${author.username.replace(/^@/u, "")}`
                        : "İlkOku yazarı"}
                    </p>
                  </div>

                  {author.bio ? (
                    <p className="reader-author-discovery-card__bio">{author.bio}</p>
                  ) : (
                    <p className="reader-author-discovery-card__bio reader-author-discovery-card__bio--muted">
                      Yazar henüz kısa bir tanıtım eklemedi.
                    </p>
                  )}

                  {latest ? (
                    <div className="reader-author-discovery-card__latest">
                      <span>Son eşleşen eser</span>
                      <strong>{latest.title}</strong>
                      <div className="reader-author-discovery-card__chips">
                        {latest.genre ? <span>{latest.genre}</span> : null}
                        <span>{workContentRatingDetails[latest.contentRating].shortLabel}</span>
                        <span>
                          {readerReviewLabel(
                            latest.editorReviewStatus as ReaderReviewFilter,
                          )}
                        </span>
                      </div>
                    </div>
                  ) : null}

                  {author.works.length > 1 ? (
                    <div className="reader-author-discovery-card__works">
                      {author.works.slice(1).map((work) => (
                        <Link href={`/kitap/${work.slug}`} key={work.slug}>
                          {work.title}
                        </Link>
                      ))}
                    </div>
                  ) : null}

                  <div className="reader-author-discovery-card__actions">
                    <Link className="button button--outline" href={profileHref}>
                      Yazar vitrini
                    </Link>
                    {author.id === profile.id ? (
                      <span className="reader-author-discovery-card__self">Bu sizsiniz</span>
                    ) : (
                      <form action={toggleReaderAuthorFavoriteAction}>
                        <input name="authorPublicId" type="hidden" value={author.publicId} />
                        <input name="returnPath" type="hidden" value={returnTo} />
                        <button className="button button--ghost" type="submit">
                          {isFavorite ? "Favoriden Çıkar" : "Yazarı Favorile"}
                        </button>
                      </form>
                    )}
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <div className="workspace-list-empty">
            <h2>Eşleşen yazar bulunamadı</h2>
            <p>Arama veya filtreleri değiştirerek yeniden deneyin.</p>
          </div>
        )}

        <ReaderPagination
          ariaLabel="Yazar keşif sayfalama"
          currentPage={currentPage}
          hrefForPage={pageHref}
          totalPages={totalPages}
        />
      </div>
    </AppShell>
  );
}
