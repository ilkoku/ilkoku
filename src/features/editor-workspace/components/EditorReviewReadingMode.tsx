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
    </div>
  );
}
