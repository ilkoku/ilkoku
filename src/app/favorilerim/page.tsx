import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import type { Prisma } from "@/generated/prisma/client";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import {
  getReaderFavoriteAuthors,
  toggleReaderAuthorFavoriteAction,
} from "@/features/reader/author-favorites";
import {
  ReaderWorksTable,
  type ReaderWorkRow,
} from "@/features/reader/components/ReaderWorksTable";
import {
  READER_LIST_PAGE_SIZE,
  ReaderFilterDesk,
  ReaderPagination,
  ReaderResultSummary,
  parseManagedReaderStandardFilters,
  readerListHref,
  readerReviewLabel,
  readerWorkMatches,
  type ReaderActiveFilter,
  type ReaderSortOption,
} from "@/features/reader/discovery-standard";
import { getFavoriteWorks } from "@/features/reader/favorites";
import "@/features/reader/reader-discovery.css";
import {
  getAdultContentAccess,
  visibleMemberContentRatings,
} from "@/lib/adult-content-access";
import { discoveryAdvancedFilterChips } from "@/lib/discovery-advanced-filters";
import {
  publicStoredWorkContentRatings,
  workContentRatingDetails,
} from "@/lib/work-content-classification";
import "../yazarlar/reader-author-favorites.css";

export const metadata: Metadata = {
  description: "Favori eserlerinizi ve yazarlarınızı görüntüleyin.",
  title: "Favorilerim | İlkOku",
};

export const dynamic = "force-dynamic";

type FavoriteType = "work" | "author";

const workSortOptions = [
  { label: "En yeni yayımlanan", value: "newest" },
  { label: "Son güncellenen", value: "updated" },
] as const satisfies readonly ReaderSortOption[];

const authorSortOptions = [
  { label: "Son eser yayımlayan", value: "recent" },
  { label: "En çok eşleşen eser", value: "most_works" },
  { label: "A–Z", value: "az" },
] as const satisfies readonly ReaderSortOption[];

export default async function ReaderFavoritesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/giris?sonraki=/favorilerim");
  if (!canAccessReaderWorkspace(profile.role)) {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  const params = await searchParams;
  const rawType = Array.isArray(params.tip) ? params.tip[0] : params.tip;
  const type: FavoriteType = rawType === "yazar" ? "author" : "work";
  const adultAccess = await getAdultContentAccess(profile.id);
  const workRatingOptions = visibleMemberContentRatings(
    adultAccess.canAccessAdultContent,
  );
  const ratingOptions =
    type === "author" ? publicStoredWorkContentRatings : workRatingOptions;
  const sortOptions = type === "author" ? authorSortOptions : workSortOptions;
  const defaultSort = type === "author" ? "recent" : "newest";
  const fixedParams: Record<string, string> =
    type === "author" ? { tip: "yazar" } : {};
  const clearHref = type === "author" ? "/favorilerim?tip=yazar" : "/favorilerim";
  const surfaceId = type === "author" ? "reader-favorite-authors" : "reader-favorite-works";
  const { enabledFilterIds, filters } = await parseManagedReaderStandardFilters(
    surfaceId,
    params,
    ratingOptions,
    sortOptions,
    defaultSort,
  );

  const allWorks = type === "work" ? await getFavoriteWorks(profile.id) : [];
  const allWorkRows: ReaderWorkRow[] = allWorks.map((work) => ({
    authorName: work.authorName,
    authorUsername: work.authorUsername,
    chapterCount: work.chapterCount,
    commentCount: work.commentCount,
    contentRating: work.contentRating,
    coverUrl: work.coverUrl,
    description: work.description,
    editorReviewStatus: work.editorReviewStatus,
    favoriteCount: work.favoriteCount,
    genre: work.genre,
    id: work.id,
    isFavorite: work.isFavorite,
    language: work.language,
    lastReadLabel: work.lastReadLabel,
    progressPercent: work.progressPercent,
    publishedAt: work.publishedAt?.toISOString() ?? null,
    readerCount: work.readerCount,
    readingHref: work.readingHref,
    readingState: work.readingState,
    slug: work.slug,
    title: work.title,
    totalWords: work.totalWords,
    updatedAt: work.updatedAt.toISOString(),
  }));
  const filteredWorkRows = allWorkRows
    .filter((work) => readerWorkMatches(work, filters))
    .sort((left, right) => {
      const leftDate =
        filters.sort === "updated" ? left.updatedAt : left.publishedAt;
      const rightDate =
        filters.sort === "updated" ? right.updatedAt : right.publishedAt;
      return (
        new Date(rightDate ?? 0).getTime() - new Date(leftDate ?? 0).getTime()
      );
    });

  const authorWorkFilters: Prisma.WorkWhereInput = {
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
  const authorResults =
    type === "author"
      ? await getReaderFavoriteAuthors(profile.id, authorWorkFilters)
      : [];
  const collator = new Intl.Collator("tr-TR", { sensitivity: "base" });
  const sortedAuthors = [...authorResults].sort((left, right) => {
    if (filters.sort === "most_works") {
      const difference = right._count.works - left._count.works;
      if (difference !== 0) return difference;
    }

    if (filters.sort === "recent") {
      const leftTime = left.works[0]?.publishedAt?.getTime() ?? 0;
      const rightTime = right.works[0]?.publishedAt?.getTime() ?? 0;
      if (rightTime !== leftTime) return rightTime - leftTime;
    }

    return collator.compare(
      left.displayName ?? left.fullName,
      right.displayName ?? right.fullName,
    );
  });

  const totalCount =
    type === "author" ? sortedAuthors.length : filteredWorkRows.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / READER_LIST_PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);
  const pageRows =
    type === "work"
      ? filteredWorkRows.slice(
          (currentPage - 1) * READER_LIST_PAGE_SIZE,
          currentPage * READER_LIST_PAGE_SIZE,
        )
      : [];
  const pageAuthors =
    type === "author"
      ? sortedAuthors.slice(
          (currentPage - 1) * READER_LIST_PAGE_SIZE,
          currentPage * READER_LIST_PAGE_SIZE,
        )
      : [];
  const normalizedFilters = { ...filters, page: currentPage };
  const pageHref = (page: number) =>
    readerListHref("/favorilerim", normalizedFilters, page, fixedParams);
  const activeFilters: ReaderActiveFilter[] = [
    filters.search
      ? {
          href: readerListHref(
            "/favorilerim",
            { ...normalizedFilters, search: undefined },
            1,
            fixedParams,
          ),
          label: `Arama: ${filters.search}`,
        }
      : null,
    filters.genre
      ? {
          href: readerListHref(
            "/favorilerim",
            { ...normalizedFilters, genre: undefined },
            1,
            fixedParams,
          ),
          label: `Tür: ${filters.genre}`,
        }
      : null,
    filters.contentRating
      ? {
          href: readerListHref(
            "/favorilerim",
            { ...normalizedFilters, contentRating: undefined },
            1,
            fixedParams,
          ),
          label: `Hitap: ${workContentRatingDetails[filters.contentRating].shortLabel}`,
        }
      : null,
    filters.reviewStatus
      ? {
          href: readerListHref(
            "/favorilerim",
            { ...normalizedFilters, reviewStatus: undefined },
            1,
            fixedParams,
          ),
          label: readerReviewLabel(filters.reviewStatus),
        }
      : null,
    filters.sort !== defaultSort
      ? {
          href: readerListHref(
            "/favorilerim",
            { ...normalizedFilters, sort: defaultSort },
            1,
            fixedParams,
          ),
          label: `Sıralama: ${sortOptions.find((option) => option.value === filters.sort)?.label ?? filters.sort}`,
        }
      : null,
  ].filter((item): item is ReaderActiveFilter => item !== null);
  const advancedFilterCount = discoveryAdvancedFilterChips(
    filters.advanced,
    enabledFilterIds,
  ).length;
  const hasFilters = activeFilters.length + advancedFilterCount > 0;
  const returnTo = pageHref(currentPage);

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace reader-discovery-workdesk">
        <EditorPageHeader
          description="Sonra dönmek istediğiniz eserleri ve yeni yayınlarını takip etmek istediğiniz yazarları burada yönetin."
          eyebrow="Okuma listeniz"
          title="Favorilerim"
        />

        <nav aria-label="Favori türü" className="reader-favorites-tabs">
          <Link
            className={
              type === "work" ? "button button--primary" : "button button--ghost"
            }
            href="/favorilerim"
          >
            Eserler
          </Link>
          <Link
            className={
              type === "author" ? "button button--primary" : "button button--ghost"
            }
            href="/favorilerim?tip=yazar"
          >
            Yazarlar
          </Link>
        </nav>

        <ReaderFilterDesk
          activeFilters={activeFilters}
          advancedFilters={filters.advanced}
          clearHref={clearHref}
          contentRating={filters.contentRating}
          genre={filters.genre}
          heading={
            type === "author"
              ? "Favori yazarlarınızı daraltın"
              : "Favori eserlerinizi daraltın"
          }
          hiddenFields={type === "author" ? [{ name: "tip", value: "yazar" }] : []}
          hint={
            type === "author"
              ? "Tüm favori yazarlarınızı görüyorsunuz."
              : "Tüm favori eserlerinizi görüyorsunuz."
          }
          ratingOptions={ratingOptions}
          reviewStatus={filters.reviewStatus}
          search={filters.search}
          searchPlaceholder={
            type === "author"
              ? "Yazar, rumuz veya eser ara"
              : "Eser, yazar veya rumuz ara"
          }
          sort={filters.sort}
          sortOptions={sortOptions}
          standardFilters={normalizedFilters}
        />

        <ReaderResultSummary
          currentPage={currentPage}
          noun={type === "author" ? "yazar" : "eser"}
          totalCount={totalCount}
          visibleCount={type === "author" ? pageAuthors.length : pageRows.length}
        />

        {type === "work" ? (
          <ReaderWorksTable
            emptyDescription={
              hasFilters
                ? "Filtreleri değiştirerek favori eserleriniz içinde yeniden deneyin."
                : "Keşfet veya eser sayfasından eserleri favorilerinize ekleyerek okuma listenizi oluşturabilirsiniz."
            }
            emptyTitle={
              hasFilters
                ? "Eşleşen favori eser bulunamadı"
                : "Henüz favori eserin yok"
            }
            returnTo={returnTo}
            rows={pageRows}
          />
        ) : pageAuthors.length > 0 ? (
          <section aria-label="Favori yazarlar" className="reader-favorite-authors">
            {pageAuthors.map((author) => {
              const name = author.displayName ?? author.fullName;
              const latest = author.works[0] ?? null;

              return (
                <article className="reader-favorite-author" key={author.publicId}>
                  <div className="reader-favorite-author__identity">
                    <h3>{name}</h3>
                    <p>
                      {author.username
                        ? `@${author.username.replace(/^@/u, "")}`
                        : "İlkOku yazarı"}
                      {` · ${author._count.works} eşleşen eser`}
                    </p>
                    {latest ? (
                      <small className="reader-favorite-author__latest">
                        Son eşleşen eser: {latest.title}
                        {latest.genre ? ` · ${latest.genre}` : ""}
                      </small>
                    ) : null}
                  </div>

                  <div className="reader-favorite-author__actions">
                    <Link
                      className="button button--outline"
                      href={`/yazarlar/${author.publicId}?from=${encodeURIComponent(returnTo)}`}
                    >
                      Yazar vitrini
                    </Link>
                    <form action={toggleReaderAuthorFavoriteAction}>
                      <input name="authorPublicId" type="hidden" value={author.publicId} />
                      <input name="returnPath" type="hidden" value={returnTo} />
                      <button className="button button--ghost" type="submit">
                        Favoriden Çıkar
                      </button>
                    </form>
                  </div>
                </article>
              );
            })}
          </section>
        ) : (
          <div className="workspace-list-empty">
            <h2>
              {hasFilters
                ? "Eşleşen favori yazar bulunamadı"
                : "Henüz favori yazarın yok"}
            </h2>
            <p>
              {hasFilters
                ? "Filtreleri değiştirerek favori yazarlarınız içinde yeniden deneyin."
                : "Bir yazarı favorilediğinizde burada görünür; yeni bir eser yayımladığında Bildirimler alanında haber alırsınız."}
            </p>
            {!hasFilters ? (
              <Link className="button button--outline" href="/yazar-kesfet">
                Yazarları keşfet
              </Link>
            ) : null}
          </div>
        )}

        <ReaderPagination
          ariaLabel="Favoriler sayfalama"
          currentPage={currentPage}
          hrefForPage={pageHref}
          totalPages={totalPages}
        />
      </div>
    </AppShell>
  );
}
