"use client";

import { useEffect } from "react";

import {
  parsePublicationLayout,
  PUBLICATION_LAYOUT_INPUT_NAME,
  PUBLICATION_LAYOUT_VERSION,
  type PublicationBox,
  type PublicationFont,
  type PublicationLayoutSnapshot,
} from "@/features/works/publication-layout";

type EditorTarget = {
  canvas: HTMLElement;
  body: HTMLTextAreaElement;
};

const PUBLICATION_LAYOUT_STORAGE_PREFIX =
  "ilkoku.writer.publication-layout.v1";

function getEditorTarget(): EditorTarget | null {
  if (typeof document === "undefined") return null;

  const canvas = document.querySelector<HTMLElement>(".writer-canvas");
  const body = canvas?.querySelector<HTMLTextAreaElement>(
    ":scope > .writer-textarea",
  );

  if (!canvas || !body) return null;
  return { body, canvas };
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

function captureCurrentPublicationLayout(target: EditorTarget) {
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

function isWriterForm(target: EventTarget | null): target is HTMLFormElement {
  return (
    target instanceof HTMLFormElement && target.matches("form.writer-screen")
  );
}

function isPreviewPublishForm(
  target: EventTarget | null,
): target is HTMLFormElement {
  return (
    target instanceof HTMLFormElement && target.matches(".publish-preview form")
  );
}

function captureForWriterForm(form: HTMLFormElement) {
  const target = getEditorTarget();
  if (!target || !form.contains(target.canvas)) return "";
  return captureCurrentPublicationLayout(target);
}

function formValue(form: HTMLFormElement, name: string) {
  const field = form.elements.namedItem(name);
  if (
    field instanceof HTMLInputElement ||
    field instanceof HTMLTextAreaElement
  ) {
    return field.value;
  }
  return "";
}

function formContent(form: HTMLFormElement) {
  return formValue(form, "content");
}

function existingPublicationLayout(form: HTMLFormElement) {
  return (
    form.querySelector<HTMLInputElement>(
      `input[name="${PUBLICATION_LAYOUT_INPUT_NAME}"]`,
    )?.value ?? ""
  );
}

function contentFingerprint(content: string) {
  let hash = 0xcbf29ce484222325n;
  const prime = 0x100000001b3n;
  const mask = 0xffffffffffffffffn;

  for (let index = 0; index < content.length; index += 1) {
    hash ^= BigInt(content.charCodeAt(index));
    hash = (hash * prime) & mask;
  }

  return hash.toString(16).padStart(16, "0");
}

function storageKey(form: HTMLFormElement, content: string) {
  const workId = formValue(form, "workId");
  const chapterId = formValue(form, "chapterId");
  if (!workId || !chapterId || !content) return "";

  return [
    PUBLICATION_LAYOUT_STORAGE_PREFIX,
    workId,
    chapterId,
    content.length,
    contentFingerprint(content),
  ].join(":");
}

function isValidLayout(layout: string, content: string) {
  return Boolean(layout && parsePublicationLayout(layout, content));
}

function readPersistedLayout(form: HTMLFormElement, content: string) {
  const key = storageKey(form, content);
  if (!key) return "";

  try {
    const layout = window.sessionStorage.getItem(key) ?? "";
    return isValidLayout(layout, content) ? layout : "";
  } catch {
    return "";
  }
}

function persistLayout(form: HTMLFormElement, layout: string, content: string) {
  if (!isValidLayout(layout, content)) return;

  const key = storageKey(form, content);
  if (!key) return;

  try {
    window.sessionStorage.setItem(key, layout);
  } catch {
    // Session storage is only a resilience layer; publication can continue
    // with the in-memory/form snapshot when storage is unavailable.
  }
}

function resolvePublicationLayout(
  form: HTMLFormElement,
  rememberedLayout: string,
  freshLayout = "",
) {
  const content = formContent(form);
  if (!content) return "";

  for (const candidate of [
    freshLayout,
    rememberedLayout,
    existingPublicationLayout(form),
    readPersistedLayout(form, content),
  ]) {
    if (isValidLayout(candidate, content)) {
      return candidate;
    }
  }

  return "";
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

export function WriterPublicationSnapshotGuard() {
  useEffect(() => {
    let lastPublicationLayout = "";

    function rememberCurrentWriterLayout() {
      const form = document.querySelector<HTMLFormElement>("form.writer-screen");
      if (!form) return;

      const freshLayout = captureForWriterForm(form);
      const layout = resolvePublicationLayout(
        form,
        lastPublicationLayout,
        freshLayout,
      );

      if (!layout) return;

      lastPublicationLayout = layout;
      setPublicationLayoutInput(form, layout);
      persistLayout(form, layout, formContent(form));
    }

    function rememberBeforeEditorTransition(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest("form.writer-screen")) return;
      rememberCurrentWriterLayout();
    }

    function prepareBeforeReactSubmit(event: SubmitEvent) {
      if (isWriterForm(event.target)) {
        const freshLayout = captureForWriterForm(event.target);
        const layout = resolvePublicationLayout(
          event.target,
          lastPublicationLayout,
          freshLayout,
        );

        if (layout) {
          lastPublicationLayout = layout;
          persistLayout(event.target, layout, formContent(event.target));
        }

        setPublicationLayoutInput(event.target, layout);
        return;
      }

      if (!isPreviewPublishForm(event.target)) return;

      const layout = resolvePublicationLayout(
        event.target,
        lastPublicationLayout,
      );

      if (!layout) {
        event.preventDefault();
        window.alert(
          "Yayın yapılmadı: yazarın kitap sayfa snapshot'ı doğrulanamadı. Önizlemeden editöre dönüp sayfaların görünmesini bekledikten sonra yeniden Yayınla.",
        );
        return;
      }

      lastPublicationLayout = layout;
      setPublicationLayoutInput(event.target, layout);
      persistLayout(event.target, layout, formContent(event.target));
    }

    function bindLayoutToFormData(event: Event) {
      const formDataEvent = event as FormDataEvent;

      if (isWriterForm(event.target)) {
        const freshLayout = captureForWriterForm(event.target);
        const layout = resolvePublicationLayout(
          event.target,
          lastPublicationLayout,
          freshLayout,
        );

        if (layout) {
          lastPublicationLayout = layout;
          persistLayout(event.target, layout, formContent(event.target));
        }

        formDataEvent.formData.set(PUBLICATION_LAYOUT_INPUT_NAME, layout);
        setPublicationLayoutInput(event.target, layout);
        return;
      }

      if (!isPreviewPublishForm(event.target)) return;

      const layout = resolvePublicationLayout(
        event.target,
        lastPublicationLayout,
      );
      formDataEvent.formData.set(PUBLICATION_LAYOUT_INPUT_NAME, layout);
      setPublicationLayoutInput(event.target, layout);

      if (layout) {
        lastPublicationLayout = layout;
        persistLayout(event.target, layout, formContent(event.target));
      }
    }

    document.addEventListener("click", rememberBeforeEditorTransition, true);
    document.addEventListener("submit", prepareBeforeReactSubmit, true);
    document.addEventListener("formdata", bindLayoutToFormData, true);

    return () => {
      document.removeEventListener("click", rememberBeforeEditorTransition, true);
      document.removeEventListener("submit", prepareBeforeReactSubmit, true);
      document.removeEventListener("formdata", bindLayoutToFormData, true);
    };
  }, []);

  return null;
}
