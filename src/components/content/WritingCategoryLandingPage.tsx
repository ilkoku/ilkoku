import LiveHomepageFooter from "@/app/onizleme/ana-sayfa-yeni/live-footer";
import { WritingGuideShell } from "@/components/content/WritingGuideShell";
import { getGenresByCategory } from "@/lib/genres";
import type { WritingCategoryHub } from "@/lib/writing-category-hubs";

export function WritingCategoryLandingPage({ hub }: { hub: WritingCategoryHub }) {
  const genres = getGenresByCategory(hub.category);

  return (
    <>
      <WritingGuideShell activeCategory={hub.category} activeGenreSlug="">
        <article className="mx-auto max-w-5xl pb-6 sm:pb-10">
          <header className="overflow-hidden rounded-[2.5rem] border border-black/[0.06] bg-white px-7 py-10 shadow-[0_20px_70px_rgba(34,23,70,0.09)] sm:px-10 sm:py-14 lg:px-12 lg:py-16">
            <div className="flex flex-wrap items-center gap-3">
              <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#6b52c7]">Yazarlık Eğitimi · Ana Kategori</span>
              <span className="rounded-full bg-[#f0ecff] px-3 py-1.5 text-xs font-extrabold text-[#5b35dd]">{genres.length} tür · türe özel eğitim</span>
            </div>
            <h1 className="mt-5 max-w-3xl font-serif text-5xl font-semibold tracking-[-0.05em] text-[#211746] sm:text-6xl lg:text-7xl">{hub.title}</h1>
            <p className="mt-6 max-w-3xl text-xl font-semibold leading-9 tracking-[-0.015em] text-[#30284d] sm:text-2xl sm:leading-10">{hub.lead}</p>
            <p className="mt-7 max-w-3xl text-base leading-8 text-[#625b6d]">{hub.promise}</p>
          </header>

          <div className="mt-6 grid gap-6 lg:grid-cols-2">
            <section
              className="rounded-[2rem] border border-black/[0.06] bg-white px-7 py-8 shadow-[0_14px_44px_rgba(34,23,70,0.06)] sm:px-9 sm:py-10"
              aria-labelledby={`${hub.slug}-nedir`}
            >
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8a78c8]">Temel çerçeve</span>
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

          <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-[#fffdf8] px-7 py-9 shadow-[0_14px_48px_rgba(34,23,70,0.06)] sm:px-10 sm:py-11" aria-labelledby={`${hub.slug}-temeller`}>
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Bu kategoride ne öğreneceksin?</span>
            <h2 id={`${hub.slug}-temeller`} className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] text-[#211746] sm:text-4xl">
              Türlere geçmeden önce bu dört temel yazarlık problemini gör.
            </h2>
            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              {hub.foundations.map((item, index) => (
                <div className="rounded-[1.6rem] border border-[#2a2338]/[0.07] bg-white p-6 shadow-[0_10px_30px_rgba(34,23,70,0.045)]" key={item.title}>
                  <span className="text-xs font-black tabular-nums text-[#8a78c8]">0{index + 1}</span>
                  <h3 className="mt-3 text-lg font-extrabold tracking-[-0.02em] text-[#211746]">{item.title}</h3>
                  <p className="mt-3 text-sm leading-7 text-[#665f70]">{item.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 overflow-hidden rounded-[2.25rem] border border-black/[0.06] bg-white shadow-[0_14px_48px_rgba(34,23,70,0.06)]" aria-labelledby={`${hub.slug}-tur-secimi`}>
            <div className="px-7 pb-6 pt-9 sm:px-10 sm:pt-11">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8a78c8]">Türünü seçmeden önce</span>
              <h2 id={`${hub.slug}-tur-secimi`} className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] text-[#211746] sm:text-4xl">{hub.choiceHeading}</h2>
              <p className="mt-5 max-w-3xl text-base leading-8 text-[#625b6d]">{hub.choiceIntro}</p>
            </div>
            <div className="border-t border-black/[0.06]">
              {hub.choiceSignals.map((item, index) => (
                <div className="grid gap-2 border-b border-black/[0.06] px-7 py-6 last:border-b-0 sm:grid-cols-[3rem_13rem_minmax(0,1fr)] sm:items-start sm:gap-5 sm:px-10" key={item.title}>
                  <span className="text-sm font-black tabular-nums text-[#9a8db5]">{String(index + 1).padStart(2, "0")}</span>
                  <h3 className="text-base font-extrabold leading-7 text-[#2d244c]">{item.title}</h3>
                  <p className="text-sm leading-7 text-[#696270]">{item.text}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="mt-6 rounded-[2.35rem] bg-[#17122f] px-7 py-9 text-white shadow-[0_20px_60px_rgba(23,18,47,0.2)] sm:px-10 sm:py-11" aria-labelledby={`${hub.slug}-yolculuk`}>
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b7a8ff]">Eğitim yolculuğu</span>
            <h2 id={`${hub.slug}-yolculuk`} className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">
              Bilgiyi okumaktan gerçek eser üretmeye geç.
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#d8d2e8]">
              İlkOku’daki tür eğitimleri birbirinden farklıdır; fakat hepsi seni fikir aşamasından uygulanabilir taslağa ve revizyona taşır. Bu kategori için genel çalışma hattı şöyle işler:
            </p>
            <ol className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {hub.learningPath.map((item, index) => (
                <li className="rounded-[1.55rem] border border-white/10 bg-white/[0.055] p-5" key={item.title}>
                  <span className="text-xs font-black tracking-[0.14em] text-[#b7a8ff]">AŞAMA {index + 1}</span>
                  <h3 className="mt-3 text-base font-extrabold leading-7 text-white">{item.title}</h3>
                  <p className="mt-2 text-sm leading-7 text-[#cfc8e2]">{item.text}</p>
                </li>
              ))}
            </ol>
          </section>

          <section className="mt-6 grid gap-6 lg:grid-cols-[1.25fr_.75fr]" aria-labelledby={`${hub.slug}-cikti`}>
            <div className="rounded-[2.2rem] border border-[#6b52c7]/10 bg-[#efebff] px-7 py-9 shadow-[0_14px_44px_rgba(91,53,221,0.08)] sm:px-10 sm:py-11">
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#5b35dd]">Somut çıktı</span>
              <h2 id={`${hub.slug}-cikti`} className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.03em] text-[#211746] sm:text-4xl">{hub.outcomeHeading}</h2>
              <p className="mt-5 max-w-3xl text-base leading-8 text-[#5f5869]">{hub.outcomeIntro}</p>
            </div>
            <div className="rounded-[2.2rem] border border-black/[0.06] bg-white p-6 shadow-[0_14px_44px_rgba(34,23,70,0.06)] sm:p-8">
              <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8a78c8]">Eğitim sonunda elinde</p>
              <ul className="mt-5 space-y-4">
                {hub.outcomes.map((item) => (
                  <li className="flex gap-3 text-sm font-semibold leading-7 text-[#423a52]" key={item}>
                    <span aria-hidden="true" className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#6b52c7]" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section
            className="mt-6 rounded-[2.2rem] border border-[#6b52c7]/10 bg-white px-7 py-9 shadow-[0_14px_44px_rgba(34,23,70,0.06)] sm:px-10 sm:py-11"
            aria-labelledby={`${hub.slug}-egitim`}
          >
            <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#5b35dd]">Şimdi eğitime geç</span>
            <h2 id={`${hub.slug}-egitim`} className="mt-3 max-w-2xl font-serif text-3xl font-semibold tracking-[-0.03em] text-[#211746] sm:text-4xl">
              Yazmak istediğin türü seç.
            </h2>
            <p className="mt-5 max-w-3xl text-base leading-8 text-[#5f5869]">{hub.invitation}</p>
            <div className="mt-6 flex flex-wrap items-center gap-3">
              <p className="inline-flex rounded-full bg-[#211746] px-4 py-2.5 text-sm font-extrabold text-white shadow-sm">
                {genres.length} tür eğitimi soldaki menüde →
              </p>
              <p className="text-sm font-semibold text-[#77707f]">Bir tür seçtiğinde doğrudan o türe özel eğitime geçersin.</p>
            </div>
          </section>
        </article>
      </WritingGuideShell>
      <LiveHomepageFooter
        signedIn={false}
        slogan="İlk cümle, ilk okurun, ilk adımın."
        copyright={`© ${new Date().getFullYear()} İlkOku. Tüm hakları saklıdır.`}
      />
    </>
  );
}
