import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@/generated/prisma/client";

import { AdvancedDiscoveryFilterFields } from "@/components/discovery/AdvancedDiscoveryFilterFields";
import {
  DiscoveryAuthorCard,
  DiscoveryAuthorGrid,
} from "@/components/discovery/DiscoveryAuthorCard";
import {
  DiscoveryPagination,
  DiscoveryResultSummary,
} from "@/components/discovery/DiscoveryListChrome";
import { DiscoveryWorkspaceHero } from "@/components/discovery/DiscoveryWorkspaceHero";
import "@/components/discovery/discovery-filter-desk.css";
import { AppShell } from "@/components/layout/AppShell";
import { getDiscoveryAuthorMetrics } from "@/features/discovery/author-filter-metrics";
import { commonDiscoveryAuthorWhereFor } from "@/features/discovery/common-author-scope";
import { commonDiscoveryWorkWhereFor } from "@/features/discovery/common-work-scope";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import {
  getAdultContentAccess,
  visibleMemberContentRatings,
} from "@/lib/adult-content-access";
import { sanitizeDiscoveryAdvancedFilters } from "@/lib/discovery-advanced-filter-management";
import {
  appendDiscoveryAdvancedFilterParams,
  clearDiscoveryAdvancedFilter,
  discoveryAdvancedFilterChips,
  hasDiscoveryAdvancedFilters,
  matchesDiscoveryAdvancedAuthorFilters,
  parseDiscoveryAdvancedFilters,
  type DiscoveryAdvancedFilters,
} from "@/lib/discovery-advanced-filters";
import { getDiscoverySurfaceFilterIds } from "@/lib/discovery-filter-config";
import type { DiscoveryFilterId } from "@/lib/discovery-filter-registry";
import { DISCOVERY_PAGE_SIZE } from "@/lib/discovery-list-standard";
import { availableGenreLabels, normalizeGenreLabel } from "@/lib/genre-system";
import { GENRE_LABELS } from "@/lib/genres";
import { prisma } from "@/lib/prisma";
import {
  isMemberStoredWorkContentRating,
  workContentRatingDetails,
  type MemberStoredWorkContentRating,
} from "@/lib/work-content-classification";

export const metadata: Metadata = {
  title: "Yazar Keşfet | İlkOku",
  description: "İlkOku'da yayımlanmış eseri bulunan yazarları keşfedin.",
};

export const dynamic = "force-dynamic";

const reviewFilters = [
  "not_requested",
  "requested",
  "in_progress",
  "awaiting_second_editor",
  "second_in_progress",
  "completed",
] as const;
const sortFilters = ["recent", "most_works", "az"] as const;

type ReviewFilter = (typeof reviewFilters)[number];
type SortFilter = (typeof sortFilters)[number];

type EditorAuthorFilters = {
  advanced: DiscoveryAdvancedFilters;
  city?: string;
  contentRating?: MemberStoredWorkContentRating;
  genre?: string;
  reviewStatus?: ReviewFilter;
  search?: string;
  sort: SortFilter;
};

function firstValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function includesValue<T extends string>(values: readonly T[], value: string): value is T {
  return values.includes(value as T);
}

function reviewLabel(value: ReviewFilter) {
  if (value === "completed") return "İncelendi";
  if (value === "second_in_progress") return "İkinci editörde";
  if (value === "awaiting_second_editor") return "İkinci editör bekleniyor";
  if (value === "in_progress") return "İlk editörde";
  if (value === "requested") return "İnceleme talep edildi";
  return "Henüz incelenmedi";
}

function sortLabel(value: SortFilter) {
  if (value === "most_works") return "En çok eşleşen eser";
  if (value === "az") return "A–Z";
  return "Son eser yayımlayan";
}

function pageHref(filters: EditorAuthorFilters, page = 1) {
  const params = new URLSearchParams();
  if (filters.search) params.set("arama", filters.search);
  if (filters.genre) params.set("tur", filters.genre);
  if (filters.contentRating) params.set("hitap", filters.contentRating);
  if (filters.city) params.set("sehir", filters.city);
  if (filters.reviewStatus) params.set("editor", filters.reviewStatus);
  if (filters.sort !== "recent") params.set("siralama", filters.sort);
  appendDiscoveryAdvancedFilterParams(params, filters.advanced);
  if (page > 1) params.set("sayfa", String(page));
  const query = params.toString();
  return query ? `/editor/yazarlar?${query}` : "/editor/yazarlar";
}

function publicWriterName(writer: {
  displayName: string | null;
  username: string | null;
}) {
  return writer.displayName?.trim() || writer.username?.trim() || "İlkOku Yazarı";
}

function publicWriterAlias(writer: {
  displayName: string | null;
  username: string | null;
}) {
  if (writer.username?.trim()) {
    return writer.username.startsWith("@") ? writer.username : `@${writer.username}`;
  }

  const source = writer.displayName?.trim() || "ilkoku-yazari";
  const slug = source
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/gu, "-")
    .replace(/[^a-z0-9çğıöşü_-]/giu, "");

  return `@${slug || "ilkoku-yazari"}`;
}

export default async function EditorWriterDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireEditorProfile("/editor/yazarlar");
  const enabledFilterIds = new Set<DiscoveryFilterId>(
    await getDiscoverySurfaceFilterIds("editor-author-discovery"),
  );
  const adultAccess = await getAdultContentAccess(profile.id);
  const visibleRatings = visibleMemberContentRatings(adultAccess.canAccessAdultContent);
  const params = await searchParams;
  const search = enabledFilterIds.has("search")
    ? firstValue(params.arama).slice(0, 220) || undefined
    : undefined;
  const genre = enabledFilterIds.has("genre")
    ? normalizeGenreLabel(firstValue(params.tur))
    : undefined;
  const city = enabledFilterIds.has("city")
    ? firstValue(params.sehir).slice(0, 120) || undefined
    : undefined;
  const ratingValue = firstValue(params.hitap);
  const requestedRating =
    enabledFilterIds.has("contentRating") && isMemberStoredWorkContentRating(ratingValue)
      ? ratingValue
      : undefined;
  const contentRating =
    requestedRating && visibleRatings.includes(requestedRating)
      ? requestedRating
      : undefined;
  const reviewValue = firstValue(params.editor);
  const reviewStatus =
    enabledFilterIds.has("reviewStatus") && includesValue(reviewFilters, reviewValue)
      ? reviewValue
      : undefined;
  const sortValue = firstValue(params.siralama);
  const sort: SortFilter =
    enabledFilterIds.has("sort") && includesValue(sortFilters, sortValue)
      ? sortValue
      : "recent";
  const advanced = sanitizeDiscoveryAdvancedFilters(
    parseDiscoveryAdvancedFilters(params),
    enabledFilterIds,
  );
  const rawPage = Number.parseInt(firstValue(params.sayfa), 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const filters: EditorAuthorFilters = {
    advanced,
    city,
    contentRating,
    genre,
    reviewStatus,
    search,
    sort,
  };

  const baseWorkWhere = commonDiscoveryWorkWhereFor(adultAccess.canAccessAdultContent);
  const matchedWorkWhere: Prisma.WorkWhereInput = {
    ...baseWorkWhere,
    ...(genre ? { genre } : {}),
    ...(contentRating ? { contentRating } : {}),
    ...(reviewStatus ? { editorReviewStatus: reviewStatus } : {}),
  };
  const where: Prisma.UserWhereInput = {
    ...commonDiscoveryAuthorWhereFor(adultAccess.canAccessAdultContent, {
      ...(genre ? { genre } : {}),
      ...(contentRating ? { contentRating } : {}),
      ...(reviewStatus ? { editorReviewStatus: reviewStatus } : {}),
    }),
    ...(search
      ? {
          OR: [
            { displayName: { contains: search } },
            { username: { contains: search } },
            { bio: { contains: search } },
            {
              works: {
                some: {
                  ...matchedWorkWhere,
                  title: { contains: search },
                },
              },
            },
          ],
        }
      : {}),
    ...(city
      ? {
          profile: {
            is: {
              city: { contains: city },
            },
          },
        }
      : {}),
  };

  const writerSelect = {
    bio: true,
    displayName: true,
    id: true,
    profile: {
      select: {
        city: true,
      },
    },
    publicId: true,
    username: true,
    works: {
      where: matchedWorkWhere,
      orderBy: [{ publishedAt: "desc" as const }, { updatedAt: "desc" as const }],
      take: 4,
      select: {
        _count: {
          select: {
            chapters: true,
            comments: true,
            favorites: true,
            readingProgress: true,
          },
        },
        genre: true,
        id: true,
        publishedAt: true,
        slug: true,
        title: true,
      },
    },
    _count: {
      select: {
        works: { where: matchedWorkWhere },
        feedbackReceived: true,
      },
    },
  } satisfies Prisma.UserSelect;

  const needsPostFilter = sort !== "recent" || hasDiscoveryAdvancedFilters(advanced);
  let writers: Prisma.UserGetPayload<{ select: typeof writerSelect }>[];
  let totalCount: number;
  let totalPages: number;
  let currentPage: number;

  if (needsPostFilter) {
    const allWriters = await prisma.user.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      select: writerSelect,
    });
    const filterMetrics = hasDiscoveryAdvancedFilters(advanced)
      ? await getDiscoveryAuthorMetrics(
          allWriters.map((writer) => writer.id),
          matchedWorkWhere,
        )
      : null;
    const filteredWriters = filterMetrics
      ? allWriters.filter((writer) => {
          const metric = filterMetrics.get(writer.id);
          return Boolean(metric && matchesDiscoveryAdvancedAuthorFilters(metric, advanced));
        })
      : allWriters;

    const collator = new Intl.Collator("tr-TR", { sensitivity: "base" });
    filteredWriters.sort((left, right) => {
      if (sort === "most_works") {
        const difference = right._count.works - left._count.works;
        if (difference !== 0) return difference;
      }
      if (sort === "az") {
        return collator.compare(publicWriterName(left), publicWriterName(right));
      }
      const leftTime = left.works[0]?.publishedAt?.getTime() ?? 0;
      const rightTime = right.works[0]?.publishedAt?.getTime() ?? 0;
      return rightTime - leftTime;
    });

    totalCount = filteredWriters.length;
    totalPages = Math.max(1, Math.ceil(totalCount / DISCOVERY_PAGE_SIZE));
    currentPage = Math.min(requestedPage, totalPages);
    writers = filteredWriters.slice(
      (currentPage - 1) * DISCOVERY_PAGE_SIZE,
      currentPage * DISCOVERY_PAGE_SIZE,
    );
  } else {
    totalCount = await prisma.user.count({ where });
    totalPages = Math.max(1, Math.ceil(totalCount / DISCOVERY_PAGE_SIZE));
    currentPage = Math.min(requestedPage, totalPages);
    writers = await prisma.user.findMany({
      where,
      orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
      skip: (currentPage - 1) * DISCOVERY_PAGE_SIZE,
      take: DISCOVERY_PAGE_SIZE,
      select: writerSelect,
    });
  }

  const cardMetrics = await getDiscoveryAuthorMetrics(
    writers.map((writer) => writer.id),
    baseWorkWhere,
  );
  const baseActiveFilters = [
    search
      ? { href: pageHref({ ...filters, search: undefined }), label: `Arama: ${search}` }
      : null,
    genre
      ? { href: pageHref({ ...filters, genre: undefined }), label: `Tür: ${genre}` }
      : null,
    contentRating
      ? {
          href: pageHref({ ...filters, contentRating: undefined }),
          label: `Yaş: ${workContentRatingDetails[contentRating].shortLabel}`,
        }
      : null,
    city
      ? { href: pageHref({ ...filters, city: undefined }), label: `Şehir: ${city}` }
      : null,
    reviewStatus
      ? {
          href: pageHref({ ...filters, reviewStatus: undefined }),
          label: `Editör: ${reviewLabel(reviewStatus)}`,
        }
      : null,
    sort !== "recent"
      ? {
          href: pageHref({ ...filters, sort: "recent" }),
          label: `Sıralama: ${sortLabel(sort)}`,
        }
      : null,
  ].filter((item): item is { href: string; label: string } => item !== null);
  const advancedActiveFilters = discoveryAdvancedFilterChips(advanced, enabledFilterIds).map(
    (item) => ({
      href: pageHref(
        { ...filters, advanced: clearDiscoveryAdvancedFilter(advanced, item.id) },
        1,
      ),
      label: item.label,
    }),
  );
  const activeFilters = [...baseActiveFilters, ...advancedActiveFilters];
  const hasFilters = activeFilters.length > 0;
  const returnTo = pageHref(filters, currentPage);

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <DiscoveryWorkspaceHero
          description="Ortak Yazar Havuzu’nda keşfe açık eseri bulunan yazarları inceleyin; üretimlerini ve okur etkileşimini aynı kart standardında karşılaştırın."
          eyebrow="Editör · Yazar Havuzu · Keşif"
          links={[
            { href: "/editor/kesfet", label: "Eserler" },
            { current: true, href: "/editor/yazarlar", label: "Yazarlar" },
            { href: "/editor/favoriler", label: "Favoriler" },
            { href: "/editor/seckiler", label: "Seçkiler" },
          ]}
          stats={[
            { label: "Eşleşen yazar", value: totalCount },
            { label: "Aktif filtre", value: activeFilters.length },
            { label: "Bu sayfada", value: writers.length },
          ]}
          title="Yazar Keşfet"
        />

        <section aria-label="Editör yazar filtre masası" className="role-filter-desk">
          <header className="role-filter-desk__header">
            <div>
              <span>Filtre masası</span>
              <strong>Editör için uygun yazarları daraltın</strong>
            </div>
            {hasFilters ? <Link href="/editor/yazarlar">Tüm filtreleri temizle</Link> : null}
          </header>

          {enabledFilterIds.size > 0 ? (
            <form className="role-filter-desk__form" method="get">
              {enabledFilterIds.has("search") ? (
                <label className="role-filter-field--search">
                  <span>Arama</span>
                  <input
                    defaultValue={search}
                    name="arama"
                    placeholder="Yazar, rumuz, biyografi veya eser"
                    type="search"
                  />
                </label>
              ) : null}

              {enabledFilterIds.has("genre") ? (
                <label>
                  <span>Tür</span>
                  <select defaultValue={genre ?? ""} name="tur">
                    <option value="">Tüm türler</option>
                    {GENRE_LABELS.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              {enabledFilterIds.has("contentRating") ? (
                <label>
                  <span>Hitap yaşı</span>
                  <select defaultValue={contentRating ?? ""} name="hitap">
                    <option value="">Tüm yaşlar</option>
                    {visibleRatings.map((rating) => (
                      <option key={rating} value={rating}>
                        {workContentRatingDetails[rating].label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}

              {enabledFilterIds.has("city") ? (
                <label>
                  <span>Şehir</span>
                  <input defaultValue={city} name="sehir" placeholder="Örn. İstanbul" />
                </label>
              ) : null}

              {enabledFilterIds.has("reviewStatus") ? (
                <label>
                  <span>Editör durumu</span>
                  <select defaultValue={reviewStatus ?? ""} name="editor">
                    <option value="">Tümü</option>
                    {reviewFilters.map((value) => (
                      <option key={value} value={value}>{reviewLabel(value)}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              {enabledFilterIds.has("sort") ? (
                <label>
                  <span>Sıralama</span>
                  <select defaultValue={sort} name="siralama">
                    {sortFilters.map((value) => (
                      <option key={value} value={value}>{sortLabel(value)}</option>
                    ))}
                  </select>
                </label>
              ) : null}

              <AdvancedDiscoveryFilterFields
                enabledFilterIds={enabledFilterIds}
                filters={advanced}
              />

              <div className="role-filter-desk__actions">
                <button className="button button--primary" type="submit">
                  Masayı Güncelle
                </button>
                {hasFilters ? (
                  <Link className="button button--ghost" href="/editor/yazarlar">
                    Temizle
                  </Link>
                ) : null}
              </div>
            </form>
          ) : (
            <p className="role-filter-desk__hint">
              Bu yüzeyde Filtre Masası alanları İçerik Yönetimi&apos;nden kapatıldı.
            </p>
          )}

          {hasFilters ? (
            <div aria-label="Aktif filtreler" className="role-filter-desk__active">
              <span>Aktif</span>
              {activeFilters.map((item) => (
                <Link href={item.href} key={`${item.label}-${item.href}`}>
                  {item.label}
                  <b aria-hidden="true">×</b>
                </Link>
              ))}
            </div>
          ) : enabledFilterIds.size > 0 ? (
            <p className="role-filter-desk__hint">
              Filtre seçmeden editöre açık ortak Yazar Havuzu’nu görüyorsunuz.
            </p>
          ) : null}
        </section>

        <DiscoveryResultSummary
          currentPage={currentPage}
          noun="yazar"
          pageSize={DISCOVERY_PAGE_SIZE}
          totalCount={totalCount}
          visibleCount={writers.length}
        />

        {writers.length === 0 ? (
          <div className="editor-empty">
            <h2>Eşleşen yazar bulunamadı</h2>
            <p>Arama veya filtreleri değiştirerek yeniden deneyin.</p>
          </div>
        ) : (
          <DiscoveryAuthorGrid>
            {writers.map((writer) => {
              const name = publicWriterName(writer);
              const metric = cardMetrics.get(writer.id);
              const genres = availableGenreLabels(writer.works.map((work) => work.genre)).slice(0, 2);
              const latest = writer.works[0] ?? null;
              const profileHref = `/yazarlar/${writer.publicId}?from=${encodeURIComponent(returnTo)}`;
              const signals = [
                writer.profile?.city || "Şehir belirtilmedi",
                ...genres,
                writer._count.feedbackReceived > 0
                  ? `${writer._count.feedbackReceived} editör görüşü`
                  : null,
              ].filter((value): value is string => Boolean(value));

              return (
                <DiscoveryAuthorCard
                  alias={publicWriterAlias(writer)}
                  bio={writer.bio}
                  key={writer.id}
                  latestWork={
                    latest
                      ? {
                          href: `/kitap/${latest.slug}?from=${encodeURIComponent(returnTo)}`,
                          meta: `${latest.genre || "Tür belirtilmedi"} · ${latest._count.chapters} bölüm`,
                          title: latest.title,
                        }
                      : null
                  }
                  matchedWorkCount={writer._count.works}
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
        )}

        <DiscoveryPagination
          ariaLabel="Editör yazar keşif sayfalama"
          currentPage={currentPage}
          hrefForPage={(page) => pageHref(filters, page)}
          totalPages={totalPages}
        />
      </div>
    </AppShell>
  );
}
