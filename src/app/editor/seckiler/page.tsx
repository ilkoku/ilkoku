import Link from "next/link";
import type { Metadata } from "next";

import {
  DiscoveryPagination,
  DiscoveryResultSummary,
} from "@/components/discovery/DiscoveryListChrome";
import "@/components/discovery/discovery-filter-desk.css";
import { AppShell } from "@/components/layout/AppShell";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import { getEditorSelectionCollection } from "@/features/editor-workspace/collection-query";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import {
  getAdultContentAccess,
  visibleMemberContentRatings,
} from "@/lib/adult-content-access";
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

type SelectionFilters = {
  contentRating?: MemberStoredWorkContentRating;
  genre?: string;
  search?: string;
};

function pageHref(filters: SelectionFilters, page = 1) {
  const params = new URLSearchParams();
  if (filters.search) params.set("arama", filters.search);
  if (filters.genre) params.set("tur", filters.genre);
  if (filters.contentRating) params.set("hitap", filters.contentRating);
  if (page > 1) params.set("sayfa", String(page));
  const query = params.toString();
  return query ? `/editor/seckiler?${query}` : "/editor/seckiler";
}

export default async function EditorSelectionsPage({
  searchParams,
}: {
  searchParams: Promise<{
    arama?: string;
    hitap?: string;
    sayfa?: string;
    tur?: string;
  }>;
}) {
  const profile = await requireEditorProfile("/editor/seckiler");
  const adultAccess = await getAdultContentAccess(profile.id);
  const visibleRatings = visibleMemberContentRatings(
    adultAccess.canAccessAdultContent,
  );
  const params = await searchParams;
  const search = params.arama?.trim().slice(0, 220) || undefined;
  const genre = normalizeGenreLabel(params.tur);
  const requestedRating = isMemberStoredWorkContentRating(params.hitap)
    ? params.hitap
    : undefined;
  const contentRating: MemberStoredWorkContentRating | undefined =
    requestedRating && visibleRatings.includes(requestedRating)
      ? requestedRating
      : undefined;
  const rawPage = Number.parseInt(params.sayfa ?? "", 10);
  const requestedPage = Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1;
  const filters: SelectionFilters = {
    contentRating,
    genre,
    search,
  };
  const data = await getEditorSelectionCollection(
    profile.id,
    {
      contentRating,
      genre,
      page: requestedPage,
      search,
    },
    adultAccess.canAccessAdultContent,
  );
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
  ].filter((item): item is { href: string; label: string } => item !== null);
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

          <form className="role-filter-desk__form" method="get">
            <label className="role-filter-field--search">
              <span>Arama</span>
              <input
                defaultValue={search}
                name="arama"
                placeholder="Eser veya yazar ara"
                type="search"
              />
            </label>

            <label>
              <span>Tür</span>
              <select defaultValue={genre ?? ""} name="tur">
                <option value="">Tüm türler</option>
                {GENRE_LABELS.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </label>

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

          {hasFilters ? (
            <div aria-label="Aktif filtreler" className="role-filter-desk__active">
              <span>Aktif</span>
              {activeFilters.map((item) => (
                <Link href={item.href} key={`${item.label}-${item.href}`}>
                  {item.label}<b aria-hidden="true">×</b>
                </Link>
              ))}
            </div>
          ) : (
            <p className="role-filter-desk__hint">
              Filtre seçmeden tamamladığınız tüm public incelemeleri görüyorsunuz.
            </p>
          )}
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
