import type { Metadata } from "next";
import Link from "next/link";

import {
  getPublicGenres,
} from "@/features/public-discovery/library";
import { PublicHubShell } from "@/features/public-discovery/PublicHubShell";

const baseUrl = "https://ilkoku.com";
const title = "Eser Türleri | İlkOku";
const description =
  "İlkOku’da herkese açık yayımlanan Türkçe eserleri edebî türlerine göre keşfedin.";

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
  };
}

export default async function PublicGenresPage({
  searchParams,
}: PublicGenresPageProps) {
  const query = await searchParams;
  const search = query.arama?.trim().slice(0, 120) || undefined;
  const genres = await getPublicGenres(search);
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
      itemListElement: genres.map(
        (genre, index) => ({
          "@type": "ListItem",
          position: index + 1,
          name: genre.label,
          url: `${baseUrl}/turler/${genre.slug}`,
        }),
      ),
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
            herkese açık eserlerden oluşur. Boş kategori veya
            yapay SEO etiketi üretilmez.
          </p>
        </header>

        <section
          aria-labelledby="tur-listesi"
          className="public-hub__section"
        >
          <div className="public-hub__section-heading">
            <h2 id="tur-listesi">Yayınlanan türler</h2>
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
              <Link href="/turler">Aramayı temizle</Link>
            ) : null}
          </form>

          {genres.length > 0 ? (
            <div className="public-hub__grid">
              {genres.map((genre) => (
                <Link
                  className="public-hub-card"
                  href={`/turler/${genre.slug}?from=${encodeURIComponent(returnPath)}`}
                  key={genre.slug}
                >
                  <div className="public-hub-card__meta">
                    <span>Eser türü</span>
                    <span>{genre.count} eser</span>
                  </div>
                  <h2>{genre.label}</h2>
                  <p className="public-hub-card__description">
                    {genre.label} türünde herkese açık
                    yayımlanan {genre.count} eseri inceleyin.
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
                  : "Henüz public eser türü oluşmadı."}
              </strong>
              <p>
                {search
                  ? "Aramayı temizleyerek gerçek yayınlardan oluşan tüm tür dizinine dönebilirsiniz."
                  : "İlk herkese açık eser yayımlandığında tür sayfası otomatik oluşacak ve sitemap’e eklenecek."}
              </p>
              {search ? (
                <Link href="/turler">Tüm türleri göster</Link>
              ) : (
                <Link href="/nasil-calisir#eser-ilkoku-da-nasil-ilerler">
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
