"use client";

import { useEffect } from "react";

import {
  BOOK_PUBLICATION_LAYOUT_INPUT_NAME,
} from "@/features/works/book-publication";
import { prepareBookForPublicationAction } from "@/features/works/book-structure-actions";
import { measureBookPublicationLayouts } from "../book-publication-measurement";

function isWriterForm(target: EventTarget | null): target is HTMLFormElement {
  return target instanceof HTMLFormElement && target.matches("form.writer-screen");
}

function isPreviewForm(target: EventTarget | null): target is HTMLFormElement {
  return target instanceof HTMLFormElement && target.matches(".publish-preview form");
}

function isWriterPublish(event: SubmitEvent) {
  return (
    isWriterForm(event.target) &&
    event.submitter instanceof HTMLButtonElement &&
    !event.submitter.classList.contains("writer-save-button")
  );
}

function setBookPublicationInput(form: HTMLFormElement, value: string) {
  let input = form.querySelector<HTMLInputElement>(
    `input[name="${BOOK_PUBLICATION_LAYOUT_INPUT_NAME}"]`,
  );

  if (!input) {
    input = document.createElement("input");
    input.type = "hidden";
    input.name = BOOK_PUBLICATION_LAYOUT_INPUT_NAME;
    form.append(input);
  }

  input.value = value;
}

function previewButtonFromEvent(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) return null;

  const button = target.closest<HTMLButtonElement>(
    "form.writer-screen .writer-toolbar__actions button[type=\"button\"]",
  );
  if (!button) return null;

  return button.textContent?.includes("Önizleme") ? button : null;
}

export function WriterFullBookPublicationEnhancer() {
  useEffect(() => {
    let cachedPublicationInput = "";
    const submitBypass = new WeakSet<HTMLFormElement>();
    const previewButtonBypass = new WeakSet<HTMLButtonElement>();

    async function prepareBookPublication(form: HTMLFormElement) {
      const workId =
        form.querySelector<HTMLInputElement>('input[name="workId"]')?.value ?? "";
      const workTitle =
        form.querySelector<HTMLInputElement>('input[name="workTitle"]')?.value ??
        form.querySelector<HTMLInputElement>(".writer-work-title")?.value ??
        "";

      if (!workId || !workTitle) {
        return {
          ok: false as const,
          message: "Tam kitap yayını için eser bilgileri hazırlanamadı.",
        };
      }

      const prepared = await prepareBookForPublicationAction(workId);
      if (prepared.status !== "success" || !prepared.items) {
        return {
          ok: false as const,
          message: prepared.message,
        };
      }

      const measured = await measureBookPublicationLayouts(
        form,
        workTitle,
        prepared.items,
      );
      if (!measured) {
        return {
          ok: false as const,
          message:
            "Kitabın ek sayfalarının fiziksel sayfa düzeni hazırlanamadı. Sayfalar yüklendikten sonra yeniden yayınla.",
        };
      }

      const encoded = JSON.stringify(measured);
      cachedPublicationInput = encoded;
      setBookPublicationInput(form, encoded);

      return { ok: true as const, value: encoded };
    }

    async function prepareBeforePreview(button: HTMLButtonElement) {
      const form = button.closest<HTMLFormElement>("form.writer-screen");
      if (!form) return;

      const prepared = await prepareBookPublication(form);
      if (!prepared.ok) {
        window.alert(prepared.message);
        return;
      }

      previewButtonBypass.add(button);
      button.click();
    }

    function handlePreviewClick(event: MouseEvent) {
      const button = previewButtonFromEvent(event);
      if (!button) return;

      if (previewButtonBypass.has(button)) {
        previewButtonBypass.delete(button);
        return;
      }

      event.preventDefault();
      event.stopImmediatePropagation();
      void prepareBeforePreview(button);
    }

    function handleSubmit(event: SubmitEvent) {
      if (isPreviewForm(event.target)) {
        if (cachedPublicationInput) {
          setBookPublicationInput(event.target, cachedPublicationInput);
        }
        return;
      }

      if (!isWriterPublish(event) || !(event.target instanceof HTMLFormElement)) {
        return;
      }

      const form = event.target;
      if (submitBypass.has(form)) {
        submitBypass.delete(form);
        return;
      }

      const submitter = event.submitter;
      if (!(submitter instanceof HTMLButtonElement)) return;

      event.preventDefault();
      event.stopImmediatePropagation();

      void (async () => {
        const prepared = await prepareBookPublication(form);
        if (!prepared.ok) {
          window.alert(prepared.message);
          return;
        }

        submitBypass.add(form);
        form.requestSubmit(submitter);
      })();
    }

    function bindPreviewFormInput(event: Event) {
      const formDataEvent = event as FormDataEvent;
      if (!isPreviewForm(event.target) || !cachedPublicationInput) return;

      setBookPublicationInput(event.target, cachedPublicationInput);
      formDataEvent.formData.set(
        BOOK_PUBLICATION_LAYOUT_INPUT_NAME,
        cachedPublicationInput,
      );
    }

    document.addEventListener("click", handlePreviewClick, true);
    document.addEventListener("submit", handleSubmit, true);
    document.addEventListener("formdata", bindPreviewFormInput, true);

    return () => {
      document.removeEventListener("click", handlePreviewClick, true);
      document.removeEventListener("submit", handleSubmit, true);
      document.removeEventListener("formdata", bindPreviewFormInput, true);
    };
  }, []);

  return null;
}
