"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import {
  clearPersonalAnnotationsAction,
  createPersonalAnnotationAction,
  deletePersonalAnnotationAction,
  updatePersonalAnnotationNoteAction,
} from "../personal-annotations";
import type {
  PersonalAnnotationRecord,
  PersonalDrawingPoint,
  PersonalTextAnchor,
} from "../personal-annotation-types";
import {
  PERSONAL_PAGE_POINT_NAVIGATE_EVENT,
  parsePersonalPagePointAnchor,
  type PersonalPagePointAnchor,
} from "../personal-page-point-anchor";
import styles from "./PersonalReadingToolsProvider.module.css";

export type PersonalReadingActiveTool =
  | "pen"
  | "highlight"
  | "underline"
  | "pin"
  | "reading_position"
  | "note"
  | "eraser"
  | null;

type PersonalReadingToolsContextValue = {
  activeTool: PersonalReadingActiveTool;
  annotations: PersonalAnnotationRecord[];
  applyPagePointAnchor: (anchor: PersonalPagePointAnchor) => Promise<boolean>;
  applyParagraphAnchor: (paragraphIndex: number) => Promise<void>;
  applyTextAnchor: (anchor: PersonalTextAnchor) => Promise<boolean>;
  deleteAnnotation: (annotationId: string) => Promise<boolean>;
  isBusy: boolean;
  openNoteId: string | null;
  saveDrawing: (
    paragraphIndex: number,
    points: PersonalDrawingPoint[],
  ) => Promise<boolean>;
  setOpenNoteId: (annotationId: string | null) => void;
  setStatus: (message: string) => void;
  updateNote: (annotationId: string, note: string) => Promise<boolean>;
};

const PersonalReadingToolsContext =
  createContext<PersonalReadingToolsContextValue | null>(null);

const toolCards: Array<{
  icon: string;
  label: string;
  tool: Exclude<PersonalReadingActiveTool, null>;
}> = [
  { icon: "▰", label: "Vurgula", tool: "highlight" },
  { icon: "U", label: "Altını Çiz", tool: "underline" },
  { icon: "⌖", label: "İğne", tool: "pin" },
  { icon: "⌑", label: "Kaldığım Yer", tool: "reading_position" },
  { icon: "▱", label: "Not", tool: "note" },
  { icon: "⌫", label: "Silgi", tool: "eraser" },
];

const toolInstructions: Record<
  Exclude<PersonalReadingActiveTool, null>,
  string
> = {
  pen: "Eski çizim kayıtları uyumluluk için korunur.",
  highlight: "Metni seç. Vurgu uygulanınca araç otomatik kapanır.",
  underline: "Metni seç. Alt çizgi uygulanınca araç otomatik kapanır.",
  pin: "Kitap sayfasında istediğin noktaya bir kez tıkla veya dokun.",
  reading_position: "Kaldığın noktaya bir kez tıkla veya dokun; eski konumun yenilenir.",
  note: "Not bağlamak istediğin metni seç; kaydedince küçük not işareti görünür.",
  eraser: "Kişisel işaretlere tıkla; varsa eski çizgilerin üzerinden sürükle.",
};

const annotationLabels: Record<
  PersonalAnnotationRecord["type"],
  string
> = {
  drawing: "Kalem çizgisi",
  highlight: "Vurgu",
  note: "Not",
  pin: "İğne",
  reading_position: "Kaldığım yer",
  underline: "Alt çizgi",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function annotationPreview(annotation: PersonalAnnotationRecord) {
  if (annotation.note) return annotation.note;
  if (annotation.selectedText) return annotation.selectedText;

  const pagePoint = parsePersonalPagePointAnchor(annotation.pathData);
  if (pagePoint) {
    return `${pagePoint.pageIndex + 1}. sayfa · serbest işaret`;
  }

  if (typeof annotation.paragraphIndex === "number") {
    return `${annotation.paragraphIndex + 1}. paragraf`;
  }
  return "Kişisel işaret";
}

function toolStatus(tool: PersonalReadingActiveTool) {
  if (!tool) {
    return "Normal okuma · işaretlerin yalnızca sana görünür.";
  }

  const label = toolCards.find((card) => card.tool === tool)?.label ?? "Araç";
  return `${label} aktif · ${toolInstructions[tool]}`;
}

export function usePersonalReadingTools() {
  return useContext(PersonalReadingToolsContext);
}

export function PersonalReadingToolsProvider({
  chapterId,
  children,
  initialAnnotations,
  userKey,
}: {
  chapterId: string;
  children: ReactNode;
  initialAnnotations: PersonalAnnotationRecord[];
  userKey: string;
}) {
  const [annotations, setAnnotations] = useState(initialAnnotations);
  const [activeTool, setActiveTool] =
    useState<PersonalReadingActiveTool>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [pendingNote, setPendingNote] =
    useState<PersonalTextAnchor | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [status, setStatus] = useState(
    "Normal okuma · işaretlerin yalnızca sana görünür.",
  );
  const [position, setPosition] = useState({ x: 18, y: 150 });
  const dragRef = useRef<{
    offsetX: number;
    offsetY: number;
    pointerId: number;
  } | null>(null);

  const storageKey = `ilkoku:reading-tools:${userKey}:position:v1`;

  const returnToSelectMode = useCallback((message = "Normal okuma.") => {
    setActiveTool(null);
    setPendingNote(null);
    setNoteDraft("");
    setStatus(message);
  }, []);

  useEffect(() => {
    const media = window.matchMedia("(max-width: 48rem)");
    const sync = () => setIsCompact(media.matches);
    sync();
    media.addEventListener("change", sync);
    return () => media.removeEventListener("change", sync);
  }, []);

  useEffect(() => {
    if (isCompact) return;

    try {
      const saved = window.localStorage.getItem(storageKey);
      if (!saved) return;
      const parsed = JSON.parse(saved) as { x?: unknown; y?: unknown };
      if (
        typeof parsed.x !== "number" ||
        typeof parsed.y !== "number"
      ) {
        return;
      }

      const frame = window.requestAnimationFrame(() => {
        setPosition({
          x: clamp(parsed.x as number, 8, Math.max(8, window.innerWidth - 310)),
          y: clamp(parsed.y as number, 8, Math.max(8, window.innerHeight - 120)),
        });
      });

      return () => window.cancelAnimationFrame(frame);
    } catch {
      // Yerel konum kaydı bozuksa varsayılan konum kullanılır.
    }
  }, [isCompact, storageKey]);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => {
      setStatus("");
    }, 4500);
    return () => window.clearTimeout(timer);
  }, [status]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== "Escape") return;
      if (!activeTool && !pendingNote) return;
      event.preventDefault();
      returnToSelectMode("Normal okuma · araç kapatıldı.");
    }

    window.addEventListener("keydown", handleEscape);
    return () => window.removeEventListener("keydown", handleEscape);
  }, [activeTool, pendingNote, returnToSelectMode]);

  const addSavedAnnotation = useCallback(
    (annotation: PersonalAnnotationRecord) => {
      setAnnotations((current) => {
        const withoutSameId = current.filter(
          (item) => item.id !== annotation.id,
        );
        const withoutPreviousReadingPosition =
          annotation.type === "reading_position"
            ? withoutSameId.filter(
                (item) => item.type !== "reading_position",
              )
            : withoutSameId;
        return [...withoutPreviousReadingPosition, annotation];
      });
    },
    [],
  );

  const createAnnotation = useCallback(
    async (payload: Record<string, unknown>) => {
      if (isBusy) return null;
      setIsBusy(true);

      try {
        const result = await createPersonalAnnotationAction({
          chapterId,
          ...payload,
        });

        if (result.status !== "saved" || !result.annotation) {
          setStatus(
            result.status === "invalid"
              ? "İşaret konumu doğrulanamadı; seçim ekranda bırakıldı."
              : "Bu eser için işaret kaydı şu anda kullanılamıyor.",
          );
          return null;
        }

        addSavedAnnotation(result.annotation);
        setStatus("Kişisel işaretin kaydedildi.");
        return result.annotation;
      } catch {
        setStatus("İşaret kaydedilemedi. Bağlantını kontrol et.");
        return null;
      } finally {
        setIsBusy(false);
      }
    },
    [addSavedAnnotation, chapterId, isBusy],
  );

  const applyTextAnchor = useCallback(
    async (anchor: PersonalTextAnchor) => {
      if (
        activeTool !== "highlight" &&
        activeTool !== "underline" &&
        activeTool !== "note"
      ) {
        return false;
      }

      if (activeTool === "note") {
        setPendingNote(anchor);
        setNoteDraft("");
        setStatus("Notunu yaz · Ctrl/Cmd+Enter ile kaydet, Esc ile vazgeç.");
        return true;
      }

      const tool = activeTool;
      const saved = await createAnnotation({
        ...anchor,
        type: tool,
      });

      if (!saved) return false;

      returnToSelectMode(
        tool === "highlight"
          ? "Vurgu eklendi · normal okumaya dönüldü."
          : "Alt çizgi eklendi · normal okumaya dönüldü.",
      );
      return true;
    },
    [activeTool, createAnnotation, returnToSelectMode],
  );

  const applyPagePointAnchor = useCallback(
    async (anchor: PersonalPagePointAnchor) => {
      if (
        activeTool !== "pin" &&
        activeTool !== "reading_position"
      ) {
        return false;
      }

      const tool = activeTool;
      const saved = await createAnnotation({
        pagePoint: anchor,
        type: tool,
      });

      if (!saved) return false;

      returnToSelectMode(
        tool === "reading_position"
          ? "Kaldığın yer kaydedildi · normal okumaya dönüldü."
          : "İğne eklendi · normal okumaya dönüldü.",
      );
      return true;
    },
    [activeTool, createAnnotation, returnToSelectMode],
  );

  const applyParagraphAnchor = useCallback(
    async (paragraphIndex: number) => {
      if (
        activeTool !== "pin" &&
        activeTool !== "reading_position"
      ) {
        return;
      }

      const tool = activeTool;
      const saved = await createAnnotation({
        paragraphIndex,
        type: tool,
      });

      if (saved) {
        returnToSelectMode(
          tool === "reading_position"
            ? "Kaldığın yer kaydedildi · normal okumaya dönüldü."
            : "İğne eklendi · normal okumaya dönüldü.",
        );
      }
    },
    [activeTool, createAnnotation, returnToSelectMode],
  );

  const saveDrawing = useCallback(
    async (
      paragraphIndex: number,
      points: PersonalDrawingPoint[],
    ) => {
      if (activeTool !== "pen" || points.length < 2) return false;
      const saved = await createAnnotation({
        paragraphIndex,
        points,
        type: "drawing",
      });
      return Boolean(saved);
    },
    [activeTool, createAnnotation],
  );

  const deleteAnnotation = useCallback(
    async (annotationId: string) => {
      if (isBusy) return false;
      setIsBusy(true);

      try {
        const result = await deletePersonalAnnotationAction(annotationId);
        if (result.status !== "deleted") {
          setStatus("İşaret silinemedi.");
          return false;
        }

        setAnnotations((current) =>
          current.filter((item) => item.id !== annotationId),
        );
        if (openNoteId === annotationId) setOpenNoteId(null);
        setStatus("İşaret silindi.");
        return true;
      } catch {
        setStatus("İşaret silinemedi.");
        return false;
      } finally {
        setIsBusy(false);
      }
    },
    [isBusy, openNoteId],
  );

  const updateNote = useCallback(
    async (annotationId: string, note: string) => {
      const normalized = note.trim();
      if (!normalized || normalized.length > 1200 || isBusy) {
        return false;
      }

      setIsBusy(true);
      try {
        const result = await updatePersonalAnnotationNoteAction({
          id: annotationId,
          note: normalized,
        });
        if (result.status !== "saved") {
          setStatus("Not güncellenemedi.");
          return false;
        }

        setAnnotations((current) =>
          current.map((item) =>
            item.id === annotationId
              ? {
                  ...item,
                  note: normalized,
                  updatedAt: new Date().toISOString(),
                }
              : item,
          ),
        );
        setStatus("Not güncellendi.");
        return true;
      } catch {
        setStatus("Not güncellenemedi.");
        return false;
      } finally {
        setIsBusy(false);
      }
    },
    [isBusy],
  );

  async function savePendingNote() {
    if (!pendingNote || !noteDraft.trim()) return;
    const saved = await createAnnotation({
      ...pendingNote,
      note: noteDraft.trim(),
      type: "note",
    });
    if (!saved) return;
    setPendingNote(null);
    setNoteDraft("");
    setOpenNoteId(saved.id);
    setActiveTool(null);
    setStatus("Not kaydedildi · normal okumaya dönüldü.");
  }

  function handleNoteComposerKeyDown(
    event: ReactKeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (event.key === "Escape") {
      event.preventDefault();
      returnToSelectMode("Not iptal edildi · normal okumaya dönüldü.");
      return;
    }

    if (
      event.key === "Enter" &&
      (event.ctrlKey || event.metaKey) &&
      noteDraft.trim() &&
      !isBusy
    ) {
      event.preventDefault();
      void savePendingNote();
    }
  }

  async function clearAllAnnotations() {
    if (
      isBusy ||
      annotations.length === 0 ||
      !window.confirm(
        "Bu bölümdeki tüm kişisel işaretlerini silmek istiyor musun?",
      )
    ) {
      return;
    }

    setIsBusy(true);
    try {
      const result = await clearPersonalAnnotationsAction(chapterId);
      if (result.status !== "cleared") {
        setStatus("İşaretler temizlenemedi.");
        return;
      }
      setAnnotations([]);
      setOpenNoteId(null);
      setPendingNote(null);
      setStatus("Bu bölümdeki kişisel işaretlerin temizlendi.");
    } catch {
      setStatus("İşaretler temizlenemedi.");
    } finally {
      setIsBusy(false);
    }
  }

  function selectTool(tool: Exclude<PersonalReadingActiveTool, null>) {
    const nextTool = activeTool === tool ? null : tool;
    setActiveTool(nextTool);
    setPendingNote(null);
    setNoteDraft("");
    setStatus(
      nextTool
        ? toolStatus(nextTool)
        : "Normal okuma · araç kapatıldı.",
    );
  }

  function showAnnotation(annotation: PersonalAnnotationRecord) {
    const pagePoint = parsePersonalPagePointAnchor(annotation.pathData);
    if (pagePoint) {
      window.dispatchEvent(
        new CustomEvent(PERSONAL_PAGE_POINT_NAVIGATE_EVENT, {
          detail: {
            annotationId: annotation.id,
            pageIndex: pagePoint.pageIndex,
          },
        }),
      );
      return;
    }

    if (typeof annotation.paragraphIndex !== "number") return;
    const target = document.querySelector<HTMLElement>(
      `[data-annotation-paragraph="${annotation.paragraphIndex}"]`,
    );
    target?.scrollIntoView({ behavior: "smooth", block: "center" });
    if (annotation.type === "note") setOpenNoteId(annotation.id);
  }

  function beginDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (isCompact) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    dragRef.current = {
      offsetX: event.clientX - position.x,
      offsetY: event.clientY - position.y,
      pointerId: event.pointerId,
    };
  }

  function moveDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) {
      return;
    }

    setPosition({
      x: clamp(
        event.clientX - dragRef.current.offsetX,
        8,
        Math.max(8, window.innerWidth - 310),
      ),
      y: clamp(
        event.clientY - dragRef.current.offsetY,
        8,
        Math.max(8, window.innerHeight - 120),
      ),
    });
  }

  function endDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) {
      return;
    }

    dragRef.current = null;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(position));
    } catch {
      // Konum kaydı başarısız olsa da araç kutusu çalışmaya devam eder.
    }
  }

  const contextValue = useMemo<PersonalReadingToolsContextValue>(
    () => ({
      activeTool,
      annotations,
      applyPagePointAnchor,
      applyParagraphAnchor,
      applyTextAnchor,
      deleteAnnotation,
      isBusy,
      openNoteId,
      saveDrawing,
      setOpenNoteId,
      setStatus,
      updateNote,
    }),
    [
      activeTool,
      annotations,
      applyPagePointAnchor,
      applyParagraphAnchor,
      applyTextAnchor,
      deleteAnnotation,
      isBusy,
      openNoteId,
      saveDrawing,
      updateNote,
    ],
  );

  const statusMessage = status || toolStatus(activeTool);

  return (
    <PersonalReadingToolsContext.Provider value={contextValue}>
      {children}

      <aside
        aria-label="Kişisel okuma araçları"
        className={styles.palette}
        data-compact={isCompact ? "true" : "false"}
        data-minimized={isMinimized ? "true" : "false"}
        style={
          isCompact
            ? undefined
            : { left: `${position.x}px`, top: `${position.y}px` }
        }
      >
        <header className={styles.header}>
          <button
            aria-label="Araç kutusunu taşı"
            className={styles.dragHandle}
            onPointerDown={beginDrag}
            onPointerMove={moveDrag}
            onPointerUp={endDrag}
            type="button"
          >
            ⋮⋮
          </button>

          <button
            className={styles.titleButton}
            onClick={() => setIsMinimized((current) => !current)}
            type="button"
          >
            <span aria-hidden="true">✎</span>
            <span>
              <strong>Araçlar</strong>
              <small>Sadece sen görürsün</small>
            </span>
          </button>

          <button
            aria-label={isMinimized ? "Araçları aç" : "Araçları küçült"}
            className={styles.minimize}
            onClick={() => setIsMinimized((current) => !current)}
            type="button"
          >
            {isMinimized ? "+" : "−"}
          </button>
        </header>

        {!isMinimized ? (
          <>
            <div className={styles.toolGrid}>
              {toolCards.map((card) => (
                <button
                  aria-pressed={activeTool === card.tool}
                  className={styles.toolCard}
                  data-active={activeTool === card.tool ? "true" : "false"}
                  disabled={isBusy}
                  key={card.tool}
                  onClick={() => selectTool(card.tool)}
                  title={toolInstructions[card.tool]}
                  type="button"
                >
                  <span aria-hidden="true">{card.icon}</span>
                  <small>{card.label}</small>
                </button>
              ))}

              <button
                aria-expanded={isListOpen}
                className={styles.toolCard}
                data-active={isListOpen ? "true" : "false"}
                onClick={() => setIsListOpen((current) => !current)}
                type="button"
              >
                <span aria-hidden="true">≡</span>
                <small>İşaretlerim</small>
              </button>
            </div>

            {pendingNote ? (
              <div className={styles.noteComposer}>
                <strong>Not / Açıklama</strong>
                <p>“{pendingNote.selectedText.slice(0, 120)}”</p>
                <textarea
                  autoFocus
                  maxLength={1200}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  onKeyDown={handleNoteComposerKeyDown}
                  placeholder="Bu kısım hakkında kişisel notunu yaz…"
                  rows={4}
                  value={noteDraft}
                />
                <div>
                  <button
                    disabled={!noteDraft.trim() || isBusy}
                    onClick={() => void savePendingNote()}
                    title="Ctrl/Cmd+Enter"
                    type="button"
                  >
                    Kaydet
                  </button>
                  <button
                    onClick={() =>
                      returnToSelectMode("Not iptal edildi · normal okumaya dönüldü.")
                    }
                    title="Esc"
                    type="button"
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            ) : null}

            {isListOpen ? (
              <div className={styles.annotationList}>
                <div className={styles.listHeading}>
                  <div>
                    <strong>İşaretlerim</strong>
                    <small>{annotations.length} kişisel kayıt</small>
                  </div>
                  {annotations.length > 0 ? (
                    <button
                      disabled={isBusy}
                      onClick={() => void clearAllAnnotations()}
                      type="button"
                    >
                      Tümünü temizle
                    </button>
                  ) : null}
                </div>

                {annotations.length === 0 ? (
                  <p className={styles.empty}>Bu bölümde henüz işaretin yok.</p>
                ) : (
                  <ol>
                    {[...annotations]
                      .sort((left, right) => {
                        const leftIndex = left.paragraphIndex ?? 0;
                        const rightIndex = right.paragraphIndex ?? 0;
                        return leftIndex - rightIndex;
                      })
                      .map((annotation) => (
                        <li key={annotation.id}>
                          <button
                            className={styles.annotationJump}
                            onClick={() => showAnnotation(annotation)}
                            type="button"
                          >
                            <strong>{annotationLabels[annotation.type]}</strong>
                            <span>{annotationPreview(annotation).slice(0, 140)}</span>
                          </button>
                          <button
                            aria-label="İşareti sil"
                            className={styles.annotationDelete}
                            disabled={isBusy}
                            onClick={() =>
                              void deleteAnnotation(annotation.id)
                            }
                            type="button"
                          >
                            ×
                          </button>
                        </li>
                      ))}
                  </ol>
                )}
              </div>
            ) : null}

            <p aria-live="polite" className={styles.status} role="status">
              {statusMessage}
            </p>
          </>
        ) : null}
      </aside>
    </PersonalReadingToolsContext.Provider>
  );
}
