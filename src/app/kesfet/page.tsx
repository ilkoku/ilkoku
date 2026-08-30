import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

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
  parseReaderStandardFilters,
  readerListHref,
  readerReviewLabel,
  type ReaderActiveFilter,
  type ReaderSortOption,
} from "@/features/reader/discovery-standard";
import "@/features/reader/reader-discovery.css";
import {
  getAdultContentAccess,
  visibleMemberContentRatings,
} from "@/lib/adult-content-access";
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

export default async function ReaderExplorePage({
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

  if (!profile) redirect("/giris?sonraki=/kesfet");
  if (!canAccessReaderWorkspace(profile.role)) {
    redirect("/erisim-reddedildi?kaynak=reader");
  }

  const adultAccess = await getAdultContentAccess(profile.id);
  const ratingOptions = visibleMemberContentRatings(
    adultAccess.canAccessAdultContent,
  );
  const filters = parseReaderStandardFilters(
    await searchParams,
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
    ...(filters.reviewStatus
      ? { editorReviewStatus: filters.reviewStatus }
      : {}),
  };

  const [totalCount, favoriteCount] = await Promise.all([
    prisma.work.count({ where }),
    prisma.favorite.count({ where: { userId: profile.id } }),
  ]);
  const totalPages = Math.max(1, Math.ceil(totalCount / READER_LIST_PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);

  const works = await prisma.work.findMany({
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
          readingProgress: true,
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
          publishedAt: { not: null },
          status: "published",
        },
        orderBy: { position: "asc" },
        select: {
          content: true,
          position: true,
          title: true,
        },
      },
      favorites: {
        where: { userId: profile.id },
        select: { id: true },
      },
      readingProgress: {
        where: {
          userId: profile.id,
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
          progressPercent: true,
        },
        take: 1,
      },
    },
    orderBy:
      filters.sort === "updated"
        ? [{ updatedAt: "desc" }, { publishedAt: "desc" }]
        : [{ publishedAt: "desc" }, { createdAt: "desc" }],
    skip: (currentPage - 1) * READER_LIST_PAGE_SIZE,
    take: READER_LIST_PAGE_SIZE,
  });

  const rows: ReaderWorkRow[] = works.map((work) => {
    const firstChapter = work.chapters[0] ?? null;
    const progress = work.readingProgress[0] ?? null;

    return {
      authorName: work.author.displayName ?? work.author.fullName,
      authorUsername: work.author.username,
      chapterCount: work.chapters.length,
      commentCount: work._count.comments,
      completedAt: progress?.completedAt?.toISOString() ?? null,
      contentRating: work.contentRating,
      coverUrl: work.coverUrl,
      description: work.description,
      editorReviewStatus: work.editorReviewStatus,
      favoriteCount: work._count.favorites,
      genre: work.genre,
      id: work.id,
      isFavorite: work.favorites.length > 0,
      language: work.language,
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
      totalWords: work.chapters.reduce(
        (total, chapter) => total + countWords(chapter.content),
        0,
      ),
      updatedAt: work.updatedAt.toISOString(),
    };
  });

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
  const returnTo = pageHref(currentPage);

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace reader-discovery-workdesk">
        <section className="reader-discovery-desk">
          <div className="reader-discovery-desk__intro">
            <p className="reader-discovery-desk__eyebrow">Keşif masası</p>
            <h1>Eserleri masaya yatır</h1>
            <p className="reader-discovery-desk__lead">
              Ortak Keşfet havuzunu arayın, filtreleyin; bir eseri detay panelinde inceleyip
              favoriye alın veya doğrudan okumaya geçin.
            </p>
            <nav aria-label="Keşif çalışma alanı" className="reader-discovery-desk__quick-links">
              <span aria-current="page">Eserler</span>
              <Link href="/yazar-kesfet">Yazarlar</Link>
              <Link href="/favorilerim">Favorilerim</Link>
              <Link href="/okumaya-devam">Okumaya Devam</Link>
            </nav>
          </div>

          <div className="reader-discovery-desk__stats" aria-label="Keşif özeti">
            <div>
              <strong>{totalCount}</strong>
              <span>Eşleşen eser</span>
            </div>
            <div>
              <strong>{activeFilters.length}</strong>
              <span>Aktif filtre</span>
            </div>
            <div>
              <strong>{favoriteCount}</strong>
              <span>Favori eser</span>
            </div>
          </div>
        </section>

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
