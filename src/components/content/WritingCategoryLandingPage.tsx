import { WritingGuideShell } from "@/components/content/WritingGuideShell";
import type { WritingCategoryHub } from "@/lib/writing-category-hubs";

export function WritingCategoryLandingPage({ hub }: { hub: WritingCategoryHub }) {
  return (
    <WritingGuideShell activeCategory={hub.category} activeGenreSlug="">
      <article className="mx-auto max-w-5xl pb-4 sm:pb-8">
        <header className="overflow-hidden rounded-[2.35rem] border border-black/[0.06] bg-white px-7 py-10 shadow-[0_18px_60px_rgba(34,23,70,0.08)] sm:px-10 sm:py-14 lg:px-12">
          <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#6b52c7]">Yazarlık Eğitimi · Ana Kategori</span>
          <h1 className="mt-4 max-w-3xl font-serif text-5xl font-semibold tracking-[-0.045em] text-[#211746] sm:text-6xl">{hub.title}</h1>
          <p className="mt-5 max-w-2xl text-xl font-semibold leading-9 tracking-[-0.015em] text-[#30284d]">{hub.lead}</p>
        </header>

        <div className="mt-6 grid gap-6 lg:grid-cols-2">
          <section
            className="rounded-[2rem] border border-black/[0.06] bg-white px-7 py-8 shadow-[0_14px_44px_rgba(34,23,70,0.06)] sm:px-9 sm:py-10"
            aria-labelledby={`${hub.slug}-nedir`}
          >
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8a78c8]">Kısa tanım</span>
            <h2 id={`${hub.slug}-nedir`} className="mt-3 font-serif text-3xl font-semibold tracking-[-0.03em] text-[#211746] sm:text-4xl">
              {hub.title} nedir?
            </h2>
            <p className="mt-5 text-base leading-8 text-[#625b6d]">{hub.definition}</p>
          </section>

          <section
            className="rounded-[2rem] bg-[#17122f] px-7 py-8 text-white shadow-[0_18px_54px_rgba(23,18,47,0.2)] sm:px-9 sm:py-10"
            aria-labelledby={`${hub.slug}-fark`}
          >
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b7a8ff]">Tür mantığı</span>
            <h2 id={`${hub.slug}-fark`} className="mt-3 font-serif text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">
              Her tür aynı şekilde yazılmaz.
            </h2>
            <p className="mt-5 text-base leading-8 text-[#ddd7ef]">{hub.difference}</p>
          </section>
        </div>

        <section
          className="mt-6 rounded-[2.2rem] border border-[#6b52c7]/10 bg-[#efebff] px-7 py-9 shadow-[0_14px_44px_rgba(91,53,221,0.08)] sm:px-10 sm:py-11"
          aria-labelledby={`${hub.slug}-egitim`}
        >
          <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#5b35dd]">Eğitime geç</span>
          <h2 id={`${hub.slug}-egitim`} className="mt-3 max-w-2xl font-serif text-3xl font-semibold tracking-[-0.03em] text-[#211746] sm:text-4xl">
            Yazmak istediğin türü seç.
          </h2>
          <p className="mt-5 max-w-3xl text-base leading-8 text-[#5f5869]">{hub.invitation}</p>
          <p className="mt-6 inline-flex rounded-full bg-white px-4 py-2.5 text-sm font-extrabold text-[#4b2dbf] shadow-sm">
            Tür eğitimleri soldaki menüde →
          </p>
        </section>
      </article>
    </WritingGuideShell>
  );
}
