import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { DiscoveryWorkspaceHero } from "@/components/discovery/DiscoveryWorkspaceHero";
import { AppShell } from "@/components/layout/AppShell";
import type { Prisma } from "@/generated/prisma/client";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { commonDiscoveryWorkWhereFor } from "@/features/discovery/common-work-scope";
import { countWords } from "@/features/editor-workspace/eligibility";
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
import "@/features/reader/reader-discovery.css";
import {
  getAdultContentAccess,
  visibleMemberContentRatings,
} from "@/lib/adult-content-access";
import {
  discoveryAdvancedFilterChips,
  hasDiscoveryAdvancedFilters,
} from "@/lib/discovery-advanced-filters";
import { prisma } from "@/lib/prisma";
import { workContentRatingDetails } from "@/lib/work-content-classification";

export const metadata: Metadata = {
  description: "İlkOku'da yayımlanan eserleri keşfedin.",
  title: "Keşfet | İlkOku",
};

export const dynamic = "force-dynamic";

const sortOptions = [
  { label: "En yeni yayımlanan", value: "newest" },
  { label: "Son güncellenen", value: "updated" },
] as const satisfies readonly ReaderSortOption[];

type SearchParams = Record<string, string | string[] | undefined>;

function mapReaderWork(work: Awaited<ReturnType<typeof fetchWorks>>[number]): ReaderWorkRow {
  const publishedChapters = work.chapters.filter(
    (chapter) => chapter.status === "published" && chapter.publishedAt !== null,
  );
  const firstChapter = publishedChapters[0] ?? null;
  const progress = work.readingProgress[0] ?? null;
  const hasPendingChapter = work.chapters.some(
    (chapter) => chapter.status !== "published" || chapter.publishedAt === null,
  );

  return {
    authorName: work.author.displayName ?? work.author.fullName,
    authorUsername: work.author.username,
    chapterCount: publishedChapters.length,
    commentCount: work._count.comments,
    completedAt: progress?.completedAt?.toISOString() ?? null,
    completionStatus:
      publishedChapters.length > 0 && !hasPendingChapter ? "completed" : "ongoing",
    contentRating: work.contentRating,
    coverUrl: work.coverUrl,
    description: work.description,
    editorReviewStatus: work.editorReviewStatus,
    favoriteCount: work._count.favorites,
    genre: work.genre,
    hasPassport: work._count.ownershipStamps > 0 || work._count.versions > 0,
    id: work.id,
    isFavorite: work.favorites.length > 0,
    language: work.language,
    lastReadAt: progress?.lastReadAt?.toISOString() ?? null,
    lastReadLabel: progress?.chapter.title ?? null,
    progressPercent: progress?.progressPercent ?? null,
    publishedAt: work.publishedAt?.toISOString() ?? null,
    readerCount: work._count.readingProgress,
    readingHref: progress
      ? `/oku/${work.slug}/bolum-${progress.chapter.position}`
      : firstChapter
        ? `/oku/${work.slug}/bolum-${firstChapter.position}`
        : null,
    readingState: progress
      ? progress.completed
        ? "completed"
        : "in_progress"
      : "unread",
    slug: work.slug,
    title: work.title,
    totalWords: publishedChapters.reduce(
      (total, chapter) => total + countWords(chapter.content),
      0,
    ),
    updatedAt: work.updatedAt.toISOString(),
    versionCount: work._count.versions,
  };
}

function fetchWorks(
  where: Prisma.WorkWhereInput,
  userId: string,
  orderBy: Prisma.WorkOrderByWithRelationInput[],
  pagination?: { skip: number; take: number },
) {
  return prisma.work.findMany({
    where,
    include: {
      _count: {
        select: {
          comments: {
            where: {
              deletedAt: null,
              status: "visible",
            },
          },
          favorites: true,
          ownershipStamps: true,
          readingProgress: true,
          versions: true,
        },
      },
      author: {
        select: {
          displayName: true,
          fullName: true,
          username: true,
        },
      },
      chapters: {
        where: {
          archivedAt: null,
        },
        orderBy: { position: "asc" },
        select: {
          content: true,
          position: true,
          publishedAt: true,
          status: true,
          title: true,
        },
      },
      favorites: {
        where: { userId },
        select: { id: true },
      },
      readingProgress: {
        where: {
          userId,
          chapter: {
            is: {
              archivedAt: null,
              publishedAt: { not: null },
              status: "published",
            },
          },
        },
        orderBy: { lastReadAt: "desc" },
        select: {
          chapter: {
            select: {
              position: true,
              title: true,
            },
          },
          completed: true,
          completedAt: true,
          lastReadAt: true,
          progressPercent: true,
        },
        take: 1,
      },
    },
    orderBy,
    ...(pagination ?? {}),
  });
}

export default async function ReaderExplorePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const profile = await getCurrentProfile();

  if (!profile) redirect("/giris?sonraki=/kesfet");
  if (!canAccessReaderWorkspace(profile.role)) {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  const adultAccess = await getAdultContentAccess(profile.id);
  const ratingOptions = visibleMemberContentRatings(
    adultAccess.canAccessAdultContent,
  );
  const params = await searchParams;
  const { enabledFilterIds, filters } = await parseManagedReaderStandardFilters(
    "reader-work-discovery",
    params,
    ratingOptions,
    sortOptions,
    "newest",
  );

  const where: Prisma.WorkWhereInput = {
    ...commonDiscoveryWorkWhereFor(adultAccess.canAccessAdultContent),
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
    ...(filters.language ? { language: filters.language } : {}),
    ...(filters.reviewStatus
      ? { editorReviewStatus: filters.reviewStatus }
      : {}),
  };
  const orderBy: Prisma.WorkOrderByWithRelationInput[] =
    filters.sort === "updated"
      ? [{ updatedAt: "desc" }, { publishedAt: "desc" }]
      : [{ publishedAt: "desc" }, { createdAt: "desc" }];
  const usesPostFilters =
    Boolean(filters.wordCount) || hasDiscoveryAdvancedFilters(filters.advanced);
  const favoriteCount = await prisma.favorite.count({ where: { userId: profile.id } });

  let rows: ReaderWorkRow[];
  let totalCount: number;
  let currentPage: number;
  let totalPages: number;

  if (usesPostFilters) {
    const allWorks = await fetchWorks(where, profile.id, orderBy);
    const allRows = allWorks
      .map(mapReaderWork)
      .filter((work) => readerWorkMatches(work, filters));
    totalCount = allRows.length;
    totalPages = Math.max(1, Math.ceil(totalCount / READER_LIST_PAGE_SIZE));
    currentPage = Math.min(filters.page, totalPages);
    rows = allRows.slice(
      (currentPage - 1) * READER_LIST_PAGE_SIZE,
      currentPage * READER_LIST_PAGE_SIZE,
    );
  } else {
    totalCount = await prisma.work.count({ where });
    totalPages = Math.max(1, Math.ceil(totalCount / READER_LIST_PAGE_SIZE));
    currentPage = Math.min(filters.page, totalPages);
    const pageWorks = await fetchWorks(where, profile.id, orderBy, {
      skip: (currentPage - 1) * READER_LIST_PAGE_SIZE,
      take: READER_LIST_PAGE_SIZE,
    });
    rows = pageWorks.map(mapReaderWork);
  }

  const normalizedFilters = { ...filters, page: currentPage };
  const pageHref = (page: number) =>
    readerListHref("/kesfet", normalizedFilters, page);
  const activeFilters: ReaderActiveFilter[] = [
    filters.search
      ? {
          href: readerListHref(
            "/kesfet",
            { ...normalizedFilters, search: undefined },
            1,
          ),
          label: `Arama: ${filters.search}`,
        }
      : null,
    filters.genre
      ? {
          href: readerListHref(
            "/kesfet",
            { ...normalizedFilters, genre: undefined },
            1,
          ),
          label: `Tür: ${filters.genre}`,
        }
      : null,
    filters.contentRating
      ? {
          href: readerListHref(
            "/kesfet",
            { ...normalizedFilters, contentRating: undefined },
            1,
          ),
          label: `Hitap: ${workContentRatingDetails[filters.contentRating].shortLabel}`,
        }
      : null,
    filters.reviewStatus
      ? {
          href: readerListHref(
            "/kesfet",
            { ...normalizedFilters, reviewStatus: undefined },
            1,
          ),
          label: readerReviewLabel(filters.reviewStatus),
        }
      : null,
    filters.sort !== "newest"
      ? {
          href: readerListHref(
            "/kesfet",
            { ...normalizedFilters, sort: "newest" },
            1,
          ),
          label: "Sıralama: Son güncellenen",
        }
      : null,
  ].filter((item): item is ReaderActiveFilter => item !== null);
  const advancedFilterCount = discoveryAdvancedFilterChips(
    filters.advanced,
    enabledFilterIds,
  ).length;
  const returnTo = pageHref(currentPage);

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace reader-discovery-workdesk">
        <DiscoveryWorkspaceHero
          description="Ortak Eser Havuzu’nu arayın ve filtreleyin; eserin okur etkileşimini inceleyip favoriye alın veya doğrudan okumaya geçin."
          eyebrow="Okur · Eser Havuzu · Keşif"
          links={[
            { current: true, href: "/kesfet", label: "Eserler" },
            { href: "/yazar-kesfet", label: "Yazarlar" },
            { href: "/favorilerim", label: "Favorilerim" },
            { href: "/okumaya-devam", label: "Okumaya Devam" },
          ]}
          stats={[
            { label: "Eşleşen eser", value: totalCount },
            { label: "Aktif filtre", value: activeFilters.length + advancedFilterCount },
            { label: "Favori eser", value: favoriteCount },
          ]}
          title="Eser Keşfet"
        />

        {adultAccess.isAdult && !adultAccess.canAccessAdultContent ? (
          <section className="reader-discovery-notice">
            <span>18+ içerik tercihi</span>
            <strong>İkinci onay gerekli</strong>
            <small>18+ eserleri aynı Keşfet havuzunda görmek için açık onay verin.</small>
            <Link
              className="button button--outline"
              href="/yetiskin-icerik-onayi?sonraki=%2Fkesfet"
            >
              18+ içerikleri aç
            </Link>
          </section>
        ) : null}

        <ReaderFilterDesk
          activeFilters={activeFilters}
          advancedFilters={filters.advanced}
          clearHref="/kesfet"
          contentRating={filters.contentRating}
          genre={filters.genre}
          heading="Aradığınız eseri daraltın"
          hint="Filtre seçmeden tüm keşif havuzunu görüyorsunuz."
          ratingOptions={ratingOptions}
          reviewStatus={filters.reviewStatus}
          search={filters.search}
          searchPlaceholder="Eser, yazar veya rumuz ara"
          sort={filters.sort}
          sortOptions={sortOptions}
          standardFilters={normalizedFilters}
        />

        <ReaderResultSummary
          currentPage={currentPage}
          noun="eser"
          totalCount={totalCount}
          visibleCount={rows.length}
        />

        <ReaderWorksTable
          emptyDescription="Arama ifadenizi veya filtreleri değiştirerek yeniden deneyin."
          emptyTitle="Eşleşen eser bulunamadı"
          returnTo={returnTo}
          rows={rows}
        />

        <ReaderPagination
          ariaLabel="Keşif sayfalama"
          currentPage={currentPage}
          hrefForPage={pageHref}
          totalPages={totalPages}
        />
      </div>
    </AppShell>
  );
}
