"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { writerContent } from "@/content";
import {
  PUBLICATION_LAYOUT_INPUT_NAME,
  PUBLICATION_LAYOUT_VERSION,
  type PublicationBox,
  type PublicationFont,
  type PublicationLayoutSnapshot,
} from "@/features/works/publication-layout";

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
  const subtitle =
    canvas?.querySelector<HTMLElement>(":scope > .writer-subtitle") ?? null;

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

function finiteCssNumber(value: string, fallback = 0) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function relativeBox(
  element: HTMLElement,
  page: HTMLElement,
): PublicationBox {
  const pageRect = page.getBoundingClientRect();
  const rect = element.getBoundingClientRect();

  return {
    height: rect.height,
    left: rect.left - pageRect.left,
    top: rect.top - pageRect.top,
    width: rect.width,
  };
}

function writerFont(): PublicationFont {
  const value = document.querySelector<HTMLSelectElement>(
    'select[aria-label="Yazı tipi"]',
  )?.value;

  return value === "serif" || value === "sans" || value === "typewriter"
    ? value
    : "typewriter";
}

function capturePublicationLayout(target: EditorTarget) {
  const pageTextareas = Array.from(
    target.canvas.querySelectorAll<HTMLTextAreaElement>(
      ".writer-manuscript-pages .writer-page-textarea",
    ),
  );
  const probes = Array.from(
    target.canvas.querySelectorAll<HTMLTextAreaElement>(
      ".writer-page-probes .writer-page-textarea--probe",
    ),
  );
  const firstProbe = probes[0];
  const continuationProbe = probes[1];
  const firstPage = firstProbe?.closest<HTMLElement>(".writer-manuscript-page");
  const continuationPage = continuationProbe?.closest<HTMLElement>(
    ".writer-manuscript-page",
  );

  if (
    !target.body.value ||
    pageTextareas.length === 0 ||
    !firstProbe ||
    !continuationProbe ||
    !firstPage ||
    !continuationPage
  ) {
    return "";
  }

  const joined = pageTextareas.map((textarea) => textarea.value).join("");
  if (joined !== target.body.value) return "";

  let end = 0;
  const pageEnds = pageTextareas.map((textarea) => {
    end += textarea.value.length;
    return end;
  });
  if (pageEnds.at(-1) !== target.body.value.length) return "";

  const pageRect = firstPage.getBoundingClientRect();
  const continuationPageRect = continuationPage.getBoundingClientRect();
  if (
    pageRect.width <= 0 ||
    pageRect.height <= 0 ||
    continuationPageRect.width <= 0 ||
    continuationPageRect.height <= 0
  ) {
    return "";
  }

  const textStyle = window.getComputedStyle(firstProbe);
  const fontSize = finiteCssNumber(textStyle.fontSize);
  const lineHeight = finiteCssNumber(textStyle.lineHeight);
  const letterSpacing =
    textStyle.letterSpacing === "normal"
      ? 0
      : finiteCssNumber(textStyle.letterSpacing);

  if (fontSize <= 0 || lineHeight <= 0) return "";

  const layout: PublicationLayoutSnapshot = {
    version: PUBLICATION_LAYOUT_VERSION,
    contentLength: target.body.value.length,
    pageEnds,
    page: {
      height: pageRect.height,
      width: pageRect.width,
      firstBody: relativeBox(firstProbe, firstPage),
      continuationBody: relativeBox(continuationProbe, continuationPage),
    },
    typography: {
      font: writerFont(),
      fontSize,
      letterSpacing,
      lineHeight,
    },
  };

  return JSON.stringify(layout);
}

function syncPublicationLayoutInputs(layout: string) {
  if (!layout) return;

  const forms = new Set<HTMLFormElement>();
  const writerForm = document.querySelector<HTMLFormElement>("form.writer-screen");
  if (writerForm) forms.add(writerForm);
  document
    .querySelectorAll<HTMLFormElement>(".publish-preview form")
    .forEach((form) => forms.add(form));

  for (const form of forms) {
    let input = form.querySelector<HTMLInputElement>(
      `input[name="${PUBLICATION_LAYOUT_INPUT_NAME}"]`,
    );
    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = PUBLICATION_LAYOUT_INPUT_NAME;
      form.append(input);
    }
    input.value = layout;
  }
}

export function WriterPagedManuscriptEnhancer() {
  const snapshot = useSyncExternalStore(
    subscribeEditorDom,
    getEditorSnapshot,
    getServerSnapshot,
  );
  const target = getEditorTarget();
  const [publicationLayout, setPublicationLayout] = useState("");

  useEffect(() => {
    if (!target || snapshot === "writer-editor-unavailable") return;

    let frame = window.requestAnimationFrame(() => {
      frame = window.requestAnimationFrame(() => {
        const nextLayout = capturePublicationLayout(target);
        if (nextLayout) setPublicationLayout(nextLayout);
      });
    });

    return () => window.cancelAnimationFrame(frame);
  }, [snapshot, target]);

  useEffect(() => {
    syncPublicationLayoutInputs(publicationLayout);
    const observer = new MutationObserver(() => {
      syncPublicationLayoutInputs(publicationLayout);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });
    return () => observer.disconnect();
  }, [publicationLayout]);

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
