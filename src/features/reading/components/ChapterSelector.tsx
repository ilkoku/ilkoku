import Link from "next/link";

import styles from "./ChapterSelector.module.css";

type ChapterSelectorItem = {
  id: string;
  position: number;
  title: string;
};

export function ChapterSelector({
  activePosition,
  chapters,
  encodedReturnTo,
  readingProgress,
  workSlug,
  workTitle,
}: {
  activePosition: number;
  chapters: ChapterSelectorItem[];
  encodedReturnTo: string;
  readingProgress?: number | null;
  workSlug: string;
  workTitle: string;
}) {
  return (
    <details className={styles.selector}>
      <summary aria-label="Bölüm seç">
        <strong className={styles.title}>{workTitle}</strong>
        <span aria-hidden="true">·</span>
        <span>{activePosition}. Bölüm</span>
        {typeof readingProgress === "number" ? (
          <>
            <span aria-hidden="true">·</span>
            <span className={styles.progress}>%{readingProgress} okundu</span>
          </>
        ) : null}
        <span aria-hidden="true" className={styles.chevron}>⌄</span>
      </summary>

      <div className={styles.popover}>
        <header className={styles.heading}>
          <strong>Bölümler</strong>
          <small>Okumak istediğin bölüme doğrudan geç.</small>
        </header>

        <nav aria-label="Eser bölümleri" className={styles.list}>
          {chapters.map((item) => {
            const active = item.position === activePosition;
            return (
              <Link
                className={styles.chapter}
                data-active={active ? "true" : "false"}
                href={`/oku/${workSlug}/bolum-${item.position}?from=${encodedReturnTo}`}
                key={item.id}
              >
                <span className={styles.number}>{item.position}. Bölüm</span>
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
