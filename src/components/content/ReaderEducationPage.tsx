import Image from "next/image";
import Link from "next/link";

import LiveHomepageFooter from "@/app/onizleme/ana-sayfa-yeni/live-footer";
import type { ReaderEducationGuideRecord } from "@/lib/cms-reader-education";
import {
  READER_EDUCATION_CATEGORIES,
  READER_EDUCATION_VISUAL_SLOTS,
  readerEducationPublicPath,
  type ReaderEducationCategory,
  type ReaderEducationVisualSlotKey,
} from "@/lib/reader-education";

function ReaderVisual({
  guide,
  slotKey,
  fallbackAlt,
}: {
  guide: ReaderEducationGuideRecord;
  slotKey: ReaderEducationVisualSlotKey;
  fallbackAlt: string;
}) {
  const visual = guide.visuals[slotKey];
  if (!visual) return null;
  const slot = READER_EDUCATION_VISUAL_SLOTS.find((item) => item.key === slotKey)!;

  return (
    <figure className="mt-7 overflow-hidden rounded-[1.8rem] border border-black/[0.06] bg-white shadow-[0_14px_44px_rgba(34,23,70,0.08)]">
      <Image
        src={visual.url}
        alt={visual.altText || fallbackAlt}
        width={visual.recommendedWidth}
        height={visual.recommendedHeight}
        className="h-auto w-full object-contain"
        unoptimized
      />
      <figcaption className="border-t border-black/[0.06] px-5 py-3 text-xs leading-6 text-[#746d7d]">
        {slot.label} · {guide.title}
      </figcaption>
    </figure>
  );
}

export function ReaderEducationPage({ category, guide }: { category: ReaderEducationCategory; guide: ReaderEducationGuideRecord }) {
  return (
    <>
      <main className="min-h-screen bg-[#f7f4ee] text-[#211746]">
        <div className="mx-auto max-w-6xl px-5 pb-16 pt-6 sm:px-7 lg:px-8">
          <nav className="mb-5 flex flex-wrap items-center justify-between gap-3 text-sm font-bold text-[#665f70]" aria-label="Okur eğitimi gezinme">
            <Link href="/nasil-calisir#okur-egitimi" className="rounded-full border border-black/[0.07] bg-white px-4 py-2 shadow-sm transition hover:-translate-y-0.5">← Okur eğitimleri</Link>
            <Link href="/kesfet" className="rounded-full bg-[#211746] px-4 py-2 text-white shadow-sm transition hover:-translate-y-0.5">Eserleri keşfet →</Link>
          </nav>

          <article className="mx-auto max-w-5xl">
            <header className="overflow-hidden rounded-[2.5rem] bg-[#17122f] px-7 py-10 text-white shadow-[0_24px_70px_rgba(23,18,47,0.22)] sm:px-10 sm:py-14 lg:px-12 lg:py-16">
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-xs font-extrabold uppercase tracking-[0.18em] text-[#b7a8ff]">İlkOku · Okurluk Okulu</span>
                <span className="rounded-full border border-white/10 bg-white/[0.07] px-3 py-1.5 text-xs font-extrabold text-[#e5dfff]">{category.number} / 08</span>
              </div>
              <h1 className="mt-5 max-w-4xl font-serif text-5xl font-semibold tracking-[-0.05em] sm:text-6xl lg:text-7xl">{guide.title}</h1>
              <p className="mt-6 max-w-3xl text-xl font-semibold leading-9 tracking-[-0.015em] text-[#f2eefc] sm:text-2xl sm:leading-10">{category.lead}</p>
              <p className="mt-7 max-w-3xl text-base leading-8 text-[#d8d2e8]">{guide.summary || category.promise}</p>
              <div className="mt-7 flex flex-wrap gap-2 text-xs font-bold text-[#d8d2e8]">
                <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Öğren</span>
                <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Örneği incele</span>
                <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Metni çöz</span>
                <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">Kendin dene</span>
                <span className="rounded-full border border-white/10 bg-white/[0.055] px-3 py-2">İlkOku’da uygula</span>
              </div>
            </header>

            <ReaderVisual guide={guide} slotKey="hero" fallbackAlt={`${category.title} eğitimini anlatan ana görsel`} />

            <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 shadow-[0_14px_48px_rgba(34,23,70,0.06)] sm:px-10 sm:py-11" aria-labelledby={`${category.slug}-kazanim`}>
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Bu eğitim sana ne kazandıracak?</span>
              <h2 id={`${category.slug}-kazanim`} className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Okuma davranışını görünür ve geliştirilebilir hâle getir.</h2>
              <p className="mt-5 max-w-3xl text-base leading-8 text-[#625b6d]">{category.promise}</p>
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                {category.benefits.map((item, index) => (
                  <div className="rounded-[1.6rem] border border-[#2a2338]/[0.07] bg-[#fffdf8] p-6" key={item.title}>
                    <span className="text-xs font-black tabular-nums text-[#8a78c8]">{String(index + 1).padStart(2, "0")}</span>
                    <h3 className="mt-3 text-lg font-extrabold tracking-[-0.02em]">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#665f70]">{item.text}</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="mt-6 rounded-[2.35rem] bg-[#17122f] px-7 py-9 text-white shadow-[0_20px_60px_rgba(23,18,47,0.2)] sm:px-10 sm:py-11" aria-labelledby={`${category.slug}-yol`}>
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b7a8ff]">Öğrenme yolu</span>
              <h2 id={`${category.slug}-yol`} className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Bilgiyi okumaktan bilinçli okuma pratiğine geç.</h2>
              <ol className="mt-7 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {category.learningPath.map((item, index) => (
                  <li className="rounded-[1.55rem] border border-white/10 bg-white/[0.055] p-5" key={item.title}>
                    <span className="text-xs font-black tracking-[0.14em] text-[#b7a8ff]">AŞAMA {index + 1}</span>
                    <h3 className="mt-3 text-base font-extrabold leading-7">{item.title}</h3>
                    <p className="mt-2 text-sm leading-7 text-[#cfc8e2]">{item.text}</p>
                  </li>
                ))}
              </ol>
              <ReaderVisual guide={guide} slotKey="learningPath" fallbackAlt={`${category.title} öğrenme yolunu gösteren görsel`} />
            </section>

            <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-[#fffdf8] px-7 py-9 shadow-[0_14px_48px_rgba(34,23,70,0.06)] sm:px-10 sm:py-11" aria-labelledby={`${category.slug}-analiz`}>
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Temel analiz araçları</span>
              <h2 id={`${category.slug}-analiz`} className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Okurken hangi işaretlere bakacağını bil.</h2>
              <div className="mt-7 grid gap-4 sm:grid-cols-2">
                {category.concepts.map((item) => (
                  <div className="rounded-[1.55rem] border border-black/[0.06] bg-white p-6" key={item.title}>
                    <h3 className="text-lg font-extrabold">{item.title}</h3>
                    <p className="mt-3 text-sm leading-7 text-[#665f70]">{item.text}</p>
                  </div>
                ))}
              </div>
              <ReaderVisual guide={guide} slotKey="analysis" fallbackAlt={`${category.title} analiz kavramlarını anlatan görsel`} />
            </section>

            <section className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_.8fr]" aria-labelledby={`${category.slug}-ornek`}>
              <div className="rounded-[2.2rem] border border-[#6b52c7]/10 bg-[#efebff] px-7 py-9 shadow-[0_14px_44px_rgba(91,53,221,0.08)] sm:px-10 sm:py-11">
                <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#5b35dd]">Örneği incele</span>
                <h2 id={`${category.slug}-ornek`} className="mt-3 font-serif text-3xl font-semibold tracking-[-0.03em] sm:text-4xl">{category.example.heading}</h2>
                <p className="mt-5 text-base leading-8 text-[#5f5869]">{category.example.text}</p>
              </div>
              <div className="rounded-[2.2rem] border border-black/[0.06] bg-white p-7 shadow-[0_14px_44px_rgba(34,23,70,0.06)]">
                <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8a78c8]">Kendine sor</p>
                <ul className="mt-5 space-y-4">
                  {category.example.questions.map((question) => <li className="flex gap-3 text-sm font-semibold leading-7 text-[#423a52]" key={question}><span className="mt-2 h-2 w-2 shrink-0 rounded-full bg-[#6b52c7]" aria-hidden="true" /><span>{question}</span></li>)}
                </ul>
              </div>
            </section>
            <ReaderVisual guide={guide} slotKey="example" fallbackAlt={`${category.title} örnek çözümleme görseli`} />

            <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 shadow-[0_14px_48px_rgba(34,23,70,0.06)] sm:px-10 sm:py-11" aria-labelledby={`${category.slug}-uygulama`}>
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#6b52c7]">Kendin dene</span>
              <h2 id={`${category.slug}-uygulama`} className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{category.practice.heading}</h2>
              <p className="mt-5 max-w-3xl text-base leading-8 text-[#625b6d]">{category.practice.text}</p>
              <ol className="mt-7 grid gap-4 sm:grid-cols-2">
                {category.practice.steps.map((step, index) => (
                  <li className="flex gap-4 rounded-[1.4rem] bg-[#f7f4ee] p-5 text-sm font-semibold leading-7 text-[#423a52]" key={step}>
                    <span className="font-black tabular-nums text-[#6b52c7]">{String(index + 1).padStart(2, "0")}</span>
                    <span>{step}</span>
                  </li>
                ))}
              </ol>
              <ReaderVisual guide={guide} slotKey="practice" fallbackAlt={`${category.title} uygulama çalışmasını anlatan görsel`} />
            </section>

            <section className="mt-6 rounded-[2.35rem] bg-[#211746] px-7 py-9 text-white shadow-[0_20px_60px_rgba(23,18,47,0.2)] sm:px-10 sm:py-11" aria-labelledby={`${category.slug}-ilkoku`}>
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#b7a8ff]">İlkOku’da uygula</span>
              <h2 id={`${category.slug}-ilkoku`} className="mt-3 max-w-3xl font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">{category.application.heading}</h2>
              <p className="mt-5 max-w-3xl text-base leading-8 text-[#d8d2e8]">{category.application.text}</p>
              <Link className="mt-6 inline-flex rounded-full bg-white px-5 py-3 text-sm font-extrabold text-[#211746] shadow-sm transition hover:-translate-y-0.5" href={category.application.href}>{category.application.label} →</Link>
              <ReaderVisual guide={guide} slotKey="finalCta" fallbackAlt={`${category.title} eğitimi kapanış görseli`} />
            </section>

            <section className="mt-6 rounded-[2.25rem] border border-black/[0.06] bg-white px-7 py-9 shadow-[0_14px_48px_rgba(34,23,70,0.06)] sm:px-10 sm:py-11" aria-labelledby={`${category.slug}-diger`}>
              <span className="text-xs font-extrabold uppercase tracking-[0.16em] text-[#8a78c8]">Okurluk Okulu</span>
              <h2 id={`${category.slug}-diger`} className="mt-3 font-serif text-3xl font-semibold tracking-[-0.035em] sm:text-4xl">Diğer eğitim alanlarını keşfet.</h2>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {READER_EDUCATION_CATEGORIES.filter((item) => item.slug !== category.slug).map((item) => (
                  <Link className="rounded-[1.35rem] border border-black/[0.06] bg-[#fffdf8] p-4 transition hover:-translate-y-0.5 hover:border-[#6b52c7]/30" href={readerEducationPublicPath(item)} key={item.slug}>
                    <span className="text-xs font-black text-[#8a78c8]">{item.number}</span>
                    <strong className="mt-2 block text-sm leading-6">{item.title}</strong>
                  </Link>
                ))}
              </div>
            </section>
          </article>
        </div>
      </main>
      <LiveHomepageFooter
        signedIn={false}
        slogan="İlk cümle, ilk okurun, ilk adımın."
        copyright={`© ${new Date().getFullYear()} İlkOku. Tüm hakları saklıdır.`}
      />
    </>
  );
}
