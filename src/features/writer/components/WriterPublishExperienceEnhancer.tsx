"use client";

import Link from "next/link";
import { useMemo, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";

import { writerContent } from "@/content";
import { PublishedManuscriptViewport } from "@/features/reading/components/PublishedManuscriptViewport";
import {
  PUBLICATION_LAYOUT_INPUT_NAME,
  parsePublicationLayout,
} from "@/features/works/publication-layout";

type PreviewSnapshot = {
  mode: "preview";
  chapterTitle: string;
  content: string;
  layout: string;
  workTitle: string;
};

type SuccessSnapshot = {
  mode: "success";
};

type PublishExperienceSnapshot = PreviewSnapshot | SuccessSnapshot;

const EMPTY_SNAPSHOT = "";

function readPreviewSnapshot(): PreviewSnapshot | null {
  const preview = document.querySelector<HTMLElement>(
    ".publish-preview .preview-article",
  );

  if (!preview) return null;

  const chapterTitle =
    preview.querySelector<HTMLElement>(":scope > h1")?.textContent?.trim() ?? "";
  const workTitle =
    preview.querySelector<HTMLElement>(":scope > span")?.textContent?.trim() ?? "";
  const content =
    preview.querySelector<HTMLElement>(":scope > .preview-article__body")?.textContent ?? "";
  const layout =
    document.querySelector<HTMLInputElement>(
      `.publish-preview form input[name="${PUBLICATION_LAYOUT_INPUT_NAME}"]`,
    )?.value ?? "";

  return {
    mode: "preview",
    chapterTitle,
    content,
    layout,
    workTitle,
  };
}

function getPublishExperienceSnapshot() {
  if (typeof document === "undefined") return EMPTY_SNAPSHOT;

  const preview = readPreviewSnapshot();
  if (preview) return JSON.stringify(preview);

  if (document.querySelector(".publish-success__content")) {
    return JSON.stringify({ mode: "success" } satisfies SuccessSnapshot);
  }

  return EMPTY_SNAPSHOT;
}

function getServerSnapshot() {
  return EMPTY_SNAPSHOT;
}

function subscribePublishExperience(onStoreChange: () => void) {
  if (typeof document === "undefined") return () => undefined;

  let frame = 0;
  let secondFrame = 0;

  const schedule = () => {
    window.cancelAnimationFrame(frame);
    window.cancelAnimationFrame(secondFrame);
    onStoreChange();
    frame = window.requestAnimationFrame(() => {
      onStoreChange();
      secondFrame = window.requestAnimationFrame(onStoreChange);
    });
  };

  const observer = new MutationObserver(schedule);
  observer.observe(document.body, {
    attributes: true,
    characterData: true,
    childList: true,
    subtree: true,
  });

  document.addEventListener("click", schedule, true);
  document.addEventListener("input", schedule, true);
  document.addEventListener("change", schedule, true);

  return () => {
    observer.disconnect();
    document.removeEventListener("click", schedule, true);
    document.removeEventListener("input", schedule, true);
    document.removeEventListener("change", schedule, true);
    window.cancelAnimationFrame(frame);
    window.cancelAnimationFrame(secondFrame);
  };
}

export function WriterPublishExperienceEnhancer() {
  const snapshot = useSyncExternalStore(
    subscribePublishExperience,
    getPublishExperienceSnapshot,
    getServerSnapshot,
  );

  const parsed = useMemo<PublishExperienceSnapshot | null>(() => {
    if (!snapshot) return null;

    try {
      return JSON.parse(snapshot) as PublishExperienceSnapshot;
    } catch {
      return null;
    }
  }, [snapshot]);

  if (!parsed || typeof document === "undefined") return null;

  if (parsed.mode === "success") {
    const successTarget = document.querySelector<HTMLElement>(
      ".publish-success__content",
    );

    if (!successTarget) return null;

    return createPortal(
      <Link
        className="button button--primary writer-post-publish-action"
        href="/eserlerim"
      >
        Eserlerime Dön
      </Link>,
      successTarget,
    );
  }

  const previewTarget = document.querySelector<HTMLElement>(
    ".publish-preview .preview-article",
  );

  if (!previewTarget || !parsed.layout || !parsed.content) return null;

  const publicationLayout = parsePublicationLayout(
    parsed.layout,
    parsed.content,
  );

  if (!publicationLayout) return null;

  return createPortal(
    <div
      className="writer-publication-preview"
      aria-label="Yazarın gerçek yayın önizlemesi"
    >
      <PublishedManuscriptViewport
        chapterTitle={parsed.chapterTitle}
        content={parsed.content}
        identity="Yayın önizleme"
        layout={publicationLayout}
        subtitle={writerContent.editor.subtitle}
        workTitle={parsed.workTitle}
      />
    </div>,
    previewTarget,
  );
}
