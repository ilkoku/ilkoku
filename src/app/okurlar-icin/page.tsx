import type { Metadata } from "next";
import Link from "next/link";

import { PublicPageTemplate } from "@/components/layout/PublicPageTemplate";
import {
  READER_EDUCATION_CATEGORIES,
  readerEducationPublicPath,
} from "@/lib/reader-education";

const baseUrl = "https://ilkoku.com";
const canonical = "/okurlar-icin";
const title = "Okurlar İçin | Okurluk Okulu | İlkOku";
const description =
  "Okuma alışkanlığından aktif ve eleştirel okumaya, edebi çözümlemeden yorum yazmaya uzanan İlkOku Okurluk Okulu eğitimlerini keşfedin.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical },
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    locale: "tr_TR",
    url: canonical,
    title,
    description,
    images: [{ url: "/opengraph-image", alt: "İlkOku Okurluk Okulu" }],
  },
  twitter: {
    card: "summary_large_image",
    title,
    description,
    images: ["/opengraph-image"],
  },
};

const breadcrumbSchema = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "İlkOku",
      item: `${baseUrl}/`,
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Okurlar İçin",
      item: `${baseUrl}${canonical}`,
    },
  ],
};

export default function ReadersHomePage() {
  return (
    <PublicPageTemplate>
      <main className="bg-[#f8f6f0] px-4 py-10 text-[#211746] sm:px-6 lg:py-14">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(breadcrumbSchema).replace(/</g, "\\u003c"),
          }}
        />

        <div className="mx-auto max-w-6xl">
          <header className="overflow-hidden rounded-[2.5rem] bg-[#17122f] px-7 py-10 text-white shadow-[0_24px_70px_rgba(23,18,47,0.22)] sm:px-10 sm:py-14 lg:px-12 lg:py-16">
            <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#b7a8ff]">
              İlkOku · Okurluk Okulu
            </span>
            <h1 className="mt-5 max-w-4xl font-serif text-5xl font-semibold tracking-[-0.05em] sm:text-6xl lg:text-7xl">
              Okumayı alışkanlıktan bilinçli bir pratiğe taşı.
            </h1>
            <p className="mt-6 max-w-3xl text-xl font-semibold leading-9 text-[#f2eefc] sm:text-2xl sm:leading-10">
              Eser seçmeyi, metinle çalışmayı, anlatıyı çözümlemeyi ve okur görüşünü gerekçeli biçimde ifade etmeyi adım adım öğren.
            </p>
            <p className="mt-7 max-w-3xl text-base leading-8 text-[#d8d2e8]">
              Okurluk Okulu; okumaya başlamadan eleştirel okumaya, türleri anlamaktan yorum ve eleştiri yazmaya uzanan birbirini tamamlayan eğitimlerden oluşur.
            </p>
          </header>

          <section className="mt-8" aria-labelledby="okurluk-egitimleri">
            <div className="max-w-3xl">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">
                Eğitim yolu
              </span>
              <h2
                id="okurluk-egitimleri"
                className="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl"
              >
                Okurluk Okulu eğitimleri
              </h2>
              <p className="mt-4 text-base leading-8 text-[#625b6d]">
                İlk eğitimden başlayabilir veya geliştirmek istediğin okuma becerisine doğrudan geçebilirsin.
              </p>
            </div>

            <div className="mt-7 grid gap-4 md:grid-cols-2">
              {READER_EDUCATION_CATEGORIES.map((category) => (
                <Link
                  className="group rounded-[1.7rem] border border-black/[0.07] bg-white p-6 shadow-[0_12px_40px_rgba(34,23,70,0.05)] transition hover:-translate-y-0.5 hover:border-[#6b52c7]/25 hover:shadow-[0_18px_48px_rgba(34,23,70,0.08)]"
                  href={readerEducationPublicPath(category)}
                  key={category.slug}
                >
                  <div className="flex items-start gap-4">
                    <span className="mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#efeaff] text-sm font-black text-[#5b35dd]">
                      {category.number}
                    </span>
                    <div>
                      <h3 className="text-xl font-extrabold tracking-[-0.025em] text-[#211746]">
                        {category.title}
                      </h3>
                      <p className="mt-2 text-sm leading-7 text-[#625b6d]">
                        {category.shortDescription}
                      </p>
                      <span className="mt-4 inline-flex text-sm font-extrabold text-[#5b35dd]">
                        Eğitime geç <span aria-hidden="true" className="ml-1">→</span>
                      </span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>

          <section className="mt-8 rounded-[2.2rem] border border-[#6b52c7]/10 bg-[#efebff] px-7 py-8 sm:px-10 sm:py-10">
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#5b35dd]">
              İlk adım
            </span>
            <h2 className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              Nereden başlayacağını bilmiyorsan Okumaya Başlama eğitiminden başla.
            </h2>
            <p className="mt-4 max-w-3xl text-base leading-8 text-[#5f5869]">
              Okuma amacını, eser seçimini ve sürdürülebilir okuma düzenini kurduktan sonra diğer eğitimlere geçmek daha kolaydır.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link
                className="inline-flex rounded-full bg-[#211746] px-5 py-3 text-sm font-extrabold !text-white"
                href="/okurlar-icin/okumaya-baslama"
              >
                Okumaya Başlama →
              </Link>
              <Link
                className="inline-flex rounded-full border border-[#6b52c7]/20 bg-white px-5 py-3 text-sm font-extrabold text-[#5b35dd]"
                href="/kayit?rol=reader"
              >
                Okuyucu Ol
              </Link>
            </div>
          </section>
        </div>
      </main>
    </PublicPageTemplate>
  );
}
