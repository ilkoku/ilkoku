import Link from "next/link";
import { publisherContent } from "@/content";
import { BookCover } from "@/features/showcase/components/BookCover";
import { publisherChapters, readerSignals, selectedPublisherWork as work } from "../data";
import { ContactRequest } from "./ContactRequest";
import { PublisherHeader } from "./PublisherHeader";
import { ReviewListButton } from "./ReviewListButton";

export function PublisherWorkDetail() {
  return (
    <div className="publisher-page">
      <a className="publisher-skip-link" href="#ana-icerik">{publisherContent.dashboard.skip}</a>
      <PublisherHeader backHref="/yayinevi" />
      <main id="ana-icerik">
        <section className="publisher-detail-hero" aria-labelledby="work-title">
          <BookCover title={work.title} variant={work.coverVariant} />
          <div className="publisher-detail-hero__copy">
            <p className="publisher-eyebrow">{work.potential}</p>
            <h1 id="work-title">{work.title}</h1>
            <p className="publisher-detail-hero__author">{work.author}</p>
            <p className="publisher-detail-hero__summary">{publisherContent.detail.summary}</p>
            <ul className="publisher-tags" aria-label={publisherContent.detail.tagsLabel}><li>{work.genre}</li><li>{work.subgenre}</li>{publisherContent.detail.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>
            <div className="publisher-detail-hero__actions">
              <Link className="button button--primary" href="/oku/kayip-sehir/bolum-1"><span className="button__label">{publisherContent.detail.firstChapter}</span></Link>
              <ReviewListButton title={work.title} />
            </div>
          </div>
          <aside className="publisher-detail-score" aria-label={publisherContent.detail.developmentSummary}>
            <p>{publisherContent.detail.developmentStatus}</p><strong>%{work.completion}</strong><progress max="100" value={work.completion}>%{work.completion}</progress>
            <dl><div><dt>{publisherContent.dashboard.chapter}</dt><dd>{work.chapters}</dd></div><div><dt>{publisherContent.detail.lastUpdate}</dt><dd>{work.updatedAt}</dd></div></dl>
          </aside>
        </section>

        <div className="publisher-detail-layout">
          <div className="publisher-detail-main">
            <section aria-labelledby="chapters-title">
              <header className="publisher-section-heading publisher-section-heading--compact"><p>{publisherContent.detail.structureEyebrow}</p><h2 id="chapters-title">{publisherContent.detail.chaptersTitle}</h2></header>
              <ol className="publisher-chapter-list">
                {publisherChapters.map((chapter) => <li key={chapter.number}><span>{String(chapter.number).padStart(2, "0")}</span><div><strong>{chapter.title}</strong><small>{chapter.words}</small></div><em>{chapter.status}</em></li>)}
              </ol>
            </section>
            <section aria-labelledby="signals-title">
              <header className="publisher-section-heading publisher-section-heading--compact"><p>{publisherContent.detail.readerEyebrow}</p><h2 id="signals-title">{publisherContent.detail.readerSignals}</h2></header>
              <div className="publisher-signal-list">
                {readerSignals.map((signal) => <article key={signal.label}><div><strong>{signal.label}</strong><span>%{signal.value}</span></div><progress max="100" value={signal.value}>%{signal.value}</progress><p>{signal.note}</p></article>)}
              </div>
            </section>
            <section className="publisher-editor-review" aria-labelledby="editor-review-title">
              <div className="publisher-editor-review__meta"><span>MK</span><p><strong>{publisherContent.detail.editorName}</strong><small>{publisherContent.detail.editorExperience}</small></p></div>
              <p className="publisher-eyebrow">{publisherContent.detail.humanReview}</p>
              <h2 id="editor-review-title">“{publisherContent.detail.reviewTitle}”</h2>
              <p>{publisherContent.detail.review}</p>
              <Link href="/editörler/merve-kaya">{publisherContent.detail.inspectEditor}</Link>
            </section>
          </div>
          <aside className="publisher-detail-aside">
            <section><p className="publisher-eyebrow">{publisherContent.detail.author}</p><h2>{work.author}</h2><p>{publisherContent.detail.authorBiography}</p><Link href="/kitap/kayip-sehir#yazar">{publisherContent.detail.authorProfile}</Link></section>
            <section><p className="publisher-eyebrow">{publisherContent.detail.balancedView}</p><dl><div><dt>{publisherContent.dashboard.reads}</dt><dd>{work.reads}</dd></div><div><dt>{publisherContent.dashboard.comments}</dt><dd>{work.comments}</dd></div><div><dt>{publisherContent.detail.development}</dt><dd>{work.momentum}</dd></div></dl><p className="publisher-detail-aside__note">{publisherContent.detail.balanceNote}</p></section>
            <ContactRequest authorName={work.author} />
          </aside>
        </div>
      </main>
    </div>
  );
}
