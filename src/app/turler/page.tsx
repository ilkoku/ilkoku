import type { Metadata } from "next";
import Link from "next/link";

import {
  getPublicGenres,
} from "@/features/public-discovery/library";
import { PublicHubShell } from "@/features/public-discovery/PublicHubShell";

const baseUrl = "https://ilkoku.com";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Eser Türleri | İlkOku",
  description:
    "İlkOku’da herkese açık yayımlanan Türkçe eserleri edebî türlerine göre keşfedin.",
  alternates: {
    canonical: "/turler",
  },
};

export default async function PublicGenresPage() {
  const genres = await getPublicGenres();
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

          {genres.length > 0 ? (
            <div className="public-hub__grid">
              {genres.map((genre) => (
                <Link
                  className="public-hub-card"
                  href={`/turler/${genre.slug}`}
                  key={genre.slug}
                >
                  <div className="public-hub-card__meta">
                    <span>Eser türü</span>
                  </div>
                  <h2>{genre.label}</h2>
                  <p className="public-hub-card__description">
                    {genre.label} türünde herkese açık
                    yayımlanan eserleri inceleyin.
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
                Henüz public eser türü oluşmadı.
              </strong>
              <p>
                İlk herkese açık eser yayımlandığında tür
                sayfası otomatik oluşacak ve sitemap’e
                eklenecek.
              </p>
              <Link href="/nasil-calisir#eser-ilkoku-da-nasil-ilerler">
                İlkOku’da eser yolculuğunu öğren
              </Link>
            </div>
          )}
        </section>
      </main>
    </PublicHubShell>
  );
}
