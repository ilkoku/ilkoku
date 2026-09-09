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
          <strong>Kitap sırası</strong>
          <small>Yazarın yayımladığı sayfa ve bölümlere doğrudan geç.</small>
        </header>

        <nav aria-label="Yayımlanmış kitap sırası" className={styles.list}>
          {items.map((item) => {
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
                {active ? <span className={styles.current}>Şu an</span> : null}
              </Link>
            );
          })}
        </nav>
      </div>
    </details>
  );
}
