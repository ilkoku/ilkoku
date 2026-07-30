import Link from "next/link";
import { publisherContent } from "@/content";
import { BookCover } from "@/features/showcase/components/BookCover";
import { ContactRequest } from "./ContactRequest";
import { PublisherHeader } from "./PublisherHeader";
import { ReviewListButton } from "./ReviewListButton";
import { publisherChapters, readerSignals, selectedPublisherWork } from "../data";

export function PublisherWorkDetail() {
  const work = selectedPublisherWork;
  const review = work.editorReview;

  return (
    <div className="publisher-page">
      <a className="publisher-skip-link" href="#publisher-work-detail">
        İçeriğe geç
      </a>

      <PublisherHeader backHref="/yayinevi" />

      <main id="publisher-work-detail">
        <section className="publisher-detail-hero" aria-labelledby="publisher-work-title">
          <BookCover title={work.title} variant={work.coverVariant} />

          <div className="publisher-detail-hero__copy">
            <p className="publisher-eyebrow">{work.genre}</p>
            <h1 id="publisher-work-title">{work.title}</h1>
            <p className="publisher-detail-hero__author">{work.author}</p>
            <p className="publisher-detail-hero__summary">{publisherContent.detail.summary}</p>

            <ul className="publisher-tags" aria-label={publisherContent.detail.tagsLabel}>
              {[work.subgenre, ...publisherContent.detail.tags].map((tag) => (
                <li key={tag}>{tag}</li>
              ))}
            </ul>

            <div className="publisher-detail-hero__actions">
              <Link className="button button--primary" href="/kitap/kayip-sehir">
                <span className="button__label">{publisherContent.detail.firstChapter}</span>
              </Link>
              <ReviewListButton title={work.title} />
            </div>
          </div>

          <aside className="publisher-detail-score" aria-label={publisherContent.detail.developmentSummary}>
            <p>{publisherContent.detail.developmentSummary}</p>
            <strong>%{work.completion}</strong>
            <progress max={100} value={work.completion}>{work.completion}%</progress>
            <dl>
              <div>
                <dt>{publisherContent.detail.developmentStatus}</dt>
                <dd>{work.momentum}</dd>
              </div>
              <div>
                <dt>{publisherContent.detail.lastUpdate}</dt>
                <dd>{work.updatedAt}</dd>
              </div>
            </dl>
          </aside>
        </section>

        <div className="publisher-detail-layout">
          <div className="publisher-detail-main">
            <section aria-labelledby="publisher-chapters-title">
              <header className="publisher-section-heading publisher-section-heading--compact">
                <p>{publisherContent.detail.structureEyebrow}</p>
                <h2 id="publisher-chapters-title">{publisherContent.detail.chaptersTitle}</h2>
              </header>

              <ol className="publisher-chapter-list">
                {publisherChapters.map((chapter) => (
                  <li key={chapter.number}>
                    <span>{String(chapter.number).padStart(2, "0")}</span>
                    <div>
                      <strong>{chapter.title}</strong>
                      <small>{chapter.words}</small>
                    </div>
                    <em>{chapter.status}</em>
                  </li>
                ))}
              </ol>
            </section>

            <section aria-labelledby="publisher-reader-signals-title">
              <header className="publisher-section-heading publisher-section-heading--compact">
                <p>{publisherContent.detail.readerEyebrow}</p>
                <h2 id="publisher-reader-signals-title">{publisherContent.detail.readerSignals}</h2>
              </header>

              <div className="publisher-signal-list">
                {readerSignals.map((signal) => (
                  <article key={signal.label}>
                    <div>
                      <strong>{signal.label}</strong>
                      <span>%{signal.value}</span>
                    </div>
                    <progress max={100} value={signal.value}>{signal.value}%</progress>
                    <p>{signal.note}</p>
                  </article>
                ))}
              </div>
            </section>

            {review && (
              <section className="publisher-editor-review" aria-labelledby="publisher-editor-review-title">
                <p className="publisher-eyebrow">{publisherContent.detail.humanReview}</p>
                <div className="publisher-editor-review__meta">
                  <span aria-hidden="true">MK</span>
                  <p>
                    <strong>{publisherContent.detail.editorName}</strong>
                    <small>{publisherContent.detail.editorExperience}</small>
                  </p>
                </div>
                <h2 id="publisher-editor-review-title">{publisherContent.detail.reviewTitle}</h2>
                <p>{publisherContent.detail.review}</p>
                <Link href="/editorler">{publisherContent.detail.inspectEditor}</Link>
              </section>
            )}
          </div>

          <aside className="publisher-detail-aside">
            <section>
              <p className="publisher-eyebrow">{publisherContent.detail.author}</p>
              <h2>{work.author}</h2>
              <p>{publisherContent.detail.authorBiography}</p>
              <Link href="/yazarlar">{publisherContent.detail.authorProfile}</Link>
            </section>

            <section>
              <p className="publisher-eyebrow">{publisherContent.detail.balancedView}</p>
              <h2>{publisherContent.detail.development}</h2>
              <dl>
                <div><dt>Okunma</dt><dd>{work.reads}</dd></div>
                <div><dt>Yorum</dt><dd>{work.comments}</dd></div>
                <div><dt>Bölüm</dt><dd>{work.chapters}</dd></div>
                <div><dt>Tamamlanma</dt><dd>%{work.completion}</dd></div>
              </dl>
              <p>{publisherContent.detail.balanceNote}</p>
            </section>

            <ContactRequest authorName={work.author} />
          </aside>
        </div>
      </main>
    </div>
  );
}
