"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { feedbackContent } from "@/content";
import type {
  FeedbackItem,
  ProfessionalReviewGroup,
} from "../types";

type Props = {
  group: ProfessionalReviewGroup;
  onClose: () => void;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(new Date(value));
}

function stageOrder(item: FeedbackItem) {
  if (item.reviewStage === "first") return 1;
  if (item.reviewStage === "second") return 2;
  return 3;
}

function stageLabel(item: FeedbackItem) {
  if (item.reviewStage === "first") return "1. Editör Raporu";
  if (item.reviewStage === "second") return "2. Editör Raporu";
  return "Profesyonel Editör Raporu";
}

function categoryLabel(item: FeedbackItem) {
  return feedbackContent.categories[item.category] ?? item.category;
}

export function ProfessionalReviewGroupDialog({
  group,
  onClose,
}: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  const reports = useMemo(
    () =>
      [...group.reports].sort(
        (first, second) => stageOrder(first) - stageOrder(second),
      ),
    [group.reports],
  );

  const hasSecondReport = reports.some(
    (report) => report.reviewStage === "second",
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused =
      document.activeElement as HTMLElement | null;

    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();

      if (
        event.key !== "Tab" ||
        !dialogRef.current
      ) {
        return;
      }

      const focusable = [
        ...dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ),
      ];

      const first = focusable[0];
      const last = focusable.at(-1);

      if (
        event.shiftKey &&
        document.activeElement === first
      ) {
        event.preventDefault();
        last?.focus();
      }

      if (
        !event.shiftKey &&
        document.activeElement === last
      ) {
        event.preventDefault();
        first?.focus();
      }
    }

    document.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div
      className="feedback-dialog-layer"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) {
          onClose();
        }
      }}
    >
      <div
        className="feedback-dialog feedback-professional-dialog"
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="professional-review-dialog-title"
      >
        <header className="feedback-dialog__header">
          <div>
            <p>
              {hasSecondReport
                ? "İki bağımsız editör raporu"
                : "Profesyonel editör incelemesi"}
            </p>
            <h2 id="professional-review-dialog-title">
              {group.work.title}
            </h2>
          </div>

          <button
            ref={closeRef}
            className="feedback-dialog__close"
            onClick={onClose}
            type="button"
            aria-label={feedbackContent.actions.close}
          >
            ×
          </button>
        </header>

        <div className="feedback-professional-dialog__body">
          <div className="feedback-professional-dialog__intro">
            <strong>
              {hasSecondReport
                ? "İki bağımsız editör raporu"
                : "Profesyonel editör raporu"}
            </strong>

            <p>
              {hasSecondReport
                ? "Eseriniz birbirinden bağımsız iki platform editörü tarafından değerlendirilmiştir."
                : "Eseriniz bir platform editörü tarafından değerlendirilmiştir."}
            </p>
          </div>

          <div className="feedback-professional-dialog__reports">
          {reports.map((report) => (
            <article key={report.id}>
              <header>
                <div>
                  <span>{stageLabel(report)}</span>
                  <h3>{report.title}</h3>
                </div>

                <time dateTime={report.createdAt}>
                  {formatDate(report.createdAt)}
                </time>
              </header>

              <dl>
                <div>
                  <dt>Editör</dt>
                  <dd>{report.editorName}</dd>
                </div>

                <div>
                  <dt>Değerlendirme alanı</dt>
                  <dd>{categoryLabel(report)}</dd>
                </div>

                <div>
                  <dt>Öncelik</dt>
                  <dd>{feedbackContent.priority[report.priority]}</dd>
                </div>
              </dl>

              <div>
                {report.content
                  .split(/\n{2,}/u)
                  .map((paragraph) => (
                    <p key={paragraph}>{paragraph}</p>
                  ))}
              </div>
            </article>
          ))}
          </div>
        </div>

        <footer className="feedback-dialog__actions">
          <Link
            className="button button--primary"
            href="/eserlerim"
          >
            {feedbackContent.actions.openWork}
          </Link>

          <Button onClick={onClose} variant="secondary">
            {feedbackContent.actions.close}
          </Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
