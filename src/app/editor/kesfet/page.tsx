import Link from "next/link";
import type { Metadata } from "next";
import "@/components/discovery/discovery-filter-desk.css";
import { AppShell } from "@/components/layout/AppShell";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import { getCommonEditorDiscovery } from "@/features/editor-workspace/common-discovery-query";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { EditorWorksTable } from "@/features/editor-workspace/components/EditorWorksTable";
import { GENRE_LABELS } from "@/lib/genres";
import { normalizeGenreLabel } from "@/lib/genre-system";
import {
  isMemberStoredWorkContentRating,
  workContentRatingDetails,
  type MemberStoredWorkContentRating,
} from "@/lib/work-content-classification";
import {
  getAdultContentAccess,
  visibleMemberContentRatings,
} from "@/lib/adult-content-access";

export const metadata: Metadata = {
  title: "Editör Keşfet | İlkOku",
  description: "İlkOku ortak havuzundaki yayımlanmış eserleri keşfedin.",
};

export const dynamic = "force-dynamic";

const languageFilters = ["tr", "en"] as const;
const reviewFilters = [
  "not_requested",
  "requested",
  "in_progress",
  "awaiting_second_editor",
  "second_in_progress",
  "completed",
] as const;
const wordCountFilters = ["short", "medium", "long"] as const;

type LanguageFilter = (typeof languageFilters)[number];
type ReviewFilter = (typeof reviewFilters)[number];
type WordCountFilter = (typeof wordCountFilters)[number];

type EditorExploreFilters = {
  contentRating?: MemberStoredWorkContentRating;
  genre?: string;
  language?: LanguageFilter;
  reviewStatus?: ReviewFilter;
  wordCount?: WordCountFilter;
};

function includesValue<T extends string>(
  values: readonly T[],
  value: string | undefined,
): value is T {
  return Boolean(value && values.includes(value as T));
}

function reviewLabel(value: ReviewFilter) {
  switch (value) {
    case "not_requested":
      return "Henüz incelenmedi";
    case "requested":
      return "Yazar görüşe açık";
    case "in_progress":
      return "İlk editörde";
    case "awaiting_second_editor":
      return "İkinci editör bekliyor";
    case "second_in_progress":
      return "İkinci editörde";
    case "completed":
      return "Tamamlandı";
  }
}

function wordCountLabel(value: WordCountFilter) {
  if (value === "short") return "30.000 altı";
  if (value === "medium") return "30.000 – 80.000";
  return "80.000 üzeri";
}

function filterHref(filters: EditorExploreFilters) {
  const params = new URLSearchParams();

  if (filters.genre) params.set("tur", filters.genre);
  if (filters.language) params.set("dil", filters.language);
  if (filters.contentRating) params.set("hitap", filters.contentRating);
  if (filters.wordCount) params.set("kelime", filters.wordCount);
  if (filters.reviewStatus) params.set("durum", filters.reviewStatus);

  const query = params.toString();
  return query ? `/editor/kesfet?${query}` : "/editor/kesfet";
}

export default async function EditorDiscoveryPage({
  searchParams,
}: {
  searchParams: Promise<{
    dil?: string;
    durum?: string;
    hitap?: string;
    kelime?: string;
    tur?: string;
  }>;
}) {
  const profile = await requireEditorProfile("/editor/kesfet");
  const adultAccess = await getAdultContentAccess(profile.id);
  const visibleRatings = visibleMemberContentRatings(
    adultAccess.canAccessAdultContent,
  );
  const parameters = await searchParams;
  const genre = normalizeGenreLabel(parameters.tur);
  const language = includesValue(languageFilters, parameters.dil)
    ? parameters.dil
    : undefined;
  const wordCount = includesValue(wordCountFilters, parameters.kelime)
    ? parameters.kelime
    : undefined;
  const reviewStatus = includesValue(reviewFilters, parameters.durum)
    ? parameters.durum
    : undefined;
  const requestedRating = isMemberStoredWorkContentRating(parameters.hitap)
    ? parameters.hitap
    : undefined;
  const contentRating =
    requestedRating && visibleRatings.includes(requestedRating)
      ? requestedRating
      : undefined;
  const filters: EditorExploreFilters = {
    contentRating,
    genre,
    language,
    reviewStatus,
    wordCount,
  };
  const activeFilters = [
    genre
      ? {
          href: filterHref({ ...filters, genre: undefined }),
          label: `Tür: ${genre}`,
        }
      : null,
    contentRating
      ? {
          href: filterHref({ ...filters, contentRating: undefined }),
          label: `Yaş: ${workContentRatingDetails[contentRating].shortLabel}`,
        }
      : null,
    language
      ? {
          href: filterHref({ ...filters, language: undefined }),
          label: language === "tr" ? "Dil: Türkçe" : "Dil: İngilizce",
        }
      : null,
    wordCount
      ? {
          href: filterHref({ ...filters, wordCount: undefined }),
          label: `Kelime: ${wordCountLabel(wordCount)}`,
        }
      : null,
    reviewStatus
      ? {
          href: filterHref({ ...filters, reviewStatus: undefined }),
          label: `Editör: ${reviewLabel(reviewStatus)}`,
        }
      : null,
  ].filter((item): item is { href: string; label: string } => item !== null);
  const hasFilters = activeFilters.length > 0;
  const works = await getCommonEditorDiscovery(profile.id, {
    contentRating,
    genre,
    language,
    reviewStatus,
    wordCount,
  });

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description="Okuyucu ve yayınevleriyle aynı ortak Keşfet havuzundaki yayımlanmış eserleri inceleyin."
          title="Keşfet"
        />

        {adultAccess.isAdult && !adultAccess.canAccessAdultContent ? (
          <div className="editor-empty">
            <h2>18+ içerik tercihi kapalı</h2>
            <p>18+ eserleri aynı ortak Keşfet havuzunda görmek için ikinci açık onayı verin.</p>
            <Link
              className="button button--outline"
              href="/yetiskin-icerik-onayi?sonraki=%2Feditor%2Fkesfet"
            >
              18+ içerikleri aç
            </Link>
          </div>
        ) : null}

        <section className="role-filter-desk" aria-label="Editör filtre masası">
          <header className="role-filter-desk__header">
            <div>
              <span>Filtre masası</span>
              <strong>Editör için uygun eserleri daraltın</strong>
            </div>
            {hasFilters ? <Link href="/editor/kesfet">Tüm filtreleri temizle</Link> : null}
          </header>

          <form className="role-filter-desk__form">
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
              <select defaultValue={contentRating ?? ""} name="hitap">
                <option value="">Tüm yaşlar</option>
                {visibleRatings.map((rating) => (
                  <option key={rating} value={rating}>
                    {workContentRatingDetails[rating].label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span>Dil</span>
              <select defaultValue={language ?? ""} name="dil">
                <option value="">Tüm diller</option>
                <option value="tr">Türkçe</option>
                <option value="en">İngilizce</option>
              </select>
            </label>

            <label>
              <span>Kelime sayısı</span>
              <select defaultValue={wordCount ?? ""} name="kelime">
                <option value="">Tümü</option>
                <option value="short">30.000 altı</option>
                <option value="medium">30.000 – 80.000</option>
                <option value="long">80.000 üzeri</option>
              </select>
            </label>

            <label>
              <span>Editör incelemesi</span>
              <select defaultValue={reviewStatus ?? ""} name="durum">
                <option value="">Tümü</option>
                <option value="not_requested">Henüz incelenmedi</option>
                <option value="requested">Yazar görüşe açık</option>
                <option value="in_progress">İlk editörde</option>
                <option value="awaiting_second_editor">İkinci editör bekliyor</option>
                <option value="second_in_progress">İkinci editörde</option>
                <option value="completed">Tamamlandı</option>
              </select>
            </label>

            <div className="role-filter-desk__actions">
              <button className="button button--primary" type="submit">
                Masayı Güncelle
              </button>
              {hasFilters ? (
                <Link className="button button--ghost" href="/editor/kesfet">
                  Temizle
                </Link>
              ) : null}
            </div>
          </form>

          {activeFilters.length > 0 ? (
            <div className="role-filter-desk__active" aria-label="Aktif filtreler">
              <span>Aktif</span>
              {activeFilters.map((item) => (
                <Link href={item.href} key={`${item.label}-${item.href}`}>
                  {item.label}
                  <b aria-hidden="true">×</b>
                </Link>
              ))}
            </div>
          ) : (
            <p className="role-filter-desk__hint">
              Filtre seçmeden editöre açık ortak eser havuzunu görüyorsunuz.
            </p>
          )}
        </section>

        {works.length === 0 ? (
          <div className="editor-empty">
            <h2>Eşleşen eser bulunamadı</h2>
            <p>Filtreleri değiştirerek yeniden deneyin.</p>
          </div>
        ) : (
          <EditorWorksTable currentEditorId={profile.id} works={works} />
        )}
      </div>
    </AppShell>
  );
}
