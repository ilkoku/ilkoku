import Link from "next/link";
import { Field } from "@/components/ui/Field";
import { publisherContent } from "@/content";
import { BookCover } from "@/features/showcase/components/BookCover";
import { publisherSummaries, publisherWorks } from "../data";
import { PublisherHeader } from "./PublisherHeader";
import { ReviewListButton } from "./ReviewListButton";

export function PublisherDashboard() {
  return (
    <div className="publisher-page">
      <a className="publisher-skip-link" href="#ana-icerik">{publisherContent.dashboard.skip}</a>
      <PublisherHeader />
      <main id="ana-icerik">
        <section className="publisher-hero" aria-labelledby="publisher-title">
          <div>
            <p className="publisher-eyebrow">{publisherContent.dashboard.eyebrow}</p>
            <h1 id="publisher-title">{publisherContent.dashboard.title}</h1>
            <p className="publisher-hero__description">{publisherContent.dashboard.description}</p>
          </div>
          <aside className="publisher-principle" aria-label={publisherContent.dashboard.principleLabel}>
            <span aria-hidden="true">✦</span>
            <p><strong>{publisherContent.dashboard.principleTitle}</strong><span>{publisherContent.dashboard.principleDescription}</span></p>
          </aside>
        </section>

        <section className="publisher-summary" aria-label={publisherContent.dashboard.summaryLabel}>
          {publisherSummaries.map((summary) => (
            <article key={summary.label}>
              <span>{summary.label}</span><strong>{summary.value}</strong><p>{summary.note}</p>
            </article>
          ))}
        </section>

        <section className="publisher-filters" aria-labelledby="filters-title">
          <header className="publisher-section-heading publisher-section-heading--compact">
            <p>{publisherContent.dashboard.filterEyebrow}</p><h2 id="filters-title">{publisherContent.dashboard.filterTitle}</h2>
          </header>
          <form className="publisher-filter-grid">
            {publisherContent.dashboard.filters.map((filter) => (
              <Field key={filter.label} control="select" label={filter.label} name={filter.label.toLocaleLowerCase("tr-TR").replaceAll(" ", "-")} defaultValue={filter.values[0]}>
                {filter.values.map((value) => <option key={value}>{value}</option>)}
              </Field>
            ))}
          </form>
        </section>

        <section className="publisher-directory" aria-labelledby="works-title">
          <header className="publisher-section-heading publisher-section-heading--row">
            <div><p>{publisherContent.dashboard.listEyebrow}</p><h2 id="works-title">{publisherContent.dashboard.listTitle}</h2></div>
            <span>{publisherWorks.length} {publisherContent.dashboard.shownSuffix}</span>
          </header>
          <div className="publisher-work-grid">
            {publisherWorks.map((work) => (
              <article className="publisher-work-card" key={work.slug}>
                <div className="publisher-work-card__visual"><BookCover compact title={work.title} variant={work.coverVariant} /></div>
                <div className="publisher-work-card__body">
                  <div className="publisher-work-card__signal"><span>{work.momentum}</span><strong>{work.potential}</strong></div>
                  <div className="publisher-work-card__identity"><p>{work.genre} · {work.subgenre}</p><h3>{work.title}</h3><span>{work.author}</span></div>
                  <div className="publisher-progress"><div><span>{publisherContent.dashboard.completion}</span><strong>%{work.completion}</strong></div><progress max="100" value={work.completion}>%{work.completion}</progress></div>
                  <dl className="publisher-work-card__stats">
                    <div><dt>{publisherContent.dashboard.chapter}</dt><dd>{work.chapters}</dd></div><div><dt>{publisherContent.dashboard.reads}</dt><dd>{work.reads}</dd></div><div><dt>{publisherContent.dashboard.comments}</dt><dd>{work.comments}</dd></div><div><dt>{publisherContent.dashboard.update}</dt><dd>{work.updatedAt}</dd></div>
                  </dl>
                  {work.editorReview ? <div className="publisher-editor-note"><span aria-hidden="true">✓</span><p><strong>{publisherContent.dashboard.humanReview}</strong><span>{work.editorReview.editor} · {work.editorReview.summary}</span></p></div> : <div className="publisher-editor-note publisher-editor-note--empty"><span aria-hidden="true">○</span><p><strong>{publisherContent.dashboard.waitingReview}</strong><span>{publisherContent.dashboard.noReview}</span></p></div>}
                  <div className="publisher-work-card__actions">
                    <Link className="button button--primary" href={work.slug === "kayip-sehir" ? "/yayinevi/eser/kayip-sehir" : `/yayinevi/eser/${work.slug}`}><span className="button__label">{publisherContent.dashboard.inspectWork}</span></Link>
                    <ReviewListButton compact title={work.title} />
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </main>
    </div>
  );
}
