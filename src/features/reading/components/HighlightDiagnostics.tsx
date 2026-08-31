"use client";

import { useEffect } from "react";

type SelectionSnapshot = {
  endOffset: number;
  paragraphIndex: number;
  selectedText: string;
  startOffset: number;
};

const DIAGNOSTIC_PREFIX = "DIAG · ";
const STATUS_SELECTOR =
  'aside[aria-label="Kişisel okuma araçları"] [role="status"][aria-live="polite"]';
const PROTECTED_ROOT_SELECTOR = "[data-protected-selection-permit]";

function getStatusElement() {
  return document.querySelector<HTMLElement>(STATUS_SELECTOR);
}

function writeDiagnostic(message: string) {
  const status = getStatusElement();
  if (!status) return;
  status.textContent = `${DIAGNOSTIC_PREFIX}${message}`;
}

function getParagraphFromNode(node: Node | null) {
  if (!node) return null;
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;

  return (
    element?.closest<HTMLParagraphElement>(
      "p[data-annotation-text-paragraph]",
    ) ?? null
  );
}

function getTextOffset(
  paragraph: HTMLParagraphElement,
  node: Node,
  offset: number,
) {
  const range = document.createRange();
  range.selectNodeContents(paragraph);
  range.setEnd(node, offset);
  return range.toString().length;
}

function readSelectionSnapshot(): SelectionSnapshot | null {
  const selection = window.getSelection();
  if (!selection || selection.rangeCount !== 1 || selection.isCollapsed) {
    return null;
  }

  const range = selection.getRangeAt(0);
  const startParagraph = getParagraphFromNode(range.startContainer);
  const endParagraph = getParagraphFromNode(range.endContainer);
  if (!startParagraph || startParagraph !== endParagraph) return null;

  const paragraphIndex = Number(
    startParagraph.dataset.annotationTextParagraph,
  );
  const startOffset = getTextOffset(
    startParagraph,
    range.startContainer,
    range.startOffset,
  );
  const endOffset = getTextOffset(
    startParagraph,
    range.endContainer,
    range.endOffset,
  );
  const selectedText = range.toString();

  if (
    !Number.isInteger(paragraphIndex) ||
    paragraphIndex < 0 ||
    endOffset <= startOffset ||
    !selectedText
  ) {
    return null;
  }

  return {
    endOffset,
    paragraphIndex,
    selectedText,
    startOffset,
  };
}

function hasTextSelectionPermit(root: HTMLElement) {
  const selectable = root.querySelector<HTMLElement>(
    '[data-personal-reading-tools-selectable="true"]',
  );
  const paragraph = selectable?.querySelector<HTMLElement>(
    "p[data-annotation-text-paragraph]",
  );

  if (!selectable || !paragraph) return false;

  const rootSelect = window.getComputedStyle(root).userSelect;
  const contentSelect = window.getComputedStyle(selectable).userSelect;
  const paragraphSelect = window.getComputedStyle(paragraph).userSelect;

  return (
    rootSelect === "text" &&
    contentSelect === "text" &&
    paragraphSelect === "text"
  );
}

function getRenderedHighlightState(snapshot: SelectionSnapshot) {
  const paragraph = document.querySelector<HTMLParagraphElement>(
    `p[data-annotation-text-paragraph="${snapshot.paragraphIndex}"]`,
  );
  if (!paragraph) {
    return { cssOk: false, renderOk: false };
  }

  const candidates = paragraph.querySelectorAll<HTMLElement>(
    'span[data-personal-annotation-interactive="true"]',
  );
  let renderOk = false;
  let cssOk = false;

  for (const candidate of candidates) {
    const probe = document.createRange();
    probe.selectNodeContents(paragraph);
    probe.setEndBefore(candidate);
    const candidateStart = probe.toString().length;
    const candidateEnd = candidateStart + (candidate.textContent?.length ?? 0);
    const overlapsSelection =
      candidateEnd > snapshot.startOffset &&
      candidateStart < snapshot.endOffset;

    if (!overlapsSelection) continue;
    renderOk = true;

    const backgroundColor = window.getComputedStyle(candidate).backgroundColor;
    if (
      backgroundColor !== "transparent" &&
      backgroundColor !== "rgba(0, 0, 0, 0)"
    ) {
      cssOk = true;
    }
  }

  return { cssOk, renderOk };
}

function serverCodeFromStatus(status: string) {
  if (
    status.includes("Vurgu eklendi") ||
    status.includes("Kişisel işaretin kaydedildi")
  ) {
    return "SERVER_SAVED";
  }
  if (status.includes("İşaret konumu doğrulanamadı")) {
    return "SERVER_INVALID";
  }
  if (status.includes("işaret kaydı şu anda kullanılamıyor")) {
    return "SERVER_UNAVAILABLE";
  }
  if (status.includes("İşaret kaydedilemedi")) {
    return "SERVER_ERROR";
  }
  return null;
}

export function HighlightDiagnostics() {
  useEffect(() => {
    let attemptActive = false;
    let permitOk = false;
    let serverResolved = false;
    let snapshot: SelectionSnapshot | null = null;
    let serverTimer: number | null = null;

    function clearServerTimer() {
      if (serverTimer !== null) {
        window.clearTimeout(serverTimer);
        serverTimer = null;
      }
    }

    function currentRoot() {
      return document.querySelector<HTMLElement>(PROTECTED_ROOT_SELECTOR);
    }

    function handlePointerDown(event: PointerEvent) {
      const root = currentRoot();
      if (!root || !root.contains(event.target as Node)) return;

      attemptActive =
        root.dataset.personalReadingToolsPermission === "highlight";
      if (!attemptActive) return;

      clearServerTimer();
      serverResolved = false;
      snapshot = null;
      permitOk =
        root.dataset.protectedSelectionPermit === "annotation" &&
        hasTextSelectionPermit(root);

      writeDiagnostic(
        `TOOL_OK · ${permitOk ? "PERMIT_OK" : "PERMIT_FAIL"}`,
      );
    }

    function handleSelectionChange() {
      if (!attemptActive) return;

      const nextSnapshot = readSelectionSnapshot();
      if (!nextSnapshot) return;
      snapshot = nextSnapshot;

      writeDiagnostic(
        `TOOL_OK · ${permitOk ? "PERMIT_OK" : "PERMIT_FAIL"} · SELECTION_OK · ANCHOR_OK P${nextSnapshot.paragraphIndex} ${nextSnapshot.startOffset}-${nextSnapshot.endOffset}`,
      );
    }

    function handlePointerUp() {
      if (!attemptActive || !snapshot) return;

      writeDiagnostic(
        `TOOL_OK · ${permitOk ? "PERMIT_OK" : "PERMIT_FAIL"} · SELECTION_OK · ANCHOR_OK · SERVER_WAIT`,
      );

      clearServerTimer();
      serverTimer = window.setTimeout(() => {
        if (!serverResolved && snapshot) {
          writeDiagnostic(
            `TOOL_OK · ${permitOk ? "PERMIT_OK" : "PERMIT_FAIL"} · SELECTION_OK · ANCHOR_OK · SERVER_NO_RESULT`,
          );
        }
      }, 2200);
    }

    function inspectProviderStatus() {
      if (!attemptActive) return;
      const statusElement = getStatusElement();
      const status = statusElement?.textContent?.trim() ?? "";
      if (!status || status.startsWith(DIAGNOSTIC_PREFIX)) return;

      const serverCode = serverCodeFromStatus(status);
      if (!serverCode) return;

      serverResolved = true;
      clearServerTimer();

      if (serverCode !== "SERVER_SAVED" || !snapshot) {
        writeDiagnostic(
          `TOOL_OK · ${permitOk ? "PERMIT_OK" : "PERMIT_FAIL"} · ${snapshot ? "SELECTION_OK · ANCHOR_OK" : "SELECTION_MISSING · ANCHOR_MISSING"} · ${serverCode}`,
        );
        return;
      }

      window.requestAnimationFrame(() => {
        window.requestAnimationFrame(() => {
          if (!snapshot) return;
          const rendered = getRenderedHighlightState(snapshot);
          writeDiagnostic(
            `TOOL_OK · ${permitOk ? "PERMIT_OK" : "PERMIT_FAIL"} · SELECTION_OK · ANCHOR_OK · SERVER_SAVED · ${rendered.renderOk ? "RENDER_OK" : "RENDER_MISSING"} · ${rendered.cssOk ? "CSS_OK" : "CSS_MISSING"}`,
          );
        });
      });
    }

    const observer = new MutationObserver(inspectProviderStatus);
    observer.observe(document.body, {
      characterData: true,
      childList: true,
      subtree: true,
    });

    document.addEventListener("pointerdown", handlePointerDown, true);
    document.addEventListener("pointerup", handlePointerUp, true);
    document.addEventListener("selectionchange", handleSelectionChange);

    return () => {
      clearServerTimer();
      observer.disconnect();
      document.removeEventListener("pointerdown", handlePointerDown, true);
      document.removeEventListener("pointerup", handlePointerUp, true);
      document.removeEventListener("selectionchange", handleSelectionChange);
    };
  }, []);

  return null;
}
