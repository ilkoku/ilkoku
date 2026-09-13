import Link from "next/link";
import type { ReactNode } from "react";

import LiveHomepageFooter from "@/app/onizleme/ana-sayfa-yeni/live-footer";
import { getGenresByCategory, type GenreCategory } from "@/lib/genres";
import { WRITING_CATEGORY_HUBS } from "@/lib/writing-category-hubs";

const LIVE_WRITING_GUIDE_HREFS: Record<string, string> = {
  roman: "/yazarlar-icin/kurgu/roman",
  oyku: "/yazarlar-icin/kurgu/oyku",
  novella: "/yazarlar-icin/kurgu/novella",
  fantastik: "/yazarlar-icin/kurgu/fantastik",
  "bilim-kurgu": "/yazarlar-icin/kurgu/bilim-kurgu",
  distopya: "/yazarlar-icin/kurgu/distopya",
  utopya: "/yazarlar-icin/kurgu/utopya",
  polisiye: "/yazarlar-icin/kurgu/polisiye",
  dedektif: "/yazarlar-icin/kurgu/dedektif",
  gerilim: "/yazarlar-icin/kurgu/gerilim",
  korku: "/yazarlar-icin/kurgu/korku",
  macera: "/yazarlar-icin/kurgu/macera",
  aksiyon: "/yazarlar-icin/kurgu/aksiyon",
  casusluk: "/yazarlar-icin/kurgu/casusluk",
  "tarihi-roman": "/yazarlar-icin/kurgu/tarihi-roman",
  "psikolojik-roman": "/yazarlar-icin/kurgu/psikolojik-roman",
  romantik: "/yazarlar-icin/kurgu/romantik",
  dram: "/yazarlar-icin/kurgu/dram",
  mizah: "/yazarlar-icin/kurgu/mizah",
  hiciv: "/yazarlar-icin/kurgu/hiciv",
  "alternatif-tarih": "/yazarlar-icin/kurgu/alternatif-tarih",
  gotik: "/yazarlar-icin/kurgu/gotik",
  mitoloji: "/yazarlar-icin/kurgu/mitoloji",
  paranormal: "/yazarlar-icin/kurgu/paranormal",
  "post-apokaliptik": "/yazarlar-icin/kurgu/post-apokaliptik",
  siir: "/yazarlar-icin/edebiyat/siir",
  deneme: "/yazarlar-icin/edebiyat/deneme",
  ani: "/yazarlar-icin/edebiyat/ani",
  gunluk: "/yazarlar-icin/edebiyat/gunluk",
  mektup: "/yazarlar-icin/edebiyat/mektup",
  biyografi: "/yazarlar-icin/edebiyat/biyografi",
  otobiyografi: "/yazarlar-icin/edebiyat/otobiyografi",
  "gezi-yazisi": "/yazarlar-icin/edebiyat/gezi-yazisi",
  elestiri: "/yazarlar-icin/edebiyat/elestiri",
  inceleme: "/yazarlar-icin/edebiyat/inceleme",
  "edebi-kurmaca": "/yazarlar-icin/edebiyat/edebi-kurmaca",
  soylesi: "/yazarlar-icin/edebiyat/soylesi",
  portre: "/yazarlar-icin/edebiyat/portre",
  "film-senaryosu": "/yazarlar-icin/senaryo-ve-sahne/film-senaryosu",
  "dizi-senaryosu": "/yazarlar-icin/senaryo-ve-sahne/dizi-senaryosu",
  "kisa-film-senaryosu": "/yazarlar-icin/senaryo-ve-sahne/kisa-film-senaryosu",
  tiyatro: "/yazarlar-icin/senaryo-ve-sahne/tiyatro",
  "radyo-tiyatrosu": "/yazarlar-icin/senaryo-ve-sahne/radyo-tiyatrosu",
  "podcast-senaryosu": "/yazarlar-icin/senaryo-ve-sahne/podcast-senaryosu",
  "belgesel-senaryosu": "/yazarlar-icin/senaryo-ve-sahne/belgesel-senaryosu",
  makale: "/yazarlar-icin/akademik/makale",
  arastirma: "/yazarlar-icin/akademik/arastirma",
  tez: "/yazarlar-icin/akademik/tez",
  bildiri: "/yazarlar-icin/akademik/bildiri",
  "vaka-analizi": "/yazarlar-icin/akademik/vaka-analizi",
  "akademik-inceleme": "/yazarlar-icin/akademik/akademik-inceleme",
  tarih: "/yazarlar-icin/bilgilendirici/tarih",
  felsefe: "/yazarlar-icin/bilgilendirici/felsefe",
  psikoloji: "/yazarlar-icin/bilgilendirici/psikoloji",
  sosyoloji: "/yazarlar-icin/bilgilendirici/sosyoloji",
  "kisisel-gelisim": "/yazarlar-icin/bilgilendirici/kisisel-gelisim",
  "is-dunyasi": "/yazarlar-icin/bilgilendirici/is-dunyasi",
  girisimcilik: "/yazarlar-icin/bilgilendirici/girisimcilik",
  finans: "/yazarlar-icin/bilgilendirici/finans",
  ekonomi: "/yazarlar-icin/bilgilendirici/ekonomi",
  teknoloji: "/yazarlar-icin/bilgilendirici/teknoloji",
  "yapay-zeka": "/yazarlar-icin/bilgilendirici/yapay-zeka",
  programlama: "/yazarlar-icin/bilgilendirici/programlama",
  hukuk: "/yazarlar-icin/bilgilendirici/hukuk",
  egitim: "/yazarlar-icin/bilgilendirici/egitim",
  siyaset: "/yazarlar-icin/bilgilendirici/siyaset",
  iletisim: "/yazarlar-icin/bilgilendirici/iletisim",
  sanat: "/yazarlar-icin/bilgilendirici/sanat",
  mimarlik: "/yazarlar-icin/bilgilendirici/mimarlik",
  saglik: "/yazarlar-icin/bilgilendirici/saglik",
  spor: "/yazarlar-icin/bilgilendirici/spor",
  "yemek-ve-gastronomi": "/yazarlar-icin/bilgilendirici/yemek-ve-gastronomi",
  seyahat: "/yazarlar-icin/bilgilendirici/seyahat",
  "din-ve-inanc": "/yazarlar-icin/bilgilendirici/din-ve-inanc",
  masal: "/yazarlar-icin/cocuk-ve-genclik/masal",
  fabl: "/yazarlar-icin/cocuk-ve-genclik/fabl",
  "cocuk-hikayesi": "/yazarlar-icin/cocuk-ve-genclik/cocuk-hikayesi",
  "cocuk-romani": "/yazarlar-icin/cocuk-ve-genclik/cocuk-romani",
  "genc-yetiskin": "/yazarlar-icin/cocuk-ve-genclik/genc-yetiskin",
  "egitici-cocuk-kitabi": "/yazarlar-icin/cocuk-ve-genclik/egitici-cocuk-kitabi",
  "cizgi-roman": "/yazarlar-icin/cizgi-anlati/cizgi-roman",
  "grafik-roman": "/yazarlar-icin/cizgi-anlati/grafik-roman",
  manga: "/yazarlar-icin/cizgi-anlati/manga",
  webtoon: "/yazarlar-icin/cizgi-anlati/webtoon",
  karikatur: "/yazarlar-icin/cizgi-anlati/karikatur",
};

const ORIGINAL_FOOTER_GENRE_CATEGORIES: ReadonlySet<GenreCategory> = new Set(["Kurgu"]);

type WritingGuideShellProps = {
  children: ReactNode;
  activeCategory: GenreCategory;
  activeGenreSlug: string;
};

export function WritingGuideShell({ children, activeCategory, activeGenreSlug }: WritingGuideShellProps) {
  const genres = getGenresByCategory(activeCategory);
  const showOriginalFooter = activeGenreSlug.length > 0 && ORIGINAL_FOOTER_GENRE_CATEGORIES.has(activeCategory);

  return (
    <>
    <div className="bg-[#f8f6f0] text-[#171426]">
      <nav aria-label="Yazarlık rehberi kategorileri" className="border-b border-[#2a2338]/10 bg-[#fffdf8] px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl gap-2 overflow-x-auto pb-1">
          {WRITING_CATEGORY_HUBS.map((category) => {
            const active = category.category === activeCategory;
            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={active
                  ? "shrink-0 rounded-full bg-[#211746] px-4 py-2 text-sm font-extrabold !text-white shadow-sm transition"
                  : "shrink-0 rounded-full border border-[#2a2338]/10 bg-white px-4 py-2 text-sm font-bold text-[#6c6575] transition hover:-translate-y-0.5 hover:border-[#6b52c7]/30 hover:text-[#211746] hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b52c7] focus-visible:ring-offset-2"}
                href={category.href}
                key={category.slug}
                style={active ? { color: "#fff" } : undefined}
              >
                {category.title}
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-8 sm:px-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:py-10">
        <aside aria-label={`${activeCategory} eser türleri`} className="lg:sticky lg:top-6 lg:self-start">
          <div className="rounded-[1.4rem] border border-[#2a2338]/10 bg-[#fffdf8] p-3 shadow-sm">
            <div className="px-3 pb-3 pt-2 text-xs font-extrabold uppercase tracking-[.16em] text-[#7c6d94]">{activeCategory}</div>
            <div className="flex gap-2 overflow-x-auto lg:block lg:space-y-1 lg:overflow-visible">
              {genres.map((genre) => {
                const active = genre.slug === activeGenreSlug;
                const href = LIVE_WRITING_GUIDE_HREFS[genre.slug];
                const className = active
                  ? "shrink-0 rounded-xl bg-[#5b35dd] px-3 py-2.5 text-sm font-extrabold !text-white lg:block"
                  : "shrink-0 rounded-xl px-3 py-2.5 text-sm font-semibold text-[#5f5869] lg:block";

                if (href) {
                  return (
                    <Link
                      aria-current={active ? "page" : undefined}
                      className={className}
                      href={href}
                      key={genre.slug}
                      style={active ? { color: "#fff" } : undefined}
                    >
                      {genre.label}
                    </Link>
                  );
                }

                return (
                  <div className={className} key={genre.slug} style={active ? { color: "#fff" } : undefined}>
                    {genre.label}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <div className="min-w-0">{children}</div>
      </div>
    </div>
    {showOriginalFooter ? (
      <LiveHomepageFooter
        signedIn={false}
        slogan="İlk cümle, ilk okurun, ilk adımın."
        copyright={`© ${new Date().getFullYear()} İlkOku. Tüm hakları saklıdır.`}
      />
    ) : null}
    </>
  );
}
