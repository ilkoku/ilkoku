"use client";

import { useState, type SyntheticEvent } from "react";
import styles from "./ProtectedChapterContent.module.css";

const watermarkCopies = Array.from(
  { length: 48 },
  (_, index) => index,
);

export function ProtectedChapterContent({
  chapterId,
  identity,
  paragraphs,
}: {
  chapterId: string;
  identity: string;
  paragraphs: string[];
}) {
  const [noticeVisible, setNoticeVisible] =
    useState(false);

  function blockInteraction(
    event: SyntheticEvent<HTMLDivElement>,
  ) {
    event.preventDefault();
    setNoticeVisible(true);
  }

  return (
    <div
      className={styles.protectedChapter}
      draggable={false}
      onContextMenu={blockInteraction}
      onCopy={blockInteraction}
      onCut={blockInteraction}
      onDragStart={blockInteraction}
    >
      <div
        aria-hidden="true"
        className={styles.watermarkLayer}
      >
        {watermarkCopies.map((copy) => (
          <span key={copy}>
            {identity} · İlkOku güvenli okuma
          </span>
        ))}
      </div>

      <div className={`chapter__body ${styles.content}`}>
        {paragraphs.map((paragraph, index) => (
          <p key={`${chapterId}-${index}`}>
            {paragraph}
          </p>
        ))}
      </div>

      {noticeVisible ? (
        <p
          aria-live="polite"
          className={styles.notice}
          role="status"
        >
          Eser metninin kopyalanması ve dışarı aktarılması
          güvenlik nedeniyle kapalıdır.
        </p>
      ) : null}

      <p className={styles.printMessage}>
        Bu eser metni İlkOku güvenli okuma alanından
        yazdırılamaz.
      </p>
    </div>
  );
}
