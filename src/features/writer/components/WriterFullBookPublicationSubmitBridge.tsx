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

function publicationLayoutFromFullBook(form: HTMLFormElement) {
  const chapterId =
    form.querySelector<HTMLInputElement>('input[name="chapterId"]')?.value ?? "";
  const content =
    form.querySelector<HTMLInputElement>('input[name="content"]')?.value ?? "";
  const book = getWriterBookPublicationPreview();

  const chapter = book?.items.find(
    (item) => item.type === "chapter" && item.chapterId === chapterId,
  );

  if (!chapter || chapter.content !== content) return "";
  return JSON.stringify(chapter.layout);
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
  const layout = publicationLayoutFromFullBook(form);
  if (!layout) return "";

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

      const layout = hydratePreviewForm(event.target);
      if (layout) {
        formDataEvent.formData.set(PUBLICATION_LAYOUT_INPUT_NAME, layout);
      } else {
        formDataEvent.formData.delete(PUBLICATION_LAYOUT_INPUT_NAME);
      }
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
