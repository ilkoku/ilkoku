"use client";

import { useEffect } from "react";

import { PUBLICATION_LAYOUT_INPUT_NAME } from "@/features/works/publication-layout";
import { getWriterBookPublicationPreview } from "../writer-publication-preview-store";

function isPreviewPublishForm(
  target: EventTarget | null,
): target is HTMLFormElement {
  return (
    target instanceof HTMLFormElement && target.matches(".publish-preview form")
  );
}

function publicationChapterFromFullBook(form: HTMLFormElement) {
  const chapterId =
    form.querySelector<HTMLInputElement>('input[name="chapterId"]')?.value ?? "";
  const book = getWriterBookPublicationPreview();

  if (!chapterId || !book?.items.length) return null;

  const chapter = book.items.find(
    (item) => item.type === "chapter" && item.chapterId === chapterId,
  );

  if (!chapter || chapter.layout.pageEnds.length === 0) return null;
  return chapter;
}

function setSnapshotContentInput(form: HTMLFormElement, content: string) {
  let input = form.querySelector<HTMLInputElement | HTMLTextAreaElement>(
    '[name="content"]',
  );

  if (!input) {
    const hidden = document.createElement("input");
    hidden.type = "hidden";
    hidden.name = "content";
    form.append(hidden);
    input = hidden;
  }

  input.value = content;
}

function setPublicationLayoutInput(form: HTMLFormElement, layout: string) {
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

function hydratePreviewForm(form: HTMLFormElement) {
  const chapter = publicationChapterFromFullBook(form);
  if (!chapter) return "";

  const layout = JSON.stringify(chapter.layout);
  setSnapshotContentInput(form, chapter.content);
  setPublicationLayoutInput(form, layout);
  return layout;
}

export function WriterFullBookPublicationSubmitBridge() {
  useEffect(() => {
    function hydrateMountedPreview() {
      const form = document.querySelector<HTMLFormElement>(
        ".publish-preview form",
      );
      if (form) hydratePreviewForm(form);
    }

    function handleSubmit(event: SubmitEvent) {
      if (!isPreviewPublishForm(event.target)) return;

      const layout = hydratePreviewForm(event.target);
      if (layout) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      window.alert(
        "Tam kitap okuyucu önizlemesi hazır değil. Düzenlemeye dönüp yeniden Yayınla.",
      );
    }

    function handleFormData(event: Event) {
      const formDataEvent = event as FormDataEvent;
      if (!isPreviewPublishForm(event.target)) return;

      const chapter = publicationChapterFromFullBook(event.target);
      if (!chapter) {
        formDataEvent.formData.delete(PUBLICATION_LAYOUT_INPUT_NAME);
        return;
      }

      const layout = JSON.stringify(chapter.layout);
      setSnapshotContentInput(event.target, chapter.content);
      setPublicationLayoutInput(event.target, layout);
      formDataEvent.formData.set("content", chapter.content);
      formDataEvent.formData.set(PUBLICATION_LAYOUT_INPUT_NAME, layout);
    }

    hydrateMountedPreview();

    const observer = new MutationObserver(hydrateMountedPreview);
    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    document.addEventListener("submit", handleSubmit, true);
    document.addEventListener("formdata", handleFormData, true);

    return () => {
      observer.disconnect();
      document.removeEventListener("submit", handleSubmit, true);
      document.removeEventListener("formdata", handleFormData, true);
    };
  }, []);

  return null;
}
