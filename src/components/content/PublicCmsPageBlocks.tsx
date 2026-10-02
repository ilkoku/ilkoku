import Image from "next/image";
import Link from "next/link";
import { EditorialBody } from "@/components/content/PublicEditorialDocument";
import type { CmsPageBlock } from "@/lib/cms-page-blocks";

function ActionLink({ href, label, secondary = false }: { href: string; label: string; secondary?: boolean }) {
  if (!href || !label) return null;
  const className = secondary
    ? "inline-flex items-center justify-center rounded-full border border-[#6847e8]/20 bg-white px-5 py-3 text-sm font-extrabold text-[#4b2dbf] no-underline shadow-sm transition hover:-translate-y-0.5 hover:border-[#6847e8]/35"
    : "inline-flex items-center justify-center rounded-full bg-[#5b35dd] px-5 py-3 text-sm font-extrabold text-white no-underline shadow-[0_12px_28px_rgba(91,53,221,.24)] transition hover:-translate-y-0.5 hover:bg-[#4b2dbf]";
  if (href.startsWith("http") || href.startsWith("mailto:") || href.startsWith("tel:")) return <a className={className} href={href}>{label}</a>;
  return <Link className={className} href={href}>{label}</Link>;
}

function SectionHeading({ heading, intro }: { heading?: string; intro?: string }) {
  if (!heading && !intro) return null;
  return (
    <header className="mx-auto mb-8 max-w-3xl text-center">
      {heading ? <h2 className="text-3xl font-semibold tracking-[-0.04em] text-[#16132f] sm:text-4xl">{heading}</h2> : null}
      {intro ? <p className="mx-auto mt-4 max-w-2xl text-base leading-8 text-[#686176]">{intro}</p> : null}
    </header>
  );
}

type PublicCmsPageBlocksProps = {
  blocks: readonly CmsPageBlock[];
  pageTitle: string;
  summary?: string;
  eyebrow: string;
  unoptimizedImages?: boolean;
};

export function PublicCmsPageBlocks({ blocks, pageTitle, summary, eyebrow, unoptimizedImages = false }: PublicCmsPageBlocksProps) {
  const hasHero = blocks.some((block) => block.type === "hero");
  return (
    <main className="min-h-screen bg-gradient-to-b from-white via-[#fbfaff] to-[#f4f1ff] text-[#171426]">
      {!hasHero ? (
        <section className="px-4 pb-8 pt-12 sm:px-6 sm:pb-12 sm:pt-16">
          <div className="mx-auto max-w-5xl text-center">
            <span className="inline-flex rounded-full border border-[#6847e8]/15 bg-white/90 px-4 py-2 text-xs font-extrabold uppercase tracking-[.18em] text-[#5b35dd] shadow-sm">{eyebrow}</span>
            <h1 className="mx-auto mt-6 max-w-4xl text-[clamp(2.7rem,7vw,5.4rem)] font-semibold leading-[.98] tracking-[-.055em] text-[#11102f]">{pageTitle}</h1>
            {summary ? <p className="mx-auto mt-6 max-w-3xl text-base leading-8 text-[#655e78] sm:text-lg">{summary}</p> : null}
          </div>
        </section>
      ) : null}

      <div className="pb-16 sm:pb-24">
        {blocks.map((block) => {
          switch (block.type) {
            case "hero":
              return (
                <section className="px-4 pb-10 pt-10 sm:px-6 sm:pb-16 sm:pt-16" key={block.id}>
                  <div className={`mx-auto grid max-w-6xl items-center gap-8 rounded-[2rem] border border-[#6847e8]/12 bg-white/90 p-6 shadow-[0_24px_70px_rgba(48,32,112,.09)] sm:p-10 ${block.imageUrl ? "lg:grid-cols-[1.08fr_.92fr]" : ""}`}>
                    <div>
                      <span className="inline-flex rounded-full border border-[#6847e8]/15 bg-[#f7f4ff] px-4 py-2 text-xs font-extrabold uppercase tracking-[.17em] text-[#5b35dd]">{block.eyebrow || eyebrow}</span>
                      <h1 className="mt-6 text-[clamp(2.6rem,6vw,5.2rem)] font-semibold leading-[.98] tracking-[-.055em] text-[#11102f]">{block.title || pageTitle}</h1>
                      {block.text || summary ? <p className="mt-6 max-w-2xl text-base leading-8 text-[#655e78] sm:text-lg">{block.text || summary}</p> : null}
                      {(block.primaryLabel || block.secondaryLabel) ? <div className="mt-7 flex flex-wrap gap-3"><ActionLink href={block.primaryHref} label={block.primaryLabel} /><ActionLink href={block.secondaryHref} label={block.secondaryLabel} secondary /></div> : null}
                    </div>
                    {block.imageUrl ? <div className="relative min-h-72 overflow-hidden rounded-[1.6rem] bg-[#f1edff]"><Image alt={block.imageAlt} className="object-cover" fill sizes="(max-width: 1024px) 100vw, 45vw" src={block.imageUrl} unoptimized={unoptimizedImages} /></div> : null}
                  </div>
                </section>
              );
            case "text":
              return (
                <section className="px-4 py-7 sm:px-6 sm:py-10" key={block.id}>
                  <div className="mx-auto max-w-4xl rounded-[1.75rem] border border-[#6847e8]/10 bg-white/92 p-6 shadow-[0_18px_50px_rgba(48,32,112,.06)] sm:p-10 lg:p-12">
                    {block.heading ? <h2 className="mb-6 text-3xl font-semibold tracking-[-.04em] text-[#17142f] sm:text-4xl">{block.heading}</h2> : null}
                    <EditorialBody body={block.body} />
                  </div>
                </section>
              );
            case "image":
              return block.imageUrl ? (
                <section className="px-4 py-7 sm:px-6 sm:py-10" key={block.id}>
                  <figure className={`mx-auto ${block.layout === "wide" ? "max-w-7xl" : "max-w-5xl"}`}>
                    <div className="relative aspect-[16/9] overflow-hidden rounded-[1.75rem] border border-[#6847e8]/10 bg-[#eee9ff] shadow-[0_18px_55px_rgba(48,32,112,.08)]"><Image alt={block.alt} className="object-cover" fill sizes="100vw" src={block.imageUrl} unoptimized={unoptimizedImages} /></div>
                    {block.caption ? <figcaption className="mt-3 text-center text-sm leading-6 text-[#7a7388]">{block.caption}</figcaption> : null}
                  </figure>
                </section>
              ) : null;
            case "split":
              return (
                <section className="px-4 py-8 sm:px-6 sm:py-12" key={block.id}>
                  <div className="mx-auto grid max-w-6xl items-center gap-8 rounded-[2rem] border border-[#6847e8]/10 bg-white p-6 shadow-[0_18px_55px_rgba(48,32,112,.06)] sm:p-10 lg:grid-cols-2">
                    <div className={block.imageSide === "left" ? "lg:order-2" : ""}><h2 className="text-3xl font-semibold tracking-[-.04em] text-[#17142f] sm:text-4xl">{block.heading}</h2><div className="mt-5"><EditorialBody body={block.body} /></div></div>
                    <div className={`relative min-h-72 overflow-hidden rounded-[1.5rem] bg-[#f0ecff] ${block.imageSide === "left" ? "lg:order-1" : ""}`}>{block.imageUrl ? <Image alt={block.imageAlt} className="object-cover" fill sizes="(max-width: 1024px) 100vw, 50vw" src={block.imageUrl} unoptimized={unoptimizedImages} /> : <div className="flex min-h-72 items-center justify-center text-sm font-semibold text-[#8b84a0]">Görsel alanı</div>}</div>
                  </div>
                </section>
              );
            case "cards":
              return (
                <section className="px-4 py-9 sm:px-6 sm:py-14" key={block.id}>
                  <div className="mx-auto max-w-6xl"><SectionHeading heading={block.heading} intro={block.intro} /><div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">{block.items.map((item, index) => <article className="rounded-[1.5rem] border border-[#6847e8]/10 bg-white p-6 shadow-[0_12px_36px_rgba(48,32,112,.055)]" key={`${block.id}-${index}`}><span className="text-xs font-extrabold uppercase tracking-[.16em] text-[#7a5ce1]">{String(index + 1).padStart(2, "0")}</span><h3 className="mt-3 text-xl font-semibold tracking-[-.025em] text-[#1d1938]">{item.title}</h3><p className="mt-3 leading-7 text-[#686176]">{item.text}</p>{item.label && item.href ? <div className="mt-5"><ActionLink href={item.href} label={item.label} secondary /></div> : null}</article>)}</div></div>
                </section>
              );
            case "cta":
              return (
                <section className="px-4 py-9 sm:px-6 sm:py-14" key={block.id}>
                  <div className="mx-auto max-w-5xl rounded-[2rem] bg-[#211746] px-6 py-10 text-center text-white shadow-[0_24px_70px_rgba(32,22,70,.18)] sm:px-10 sm:py-14"><h2 className="text-3xl font-semibold tracking-[-.04em] sm:text-4xl">{block.heading}</h2>{block.text ? <p className="mx-auto mt-4 max-w-2xl leading-8 text-white/72">{block.text}</p> : null}<div className="mt-7 flex flex-wrap justify-center gap-3"><ActionLink href={block.primaryHref} label={block.primaryLabel} /><ActionLink href={block.secondaryHref} label={block.secondaryLabel} secondary /></div></div>
                </section>
              );
            case "steps":
              return (
                <section className="px-4 py-9 sm:px-6 sm:py-14" key={block.id}><div className="mx-auto max-w-5xl"><SectionHeading heading={block.heading} intro={block.intro} /><div className="space-y-4">{block.items.map((item, index) => <article className="grid gap-4 rounded-[1.4rem] border border-[#6847e8]/10 bg-white p-5 shadow-sm sm:grid-cols-[72px_1fr] sm:p-6" key={`${block.id}-${index}`}><div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f0ebff] text-lg font-black text-[#5b35dd]">{String(index + 1).padStart(2, "0")}</div><div><h3 className="text-xl font-semibold tracking-[-.025em] text-[#1d1938]">{item.title}</h3><p className="mt-2 leading-7 text-[#686176]">{item.text}</p></div></article>)}</div></div></section>
              );
            case "stats":
              return (
                <section className="px-4 py-9 sm:px-6 sm:py-14" key={block.id}><div className="mx-auto max-w-6xl"><SectionHeading heading={block.heading} /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{block.items.map((item, index) => <div className="rounded-[1.5rem] border border-[#6847e8]/10 bg-white p-6 text-center shadow-sm" key={`${block.id}-${index}`}><strong className="block text-4xl font-semibold tracking-[-.04em] text-[#5b35dd]">{item.value}</strong><span className="mt-2 block text-sm leading-6 text-[#6d667c]">{item.label}</span></div>)}</div></div></section>
              );
            case "quote":
              return <section className="px-4 py-9 sm:px-6 sm:py-14" key={block.id}><blockquote className="mx-auto max-w-4xl rounded-[2rem] border border-[#6847e8]/12 bg-[#f7f4ff] p-7 text-center shadow-sm sm:p-12"><p className="text-2xl font-semibold leading-snug tracking-[-.03em] text-[#282044] sm:text-3xl">“{block.quote}”</p>{block.attribution ? <footer className="mt-5 text-sm font-bold text-[#6b5a9e]">— {block.attribution}</footer> : null}</blockquote></section>;
            case "faq":
              return <section className="px-4 py-9 sm:px-6 sm:py-14" key={block.id}><div className="mx-auto max-w-4xl"><SectionHeading heading={block.heading} /><div className="space-y-3">{block.items.map((item, index) => <details className="group rounded-[1.25rem] border border-[#6847e8]/10 bg-white p-5 shadow-sm" key={`${block.id}-${index}`}><summary className="cursor-pointer list-none font-bold text-[#282044]">{item.question}</summary><p className="mt-4 leading-7 text-[#686176]">{item.answer}</p></details>)}</div></div></section>;
            case "gallery":
              return <section className="px-4 py-9 sm:px-6 sm:py-14" key={block.id}><div className="mx-auto max-w-6xl"><SectionHeading heading={block.heading} /><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{block.items.filter((item) => item.imageUrl).map((item, index) => <figure key={`${block.id}-${index}`}><div className="relative aspect-[4/3] overflow-hidden rounded-[1.4rem] bg-[#eee9ff]"><Image alt={item.alt} className="object-cover" fill sizes="(max-width: 640px) 100vw, 33vw" src={item.imageUrl} unoptimized={unoptimizedImages} /></div>{item.caption ? <figcaption className="mt-2 text-sm text-[#777083]">{item.caption}</figcaption> : null}</figure>)}</div></div></section>;
            case "table":
              return <section className="px-4 py-9 sm:px-6 sm:py-14" key={block.id}><div className="mx-auto max-w-5xl"><SectionHeading heading={block.heading} /><div className="overflow-x-auto rounded-[1.4rem] border border-[#6847e8]/10 bg-white shadow-sm"><table className="min-w-full border-collapse text-left text-sm"><thead className="bg-[#f3efff] text-[#241b45]"><tr>{block.columns.map((column, index) => <th className="border-b border-[#6847e8]/10 px-4 py-3 font-extrabold" key={`${block.id}-h-${index}`}>{column}</th>)}</tr></thead><tbody>{block.rows.map((row, rowIndex) => <tr className="border-b border-[#6847e8]/8 last:border-0" key={`${block.id}-r-${rowIndex}`}>{block.columns.map((_, cellIndex) => <td className="min-w-36 px-4 py-3 align-top leading-6 text-[#5f596d]" key={`${block.id}-${rowIndex}-${cellIndex}`}>{row[cellIndex] ?? ""}</td>)}</tr>)}</tbody></table></div></div></section>;
            case "divider": {
              const height = block.spacing === "small" ? "h-6" : block.spacing === "large" ? "h-20" : "h-12";
              return <div aria-hidden="true" className={height} key={block.id} />;
            }
          }
        })}
      </div>
    </main>
  );
}
