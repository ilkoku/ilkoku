import Link from "next/link";

import { WritingGuideShell } from "@/components/content/WritingGuideShell";
import { WRITING_CATEGORY_HUBS, type WritingCategoryHub } from "@/lib/writing-category-hubs";

export function WritingCategoryLandingPage({ hub }: { hub: WritingCategoryHub }) {
  return (
    <WritingGuideShell activeCategory={hub.category} activeGenreSlug="">
      <article className="mx-auto max-w-4xl py-4 sm:py-8">
        <nav className="mb-6" aria-label="Yazarlık eğitimi ana kategorileri">
          <p className="mb-3 text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">7 ana eğitim kategorisi</p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
            {WRITING_CATEGORY_HUBS.map((category) => {
              const isActive = category.slug === hub.slug;

              return (
                <Link
                  key={category.slug}
                  href={category.href}
                  aria-current={isActive ? "page" : undefined}
                  className={`flex min-h-14 items-center justify-between rounded-2xl border px-4 py-3 text-sm font-extrabold transition hover:-translate-y-0.5 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#6b52c7] focus-visible:ring-offset-2 ${
                    isActive
                      ? "border-[#6b52c7] bg-[#6b52c7] text-white"
                      : "border-[#2a2338]/10 bg-[#17122f] text-white hover:bg-[#241a49]"
                  }`}
                >
                  <span>{category.title}</span>
                  <span aria-hidden="true">→</span>
                </Link>
              );
            })}
          </div>
        </nav>

        <header className="rounded-[2rem] border border-[#2a2338]/10 bg-[#fffdf8] px-6 py-8 shadow-sm sm:px-9 sm:py-10">
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#6b52c7]">Yazarlık Eğitimi · Ana Kategori</span>
          <h1 className="mt-3 font-serif text-4xl font-semibold tracking-[-0.035em] text-[#211746] sm:text-5xl">{hub.title}</h1>
          <p className="mt-4 max-w-2xl text-lg font-semibold leading-8 text-[#30284d]">{hub.lead}</p>
        </header>

        <section className="px-1 py-8 sm:px-3 sm:py-10" aria-labelledby={`${hub.slug}-nedir`}>
          <h2 id={`${hub.slug}-nedir`} className="font-serif text-3xl font-semibold tracking-[-0.025em] text-[#211746]">
            {hub.title} nedir?
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#5f5869]">{hub.definition}</p>
        </section>

        <section className="rounded-[1.6rem] bg-[#17122f] px-6 py-7 text-white sm:px-8 sm:py-8" aria-labelledby={`${hub.slug}-fark`}>
          <h2 id={`${hub.slug}-fark`} className="font-serif text-2xl font-semibold tracking-[-0.02em]">
            Her tür aynı şekilde yazılmaz.
          </h2>
          <p className="mt-3 max-w-3xl text-sm leading-7 text-[#ddd7ef]">{hub.difference}</p>
        </section>

        <section className="px-1 py-8 sm:px-3 sm:py-10" aria-labelledby={`${hub.slug}-egitim`}>
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Eğitime geç</span>
          <h2 id={`${hub.slug}-egitim`} className="mt-2 font-serif text-3xl font-semibold tracking-[-0.025em] text-[#211746]">
            Yazmak istediğin türü seç.
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-8 text-[#5f5869]">{hub.invitation}</p>
          <p className="mt-5 inline-flex rounded-full border border-[#6b52c7]/20 bg-[#f2efff] px-4 py-2 text-sm font-extrabold text-[#4b2dbf]">
            Tür eğitimleri menüde seni bekliyor →
          </p>
        </section>
      </article>
    </WritingGuideShell>
  );
}
