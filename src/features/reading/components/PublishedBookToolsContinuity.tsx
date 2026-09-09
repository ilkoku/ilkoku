"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from "react";

import {
  clearPersonalBookAnnotationsAction,
  createPersonalBookAnnotationAction,
  deletePersonalBookAnnotationAction,
  updatePersonalBookAnnotationNoteAction,
} from "../personal-book-annotations";
import type {
  PersonalBookAnnotationRecord,
  PersonalBookTextAnchor,
} from "../personal-book-annotation-types";
import {
  parsePersonalPagePointAnchor,
  type PersonalPagePointAnchor,
} from "../personal-page-point-anchor";
import styles from "./PersonalReadingToolsProvider.module.css";

export type PublishedBookReadingActiveTool =
  | "highlight"
  | "underline"
  | "pin"
  | "reading_position"
  | "note"
  | "eraser"
  | null;

export type PublishedBookNavigateRequest = {
  nonce: number;
  pageIndex?: number;
  startOffset?: number;
};

type PublishedBookToolsContextValue = {
  activeTool: PublishedBookReadingActiveTool;
  annotations: PersonalBookAnnotationRecord[];
  applyPagePointAnchor: (anchor: PersonalPagePointAnchor) => Promise<boolean>;
  applyTextAnchor: (anchor: PersonalBookTextAnchor) => Promise<boolean>;
  deleteAnnotation: (annotationId: string) => Promise<boolean>;
  isBusy: boolean;
  navigateRequest: PublishedBookNavigateRequest | null;
  openNoteId: string | null;
  setOpenNoteId: (annotationId: string | null) => void;
  setStatus: (message: string) => void;
  updateNote: (annotationId: string, note: string) => Promise<boolean>;
};

const PublishedBookToolsContext =
  createContext<PublishedBookToolsContextValue | null>(null);

const toolCards: Array<{
  icon: string;
  label: string;
  title: string;
  tool: Exclude<PublishedBookReadingActiveTool, null>;
}> = [
  {
    icon: "▰",
    label: "Vurgula",
    title: "Metni seç. Vurgu uygulanınca araç otomatik kapanır.",
    tool: "highlight",
  },
  {
    icon: "U",
    label: "Altını Çiz",
    title: "Metni seç. Alt çizgi uygulanınca araç otomatik kapanır.",
    tool: "underline",
  },
  {
    icon: "⌖",
    label: "İğne",
    title: "Kitap sayfasında istediğin noktaya bir kez tıkla veya dokun.",
    tool: "pin",
  },
  {
    icon: "⌑",
    label: "Kaldığım Yer",
    title: "Kaldığın noktaya bir kez tıkla veya dokun; eski konumun yenilenir.",
    tool: "reading_position",
  },
  {
    icon: "▱",
    label: "Not",
    title: "Not bağlamak istediğin metni seç; kaydedince küçük not işareti görünür.",
    tool: "note",
  },
  {
    icon: "⌫",
    label: "Silgi",
    title: "Kişisel işaretlere tıkla; varsa eski çizgilerin üzerinden sürükle.",
    tool: "eraser",
  },
];

const annotationLabels: Record<PersonalBookAnnotationRecord["type"], string> = {
  highlight: "Vurgu",
  underline: "Alt çizgi",
  pin: "İğne",
  reading_position: "Kaldığım yer",
  note: "Not",
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function toolStatus(tool: PublishedBookReadingActiveTool) {
  if (!tool) return "Normal okuma · işaretlerin yalnızca sana görünür.";
  const card = toolCards.find((candidate) => candidate.tool === tool);
  return card ? `${card.label} aktif · ${card.title}` : "Normal okuma.";
}

function annotationPreview(annotation: PersonalBookAnnotationRecord) {
  if (annotation.note) return annotation.note;
  if (annotation.selectedText) return annotation.selectedText;
  const pagePoint = parsePersonalPagePointAnchor(annotation.pathData);
  if (pagePoint) return `${pagePoint.pageIndex + 1}. sayfa`;
  return "Kişisel işaret";
}

export function usePublishedBookTools() {
  return useContext(PublishedBookToolsContext);
}

export function PublishedBookToolsContinuity({
  children,
  initialAnnotations,
  publicationItemId,
  userKey,
  workId,
}: {
  children: ReactNode;
  initialAnnotations: PersonalBookAnnotationRecord[];
  publicationItemId: string;
  userKey: string;
  workId: string;
}) {
  const [annotations, setAnnotations] = useState(initialAnnotations);
  const [activeTool, setActiveTool] =
    useState<PublishedBookReadingActiveTool>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [isListOpen, setIsListOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isCompact, setIsCompact] = useState(false);
  const [openNoteId, setOpenNoteId] = useState<string | null>(null);
  const [pendingNote, setPendingNote] = useState<PersonalBookTextAnchor | null>(null);
  const [noteDraft, setNoteDraft] = useState("");
  const [status, setStatus] = useState(
    "Normal okuma · işaretlerin yalnızca sana görünür.",
  );
  const [position, setPosition] = useState({ x: 18, y: 150 });
  const [navigateRequest, setNavigateRequest] =
    useState<PublishedBookNavigateRequest | null>(null);
  const dragRef = useRef<{
    offsetX: number;
    offsetY: number;
    pointerId: number;
  } | null>(null);
  const storageKey = `ilkoku:published-book-tools:${userKey}:position:v1`;

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
      if (typeof parsed.x !== "number" || typeof parsed.y !== "number") return;
      setPosition({
        x: clamp(parsed.x, 8, Math.max(8, window.innerWidth - 310)),
        y: clamp(parsed.y, 8, Math.max(8, window.innerHeight - 120)),
      });
    } catch {
      // Yerel araç konumu bozuksa varsayılan konum kullanılır.
    }
  }, [isCompact, storageKey]);

  const returnToSelectMode = useCallback((message: string) => {
    setActiveTool(null);
    setStatus(message);
  }, []);

  const addSavedAnnotation = useCallback(
    (annotation: PersonalBookAnnotationRecord) => {
      setAnnotations((current) => {
        const withoutSameId = current.filter((item) => item.id !== annotation.id);
        const withoutPreviousReadingPosition =
          annotation.type === "reading_position"
            ? withoutSameId.filter((item) => item.type !== "reading_position")
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
        const result = await createPersonalBookAnnotationAction({
          publicationItemId,
          workId,
          ...payload,
        });
        if (result.status !== "saved" || !result.annotation) {
          setStatus(
            result.status === "invalid"
              ? "İşaret konumu doğrulanamadı."
              : "Bu yayın sayfası için işaret kaydı şu anda kullanılamıyor.",
          );
          return null;
        }
        addSavedAnnotation(result.annotation);
        return result.annotation;
      } catch {
        setStatus("İşaret kaydedilemedi. Bağlantını kontrol et.");
        return null;
      } finally {
        setIsBusy(false);
      }
    },
    [addSavedAnnotation, isBusy, publicationItemId, workId],
  );

  const applyTextAnchor = useCallback(
    async (anchor: PersonalBookTextAnchor) => {
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
        setStatus("Notunu yaz · kaydettiğinde yalnızca sana görünür.");
        return true;
      }

      const tool = activeTool;
      const saved = await createAnnotation({ ...anchor, type: tool });
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
      if (activeTool !== "pin" && activeTool !== "reading_position") {
        return false;
      }
      const tool = activeTool;
      const saved = await createAnnotation({ pagePoint: anchor, type: tool });
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

  const deleteAnnotation = useCallback(async (annotationId: string) => {
    if (isBusy) return false;
    setIsBusy(true);
    try {
      const result = await deletePersonalBookAnnotationAction(annotationId);
      if (result.status !== "deleted") {
        setStatus("İşaret silinemedi.");
        return false;
      }
      setAnnotations((current) => current.filter((item) => item.id !== annotationId));
      setOpenNoteId((current) => (current === annotationId ? null : current));
      setStatus("İşaret silindi.");
      return true;
    } catch {
      setStatus("İşaret silinemedi.");
      return false;
    } finally {
      setIsBusy(false);
    }
  }, [isBusy]);

  const updateNote = useCallback(async (annotationId: string, note: string) => {
    const normalized = note.trim();
    if (!normalized || normalized.length > 1_200 || isBusy) return false;
    setIsBusy(true);
    try {
      const result = await updatePersonalBookAnnotationNoteAction({
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
            ? { ...item, note: normalized, updatedAt: new Date().toISOString() }
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
  }, [isBusy]);

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

  async function clearAllAnnotations() {
    if (
      isBusy ||
      annotations.length === 0 ||
      !window.confirm("Bu kitap sayfasındaki tüm kişisel işaretlerini silmek istiyor musun?")
    ) {
      return;
    }
    setIsBusy(true);
    try {
      const result = await clearPersonalBookAnnotationsAction({
        publicationItemId,
        workId,
      });
      if (result.status !== "cleared") {
        setStatus("İşaretler temizlenemedi.");
        return;
      }
      setAnnotations([]);
      setOpenNoteId(null);
      setPendingNote(null);
      setStatus("Bu kitap sayfasındaki kişisel işaretlerin temizlendi.");
    } catch {
      setStatus("İşaretler temizlenemedi.");
    } finally {
      setIsBusy(false);
    }
  }

  function selectTool(tool: Exclude<PublishedBookReadingActiveTool, null>) {
    const nextTool = activeTool === tool ? null : tool;
    setActiveTool(nextTool);
    setPendingNote(null);
    setNoteDraft("");
    setStatus(
      nextTool ? toolStatus(nextTool) : "Normal okuma · araç kapatıldı.",
    );
  }

  function showAnnotation(annotation: PersonalBookAnnotationRecord) {
    const point = parsePersonalPagePointAnchor(annotation.pathData);
    const nonce = Date.now();
    if (point) {
      setNavigateRequest({ nonce, pageIndex: point.pageIndex });
    } else if (typeof annotation.startOffset === "number") {
      setNavigateRequest({ nonce, startOffset: annotation.startOffset });
    }
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
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    setPosition({
      x: clamp(event.clientX - dragRef.current.offsetX, 8, Math.max(8, window.innerWidth - 310)),
      y: clamp(event.clientY - dragRef.current.offsetY, 8, Math.max(8, window.innerHeight - 120)),
    });
  }

  function endDrag(event: ReactPointerEvent<HTMLButtonElement>) {
    if (!dragRef.current || dragRef.current.pointerId !== event.pointerId) return;
    dragRef.current = null;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(position));
    } catch {
      // Konum kaydı başarısız olsa da araçlar çalışmaya devam eder.
    }
  }

  const openNote = annotations.find((item) => item.id === openNoteId && item.type === "note") ?? null;
  const contextValue = useMemo<PublishedBookToolsContextValue>(
    () => ({
      activeTool,
      annotations,
      applyPagePointAnchor,
      applyTextAnchor,
      deleteAnnotation,
      isBusy,
      navigateRequest,
      openNoteId,
      setOpenNoteId,
      setStatus,
      updateNote,
    }),
    [
      activeTool,
      annotations,
      applyPagePointAnchor,
      applyTextAnchor,
      deleteAnnotation,
      isBusy,
      navigateRequest,
      openNoteId,
      updateNote,
    ],
  );

  return (
    <PublishedBookToolsContext.Provider value={contextValue}>
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
                  title={card.title}
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
                title="Kişisel işaretlerini görüntüle."
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
                  maxLength={1_200}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  placeholder="Bu kısım hakkında kişisel notunu yaz…"
                  rows={4}
                  value={noteDraft}
                />
                <div>
                  <button
                    disabled={isBusy || !noteDraft.trim()}
                    onClick={() => void savePendingNote()}
                    type="button"
                  >
                    Kaydet
                  </button>
                  <button
                    onClick={() => {
                      setPendingNote(null);
                      setNoteDraft("");
                      setActiveTool(null);
                      setStatus("Not iptal edildi · normal okumaya dönüldü.");
                    }}
                    type="button"
                  >
                    Vazgeç
                  </button>
                </div>
              </div>
            ) : null}

            {openNote ? (
              <div className={styles.noteComposer}>
                <strong>Kişisel Not</strong>
                {openNote.selectedText ? (
                  <p>“{openNote.selectedText.slice(0, 120)}”</p>
                ) : null}
                <textarea
                  maxLength={1_200}
                  onChange={(event) => setNoteDraft(event.target.value)}
                  onFocus={() => setNoteDraft(openNote.note ?? "")}
                  rows={4}
                  value={noteDraft || openNote.note || ""}
                />
                <div>
                  <button
                    disabled={isBusy || !(noteDraft || openNote.note || "").trim()}
                    onClick={() => void updateNote(openNote.id, noteDraft || openNote.note || "")}
                    type="button"
                  >
                    Güncelle
                  </button>
                  <button onClick={() => setOpenNoteId(null)} type="button">
                    Kapat
                  </button>
                </div>
              </div>
            ) : null}

            {isListOpen ? (
              <div className={styles.annotationList}>
                <div className={styles.listHeading}>
                  <div>
                    <strong>İşaretlerim</strong>
                    <small>{annotations.length} kişisel işaret</small>
                  </div>
                  <button
                    disabled={isBusy || annotations.length === 0}
                    onClick={() => void clearAllAnnotations()}
                    type="button"
                  >
                    Tümünü Sil
                  </button>
                </div>

                {annotations.length > 0 ? (
                  <ol>
                    {annotations.map((annotation) => (
                      <li key={annotation.id}>
                        <button
                          className={styles.annotationJump}
                          onClick={() => showAnnotation(annotation)}
                          type="button"
                        >
                          <strong>{annotationLabels[annotation.type]}</strong>
                          <span>{annotationPreview(annotation)}</span>
                        </button>
                        <button
                          aria-label="İşareti sil"
                          className={styles.annotationDelete}
                          disabled={isBusy}
                          onClick={() => void deleteAnnotation(annotation.id)}
                          type="button"
                        >
                          ×
                        </button>
                      </li>
                    ))}
                  </ol>
                ) : (
                  <p className={styles.empty}>Bu sayfada henüz kişisel işaret yok.</p>
                )}
              </div>
            ) : null}

            <p aria-live="polite" className={styles.status} role="status">
              {status || toolStatus(activeTool)}
            </p>
          </>
        ) : null}
      </aside>
    </PublishedBookToolsContext.Provider>
  );
}
