"use client";

import { useEffect } from "react";

import {
  BOOK_PUBLICATION_LAYOUT_INPUT_NAME,
} from "@/features/works/book-publication";
import { prepareFullBookPublicationAction } from "@/features/works/prepare-full-book-publication-action";
import { measureBookPublicationLayouts } from "../book-publication-measurement";

const DRAFT_SAVE_TIMEOUT_MS = 30_000;

type DraftSaveResult =
  | { ok: true }
  | { ok: false; message: string };

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

function previewButtonFromForm(form: HTMLFormElement) {
  const buttons = form.querySelectorAll<HTMLButtonElement>(
    '.writer-toolbar__actions button[type="button"]',
  );

  return (
    [...buttons].find((button) => button.textContent?.includes("Önizleme")) ??
    null
  );
}

function previewButtonFromEvent(event: MouseEvent) {
  const target = event.target;
  if (!(target instanceof Element)) return null;

  const form = target.closest<HTMLFormElement>("form.writer-screen");
  if (!form) return null;

  const button = target.closest<HTMLButtonElement>(
    '.writer-toolbar__actions button[type="button"]',
  );
  if (!button || !button.textContent?.includes("Önizleme")) return null;

  return button;
}

function readDraftSaveState(form: HTMLFormElement) {
  return (
    form.querySelector<HTMLElement>(".writer-save-status")?.dataset.state ?? ""
  );
}

function readDraftSaveError(form: HTMLFormElement) {
  return (
    form
      .querySelector<HTMLElement>('.work-action-message[data-state="error"]')
      ?.textContent?.trim() ?? ""
  );
}

function waitForDraftSave(form: HTMLFormElement): Promise<DraftSaveResult> {
  return new Promise((resolve) => {
    let observedSaveMutation = false;
    let settled = false;
    let timeout = 0;

    const observer = new MutationObserver(() => {
      observedSaveMutation = true;
      check();
    });

    function finish(result: DraftSaveResult) {
      if (settled) return;
      settled = true;
      observer.disconnect();
      window.clearTimeout(timeout);
      resolve(result);
    }

    function check() {
      if (!document.contains(form)) {
        finish({
          ok: false,
          message: "Taslak kaydı tamamlanmadan editör kapandı.",
        });
        return;
      }

      if (readDraftSaveState(form) === "kaydedildi") {
        finish({ ok: true });
        return;
      }

      const errorMessage = readDraftSaveError(form);
      if (observedSaveMutation && errorMessage) {
        finish({ ok: false, message: errorMessage });
      }
    }

    observer.observe(form, {
      attributes: true,
      characterData: true,
      childList: true,
      subtree: true,
    });

    timeout = window.setTimeout(() => {
      finish({
        ok: false,
        message:
          "Taslak kaydı beklenenden uzun sürdü. Yayın önizlemesine geçmeden önce yeniden kaydet.",
      });
    }, DRAFT_SAVE_TIMEOUT_MS);

    check();
  });
}

async function ensureDraftSaved(form: HTMLFormElement): Promise<DraftSaveResult> {
  const saveState = readDraftSaveState(form);
  if (saveState === "kaydedildi") return { ok: true };

  if (!form.reportValidity()) {
    return {
      ok: false,
      message: "Yayın öncesi gerekli eser bilgilerini tamamla.",
    };
  }

  const saveButton = form.querySelector<HTMLButtonElement>(
    ".writer-save-button",
  );

  if (!saveButton) {
    return {
      ok: false,
      message: "Yayın öncesi taslak kaydetme düğmesi bulunamadı.",
    };
  }

  const pendingSave = waitForDraftSave(form);

  if (saveState !== "kaydediliyor" && !saveButton.disabled) {
    form.requestSubmit(saveButton);
  }

  return pendingSave;
}

export function WriterFullBookPublicationEnhancer() {
  useEffect(() => {
    let cachedPublicationInput = "";
    const previewButtonBypass = new WeakSet<HTMLButtonElement>();
    const finalReviewPending = new WeakSet<HTMLFormElement>();

    async function prepareBookPublication(form: HTMLFormElement) {
      const workId =
        form.querySelector<HTMLInputElement>('input[name="workId"]')?.value ?? "";
      const workTitle =
        form.querySelector<HTMLInputElement>('input[name="workTitle"]')?.value ??
        form.querySelector<HTMLInputElement>(".writer-work-title")?.value ??
        "";
      const chapterId =
        form.querySelector<HTMLInputElement>('input[name="chapterId"]')?.value ?? "";
      const chapterTitle =
        form.querySelector<HTMLInputElement>('input[name="chapterTitle"]')?.value ?? "";

      if (!workId || !workTitle || !chapterId || !chapterTitle.trim()) {
        return {
          ok: false as const,
          message: "Tam kitap yayını için eser ve bölüm bilgileri hazırlanamadı.",
        };
      }

      const prepared = await prepareFullBookPublicationAction({
        workId,
        chapterId,
        chapterTitle,
      });
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
            "Kitabın tüm fiziksel sayfa düzeni hazırlanamadı. Sayfalar yüklendikten sonra yeniden yayınla.",
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

    async function routePublishThroughFinalReview(
      form: HTMLFormElement,
      submitter: HTMLButtonElement,
    ) {
      if (finalReviewPending.has(form)) return;
      finalReviewPending.add(form);
      submitter.setAttribute("aria-busy", "true");

      try {
        const saved = await ensureDraftSaved(form);
        if (!saved.ok) {
          window.alert(saved.message);
          return;
        }

        const previewButton = previewButtonFromForm(form);
        if (!previewButton) {
          window.alert(
            "Okuyucu önizlemesi açılamadı. Editör ekranını yenileyip yeniden Yayınla.",
          );
          return;
        }

        previewButton.click();
      } finally {
        finalReviewPending.delete(form);
        if (submitter.isConnected) {
          submitter.removeAttribute("aria-busy");
        }
      }
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

      const submitter = event.submitter;
      if (!(submitter instanceof HTMLButtonElement)) return;

      event.preventDefault();
      event.stopImmediatePropagation();
      void routePublishThroughFinalReview(event.target, submitter);
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
