import Link from "next/link";
import type { Metadata } from "next";

import { AdvancedDiscoveryFilterFields } from "@/components/discovery/AdvancedDiscoveryFilterFields";
import {
  DiscoveryPagination,
  DiscoveryResultSummary,
} from "@/components/discovery/DiscoveryListChrome";
import "@/components/discovery/discovery-filter-desk.css";
import { AppShell } from "@/components/layout/AppShell";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import {
  getEditorSelectionCollection,
  type EditorCollectionWordCount,
} from "@/features/editor-workspace/collection-query";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import {
  getAdultContentAccess,
  visibleMemberContentRatings,
} from "@/lib/adult-content-access";
import { sanitizeDiscoveryAdvancedFilters } from "@/lib/discovery-advanced-filter-management";
import {
  appendDiscoveryAdvancedFilterParams,
  clearDiscoveryAdvancedFilter,
  discoveryAdvancedFilterChips,
  parseDiscoveryAdvancedFilters,
  type DiscoveryAdvancedFilters,
} from "@/lib/discovery-advanced-filters";
import { getDiscoverySurfaceFilterIds } from "@/lib/discovery-filter-config";
import type { DiscoveryFilterId } from "@/lib/discovery-filter-registry";
import { DISCOVERY_PAGE_SIZE } from "@/lib/discovery-list-standard";
import { normalizeGenreLabel } from "@/lib/genre-system";
import { GENRE_LABELS } from "@/lib/genres";
import {
  isMemberStoredWorkContentRating,
  workContentRatingDetails,
  type MemberStoredWorkContentRating,
} from "@/lib/work-content-classification";

export const metadata: Metadata = {
  title: "Editör Seçkilerim | İlkOku",
};
export const dynamic = "force-dynamic";

const wordCountStatuses = ["short", "medium", "long"] as const satisfies readonly EditorCollectionWordCount[];

type SelectionFilters = {
  advanced: DiscoveryAdvancedFilters;
  contentRating?: MemberStoredWorkContentRating;
  genre?: string;
  language?: string;
  search?: string;
  wordCount?: EditorCollectionWordCount;
};

function firstValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

function includesWordCount(value: string): value is EditorCollectionWordCount {
  return wordCountStatuses.includes(value as EditorCollectionWordCount);
}

function wordCountLabel(value: EditorCollectionWordCount) {
  if (value === "short") return "30.000 altı";
  if (value === "medium") return "30.000 – 80.000";
  return "80.000 üzeri";
}

function pageHref(filters: SelectionFilters, page = 1) {
  const params = new URLSearchParams();
  if (filters.search) params.set("arama", filters.search);
  if (filters.genre) params.set("tur", filters.genre);
  if (filters.contentRating) params.set("hitap", filters.contentRating);
  if (filters.language) params.set("dil", filters.language);
  if (filters.wordCount) params.set("kelime", filters.wordCount);
  appendDiscoveryAdvancedFilterParams(params, filters.advanced);
  if (page > 1) params.set("sayfa", String(page));
  const query = params.toString();
  return query ? `/editor/seckiler?${query}` : "/editor/seckiler";
}

export default async function EditorSelectionsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const profile = await requireEditorProfile("/editor/seckiler");
  const enabledFilterIds = new Set<DiscoveryFilterId>(
    await getDiscoverySurfaceFilterIds("editor-selections"),
  );
  const adultAccess = await getAdultContentAccess(profile.id);
  const visibleRatings = visibleMemberContentRatings(
    adultAccess.canAccessAdultContent,
  );
  const params = await searchParams;
  const search = enabledFilterIds.has("search")
    ? firstValue(params.arama).slice(0, 220) || undefined
    : undefined;
  const genre = enabledFilterIds.has("genre")
    ? normalizeGenreLabel(firstValue(params.tur))
    : undefined;
  const ratingValue = firstValue(params.hitap);
  const requestedRating =
    enabledFilterIds.has("contentRating") && isMemberStoredWorkContentRating(ratingValue)
      ? ratingValue
      : undefined;
  const contentRating: MemberStoredWorkContentRating | undefined =
    requestedRating && visibleRatings.includes(requestedRating)
      ? requestedRating
      : undefined;
  const language = enabledFilterIds.has("language")
    ? firstValue(params.dil).slice(0, 10) || undefined
    : undefined;
  const wordValue = firstValue(params.kelime);
  const wordCount =
    enabledFilterIds.has("wordCount") && includesWordCount(wordValue)
      ? wordValue
      : undefined;
  const advanced = sanitizeDiscoveryAdvancedFilters(
    parseDiscoveryAdvancedFilters(params),
    enabledFilterIds,
  );
  const rawPage = Number.parseInt(firstValue(params.sayfa), 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const filters: SelectionFilters = {
    advanced,
    contentRating,
    genre,
    language,
    search,
    wordCount,
  };
  const data = await getEditorSelectionCollection(
    profile.id,
    {
      advanced,
      contentRating,
      genre,
      language,
      page: requestedPage,
      search,
      wordCount,
    },
    adultAccess.canAccessAdultContent,
  );
  const baseActiveFilters = [
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
    language
      ? {
          href: pageHref({ ...filters, language: undefined }),
          label: `Dil: ${language.toLocaleUpperCase("tr-TR")}`,
        }
      : null,
    wordCount
      ? {
          href: pageHref({ ...filters, wordCount: undefined }),
          label: `Kelime: ${wordCountLabel(wordCount)}`,
        }
      : null,
  ].filter((item): item is { href: string; label: string } => item !== null);
  const advancedActiveFilters = discoveryAdvancedFilterChips(
    advanced,
    enabledFilterIds,
  ).map((item) => ({
    href: pageHref({ ...filters, advanced: clearDiscoveryAdvancedFilter(advanced, item.id) }),
    label: item.label,
  }));
  const activeFilters = [...baseActiveFilters, ...advancedActiveFilters];
  const hasFilters = activeFilters.length > 0;

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description="Profesyonel incelemesini tamamladığınız public eserlerden oluşan seçkinizi ortak Eser Havuzu üzerinden yönetin."
          title="Editör Seçkilerim"
        />

        <section aria-label="Editör seçki filtre masası" className="role-filter-desk">
          <header className="role-filter-desk__header">
            <div>
              <span>Filtre masası</span>
              <strong>Seçkinizdeki eserleri daraltın</strong>
            </div>
            {hasFilters ? <Link href="/editor/seckiler">Tüm filtreleri temizle</Link> : null}
          </header>

          {enabledFilterIds.size > 0 ? (
            <form className="role-filter-desk__form" method="get">
              {enabledFilterIds.has("search") ? (
                <label className="role-filter-field--search">
                  <span>Arama</span>
                  <input
                    defaultValue={search}
                    name="arama"
                    placeholder="Eser veya yazar ara"
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

              {enabledFilterIds.has("language") ? (
                <label>
                  <span>Dil</span>
                  <input defaultValue={language} name="dil" placeholder="Örn. tr" />
                </label>
              ) : null}

              {enabledFilterIds.has("wordCount") ? (
                <label>
                  <span>Kelime sayısı</span>
                  <select defaultValue={wordCount ?? ""} name="kelime">
                    <option value="">Tümü</option>
                    {wordCountStatuses.map((value) => (
                      <option key={value} value={value}>{wordCountLabel(value)}</option>
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
                  <Link className="button button--ghost" href="/editor/seckiler">
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
                  {item.label}<b aria-hidden="true">×</b>
                </Link>
              ))}
            </div>
          ) : enabledFilterIds.size > 0 ? (
            <p className="role-filter-desk__hint">
              Filtre seçmeden tamamladığınız tüm public incelemeleri görüyorsunuz.
            </p>
          ) : null}
        </section>

        <DiscoveryResultSummary
          currentPage={data.currentPage}
          noun="eser"
          pageSize={DISCOVERY_PAGE_SIZE}
          totalCount={data.totalCount}
          visibleCount={data.rows.length}
        />

        <div className="editor-selection-grid">
          {data.rows.map((work) => (
            <article key={work.id}>
              <span>İncelendi</span>
              <h2>{work.title}</h2>
              <p>{work.authorName}</p>
              <Link className="button button--outline" href={`/kitap/${work.slug}`}>
                Eseri Gör
              </Link>
            </article>
          ))}
        </div>

        {data.rows.length === 0 ? (
          <div className="editor-empty">
            <h2>{hasFilters ? "Eşleşen seçki eseri bulunamadı" : "Seçkiniz henüz boş"}</h2>
            <p>
              {hasFilters
                ? "Filtreleri değiştirerek yeniden deneyin."
                : "Tamamladığınız profesyonel incelemeler burada görünür."}
            </p>
          </div>
        ) : null}

        <DiscoveryPagination
          ariaLabel="Editör seçki sayfalama"
          currentPage={data.currentPage}
          hrefForPage={(page) => pageHref(filters, page)}
          totalPages={data.totalPages}
        />
      </div>
    </AppShell>
  );
}
