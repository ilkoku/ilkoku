import type { Metadata } from "next";
import Link from "next/link";

import {
  getPublicGenres,
  getSearchIndexEligibleGenreSlugs,
} from "@/features/public-discovery/library";
import { PublicHubShell } from "@/features/public-discovery/PublicHubShell";
import { buildIndexablePublicGenreSchemaItems } from "@/lib/public-genre-schema-items.mjs";

const baseUrl = "https://ilkoku.com";
const title = "Eser Türleri | İlkOku";
const description =
  "İlkOku’da keşfe açık yayımlanan Türkçe eserleri edebî türlerine göre keşfedin. Roman, öykü, bilim kurgu ve diğer türlerdeki kitapları, yazarlarını inceleyin.";
const socialImage = "/og/ilkoku-social-selected-2026.webp";

type PublicGenresPageProps = {
  searchParams: Promise<{
    arama?: string;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata({
  searchParams,
}: PublicGenresPageProps): Promise<Metadata> {
  const query = await searchParams;

  return {
    title,
    description,
    alternates: {
      canonical: "/turler",
    },
    robots: {
      index: !query.arama,
      follow: true,
    },
    openGraph: {
      type: "website",
      locale: "tr_TR",
      url: "/turler",
      title,
      description,
      images: [{ url: socialImage, alt: "İlkOku eser türleri" }],
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [socialImage],
    },
  };
}

export default async function PublicGenresPage({
  searchParams,
}: PublicGenresPageProps) {
  const query = await searchParams;
  const search = query.arama?.trim().slice(0, 120) || undefined;
  const genres = await getPublicGenres(search);
  // This indexable directory can display demo genres for QA visitors, but its
  // search metadata must only mention destinations backed by real publications.
  // Resolve eligibility once for the distinct source labels, not per genre.
  const sourceGenres = [...new Set(genres.flatMap((genre) => genre.sourceGenres))];
  let eligibleGenreSlugs = new Set<string>();
  if (sourceGenres.length > 0) {
    try {
      eligibleGenreSlugs = await getSearchIndexEligibleGenreSlugs(sourceGenres);
    } catch (error) {
      // Metadata lookup failures must not take the public directory offline.
      console.error("Public genre indexable JSON-LD eligibility lookup failed", error);
    }
  }
  const returnPath = search
    ? `/turler?arama=${encodeURIComponent(search)}`
    : "/turler";
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: "İlkOku eser türleri",
    url: `${baseUrl}/turler`,
    inLanguage: "tr-TR",
    mainEntity: {
      "@type": "ItemList",
      itemListElement: buildIndexablePublicGenreSchemaItems(genres, eligibleGenreSlugs, baseUrl),
    },
  };

  return (
    <PublicHubShell>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(
            /</g,
            "\\u003c",
          ),
        }}
      />

      <main className="public-hub__container">
        <header className="public-hub__hero">
          <p className="public-hub__eyebrow">
            EDEBÎ TÜRLER
          </p>
          <h1>Okuma yolunu türüne göre seç.</h1>
          <p>
            Bu sayfalar yalnız gerçekten yayımlanmış ve
            keşfe açık eserlerden oluşur. Boş kategori veya
            yapay SEO etiketi üretilmez.
          </p>
        </header>

        <section
          aria-labelledby="tur-listesi"
          className="public-hub__section"
        >
          <div className="public-hub__section-heading">
            <h2 id="tur-listesi">Keşfe açık türler</h2>
            <span>{genres.length} tür</span>
          </div>

          <form
            action="/turler"
            className="public-hub__filters public-hub__filters--single"
            method="get"
          >
            <label>
              <span>Tür ara</span>
              <input
                defaultValue={search}
                maxLength={120}
                name="arama"
                placeholder="Roman, polisiye, fantastik..."
                type="search"
              />
            </label>
            <button type="submit">Türleri getir</button>
            {search ? (
              <Link prefetch={false} href="/turler">Aramayı temizle</Link>
            ) : null}
          </form>

          {genres.length > 0 ? (
            <div className="public-hub__grid">
              {genres.map((genre) => (
                <Link prefetch={false}
                  className="public-hub-card"
                  href={search
                    ? `/turler/${genre.slug}?from=${encodeURIComponent(returnPath)}`
                    : `/turler/${genre.slug}`}
                  key={genre.slug}
                >
                  <div className="public-hub-card__meta">
                    <span>Eser türü</span>
                    <span>{genre.count} eser</span>
                  </div>
                  <h2>{genre.label}</h2>
                  <p className="public-hub-card__description">
                    {genre.label} türünde keşfe açık yayımlanan
                    {" "}{genre.count} eseri inceleyin.
                  </p>
                  <span className="public-hub-card__footer">
                    <span />
                    <strong>Eserleri gör →</strong>
                  </span>
                </Link>
              ))}
            </div>
          ) : (
            <div className="public-hub__empty">
              <strong>
                {search
                  ? "Bu aramada yayımlanmış eser türü bulunamadı."
                  : "Henüz keşfe açık eser türü oluşmadı."}
              </strong>
              <p>
                {search
                  ? "Aramayı temizleyerek gerçek yayınlardan oluşan tüm tür dizinine dönebilirsiniz."
                  : "İlk keşfe açık eser yayımlandığında tür sayfası otomatik oluşacak ve sitemap’e eklenecek."}
              </p>
              {search ? (
                <Link prefetch={false} href="/turler">Tüm türleri göster</Link>
              ) : (
                <Link prefetch={false} href="/nasil-calisir#eser-ilkoku-da-nasil-ilerler">
                  İlkOku’da eser yolculuğunu öğren
                </Link>
              )}
            </div>
          )}
        </section>
      </main>
    </PublicHubShell>
  );
}
