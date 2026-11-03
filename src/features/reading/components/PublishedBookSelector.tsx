import Link from "next/link";

import {
  publishedBookItemHref,
  type PublishedBookItem,
} from "@/features/works/book-publication";
import { bookSectionDetails } from "@/features/works/book-structure";

import styles from "./ChapterSelector.module.css";

function itemLabel(item: PublishedBookItem) {
  return item.type === "chapter"
    ? `${item.chapterPosition}. Bölüm`
    : bookSectionDetails[item.kind].label;
}

export function PublishedBookSelector({
  activeStructureItemId,
  encodedReturnTo,
  items,
  readingProgress,
  workSlug,
  workTitle,
}: {
  activeStructureItemId: string;
  encodedReturnTo: string;
  items: PublishedBookItem[];
  readingProgress?: number | null;
  workSlug: string;
  workTitle: string;
}) {
  const activeItem =
    items.find((item) => item.structureItemId === activeStructureItemId) ??
    items[0] ??
    null;

  if (!activeItem) return null;

  const numberedItems = items.map((item, index) => ({
    item,
    page: 1 + items.slice(0, index).reduce(
      (total, earlier) => total + earlier.layout.pageEnds.length,
      0,
    ),
  }));
  const coverHref = `/oku/${workSlug}/kapak?from=${encodedReturnTo}`;
  const contentsHref = `/oku/${workSlug}/icindekiler?from=${encodedReturnTo}`;

  return (
    <details className={styles.selector}>
      <summary aria-label="Kitap sayfası seç">
        <strong className={styles.title}>{workTitle}</strong>
        <span aria-hidden="true">·</span>
        <span>{itemLabel(activeItem)}</span>
        {activeItem.type === "chapter" && typeof readingProgress === "number" ? (
          <>
            <span aria-hidden="true">·</span>
            <span className={styles.progress}>%{readingProgress} okundu</span>
          </>
        ) : null}
        <span aria-hidden="true" className={styles.chevron}>⌄</span>
      </summary>

      <div className={styles.popover}>
        <header className={styles.heading}>
          <strong>İçindekiler</strong>
          <small>Kapak, özel sayfalar ve bölümler yazarın yayın sırasıyla gösterilir.</small>
        </header>

        <nav aria-label="Yayımlanmış kitap sırası" className={styles.list}>
          <Link className={styles.chapter} href={coverHref}>
            <span className={styles.number}>Kapak</span>
            <strong className={styles.chapterTitle}>Ön kapak</strong>
          </Link>
          <Link className={styles.chapter} href={contentsHref}>
            <span className={styles.number}>Gezinme</span>
            <strong className={styles.chapterTitle}>İçindekiler listesi</strong>
          </Link>
          {numberedItems.map(({ item, page }) => {
            const active = item.structureItemId === activeStructureItemId;
            return (
              <Link
                className={styles.chapter}
                data-active={active ? "true" : "false"}
                href={`${publishedBookItemHref(workSlug, item)}?from=${encodedReturnTo}`}
                key={item.structureItemId}
              >
                <span className={styles.number}>{itemLabel(item)}</span>
                <strong className={styles.chapterTitle}>{item.title}</strong>
                <span className={styles.number}>s. {page}</span>
                {active ? <span className={styles.current}>Şu an</span> : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </details>
  );
}
