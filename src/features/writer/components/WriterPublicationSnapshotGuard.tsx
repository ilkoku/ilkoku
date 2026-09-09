"use client";

import { useEffect } from "react";

import {
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

function existingPublicationLayout(form: HTMLFormElement) {
  return (
    form.querySelector<HTMLInputElement>(
      `input[name="${PUBLICATION_LAYOUT_INPUT_NAME}"]`,
    )?.value ?? ""
  );
}

function publicationLayoutMatchesContent(layout: string, content: string) {
  if (!layout) return false;

  try {
    const parsed = JSON.parse(layout) as Partial<PublicationLayoutSnapshot>;
    const lastPageEnd = Array.isArray(parsed.pageEnds)
      ? parsed.pageEnds.at(-1)
      : undefined;

    return (
      parsed.version === PUBLICATION_LAYOUT_VERSION &&
      parsed.contentLength === content.length &&
      lastPageEnd === content.length
    );
  } catch {
    return false;
  }
}

function captureForWriterForm(
  form: HTMLFormElement,
  lastPublicationLayout: string,
) {
  const target = getEditorTarget();
  if (!target || !form.contains(target.canvas)) return "";

  const captured = captureCurrentPublicationLayout(target);
  if (captured) return captured;

  const existing = existingPublicationLayout(form);
  if (publicationLayoutMatchesContent(existing, target.body.value)) {
    return existing;
  }

  return publicationLayoutMatchesContent(
    lastPublicationLayout,
    target.body.value,
  )
    ? lastPublicationLayout
    : "";
}

function previewPublicationLayout(
  form: HTMLFormElement,
  lastPublicationLayout: string,
) {
  const content =
    form.querySelector<HTMLInputElement>('input[name="content"]')?.value ?? "";
  const existing = existingPublicationLayout(form);

  if (publicationLayoutMatchesContent(lastPublicationLayout, content)) {
    return lastPublicationLayout;
  }

  return publicationLayoutMatchesContent(existing, content) ? existing : "";
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
      const target = getEditorTarget();
      if (!target) return;

      const layout = captureCurrentPublicationLayout(target);
      if (layout) lastPublicationLayout = layout;
    }

    function rememberBeforeEditorTransition(event: MouseEvent) {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (!target.closest("form.writer-screen")) return;
      rememberCurrentWriterLayout();
    }

    function prepareBeforeReactSubmit(event: SubmitEvent) {
      if (isWriterForm(event.target)) {
        const layout = captureForWriterForm(
          event.target,
          lastPublicationLayout,
        );

        if (layout) {
          lastPublicationLayout = layout;
          setPublicationLayoutInput(event.target, layout);
        }
        return;
      }

      if (!isPreviewPublishForm(event.target)) return;

      const layout = previewPublicationLayout(
        event.target,
        lastPublicationLayout,
      );

      if (!layout) {
        event.preventDefault();
        window.alert(
          "Yayın sayfa düzeni henüz hazır değil. Önizlemeden editöre dönüp sayfaların görünmesini bekledikten sonra yeniden Yayınla.",
        );
        return;
      }

      lastPublicationLayout = layout;
      setPublicationLayoutInput(event.target, layout);
    }

    function bindLayoutToFormData(event: Event) {
      const formDataEvent = event as FormDataEvent;

      if (isWriterForm(event.target)) {
        const layout = captureForWriterForm(
          event.target,
          lastPublicationLayout,
        );

        if (layout) {
          lastPublicationLayout = layout;
          formDataEvent.formData.set(PUBLICATION_LAYOUT_INPUT_NAME, layout);
          setPublicationLayoutInput(event.target, layout);
        } else {
          formDataEvent.formData.delete(PUBLICATION_LAYOUT_INPUT_NAME);
        }
        return;
      }

      if (!isPreviewPublishForm(event.target)) return;

      const layout = previewPublicationLayout(
        event.target,
        lastPublicationLayout,
      );

      if (layout) {
        lastPublicationLayout = layout;
        formDataEvent.formData.set(PUBLICATION_LAYOUT_INPUT_NAME, layout);
        setPublicationLayoutInput(event.target, layout);
      } else {
        formDataEvent.formData.delete(PUBLICATION_LAYOUT_INPUT_NAME);
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
