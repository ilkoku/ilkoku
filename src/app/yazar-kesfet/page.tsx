import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import type { Prisma } from "@/generated/prisma/client";
import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentProfile } from "@/features/auth/profile";
import { readerAuthorDiscoveryWorkWhere } from "@/features/reader/author-discovery-scope";
import { toggleReaderAuthorFavoriteAction } from "@/features/reader/author-favorites";
import "@/features/reader/reader-discovery.css";
import { normalizeGenreLabel } from "@/lib/genre-system";
import { GENRE_LABELS } from "@/lib/genres";
import {
  isPublicStoredWorkContentRating,
  publicStoredWorkContentRatings,
  workContentRatingDetails,
  type PublicStoredWorkContentRating,
} from "@/lib/work-content-classification";
import { prisma } from "@/lib/prisma";
import "./reader-author-discovery.css";

export const metadata: Metadata = {
  description: "İlkOku yazarlarını keşfe açık eserlerine göre süzerek keşfedin.",
  title: "Yazar Keşfet | İlkOku",
};

export const dynamic = "force-dynamic";

const PAGE_SIZE = 18;
const reviewFilters = [
  "not_requested",
  "requested",
  "in_progress",
  "awaiting_second_editor",
  "second_in_progress",
  "completed",
] as const;
const sortFilters = ["recent", "most_works", "az"] as const;
const readerAuthorContentRatings = publicStoredWorkContentRatings;

type ReviewFilter = (typeof reviewFilters)[number];
type SortFilter = (typeof sortFilters)[number];

type AuthorExploreFilters = {
  contentRating?: PublicStoredWorkContentRating;
  favoritesOnly: boolean;
  genre?: string;
  reviewStatus?: ReviewFilter;
  search?: string;
  sort: SortFilter;
};

function includesValue<T extends string>(
  values: readonly T[],
  value: string | undefined,
): value is T {
  return Boolean(value && values.includes(value as T));
}

function reviewLabel(status: ReviewFilter) {
  switch (status) {
    case "not_requested":
      return "Henüz incelenmedi";
    case "requested":
      return "İnceleme talep edildi";
    case "in_progress":
      return "İlk editörde";
    case "awaiting_second_editor":
      return "İkinci editör bekleniyor";
    case "second_in_progress":
      return "İkinci editörde";
    case "completed":
      return "İncelendi";
  }
}

function authorName(author: {
  displayName: string | null;
  fullName: string;
}) {
  return author.displayName ?? author.fullName;
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/u).filter(Boolean);
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase("tr-TR") ?? "")
    .join("") || "Y";
}

function pageHref(filters: AuthorExploreFilters, page: number) {
  const params = new URLSearchParams();

  if (filters.search) params.set("arama", filters.search);
  if (filters.genre) params.set("tur", filters.genre);
  if (filters.contentRating) params.set("hitapYasi", filters.contentRating);
  if (filters.reviewStatus) params.set("editor", filters.reviewStatus);
  if (filters.favoritesOnly) params.set("favori", "1");
  if (filters.sort !== "recent") params.set("siralama", filters.sort);
  if (page > 1) params.set("sayfa", String(page));

  const query = params.toString();
  return query ? `/yazar-kesfet?${query}` : "/yazar-kesfet";
}

export default async function ReaderAuthorDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{
    arama?: string;
    editor?: string;
    favori?: string;
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

  const parameters = await searchParams;
  const search = parameters.arama?.trim().slice(0, 220);
  const genre = normalizeGenreLabel(parameters.tur);
  const contentRating = isPublicStoredWorkContentRating(parameters.hitapYasi)
    ? parameters.hitapYasi
    : undefined;
  const reviewStatus = includesValue(reviewFilters, parameters.editor)
    ? parameters.editor
    : undefined;
  const favoritesOnly = parameters.favori === "1";
  const sort = includesValue(sortFilters, parameters.siralama)
    ? parameters.siralama
    : "recent";
  const rawPage = Number.parseInt(parameters.sayfa ?? "", 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const filters: AuthorExploreFilters = {
    contentRating,
    favoritesOnly,
    genre,
    reviewStatus,
    search,
    sort,
  };

  const workWhere: Prisma.WorkWhereInput = {
    ...readerAuthorDiscoveryWorkWhere,
    ...(search
      ? {
          OR: [
            { title: { contains: search } },
            { subtitle: { contains: search } },
            {
              author: {
                is: {
                  OR: [
                    { displayName: { contains: search } },
                    { fullName: { contains: search } },
                    { username: { contains: search } },
                  ],
                },
              },
            },
          ],
        }
      : {}),
    ...(genre ? { genre } : {}),
    ...(contentRating ? { contentRating } : {}),
    ...(reviewStatus ? { editorReviewStatus: reviewStatus } : {}),
  };

  const [authors, favoriteAuthorCount] = await Promise.all([
    prisma.user.findMany({
      where: {
        deletedAt: null,
        status: "active",
        works: { some: workWhere },
        ...(favoritesOnly
          ? {
              readerAuthorFavoritesReceived: {
                some: { userId: profile.id },
              },
            }
          : {}),
      },
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
    if (sort === "most_works") {
      const countDifference = right._count.works - left._count.works;
      if (countDifference !== 0) return countDifference;
    }

    if (sort === "recent") {
      const leftTime = left.works[0]?.publishedAt?.getTime() ?? 0;
      const rightTime = right.works[0]?.publishedAt?.getTime() ?? 0;
      if (rightTime !== leftTime) return rightTime - leftTime;
    }

    return collator.compare(authorName(left), authorName(right));
  });

  const totalCount = sortedAuthors.length;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const pageAuthors = sortedAuthors.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE,
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
  const activeFilters = [
    search
      ? {
          href: pageHref({ ...filters, search: undefined }, 1),
          label: `Arama: ${search}`,
        }
      : null,
    genre
      ? {
          href: pageHref({ ...filters, genre: undefined }, 1),
          label: `Tür: ${genre}`,
        }
      : null,
    contentRating
      ? {
          href: pageHref({ ...filters, contentRating: undefined }, 1),
          label: `Hitap: ${workContentRatingDetails[contentRating].shortLabel}`,
        }
      : null,
    reviewStatus
      ? {
          href: pageHref({ ...filters, reviewStatus: undefined }, 1),
          label: reviewLabel(reviewStatus),
        }
      : null,
    favoritesOnly
      ? {
          href: pageHref({ ...filters, favoritesOnly: false }, 1),
          label: "Yalnız favori yazarlarım",
        }
      : null,
    sort === "most_works"
      ? {
          href: pageHref({ ...filters, sort: "recent" }, 1),
          label: "En çok eşleşen eser",
        }
      : sort === "az"
        ? {
            href: pageHref({ ...filters, sort: "recent" }, 1),
            label: "A–Z sıralama",
          }
        : null,
  ].filter((item): item is { href: string; label: string } => item !== null);
  const hasFilters = activeFilters.length > 0;
  const returnTo = pageHref(filters, currentPage);
  const first = totalCount === 0 ? 0 : (currentPage - 1) * PAGE_SIZE + 1;
  const last = totalCount === 0 ? 0 : first + pageAuthors.length - 1;

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
              <Link href="/favorilerim?sekme=yazarlar">Favori Yazarlarım</Link>
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

        <section className="reader-discovery-console" aria-label="Yazar filtre masası">
          <header className="reader-discovery-console__header">
            <div>
              <span>Filtre masası</span>
              <strong>Aradığınız yazarı daraltın</strong>
            </div>
            {hasFilters ? <Link href="/yazar-kesfet">Tüm filtreleri temizle</Link> : null}
          </header>

          <nav aria-label="Hızlı yazar filtreleri" className="reader-discovery-presets">
            <Link href="/yazar-kesfet?favori=1">Favori yazarlarım</Link>
            <Link href="/yazar-kesfet?editor=completed">İncelenmiş eseri olanlar</Link>
            <Link href="/yazar-kesfet?siralama=most_works">En çok eşleşen eser</Link>
            <Link href="/yazar-kesfet?siralama=az">A–Z</Link>
          </nav>

          <form className="editor-filters reader-discovery-filters">
            <label className="reader-discovery-filter--search">
              <span>Arama</span>
              <input
                defaultValue={search}
                name="arama"
                placeholder="Yazar, rumuz veya eser ara"
                type="search"
              />
            </label>

            <label>
              <span>Tür</span>
              <select defaultValue={genre ?? ""} name="tur">
                <option value="">Tüm türler</option>
                {GENRE_LABELS.map((item) => (
                  <option key={item} value={item}>
                    {item}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Hitap yaşı</span>
              <select defaultValue={contentRating ?? ""} name="hitapYasi">
                <option value="">Tümü</option>
                {readerAuthorContentRatings.map((rating) => (
                  <option key={rating} value={rating}>
                    {workContentRatingDetails[rating].shortLabel}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Editör durumu</span>
              <select defaultValue={reviewStatus ?? ""} name="editor">
                <option value="">Tümü</option>
                <option value="not_requested">Henüz incelenmedi</option>
                <option value="requested">İnceleme talep edildi</option>
                <option value="in_progress">İlk editörde</option>
                <option value="awaiting_second_editor">İkinci editör bekleniyor</option>
                <option value="second_in_progress">İkinci editörde</option>
                <option value="completed">İncelendi</option>
              </select>
            </label>

            <label>
              <span>Favori durumu</span>
              <select defaultValue={favoritesOnly ? "1" : ""} name="favori">
                <option value="">Tüm yazarlar</option>
                <option value="1">Yalnız favori yazarlarım</option>
              </select>
            </label>

            <label>
              <span>Sıralama</span>
              <select defaultValue={sort} name="siralama">
                <option value="recent">Son eser yayımlayan</option>
                <option value="most_works">En çok eşleşen eser</option>
                <option value="az">A–Z</option>
              </select>
            </label>

            <div className="reader-discovery-filter-actions">
              <button className="button button--primary" type="submit">
                Masayı Güncelle
              </button>
              {hasFilters ? (
                <Link className="button button--ghost" href="/yazar-kesfet">
                  Temizle
                </Link>
              ) : null}
            </div>
          </form>

          {activeFilters.length > 0 ? (
            <div className="reader-discovery-active-filters" aria-label="Aktif filtreler">
              <span>Aktif</span>
              {activeFilters.map((item) => (
                <Link href={item.href} key={`${item.label}-${item.href}`}>
                  {item.label}
                  <b aria-hidden="true">×</b>
                </Link>
              ))}
            </div>
          ) : (
            <p className="reader-discovery-console__hint">
              Filtre seçmeden keşfe açık bütün uygun yazarları görüyorsunuz.
            </p>
          )}
        </section>

        <section aria-live="polite" className="reader-discovery-summary">
          <span>Masadaki sonuç</span>
          <strong>{totalCount} yazar</strong>
          <small>
            {totalCount === 0
              ? "Filtreleri değiştirerek yeniden deneyin."
              : `${first}–${last} arası gösteriliyor. Yazarlar yalnız filtreye uyan keşfe açık eserlerinden türetilir.`}
          </small>
        </section>

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
                        <span>{reviewLabel(latest.editorReviewStatus as ReviewFilter)}</span>
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
            <p>Tür, hitap yaşı, editör veya favori filtresini değiştirerek yeniden deneyin.</p>
          </div>
        )}

        {totalCount > 0 ? (
          <footer aria-label="Yazar keşif sayfalama" className="reader-discovery-pagination">
            <span>
              Sayfa {currentPage} / {totalPages}
            </span>
            <div>
              {currentPage > 1 ? (
                <Link className="button button--ghost" href={pageHref(filters, currentPage - 1)}>
                  Önceki
                </Link>
              ) : (
                <span aria-disabled="true">Önceki</span>
              )}
              {currentPage < totalPages ? (
                <Link className="button button--ghost" href={pageHref(filters, currentPage + 1)}>
                  Sonraki
                </Link>
              ) : (
                <span aria-disabled="true">Sonraki</span>
              )}
            </div>
          </footer>
        ) : null}
      </div>
    </AppShell>
  );
}
