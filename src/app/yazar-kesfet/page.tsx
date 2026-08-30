import type { Metadata } from "next";
import { redirect } from "next/navigation";
import type { Prisma } from "@/generated/prisma/client";

import {
  DiscoveryAuthorCard,
  DiscoveryAuthorGrid,
} from "@/components/discovery/DiscoveryAuthorCard";
import { DiscoveryWorkspaceHero } from "@/components/discovery/DiscoveryWorkspaceHero";
import { AppShell } from "@/components/layout/AppShell";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { getDiscoveryAuthorMetrics } from "@/features/discovery/author-filter-metrics";
import { discoveryAuthorWhereFromWorkPool } from "@/features/discovery/common-author-scope";
import { readerAuthorDiscoveryWorkWhere } from "@/features/reader/author-discovery-scope";
import { toggleReaderAuthorFavoriteAction } from "@/features/reader/author-favorites";
import {
  READER_LIST_PAGE_SIZE,
  ReaderFilterDesk,
  ReaderPagination,
  ReaderResultSummary,
  parseManagedReaderStandardFilters,
  readerListHref,
  readerReviewLabel,
  type ReaderActiveFilter,
  type ReaderReviewFilter,
  type ReaderSortOption,
} from "@/features/reader/discovery-standard";
import "@/features/reader/reader-discovery.css";
import {
  discoveryAdvancedFilterChips,
  hasDiscoveryAdvancedFilters,
  matchesDiscoveryAdvancedAuthorFilters,
} from "@/lib/discovery-advanced-filters";
import { prisma } from "@/lib/prisma";
import {
  publicStoredWorkContentRatings,
  workContentRatingDetails,
} from "@/lib/work-content-classification";

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

export default async function ReaderAuthorDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/giris?sonraki=/yazar-kesfet");
  if (!canAccessReaderWorkspace(profile.role)) {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  const params = await searchParams;
  const { enabledFilterIds, filters } = await parseManagedReaderStandardFilters(
    "reader-author-discovery",
    params,
    publicStoredWorkContentRatings,
    sortOptions,
    "recent",
  );

  const metricWorkWhere: Prisma.WorkWhereInput = {
    ...readerAuthorDiscoveryWorkWhere,
    ...(filters.genre ? { genre: filters.genre } : {}),
    ...(filters.contentRating ? { contentRating: filters.contentRating } : {}),
    ...(filters.reviewStatus
      ? { editorReviewStatus: filters.reviewStatus }
      : {}),
  };
  const workWhere: Prisma.WorkWhereInput = {
    ...metricWorkWhere,
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
  };
  const authorWhere: Prisma.UserWhereInput = {
    ...discoveryAuthorWhereFromWorkPool(workWhere),
    ...(filters.city
      ? {
          profile: {
            is: {
              city: { contains: filters.city },
            },
          },
        }
      : {}),
  };

  const [authors, favoriteAuthorCount] = await Promise.all([
    prisma.user.findMany({
      where: authorWhere,
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

  const metrics = hasDiscoveryAdvancedFilters(filters.advanced)
    ? await getDiscoveryAuthorMetrics(
        authors.map((author) => author.id),
        metricWorkWhere,
      )
    : null;
  const filteredAuthors = metrics
    ? authors.filter((author) => {
        const metric = metrics.get(author.id);
        return Boolean(
          metric &&
            matchesDiscoveryAdvancedAuthorFilters(metric, filters.advanced),
        );
      })
    : authors;

  const collator = new Intl.Collator("tr-TR", { sensitivity: "base" });
  const sortedAuthors = [...filteredAuthors].sort((left, right) => {
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
  const cardMetrics = await getDiscoveryAuthorMetrics(
    pageAuthors.map((author) => author.id),
    readerAuthorDiscoveryWorkWhere,
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
  const optionalActiveCount =
    (filters.city ? 1 : 0) +
    discoveryAdvancedFilterChips(filters.advanced, enabledFilterIds).length;
  const returnTo = pageHref(currentPage);

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace reader-discovery-workdesk">
        <DiscoveryWorkspaceHero
          description="Keşfe açık eseri bulunan yazarları bulun; üretimlerini ve okur etkileşimini aynı kart standardında karşılaştırıp ilginizi çekenleri favorilerinize alın."
          eyebrow="Okur · Yazar Havuzu · Keşif"
          links={[
            { href: "/kesfet", label: "Eserler" },
            { current: true, href: "/yazar-kesfet", label: "Yazarlar" },
            { href: "/favorilerim?tip=yazar", label: "Favori Yazarlarım" },
            { href: "/okumaya-devam", label: "Okumaya Devam" },
          ]}
          stats={[
            { label: "Eşleşen yazar", value: totalCount },
            { label: "Aktif filtre", value: activeFilters.length + optionalActiveCount },
            { label: "Favori yazar", value: favoriteAuthorCount },
          ]}
          title="Yazar Keşfet"
        />

        <ReaderFilterDesk
          activeFilters={activeFilters}
          advancedFilters={filters.advanced}
          clearHref="/yazar-kesfet"
          contentRating={filters.contentRating}
          genre={filters.genre}
          heading="Yazarları filtrele"
          hint="Keşfe açık eseri bulunan bütün uygun yazarlar Yazar Havuzu'ndan geliyor."
          ratingOptions={publicStoredWorkContentRatings}
          reviewStatus={filters.reviewStatus}
          search={filters.search}
          searchPlaceholder="Yazar adı, rumuz veya eser ara"
          sort={filters.sort}
          sortOptions={sortOptions}
          standardFilters={normalizedFilters}
        />

        <ReaderResultSummary
          currentPage={currentPage}
          noun="yazar"
          totalCount={totalCount}
          visibleCount={pageAuthors.length}
        />

        {pageAuthors.length > 0 ? (
          <DiscoveryAuthorGrid>
            {pageAuthors.map((author) => {
              const name = authorName(author);
              const latest = author.works[0] ?? null;
              const metric = cardMetrics.get(author.id);
              const isFavorite = favoriteAuthorIds.has(author.id);
              const profileHref = `/yazarlar/${author.publicId}?from=${encodeURIComponent(returnTo)}`;
              const genres = Array.from(
                new Set(
                  author.works
                    .map((work) => work.genre)
                    .filter((genre): genre is string => Boolean(genre)),
                ),
              ).slice(0, 3);
              const signals = [
                ...genres,
                latest
                  ? workContentRatingDetails[latest.contentRating].shortLabel
                  : null,
                latest
                  ? readerReviewLabel(
                      latest.editorReviewStatus as ReaderReviewFilter,
                    )
                  : null,
              ].filter((value): value is string => Boolean(value));

              return (
                <DiscoveryAuthorCard
                  actions={
                    author.id === profile.id ? (
                      <span>Bu sizsiniz</span>
                    ) : (
                      <form action={toggleReaderAuthorFavoriteAction}>
                        <input name="authorPublicId" type="hidden" value={author.publicId} />
                        <input name="returnPath" type="hidden" value={returnTo} />
                        <button
                          aria-pressed={isFavorite}
                          className={
                            isFavorite
                              ? "button button--primary"
                              : "button button--ghost"
                          }
                          type="submit"
                        >
                          {isFavorite ? "Favoride" : "Favorile"}
                        </button>
                      </form>
                    )
                  }
                  alias={
                    author.username
                      ? `@${author.username.replace(/^@/u, "")}`
                      : "İlkOku yazarı"
                  }
                  bio={author.bio}
                  key={author.publicId}
                  latestWork={
                    latest
                      ? {
                          href: `/kitap/${latest.slug}?from=${encodeURIComponent(returnTo)}`,
                          meta: latest.genre || "Tür belirtilmedi",
                          title: latest.title,
                        }
                      : null
                  }
                  matchedWorkCount={author._count.works}
                  metrics={[
                    { label: "Eser", value: metric?.publicWorkCount ?? 0 },
                    { label: "Okur", value: metric?.readerCount ?? 0 },
                    { label: "Beğeni", value: metric?.favoriteCount ?? 0 },
                    { label: "Yorum", value: metric?.commentCount ?? 0 },
                  ]}
                  name={name}
                  profileHref={profileHref}
                  signals={signals}
                />
              );
            })}
          </DiscoveryAuthorGrid>
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
