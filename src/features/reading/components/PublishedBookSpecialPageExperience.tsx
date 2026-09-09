import Link from "next/link";

import {
  publishedBookItemHref,
  type PublishedBookItem,
  type PublishedBookSpecialItem,
} from "@/features/works/book-publication";
import { bookSectionDetails } from "@/features/works/book-structure";
import type { PublicWorkDetail } from "@/features/works/types";
import { PublishedManuscriptViewport } from "./PublishedManuscriptViewport";
import styles from "./FocusedReadingExperience.module.css";

export function PublishedBookSpecialPageExperience({
  item,
  protectionIdentity,
  returnTo = "/kesfet",
  startAtLastPage = false,
  work,
}: {
  item: PublishedBookSpecialItem;
  protectionIdentity: string;
  returnTo?: string;
  startAtLastPage?: boolean;
  work: PublicWorkDetail;
}) {
  const publicationBook = work.publicationBook;
  if (!publicationBook) return null;

  const activeIndex = publicationBook.items.findIndex(
    (candidate) => candidate.structureItemId === item.structureItemId,
  );
  const previousItem =
    activeIndex > 0 ? publicationBook.items[activeIndex - 1] : null;
  const nextItem =
    activeIndex >= 0 && activeIndex < publicationBook.items.length - 1
      ? publicationBook.items[activeIndex + 1]
      : null;
  const encodedReturnTo = encodeURIComponent(returnTo);
  const currentBookPath = `/kitap/${work.slug}`;
  const returnIsBookPage =
    returnTo === currentBookPath || returnTo.startsWith(`${currentBookPath}?`);
  const bookReturnPath = returnIsBookPage
    ? returnTo
    : `${currentBookPath}?from=${encodedReturnTo}`;
  const currentPath = `${publishedBookItemHref(work.slug, item)}?from=${encodedReturnTo}`;
  const passportPath =
    `/kitap/${work.slug}/pasaport?from=${encodeURIComponent(currentPath)}`;

  function itemHref(target: PublishedBookItem, edge?: "last") {
    const edgeParameter = edge === "last" ? "&sayfa=son" : "";
    return `${publishedBookItemHref(work.slug, target)}?from=${encodedReturnTo}${edgeParameter}`;
  }

  const previousHref = previousItem ? itemHref(previousItem, "last") : null;
  const nextHref = nextItem ? itemHref(nextItem) : null;
  const details = bookSectionDetails[item.kind];

  return (
    <div className={`reading-page ${styles.page}`}>
      <a className="reader-skip-link" href="#bolum-metni">
        Kitap sayfasına geç
      </a>

      <header className={`reader-topbar ${styles.topbar}`}>
        <nav className={styles.topbarInner} aria-label="Kitap okuma araçları">
          <Link className={`reader-back ${styles.back}`} href={bookReturnPath}>
            <span aria-hidden="true">←</span>
            <span>Eser Sayfası</span>
          </Link>

          <strong>{work.title}</strong>

          <div className="reader-actions">
            <details className="reader-menu">
              <summary>
                <span>Okuma Menüsü</span>
                <span aria-hidden="true" className="reader-menu__chevron">⌄</span>
              </summary>

              <div
                aria-label="Okuma menüsü bağlantıları"
                className="reader-menu__popover"
              >
                <div className="reader-menu__heading">
                  <strong>Okuma Menüsü</strong>
                  <small>Eser ve geldiğin çalışma alanı arasında geç.</small>
                </div>

                <nav aria-label="Ortak okuma menüsü">
                  {!returnIsBookPage && (
                    <Link href={returnTo}>
                      <span>Geri Dön</span>
                      <span aria-hidden="true">←</span>
                    </Link>
                  )}

                  <Link href={bookReturnPath}>
                    <span>Eser Sayfası</span>
                    <span aria-hidden="true">→</span>
                  </Link>

                  <Link href={passportPath}>
                    <span>Eser Pasaportu</span>
                    <span aria-hidden="true">→</span>
                  </Link>

                  <Link href="/">
                    <span>İlkOku Ana Sayfa</span>
                    <span aria-hidden="true">→</span>
                  </Link>
                </nav>
              </div>
            </details>
          </div>
        </nav>
      </header>

      <main className={styles.layout}>
        <article className={styles.article} aria-labelledby="kitap-sayfasi-basligi">
          <header className={styles.chapterHeader}>
            <p className={styles.chapterMeta}>
              <span>{details.label}</span>
              <span aria-hidden="true">·</span>
              <span>Yazar yayını · {item.layout.pageEnds.length} sayfa</span>
            </p>
            <h1 id="kitap-sayfasi-basligi">{item.title}</h1>
          </header>

          <section
            className={styles.chapterBody}
            id="bolum-metni"
            aria-label={`${details.label} metni`}
          >
            <PublishedManuscriptViewport
              chapterTitle={item.title}
              content={item.content}
              identity={protectionIdentity}
              layout={item.layout}
              nextChapterHref={nextHref}
              previousChapterHref={previousHref}
              startAtLastPage={startAtLastPage}
              subtitle={item.subtitle}
              workTitle={publicationBook.workTitle}
            />
          </section>
        </article>
      </main>
    </div>
  );
}
