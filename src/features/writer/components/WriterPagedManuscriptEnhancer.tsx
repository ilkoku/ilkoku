"use client";

import { useEffect, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { writerContent } from "@/content";

import { PagedManuscriptEditor } from "./PagedManuscriptEditor";

type EditorTarget = {
  canvas: HTMLElement;
  workTitle: HTMLInputElement;
  chapterTitle: HTMLInputElement;
  body: HTMLTextAreaElement;
  subtitle: HTMLElement | null;
};

function getEditorTarget(): EditorTarget | null {
  if (typeof document === "undefined") {
    return null;
  }

  const canvas = document.querySelector<HTMLElement>(".writer-canvas");
  const workTitle = canvas?.querySelector<HTMLInputElement>(
    ":scope > .writer-work-title",
  );
  const chapterTitle = canvas?.querySelector<HTMLInputElement>(
    ":scope > .writer-title",
  );
  const body = canvas?.querySelector<HTMLTextAreaElement>(
    ":scope > .writer-textarea",
  );
  const subtitle = canvas?.querySelector<HTMLElement>(
    ":scope > .writer-subtitle",
  );

  if (!canvas || !workTitle || !chapterTitle || !body) {
    return null;
  }

  return {
    canvas,
    workTitle,
    chapterTitle,
    body,
    subtitle,
  };
}

function getEditorSnapshot() {
  const target = getEditorTarget();

  if (!target) {
    return "writer-editor-unavailable";
  }

  return [
    target.workTitle.value,
    target.chapterTitle.value,
    target.body.value,
    target.subtitle?.textContent ?? "",
  ].join("\u0000");
}

function getServerSnapshot() {
  return "writer-editor-unavailable";
}

function subscribeEditorDom(onStoreChange: () => void) {
  if (typeof document === "undefined") {
    return () => undefined;
  }

  let scheduledFrame: number | null = null;

  const scheduleChange = () => {
    if (scheduledFrame !== null) {
      window.cancelAnimationFrame(scheduledFrame);
    }

    scheduledFrame = window.requestAnimationFrame(() => {
      scheduledFrame = null;
      onStoreChange();
    });
  };

  const observer = new MutationObserver(scheduleChange);
  observer.observe(document.body, {
    childList: true,
    subtree: true,
  });

  document.addEventListener("input", scheduleChange, true);
  document.addEventListener("change", scheduleChange, true);
  document.addEventListener("click", scheduleChange, true);

  return () => {
    observer.disconnect();
    document.removeEventListener("input", scheduleChange, true);
    document.removeEventListener("change", scheduleChange, true);
    document.removeEventListener("click", scheduleChange, true);

    if (scheduledFrame !== null) {
      window.cancelAnimationFrame(scheduledFrame);
    }
  };
}

function setNativeValue(
  element: HTMLInputElement | HTMLTextAreaElement,
  value: string,
) {
  const prototype =
    element instanceof HTMLTextAreaElement
      ? HTMLTextAreaElement.prototype
      : HTMLInputElement.prototype;
  const descriptor = Object.getOwnPropertyDescriptor(prototype, "value");

  descriptor?.set?.call(element, value);
  element.dispatchEvent(new Event("input", { bubbles: true }));
  element.dispatchEvent(new Event("change", { bubbles: true }));
}

export function WriterPagedManuscriptEnhancer() {
  const snapshot = useSyncExternalStore(
    subscribeEditorDom,
    getEditorSnapshot,
    getServerSnapshot,
  );
  const target = getEditorTarget();
  const canvas = target?.canvas ?? null;

  useEffect(() => {
    if (!canvas) {
      return;
    }

    canvas.dataset.writerPaged = "true";

    return () => {
      delete canvas.dataset.writerPaged;
    };
  }, [canvas]);

  if (!target || snapshot === "writer-editor-unavailable") {
    return null;
  }

  return createPortal(
    <PagedManuscriptEditor
      workTitle={target.workTitle.value}
      chapterTitle={target.chapterTitle.value}
      subtitle={target.subtitle?.textContent ?? ""}
      content={target.body.value}
      workTitleLabel={writerContent.create.titleLabel}
      chapterTitleLabel={writerContent.editor.chapterTitleLabel}
      bodyLabel={writerContent.editor.bodyLabel}
      bodyPlaceholder={writerContent.editor.bodyPlaceholder}
      onWorkTitleChange={(value) => setNativeValue(target.workTitle, value)}
      onChapterTitleChange={(value) =>
        setNativeValue(target.chapterTitle, value)
      }
      onContentChange={(value) => setNativeValue(target.body, value)}
    />,
    target.canvas,
  );
}
