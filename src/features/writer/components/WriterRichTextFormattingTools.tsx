"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type MouseEvent as ReactMouseEvent,
} from "react";
import { createPortal } from "react-dom";

import {
  getWriterChapterFormattingAction,
  saveWriterChapterFormattingAction,
} from "@/features/works/chapter-formatting-actions";
import {
  CHAPTER_FORMATTING_INPUT_NAME,
  MAX_INLINE_FONT_SIZE,
  MIN_INLINE_FONT_SIZE,
  adjustFormattingForContentChange,
  applyInlineFontSize,
  applyParagraphFormatting,
  emptyChapterFormatting,
  inlineFontSizeAt,
  inlineMarkActive,
  paragraphFormatAt,
  parseChapterFormatting,
  serializeChapterFormatting,
  toggleInlineMark,
  type ChapterFormatting,
  type InlineMarkType,
  type ParagraphListStyle,
  type ParagraphStyle,
  type TextAlignment,
} from "@/features/works/rich-text-formatting";

type TextSelection = {
  start: number;
  end: number;
};

type EditorIdentity = {
  chapterId: string;
  content: string;
  workId: string;
};

type WriterFontSizeStepDetail = {
  baseFontSize: number;
  delta: -1 | 1;
};

const EMPTY_SELECTION: TextSelection = { start: 0, end: 0 };
const EMPTY_IDENTITY: EditorIdentity = { chapterId: "", content: "", workId: "" };
const FORMAT_SAVE_DELAY = 700;
export const WRITER_FONT_SIZE_STEP_EVENT = "ilkoku:writer-font-size-step";

function getToolbarTarget() {
  if (typeof document === "undefined") return null;
  return document.querySelector<HTMLElement>(".writer-context-bar");
}

function getServerToolbarTarget() {
  return null;
}

function subscribeToolbarTarget(onStoreChange: () => void) {
  if (typeof document === "undefined") return () => undefined;
  const observer = new MutationObserver(onStoreChange);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}

function getCanonicalBody() {
  return document.querySelector<HTMLTextAreaElement>(
    ".writer-canvas > .writer-textarea",
  );
}

function getPageTextareas() {
  return Array.from(
    document.querySelectorAll<HTMLTextAreaElement>(
      ".writer-manuscript-pages .writer-page-textarea",
    ),
  );
}

function readPagedContent() {
  const pages = getPageTextareas();
  return pages.length ? pages.map((textarea) => textarea.value).join("") : null;
}

function readEditorIdentity(contentOverride?: string): EditorIdentity {
  const form = document.querySelector<HTMLFormElement>("form.writer-screen");
  const body = getCanonicalBody();
  const workId = form?.querySelector<HTMLInputElement>('input[name="workId"]')?.value ?? "";
  const chapterId = form?.querySelector<HTMLInputElement>('input[name="chapterId"]')?.value ?? "";
  return {
    chapterId,
    content: contentOverride ?? body?.value ?? "",
    workId,
  };
}

function sameIdentity(left: EditorIdentity, right: EditorIdentity) {
  return (
    left.chapterId === right.chapterId &&
    left.content === right.content &&
    left.workId === right.workId
  );
}

function readActiveSelection(): TextSelection | null {
  const active = document.activeElement;
  if (!(active instanceof HTMLTextAreaElement)) return null;

  const pages = getPageTextareas();
  const pageIndex = pages.indexOf(active);
  if (pageIndex < 0) return null;

  const pageStart = pages
    .slice(0, pageIndex)
    .reduce((total, textarea) => total + textarea.value.length, 0);

  return {
    start: pageStart + (active.selectionStart ?? 0),
    end: pageStart + (active.selectionEnd ?? active.selectionStart ?? 0),
  };
}

function syncFormattingInputs(raw: string) {
  const forms = new Set<HTMLFormElement>();
  const writerForm = document.querySelector<HTMLFormElement>("form.writer-screen");
  if (writerForm) forms.add(writerForm);
  document
    .querySelectorAll<HTMLFormElement>(".publish-preview form")
    .forEach((form) => forms.add(form));

  for (const form of forms) {
    let input = form.querySelector<HTMLInputElement>(
      `input[name="${CHAPTER_FORMATTING_INPUT_NAME}"]`,
    );
    if (!input) {
      input = document.createElement("input");
      input.type = "hidden";
      input.name = CHAPTER_FORMATTING_INPUT_NAME;
      form.append(input);
    }
    input.value = raw;
  }
}

function preventToolbarFocus(event: ReactMouseEvent<HTMLButtonElement>) {
  event.preventDefault();
}

export function WriterRichTextFormattingTools() {
  const target = useSyncExternalStore(
    subscribeToolbarTarget,
    getToolbarTarget,
    getServerToolbarTarget,
  );
  const [identity, setIdentity] = useState<EditorIdentity>(EMPTY_IDENTITY);
  const [selection, setSelection] = useState<TextSelection>(EMPTY_SELECTION);
  const [formatting, setFormatting] = useState<ChapterFormatting>(
    emptyChapterFormatting(0),
  );
  const formattingRef = useRef(formatting);
  const lastSelectionRef = useRef<TextSelection>(EMPTY_SELECTION);
  const previousContentRef = useRef("");
  const activeChapterRef = useRef("");
  const loadSequenceRef = useRef(0);
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    formattingRef.current = formatting;
  }, [formatting]);

  useEffect(() => {
    function refreshIdentity(contentOverride?: string) {
      const next = readEditorIdentity(contentOverride);
      setIdentity((current) => (sameIdentity(current, next) ? current : next));
    }

    function handleEditorInput(event: Event) {
      if (!(event.target instanceof HTMLTextAreaElement)) {
        refreshIdentity();
        return;
      }

      if (event.target.classList.contains("writer-page-textarea")) {
        refreshIdentity(readPagedContent() ?? event.target.value);
        return;
      }

      if (event.target === getCanonicalBody()) {
        refreshIdentity(event.target.value);
        return;
      }

      refreshIdentity();
    }

    const observer = new MutationObserver(() => refreshIdentity());
    observer.observe(document.body, { childList: true, subtree: true });
    document.addEventListener("input", handleEditorInput, true);
    document.addEventListener("change", handleEditorInput, true);
    refreshIdentity();

    return () => {
      observer.disconnect();
      document.removeEventListener("input", handleEditorInput, true);
      document.removeEventListener("change", handleEditorInput, true);
    };
  }, []);

  useEffect(() => {
    function captureSelection() {
      const next = readActiveSelection();
      if (!next) return;
      lastSelectionRef.current = next;
      setSelection(next);
    }

    document.addEventListener("selectionchange", captureSelection);
    document.addEventListener("keyup", captureSelection, true);
    document.addEventListener("mouseup", captureSelection, true);
    document.addEventListener("click", captureSelection, true);

    return () => {
      document.removeEventListener("selectionchange", captureSelection);
      document.removeEventListener("keyup", captureSelection, true);
      document.removeEventListener("mouseup", captureSelection, true);
      document.removeEventListener("click", captureSelection, true);
    };
  }, []);

  const scheduleSave = useCallback(
    (nextFormatting: ChapterFormatting, editor = identity) => {
      if (!editor.workId || !editor.chapterId) return;
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);

      const raw = serializeChapterFormatting(nextFormatting);
      syncFormattingInputs(raw);
      saveTimeoutRef.current = setTimeout(() => {
        void saveWriterChapterFormattingAction({
          chapterId: editor.chapterId,
          content: editor.content,
          formatting: raw,
          workId: editor.workId,
        });
      }, FORMAT_SAVE_DELAY);
    },
    [identity],
  );

  useEffect(() => {
    if (!identity.workId || !identity.chapterId) return;

    if (activeChapterRef.current !== identity.chapterId) {
      activeChapterRef.current = identity.chapterId;
      previousContentRef.current = identity.content;
      const sequence = ++loadSequenceRef.current;

      void getWriterChapterFormattingAction(identity).then((raw) => {
        if (
          sequence !== loadSequenceRef.current ||
          activeChapterRef.current !== identity.chapterId
        ) {
          return;
        }

        let next = emptyChapterFormatting(identity.content.length);
        try {
          next = parseChapterFormatting(raw, identity.content);
        } catch {
          next = emptyChapterFormatting(identity.content.length);
        }
        formattingRef.current = next;
        setFormatting(next);
        syncFormattingInputs(serializeChapterFormatting(next));
      });
      return;
    }

    if (previousContentRef.current !== identity.content) {
      const next = adjustFormattingForContentChange(
        formattingRef.current,
        previousContentRef.current,
        identity.content,
      );
      previousContentRef.current = identity.content;
      formattingRef.current = next;
      setFormatting(next);
      scheduleSave(next, identity);
    }
  }, [identity, scheduleSave]);

  useEffect(() => {
    const observer = new MutationObserver(() => {
      syncFormattingInputs(serializeChapterFormatting(formattingRef.current));
    });
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    };
  }, []);

  function updateFormatting(next: ChapterFormatting) {
    formattingRef.current = next;
    setFormatting(next);
    scheduleSave(next);
  }

  function activeSelection() {
    return readActiveSelection() ?? lastSelectionRef.current;
  }

  function toggleMark(type: InlineMarkType) {
    const range = activeSelection();
    if (range.end <= range.start) return;
    updateFormatting(
      toggleInlineMark(formattingRef.current, identity.content, range.start, range.end, type),
    );
  }

  function changeSelectedFontSize(detail: WriterFontSizeStepDetail) {
    const range = activeSelection();
    if (range.end <= range.start) return;
    const baseFontSize = Math.max(
      MIN_INLINE_FONT_SIZE,
      Math.min(MAX_INLINE_FONT_SIZE, Math.round(detail.baseFontSize)),
    );
    const current = inlineFontSizeAt(
      formattingRef.current,
      range.start,
      range.end,
      baseFontSize,
    );
    const nextSize = Math.max(
      MIN_INLINE_FONT_SIZE,
      Math.min(MAX_INLINE_FONT_SIZE, current + detail.delta),
    );
    updateFormatting(
      applyInlineFontSize(
        formattingRef.current,
        identity.content,
        range.start,
        range.end,
        nextSize,
      ),
    );
  }

  useEffect(() => {
    function handleFontSizeStep(event: Event) {
      const customEvent = event as CustomEvent<WriterFontSizeStepDetail>;
      if (!customEvent.detail || (customEvent.detail.delta !== -1 && customEvent.detail.delta !== 1)) {
        return;
      }
      changeSelectedFontSize(customEvent.detail);
    }

    window.addEventListener(WRITER_FONT_SIZE_STEP_EVENT, handleFontSizeStep);
    return () => window.removeEventListener(WRITER_FONT_SIZE_STEP_EVENT, handleFontSizeStep);
  });

  function updateParagraph(
    patch: Parameters<typeof applyParagraphFormatting>[4],
  ) {
    const range = activeSelection();
    updateFormatting(
      applyParagraphFormatting(
        formattingRef.current,
        identity.content,
        range.start,
        range.end,
        patch,
      ),
    );
  }

  const currentParagraph = useMemo(
    () =>
      paragraphFormatAt(
        formatting,
        identity.content,
        selection.start,
      ),
    [formatting, identity.content, selection.start],
  );
  const hasSelection = selection.end > selection.start;

  if (!target || !identity.chapterId) return null;

  return createPortal(
    <div
      className="writer-rich-formatting-tools"
      aria-label="Metin biçimlendirme araçları"
      role="toolbar"
    >
      <div className="writer-rich-formatting-tools__group" aria-label="Metin biçimi">
        {(["bold", "italic", "underline"] as const).map((type) => {
          const labels = {
            bold: { label: "Kalın", short: "B" },
            italic: { label: "İtalik", short: "I" },
            underline: { label: "Altı çizili", short: "U" },
          } as const;
          return (
            <button
              aria-label={labels[type].label}
              aria-pressed={
                hasSelection &&
                inlineMarkActive(formatting, selection.start, selection.end, type)
              }
              className={`writer-rich-formatting-tools__${type}`}
              disabled={!hasSelection}
              key={type}
              onMouseDown={preventToolbarFocus}
              onClick={() => toggleMark(type)}
              title={`${labels[type].label} — önce metni seç`}
              type="button"
            >
              {labels[type].short}
            </button>
          );
        })}
      </div>

      <label className="writer-rich-formatting-tools__select">
        <span>Biçim</span>
        <select
          aria-label="Paragraf biçimi"
          value={currentParagraph?.style ?? "paragraph"}
          onChange={(event) =>
            updateParagraph({ style: event.target.value as ParagraphStyle })
          }
        >
          <option value="paragraph">Paragraf</option>
          <option value="heading">Başlık</option>
          <option value="subheading">Alt Başlık</option>
          <option value="quote">Alıntı</option>
        </select>
      </label>

      <div
        className="writer-rich-formatting-tools__group writer-rich-formatting-tools__compact-group"
        aria-label="Liste"
      >
        <span className="writer-rich-formatting-tools__group-label">Liste</span>
        <button
          aria-label="Madde işaretli liste"
          aria-pressed={currentParagraph?.list === "bullet"}
          onMouseDown={preventToolbarFocus}
          onClick={() => updateParagraph({ list: "bullet" as ParagraphListStyle })}
          title="Madde işaretli liste"
          type="button"
        >
          •
        </button>
        <button
          aria-label="Numaralı liste"
          aria-pressed={currentParagraph?.list === "number"}
          onMouseDown={preventToolbarFocus}
          onClick={() => updateParagraph({ list: "number" as ParagraphListStyle })}
          title="Numaralı liste"
          type="button"
        >
          1.
        </button>
        <button
          aria-label="Listeyi kaldır"
          disabled={currentParagraph?.list === "none"}
          onMouseDown={preventToolbarFocus}
          onClick={() => updateParagraph({ list: "none" })}
          title="Listeyi kaldır"
          type="button"
        >
          ×
        </button>
      </div>

      <label className="writer-rich-formatting-tools__select">
        <span>Hizala</span>
        <select
          aria-label="Metin hizalama"
          value={currentParagraph?.alignment ?? "left"}
          onChange={(event) =>
            updateParagraph({ alignment: event.target.value as TextAlignment })
          }
        >
          <option value="left">Sol</option>
          <option value="center">Orta</option>
          <option value="right">Sağ</option>
          <option value="justify">İki Yana</option>
        </select>
      </label>

      <div
        className="writer-rich-formatting-tools__group writer-rich-formatting-tools__compact-group"
        aria-label="Girinti"
      >
        <span className="writer-rich-formatting-tools__group-label">Girinti</span>
        <button
          aria-label="Girintiyi azalt"
          disabled={(currentParagraph?.indent ?? 0) <= 0}
          onMouseDown={preventToolbarFocus}
          onClick={() =>
            updateParagraph({ indent: Math.max(0, (currentParagraph?.indent ?? 0) - 1) })
          }
          title="Girintiyi azalt"
          type="button"
        >
          ←
        </button>
        <button
          aria-label="Girintiyi artır"
          disabled={(currentParagraph?.indent ?? 0) >= 6}
          onMouseDown={preventToolbarFocus}
          onClick={() =>
            updateParagraph({ indent: Math.min(6, (currentParagraph?.indent ?? 0) + 1) })
          }
          title="Girintiyi artır"
          type="button"
        >
          →
        </button>
      </div>
    </div>,
    target,
  );
}
