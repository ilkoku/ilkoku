import Link from "next/link";
import type { Metadata } from "next";
import type { Prisma } from "@/generated/prisma/client";

import {
  DiscoveryPagination,
  DiscoveryResultSummary,
} from "@/components/discovery/DiscoveryListChrome";
import "@/components/discovery/discovery-filter-desk.css";
import { AppShell } from "@/components/layout/AppShell";
import { commonDiscoveryAuthorWhereFor } from "@/features/discovery/common-author-scope";
import { commonDiscoveryWorkWhereFor } from "@/features/discovery/common-work-scope";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import {
  getAdultContentAccess,
  visibleMemberContentRatings,
} from "@/lib/adult-content-access";
import { getDiscoverySurfaceFilterIds } from "@/lib/discovery-filter-config";
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

type SearchParams = Promise<{
  arama?: string;
  hitap?: string;
  sayfa?: string;
  sehir?: string;
  tur?: string;
}>;

type EditorAuthorFilters = {
  city?: string;
  contentRating?: MemberStoredWorkContentRating;
  genre?: string;
  search?: string;
};

function pageHref(filters: EditorAuthorFilters, page = 1) {
  const params = new URLSearchParams();
  if (filters.search) params.set("arama", filters.search);
  if (filters.genre) params.set("tur", filters.genre);
  if (filters.contentRating) params.set("hitap", filters.contentRating);
  if (filters.city) params.set("sehir", filters.city);
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

function initials(value: string) {
  return (
    value
      .trim()
      .split(/\s+/u)
      .slice(0, 2)
      .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR"))
      .join("") || "İY"
  );
}

export default async function EditorWriterDiscoveryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const profile = await requireEditorProfile("/editor/yazarlar");
  const enabledFilterIds = new Set(
    await getDiscoverySurfaceFilterIds("editor-author-discovery"),
  );
  const adultAccess = await getAdultContentAccess(profile.id);
  const visibleRatings = visibleMemberContentRatings(
    adultAccess.canAccessAdultContent,
  );
  const params = await searchParams;
  const search = enabledFilterIds.has("search")
    ? params.arama?.trim().slice(0, 220) || undefined
    : undefined;
  const genre = enabledFilterIds.has("genre")
    ? normalizeGenreLabel(params.tur)
    : undefined;
  const city = enabledFilterIds.has("city")
    ? params.sehir?.trim().slice(0, 120) || undefined
    : undefined;
  const requestedRating =
    enabledFilterIds.has("contentRating") && isMemberStoredWorkContentRating(params.hitap)
      ? params.hitap
      : undefined;
  const contentRating =
    requestedRating && visibleRatings.includes(requestedRating)
      ? requestedRating
      : undefined;
  const rawPage = Number.parseInt(params.sayfa ?? "", 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const filters: EditorAuthorFilters = {
    city,
    contentRating,
    genre,
    search,
  };
  const matchedWorkWhere: Prisma.WorkWhereInput = {
    ...commonDiscoveryWorkWhereFor(adultAccess.canAccessAdultContent),
    ...(genre ? { genre } : {}),
    ...(contentRating ? { contentRating } : {}),
  };
  const where: Prisma.UserWhereInput = {
    ...commonDiscoveryAuthorWhereFor(adultAccess.canAccessAdultContent, {
      ...(genre ? { genre } : {}),
      ...(contentRating ? { contentRating } : {}),
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

  const totalCount = await prisma.user.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / DISCOVERY_PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const writers = await prisma.user.findMany({
    where,
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }],
    skip: (currentPage - 1) * DISCOVERY_PAGE_SIZE,
    take: DISCOVERY_PAGE_SIZE,
    select: {
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
        orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
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
          works: {
            where: matchedWorkWhere,
          },
          feedbackReceived: true,
        },
      },
    },
  });
  const activeFilters = [
    search
      ? {
          href: pageHref({ ...filters, search: undefined }),
          label: `Arama: ${search}`,
        }
      : null,
    genre
      ? {
          href: pageHref({ ...filters, genre: undefined }),
          label: `Tür: ${genre}`,
        }
      : null,
    contentRating
      ? {
          href: pageHref({ ...filters, contentRating: undefined }),
          label: `Yaş: ${workContentRatingDetails[contentRating].shortLabel}`,
        }
      : null,
    city
      ? {
          href: pageHref({ ...filters, city: undefined }),
          label: `Şehir: ${city}`,
        }
      : null,
  ].filter((item): item is { href: string; label: string } => item !== null);
  const hasFilters = activeFilters.length > 0;

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace editor-writers-page">
        <EditorPageHeader
          description="Ortak Yazar Havuzu’nda en az bir public eseri bulunan aktif yazarları inceleyin."
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
                      <option key={item} value={item}>
                        {item}
                      </option>
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
          <section className="editor-writer-grid" aria-label="Yazarlar">
            {writers.map((writer) => {
              const name = publicWriterName(writer);
              const genres = availableGenreLabels(
                writer.works.map((work) => work.genre),
              ).slice(0, 4);

              return (
                <article className="editor-writer-card" key={writer.id}>
                  <header className="editor-writer-card__header">
                    <div className="editor-writer-avatar" aria-hidden="true">
                      {initials(name)}
                    </div>
                    <div>
                      <span>{publicWriterAlias(writer)}</span>
                      <h2>{name}</h2>
                      <p>{writer.profile?.city || "Şehir belirtilmedi"}</p>
                    </div>
                  </header>

                  <p className="editor-writer-card__bio">
                    {writer.bio?.trim() || "Bu yazar henüz kısa bir biyografi eklemedi."}
                  </p>

                  {genres.length > 0 ? (
                    <div className="editor-writer-card__genres" aria-label="Yazı türleri">
                      {genres.map((item) => <span key={item}>{item}</span>)}
                    </div>
                  ) : null}

                  <dl className="editor-writer-card__stats">
                    <div><dt>Eşleşen eser</dt><dd>{writer._count.works}</dd></div>
                    <div><dt>Editör görüşü</dt><dd>{writer._count.feedbackReceived}</dd></div>
                  </dl>

                  <div className="editor-writer-card__works">
                    <div className="editor-writer-card__works-heading">
                      <span>Eşleşen public eserler</span>
                      <small>Son {writer.works.length} eser</small>
                    </div>
                    <ul>
                      {writer.works.map((work) => (
                        <li key={work.id}>
                          <Link href={`/kitap/${work.slug}`}>
                            <strong>{work.title}</strong>
                            <span>{work.genre || "Tür belirtilmedi"}</span>
                            <small>
                              {work._count.chapters} bölüm · {work._count.readingProgress} okur · {work._count.favorites} beğeni · {work._count.comments} yorum
                            </small>
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </article>
              );
            })}
          </section>
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
