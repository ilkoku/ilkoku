import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getBookIndexPublicSourcePageContext } from "@/lib/book-index/public-access";
import { createPublicPageMetadata } from "@/lib/public-page-metadata";

const baseUrl = "https://ilkoku.com";
const canonical = "/en-cok-satanlar/kaynak";
const title = "Kitap Satış Kaynaklarına Göre Çok Satanlar | İlkOku";
const description =
  "BKM Kitap, Remzi, idefix, KitapSepeti, Kitapzen ve diğer doğrulanmış kaynakların kendi çok satan sıralamalarını ayrı ayrı inceleyin.";

export const dynamic = "force-dynamic";

function formattedObservedAt(value: Date | null) {
  if (!value) return "Veri zamanı bekleniyor";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

export async function generateMetadata(): Promise<Metadata> {
  const context = await getBookIndexPublicSourcePageContext(100).catch(() => null);

  return createPublicPageMetadata({
    title,
    description,
    canonical,
    image: "/en-cok-satanlar/opengraph-image",
    noIndex: !context,
  });
}

export default async function BookIndexSourcesHubPage() {
  const context = await getBookIndexPublicSourcePageContext(100);
  if (!context) notFound();

  const sourcePages = [...context.sourcePages].sort((a, b) =>
    a.sourceName.localeCompare(b.sourceName, "tr"),
  );

  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    name: title,
    description,
    url: `${baseUrl}${canonical}`,
    inLanguage: "tr-TR",
    mainEntity: {
      "@type": "ItemList",
      numberOfItems: sourcePages.length,
      itemListElement: sourcePages.map((sourcePage, index) => ({
        "@type": "ListItem",
        position: index + 1,
        name: sourcePage.searchTitle,
        url: `${baseUrl}/en-cok-satanlar/kaynak/${sourcePage.slug}`,
      })),
    },
    isPartOf: {
      "@type": "WebSite",
      name: "İlkOku",
      url: baseUrl,
    },
  };

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:py-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(schema).replace(/</g, "\\u003c"),
        }}
      />

      <header className="max-w-4xl">
        <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">
          İlkOku Kitap Endeksi · Kaynaklar
        </span>
        <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-0.04em] text-[#211746] sm:text-5xl">
          Kaynaklara göre çok satan kitaplar
        </h1>
        <p className="mt-5 text-base leading-8 text-[#625b6d] sm:text-lg">
          Her kaynak kendi yayınladığı sıralamayla gösterilir. İlkOku kaynak
          sırasını değiştirmez; sponsorlu içerik bu listelerin sırasına müdahale
          etmez. Yeni bir kaynak kalite kontrolünü tamamladığında bu tabloya
          eklenir.
        </p>
        <p className="mt-3 text-sm leading-7 text-[#756d80]">
          Türkiye bileşik endeksi ve trend sayfaları ayrı kalite kapısındadır;
          bu kaynak tablosunun yayında olması o sayfaların açıldığı anlamına gelmez.
        </p>
      </header>

      <section className="mt-10 overflow-hidden rounded-[1.8rem] border border-black/[0.07] bg-white shadow-[0_14px_44px_rgba(34,23,70,0.05)]">
        <div className="grid gap-3 p-4 md:hidden">
          {sourcePages.map((sourcePage) => (
            <article
              className="rounded-2xl border border-black/[0.06] bg-[#faf8f3] p-4"
              key={sourcePage.sourceCode}
            >
              <div className="flex items-start justify-between gap-3">
                <strong className="text-base text-[#211746]">{sourcePage.sourceName}</strong>
                <span className="shrink-0 rounded-full bg-[#edf8ef] px-3 py-1 text-xs font-extrabold text-[#2f7040]">
                  Canlı
                </span>
              </div>
              <p className="mt-3 text-sm leading-6 text-[#625b6d]">
                {sourcePage.lists.map((list) => list.title).join(" · ")}
              </p>
              <p className="mt-2 text-xs leading-5 text-[#756d80]">
                Son veri: {formattedObservedAt(sourcePage.lastObservedAt)}
              </p>
              <Link
                className="mt-4 inline-flex min-h-11 items-center text-sm font-extrabold text-[#4b2bc5]"
                href={`/en-cok-satanlar/kaynak/${sourcePage.slug}`}
              >
                Listeyi aç →
              </Link>
            </article>
          ))}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="w-full min-w-[760px] border-collapse text-left">
            <thead className="bg-[#f7f4ff] text-xs uppercase tracking-[0.08em] text-[#655b75]">
              <tr>
                <th className="px-5 py-4 font-extrabold">Kaynak</th>
                <th className="px-5 py-4 font-extrabold">Hazır listeler</th>
                <th className="px-5 py-4 font-extrabold">Son veri</th>
                <th className="px-5 py-4 font-extrabold">Durum</th>
                <th className="px-5 py-4 font-extrabold">Sayfa</th>
              </tr>
            </thead>
            <tbody>
              {sourcePages.map((sourcePage) => (
                <tr
                  className="border-t border-black/[0.06] align-top"
                  key={sourcePage.sourceCode}
                >
                  <td className="px-5 py-5">
                    <strong className="text-[#211746]">{sourcePage.sourceName}</strong>
                  </td>
                  <td className="px-5 py-5 text-sm leading-6 text-[#625b6d]">
                    {sourcePage.lists.map((list) => list.title).join(" · ")}
                  </td>
                  <td className="px-5 py-5 text-sm text-[#625b6d]">
                    {formattedObservedAt(sourcePage.lastObservedAt)}
                  </td>
                  <td className="px-5 py-5">
                    <span className="inline-flex rounded-full bg-[#edf8ef] px-3 py-1 text-xs font-extrabold text-[#2f7040]">
                      Canlı
                    </span>
                  </td>
                  <td className="px-5 py-5">
                    <Link
                      className="inline-flex min-h-11 items-center text-sm font-extrabold text-[#4b2bc5] hover:underline"
                      href={`/en-cok-satanlar/kaynak/${sourcePage.slug}`}
                    >
                      Listeyi aç →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8 rounded-[1.8rem] border border-[#6b52c7]/12 bg-[#f2efff] p-6 sm:p-7">
        <h2 className="font-serif text-2xl font-semibold tracking-[-0.025em] text-[#211746]">
          Bu tablo nasıl büyüyecek?
        </h2>
        <p className="mt-3 max-w-4xl text-sm leading-7 text-[#625b6d]">
          Parser, kimlik eşleştirme, kaynak bütünlüğü ve doğal scheduler kanıtı
          tamamlanan kaynaklar sırayla canlıya alınır. Araştırma, canary veya
          erişim sorunu bulunan kaynaklar kullanıcıya açık tabloya eklenmez.
        </p>
      </section>
    </main>
  );
}
