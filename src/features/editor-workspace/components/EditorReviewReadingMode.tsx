import type { ReactNode } from "react";

import styles from "./EditorReviewReadingMode.module.css";

export function EditorReviewReadingMode({
  children,
  stage,
  variant,
}: {
  children: ReactNode;
  stage: "first" | "second";
  variant: "chapter" | "showcase";
}) {
  return (
    <div
      className={styles.root}
      data-review-stage={stage}
      data-review-variant={variant}
    >
      {children}

      <aside className={styles.notice} aria-label="Editör inceleme modu">
        <span>Bağımsız inceleme modu</span>
        <strong>
          {stage === "second" ? "2. Editör" : "1. Editör"}
        </strong>
        <small>
          Okur yorumları, beğeniler ve sosyal yönlendirmeler gizlidir.
        </small>
      </aside>
    </div>
  );
}
