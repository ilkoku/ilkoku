"use client";

import {
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type SyntheticEvent,
} from "react";

import type {
  PersonalAnnotationRecord,
  PersonalDrawingPoint,
} from "../personal-annotation-types";
import {
  usePersonalReadingTools,
} from "./PersonalReadingToolsProvider";
import styles from "./ProtectedChapterContent.module.css";

const watermarkCopies = Array.from(
  { length: 48 },
  (_, index) => index,
);

type DraftStroke = {
  paragraphIndex: number;
  pointerId: number;
  points: PersonalDrawingPoint[];
};

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function normalizedPoint(
  element: HTMLElement,
  clientX: number,
  clientY: number,
): PersonalDrawingPoint {
  const rectangle = element.getBoundingClientRect();
  return {
    x: clamp01((clientX - rectangle.left) / Math.max(1, rectangle.width)),
    y: clamp01((clientY - rectangle.top) / Math.max(1, rectangle.height)),
  };
}

function parseDrawingPoints(pathData: string | null) {
  if (!pathData) return [];

  try {
    const parsed = JSON.parse(pathData) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (point): point is PersonalDrawingPoint =>
          typeof point === "object" &&
          point !== null &&
          typeof (point as PersonalDrawingPoint).x === "number" &&
          typeof (point as PersonalDrawingPoint).y === "number",
      )
      .map((point) => ({
        x: clamp01(point.x),
        y: clamp01(point.y),
      }))
      .slice(0, 512);
  } catch {
    return [];
  }
}

function pointsAttribute(points: PersonalDrawingPoint[]) {
  return points
    .map((point) => `${point.x * 1000},${point.y * 1000}`)
    .join(" ");
}

function getParagraphFromNode(node: Node | null) {
  if (!node) return null;
  const element =
    node.nodeType === Node.ELEMENT_NODE
      ? (node as Element)
      : node.parentElement;
  return element?.closest<HTMLParagraphElement>(
    "p[data-annotation-text-paragraph]",
  ) ?? null;
}

function getTextOffset(
  paragraph: HTMLParagraphElement,
  node: Node,
  offset: number,
) {
  const probe = document.createRange();
  probe.selectNodeContents(paragraph);
  probe.setEnd(node, offset);
  return probe.toString().length;
}

function NoteBubble({
  annotation,
  isBusy,
  onClose,
  onDelete,
  onUpdate,
}: {
  annotation: PersonalAnnotationRecord;
  isBusy: boolean;
  onClose: () => void;
  onDelete: () => void;
  onUpdate: (note: string) => Promise<boolean>;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(annotation.note ?? "");

  async function save() {
    const saved = await onUpdate(draft);
    if (saved) setEditing(false);
  }

  return (
    <aside
      aria-label="Kişisel not"
      className={styles.noteBubble}
      data-personal-annotation-interactive="true"
    >
      <header>
        <strong>Not / Açıklama</strong>
        <button aria-label="Notu kapat" onClick={onClose} type="button">
          ×
        </button>
      </header>

      <small>Yalnızca sen görürsün</small>

      {annotation.selectedText ? (
        <blockquote>“{annotation.selectedText.slice(0, 180)}”</blockquote>
      ) : null}

      {editing ? (
        <textarea
          autoFocus
          maxLength={1200}
          onChange={(event) => setDraft(event.target.value)}
          rows={5}
          value={draft}
        />
      ) : (
        <p>{annotation.note}</p>
      )}

      <footer>
        {editing ? (
          <>
            <button
              disabled={isBusy || !draft.trim()}
              onClick={() => void save()}
              type="button"
            >
              Kaydet
            </button>
            <button
              onClick={() => {
                setDraft(annotation.note ?? "");
                setEditing(false);
              }}
              type="button"
            >
              Vazgeç
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setEditing(true)} type="button">
              Düzenle
            </button>
            <button disabled={isBusy} onClick={onDelete} type="button">
              Sil
            </button>
          </>
        )}
      </footer>
    </aside>
  );
}

export function ProtectedChapterContent({
  chapterId,
  identity,
  paragraphs,
}: {
  chapterId: string;
  identity: string;
  paragraphs: string[];
}) {
  const [noticeVisible, setNoticeVisible] = useState(false);
  const [draftStroke, setDraftStroke] = useState<DraftStroke | null>(null);
  const draftStrokeRef = useRef<DraftStroke | null>(null);
  const tools = usePersonalReadingTools();
  const annotations = tools?.annotations ?? [];
  const activeTool = tools?.activeTool ?? null;
  const textSelectionMode =
    activeTool === "highlight" ||
    activeTool === "underline" ||
    activeTool === "note";
  const drawingMode = activeTool === "pen";
  const eraserMode = activeTool === "eraser";

  function blockInteraction(
    event: SyntheticEvent<HTMLDivElement>,
  ) {
    event.preventDefault();
    setNoticeVisible(true);
  }

  function updateDraftStroke(next: DraftStroke | null) {
    draftStrokeRef.current = next;
    setDraftStroke(next);
  }

  function handleSelectionEnd() {
    if (!tools || !textSelectionMode) return;

    window.requestAnimationFrame(() => {
      const selection = window.getSelection();
      if (!selection || selection.rangeCount !== 1 || selection.isCollapsed) {
        return;
      }

      const range = selection.getRangeAt(0);
      const startParagraph = getParagraphFromNode(range.startContainer);
      const endParagraph = getParagraphFromNode(range.endContainer);

      if (!startParagraph || !endParagraph || startParagraph !== endParagraph) {
        tools.setStatus(
          "İşaretlemek için şimdilik tek paragraf içinde bir metin seç.",
        );
        selection.removeAllRanges();
        return;
      }

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
      const selectedText = startParagraph.textContent?.slice(
        startOffset,
        endOffset,
      ) ?? "";

      selection.removeAllRanges();

      if (
        !Number.isInteger(paragraphIndex) ||
        paragraphIndex < 0 ||
        endOffset <= startOffset ||
        !selectedText
      ) {
        tools.setStatus("Metin seçimi okunamadı. Tekrar deneyebilirsin.");
        return;
      }

      void tools.applyTextAnchor({
        endOffset,
        paragraphIndex,
        selectedText,
        startOffset,
      });
    });
  }

  function handleParagraphClick(
    event: ReactPointerEvent<HTMLDivElement>,
    paragraphIndex: number,
  ) {
    if (
      !tools ||
      (activeTool !== "pin" && activeTool !== "reading_position")
    ) {
      return;
    }

    const target = event.target as Element;
    if (target.closest("[data-personal-annotation-interactive='true']")) {
      return;
    }

    event.preventDefault();
    void tools.applyParagraphAnchor(paragraphIndex);
  }

  function beginDrawing(
    event: ReactPointerEvent<HTMLDivElement>,
    paragraphIndex: number,
  ) {
    if (!tools || !drawingMode || event.button !== 0) return;

    const target = event.target as Element;
    if (target.closest("[data-personal-annotation-interactive='true']")) {
      return;
    }

    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    updateDraftStroke({
      paragraphIndex,
      pointerId: event.pointerId,
      points: [
        normalizedPoint(
          event.currentTarget,
          event.clientX,
          event.clientY,
        ),
      ],
    });
  }

  function continueDrawing(event: ReactPointerEvent<HTMLDivElement>) {
    const current = draftStrokeRef.current;
    if (
      !current ||
      current.pointerId !== event.pointerId ||
      current.points.length >= 512
    ) {
      return;
    }

    event.preventDefault();
    const point = normalizedPoint(
      event.currentTarget,
      event.clientX,
      event.clientY,
    );
    const previous = current.points[current.points.length - 1];
    const distance = Math.hypot(point.x - previous.x, point.y - previous.y);
    if (distance < 0.0025) return;

    updateDraftStroke({
      ...current,
      points: [...current.points, point],
    });
  }

  function finishDrawing(event: ReactPointerEvent<HTMLDivElement>) {
    const current = draftStrokeRef.current;
    if (!tools || !current || current.pointerId !== event.pointerId) return;

    event.preventDefault();
    const point = normalizedPoint(
      event.currentTarget,
      event.clientX,
      event.clientY,
    );
    const points = [...current.points, point].slice(0, 512);
    updateDraftStroke(null);

    if (points.length >= 2) {
      void tools.saveDrawing(current.paragraphIndex, points);
    }
  }

  function cancelDrawing(event: ReactPointerEvent<HTMLDivElement>) {
    const current = draftStrokeRef.current;
    if (current?.pointerId === event.pointerId) updateDraftStroke(null);
  }

  function renderAnnotatedText(paragraph: string, paragraphIndex: number) {
    const textAnnotations = annotations.filter(
      (annotation) =>
        annotation.paragraphIndex === paragraphIndex &&
        (annotation.type === "highlight" ||
          annotation.type === "underline" ||
          annotation.type === "note") &&
        typeof annotation.startOffset === "number" &&
        typeof annotation.endOffset === "number" &&
        annotation.startOffset >= 0 &&
        annotation.endOffset > annotation.startOffset &&
        annotation.endOffset <= paragraph.length,
    );

    if (textAnnotations.length === 0) return paragraph;

    const boundaries = new Set<number>([0, paragraph.length]);
    for (const annotation of textAnnotations) {
      boundaries.add(annotation.startOffset as number);
      boundaries.add(annotation.endOffset as number);
    }

    const sorted = [...boundaries].sort((left, right) => left - right);

    return sorted.slice(0, -1).map((start, segmentIndex) => {
      const end = sorted[segmentIndex + 1];
      const segment = paragraph.slice(start, end);
      const covering = textAnnotations.filter(
        (annotation) =>
          (annotation.startOffset as number) <= start &&
          (annotation.endOffset as number) >= end,
      );

      if (covering.length === 0) {
        return <span key={`${start}-${end}`}>{segment}</span>;
      }

      const highlight = covering.some(
        (annotation) => annotation.type === "highlight",
      );
      const underline = covering.some(
        (annotation) => annotation.type === "underline",
      );
      const note = covering.find(
        (annotation) => annotation.type === "note",
      );
      const removable = covering[covering.length - 1];

      return (
        <span
          className={[
            styles.annotatedText,
            highlight ? styles.highlight : "",
            underline ? styles.underline : "",
            note ? styles.noteAnchor : "",
          ]
            .filter(Boolean)
            .join(" ")}
          data-personal-annotation-interactive="true"
          key={`${start}-${end}`}
          onClick={(event) => {
            if (!tools) return;
            if (eraserMode) {
              event.preventDefault();
              event.stopPropagation();
              void tools.deleteAnnotation(removable.id);
              return;
            }
            if (note) {
              event.stopPropagation();
              tools.setOpenNoteId(note.id);
            }
          }}
        >
          {segment}
        </span>
      );
    });
  }

  return (
    <div
      className={[
        styles.protectedChapter,
        textSelectionMode ? styles.selectionMode : "",
        drawingMode ? styles.drawingMode : "",
        eraserMode ? styles.eraserMode : "",
      ]
        .filter(Boolean)
        .join(" ")}
      draggable={false}
      onContextMenu={blockInteraction}
      onCopy={blockInteraction}
      onCut={blockInteraction}
      onDragStart={blockInteraction}
    >
      <div aria-hidden="true" className={styles.watermarkLayer}>
        {watermarkCopies.map((copy) => (
          <span key={copy}>
            {identity} · İlkOku güvenli okuma
          </span>
        ))}
      </div>

      <div
        className={`chapter__body ${styles.content}`}
        onPointerUp={handleSelectionEnd}
      >
        {paragraphs.map((paragraph, index) => {
          const paragraphAnnotations = annotations.filter(
            (annotation) => annotation.paragraphIndex === index,
          );
          const drawings = paragraphAnnotations.filter(
            (annotation) => annotation.type === "drawing",
          );
          const markers = paragraphAnnotations.filter(
            (annotation) =>
              annotation.type === "note" ||
              annotation.type === "pin" ||
              annotation.type === "reading_position",
          );
          const openNote = paragraphAnnotations.find(
            (annotation) =>
              annotation.type === "note" &&
              annotation.id === tools?.openNoteId,
          );
          const visibleDraft =
            draftStroke?.paragraphIndex === index
              ? draftStroke.points
              : null;

          return (
            <div
              className={styles.paragraphWrap}
              data-annotation-paragraph={index}
              key={`${chapterId}-${index}`}
              onClick={(event) => handleParagraphClick(event, index)}
              onPointerCancel={cancelDrawing}
              onPointerDown={(event) => beginDrawing(event, index)}
              onPointerMove={continueDrawing}
              onPointerUp={finishDrawing}
            >
              <p data-annotation-text-paragraph={index}>
                {renderAnnotatedText(paragraph, index)}
              </p>

              {drawings.length > 0 || visibleDraft ? (
                <svg
                  aria-hidden="true"
                  className={styles.drawingLayer}
                  preserveAspectRatio="none"
                  viewBox="0 0 1000 1000"
                >
                  {drawings.map((annotation) => {
                    const points = parseDrawingPoints(annotation.pathData);
                    if (points.length < 2) return null;
                    return (
                      <polyline
                        className={styles.drawingPath}
                        data-personal-annotation-interactive="true"
                        fill="none"
                        key={annotation.id}
                        onClick={(event) => {
                          if (!tools || !eraserMode) return;
                          event.preventDefault();
                          event.stopPropagation();
                          void tools.deleteAnnotation(annotation.id);
                        }}
                        points={pointsAttribute(points)}
                        vectorEffect="non-scaling-stroke"
                      />
                    );
                  })}

                  {visibleDraft ? (
                    <polyline
                      className={styles.draftDrawingPath}
                      fill="none"
                      points={pointsAttribute(visibleDraft)}
                      vectorEffect="non-scaling-stroke"
                    />
                  ) : null}
                </svg>
              ) : null}

              {markers.length > 0 ? (
                <div
                  aria-label="Kişisel paragraf işaretleri"
                  className={styles.markerRail}
                >
                  {markers.map((annotation) => {
                    const label =
                      annotation.type === "note"
                        ? "Kişisel not"
                        : annotation.type === "reading_position"
                          ? "Kaldığım yer"
                          : "Kişisel iğne";
                    const glyph =
                      annotation.type === "note"
                        ? "▱"
                        : annotation.type === "reading_position"
                          ? "⌑"
                          : "⌖";

                    return (
                      <button
                        aria-label={label}
                        className={styles.marker}
                        data-kind={annotation.type}
                        data-personal-annotation-interactive="true"
                        key={annotation.id}
                        onClick={(event) => {
                          event.preventDefault();
                          event.stopPropagation();
                          if (!tools) return;
                          if (eraserMode) {
                            void tools.deleteAnnotation(annotation.id);
                          } else if (annotation.type === "note") {
                            tools.setOpenNoteId(annotation.id);
                          } else {
                            tools.setStatus(label);
                          }
                        }}
                        type="button"
                      >
                        {glyph}
                      </button>
                    );
                  })}
                </div>
              ) : null}

              {openNote && tools ? (
                <NoteBubble
                  annotation={openNote}
                  isBusy={tools.isBusy}
                  onClose={() => tools.setOpenNoteId(null)}
                  onDelete={() => void tools.deleteAnnotation(openNote.id)}
                  onUpdate={(note) => tools.updateNote(openNote.id, note)}
                />
              ) : null}
            </div>
          );
        })}
      </div>

      {noticeVisible ? (
        <p aria-live="polite" className={styles.notice} role="status">
          Eser metninin kopyalanması ve dışarı aktarılması
          güvenlik nedeniyle kapalıdır.
        </p>
      ) : null}

      <p className={styles.printMessage}>
        Bu eser metni İlkOku güvenli okuma alanından
        yazdırılamaz.
      </p>
    </div>
  );
}
