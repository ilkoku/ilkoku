"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { feedbackContent } from "@/content";
import type { FeedbackItem } from "../types";

type Props = { item: FeedbackItem; onClose: () => void };

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));
}

export function FeedbackDetailDialog({ item, onClose }: Props) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable = [...dialogRef.current.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])')];
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
      if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
    }
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener("keydown", onKeyDown);
      previouslyFocused?.focus();
    };
  }, [onClose]);

  return createPortal(
    <div className="feedback-dialog-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div className="feedback-dialog" ref={dialogRef} role="dialog" aria-modal="true" aria-labelledby="feedback-dialog-title">
        <header className="feedback-dialog__header">
          <div><p>{feedbackContent.labels.editorNote}</p><h2 id="feedback-dialog-title">{item.title}</h2></div>
          <button ref={closeRef} className="feedback-dialog__close" onClick={onClose} type="button" aria-label={feedbackContent.actions.close}>×</button>
        </header>
        <dl className="feedback-dialog__meta">
          <div><dt>{feedbackContent.labels.editor}</dt><dd>{item.editorName}</dd></div>
          <div><dt>{feedbackContent.labels.work}</dt><dd>{item.work.title}</dd></div>
          <div><dt>{feedbackContent.labels.chapter}</dt><dd>{item.chapter?.title ?? feedbackContent.labels.workGeneral}</dd></div>
          <div><dt>{feedbackContent.labels.category}</dt><dd>{feedbackContent.categories[item.category]}</dd></div>
          <div><dt>{feedbackContent.labels.priority}</dt><dd>{feedbackContent.priority[item.priority]}</dd></div>
          <div><dt>{feedbackContent.labels.date}</dt><dd><time dateTime={item.createdAt}>{formatDate(item.createdAt)}</time></dd></div>
        </dl>
        <div className="feedback-dialog__content"><h3>{feedbackContent.labels.generalReview}</h3><p>{item.content}</p></div>
        <footer className="feedback-dialog__actions">
          <Link className="button button--primary" href={item.chapter ? `/yazmaya-devam?eser=${item.work.id}&bolum=${item.chapter.id}` : "/eserlerim"}>
            {item.chapter ? feedbackContent.actions.openChapter : feedbackContent.actions.openWork}
          </Link>
          <Button onClick={onClose} variant="secondary">{feedbackContent.actions.close}</Button>
        </footer>
      </div>
    </div>,
    document.body,
  );
}
