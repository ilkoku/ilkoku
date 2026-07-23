"use client";

import {
  startTransition,
  useActionState,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { dashboardContent, writerContent } from "@/content";
import {
  createWorkAction,
  publishWorkAction,
  saveChapterDraftAction,
} from "@/features/works/actions";
import {
  initialWorkActionState,
  type WorkWithChapterSummary,
} from "@/features/works/types";

import type { WorkDraft, WriterStep } from "../types";
import { WriterBrand } from "./WriterBrand";

const initialDraft: WorkDraft = {
  title: "",
  genre: "",
  summary: "",
  chapterTitle: writerContent.initialChapter,
  content: "",
};

const dailyWordGoal = 1000;

function subscribeToClient() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

type SaveState =
  | "kaydedilmedi"
  | "kaydediliyor"
  | "kaydedildi";

type ChapterSummary = NonNullable<
  WorkWithChapterSummary["latestChapter"]
>;

type WorkWithChapters =
  WorkWithChapterSummary & {
    chapters?: ChapterSummary[];
  };

type NewWorkFlowProps = {
  autoOpen?: boolean;
  initialWork?: WorkWithChapters;
  triggerLabel?: string;
};

function countWords(value: string) {
  const normalized = value.trim();

  return normalized
    ? normalized.split(/\s+/u).length
    : 0;
}

function getInitialChapters(
  work?: WorkWithChapters,
): ChapterSummary[] {
  if (!work) {
    return [];
  }

  if (work.chapters?.length) {
    return [...work.chapters].sort(
      (left, right) =>
        left.position - right.position,
    );
  }

  return work.latestChapter
    ? [work.latestChapter]
    : [];
}

function getInitialChapter(
  work?: WorkWithChapters,
) {
  const chapters = getInitialChapters(work);

  if (!chapters.length) {
    return null;
  }

  if (work?.latestChapter) {
    return (
      chapters.find(
        (chapter) =>
          chapter.id ===
          work.latestChapter?.id,
      ) ?? chapters[0]
    );
  }

  return chapters[0];
}

function workToDraft(
  work?: WorkWithChapters,
  chapter?: ChapterSummary | null,
): WorkDraft {
  if (!work) {
    return initialDraft;
  }

  const selectedChapter =
    chapter ?? getInitialChapter(work);

  return {
    chapterTitle:
      selectedChapter?.title ??
      writerContent.initialChapter,

    content:
      selectedChapter?.content ?? "",

    genre:
      work.genre ?? "",

    summary:
      work.description ?? "",

    title:
      work.title,
  };
}

export function NewWorkFlow({
  autoOpen = false,
  initialWork,
  triggerLabel = dashboardContent.newWork,
}: NewWorkFlowProps) {
  const initialChapter =
    getInitialChapter(initialWork);

  const mounted = useSyncExternalStore(
    subscribeToClient,
    getClientSnapshot,
    getServerSnapshot,
  );

  const [isOpen, setIsOpen] =
    useState(autoOpen);

  const [step, setStep] =
    useState<WriterStep>(
      autoOpen && initialWork
        ? "editor"
        : "create",
    );

  const [chapters, setChapters] =
    useState<ChapterSummary[]>(() =>
      getInitialChapters(initialWork),
    );

  const [draft, setDraft] =
    useState<WorkDraft>(() =>
      workToDraft(
        initialWork,
        initialChapter,
      ),
    );

  const [workId, setWorkId] =
    useState(initialWork?.id ?? "");

  const [chapterId, setChapterId] =
    useState(initialChapter?.id ?? "");

  const [saveState, setSaveState] =
    useState<SaveState>(
      initialWork
        ? "kaydedildi"
        : "kaydedilmedi",
    );

  const [isFocusMode, setIsFocusMode] =
    useState(false);

  const autosaveTimeout =
    useRef<ReturnType<typeof setTimeout> | null>(
      null,
    );

  const activeChapter = useMemo(
    () =>
      chapters.find(
        (chapter) =>
          chapter.id === chapterId,
      ) ?? null,
    [chapterId, chapters],
  );

  async function handleCreate(
    state: typeof initialWorkActionState,
    formData: FormData,
  ) {
    const nextState =
      await createWorkAction(
        state,
        formData,
      );

    if (
      nextState.status === "success" &&
      nextState.workId &&
      nextState.chapterId
    ) {
      const createdChapter: ChapterSummary = {
        content: "",
        id: nextState.chapterId,
        position: 1,
        slug: "bolum-1",
        status: "draft",
        title:
          draft.chapterTitle ||
          writerContent.initialChapter,
        updatedAt:
          new Date().toISOString(),
        wordCount: 0,
      };

      setWorkId(nextState.workId);
      setChapterId(nextState.chapterId);
      setChapters([createdChapter]);
      setSaveState("kaydedildi");
      setStep("editor");
    }

    return nextState;
  }

  async function handleSave(
    state: typeof initialWorkActionState,
    formData: FormData,
  ) {
    const savedChapterId =
      String(
        formData.get("chapterId") ?? "",
      );

    const savedChapterTitle =
      String(
        formData.get("chapterTitle") ?? "",
      );

    const savedContent =
      String(
        formData.get("content") ?? "",
      );

    const nextState =
      await saveChapterDraftAction(
        state,
        formData,
      );

    if (
      nextState.status === "success"
    ) {
      setChapters((current) =>
        current.map((chapter) =>
          chapter.id === savedChapterId
            ? {
                ...chapter,
                content: savedContent,
                title:
                  savedChapterTitle,
                updatedAt:
                  new Date().toISOString(),
                wordCount:
                  countWords(savedContent),
              }
            : chapter,
        ),
      );

      setSaveState("kaydedildi");
    } else {
      setSaveState("kaydedilmedi");
    }

    return nextState;
  }

  async function handlePublish(
    state: typeof initialWorkActionState,
    formData: FormData,
  ) {
    const publishedChapterId =
      String(
        formData.get("chapterId") ?? "",
      );

    const nextState =
      await publishWorkAction(
        state,
        formData,
      );

    if (
      nextState.status === "success"
    ) {
      setChapters((current) =>
        current.map((chapter) =>
          chapter.id ===
          publishedChapterId
            ? {
                ...chapter,
                status: "published",
                updatedAt:
                  new Date().toISOString(),
              }
            : chapter,
        ),
      );

      setSaveState("kaydedildi");
      setStep("success");
    }

    return nextState;
  }

  const [
    createState,
    createAction,
    isCreating,
  ] = useActionState(
    handleCreate,
    initialWorkActionState,
  );

  const [
    draftState,
    saveAction,
    isSaving,
  ] = useActionState(
    handleSave,
    initialWorkActionState,
  );

  const [
    publishState,
    publishAction,
    isPublishing,
  ] = useActionState(
    handlePublish,
    initialWorkActionState,
  );

  const wordCount = useMemo(
    () => countWords(draft.content),
    [draft.content],
  );

  const totalWordCount = useMemo(
    () =>
      chapters.reduce(
        (total, chapter) =>
          total +
          (chapter.id === chapterId
            ? wordCount
            : chapter.wordCount),
        0,
      ),
    [chapterId, chapters, wordCount],
  );

  const characterCount =
    draft.content.length;

  const readingTime = Math.max(
    1,
    Math.ceil(wordCount / 200),
  );

  const goalProgress = Math.min(
    100,
    Math.round(
      (wordCount / dailyWordGoal) *
        100,
    ),
  );

  const saveStatus = {
    kaydedilmedi:
      writerContent.saveStatus.unsaved,
    kaydediliyor:
      writerContent.saveStatus.saving,
    kaydedildi:
      writerContent.saveStatus.saved,
  }[saveState];

  const hasUnsavedChanges =
    useMemo(() => {
      if (!isOpen) {
        return false;
      }

      if (step === "create") {
        return Boolean(
          draft.title.trim() ||
            draft.genre.trim() ||
            draft.summary.trim(),
        );
      }

      if (
        step === "editor" ||
        step === "preview"
      ) {
        return (
          saveState ===
            "kaydedilmedi" ||
          saveState ===
            "kaydediliyor"
        );
      }

      return false;
    }, [
      draft,
      isOpen,
      saveState,
      step,
    ]);

  function resetFromInitialWork() {
    const nextChapters =
      getInitialChapters(initialWork);

    const nextChapter =
      getInitialChapter(initialWork);

    setChapters(nextChapters);

    setDraft(
      workToDraft(
        initialWork,
        nextChapter,
      ),
    );

    setWorkId(
      initialWork?.id ?? "",
    );

    setChapterId(
      nextChapter?.id ?? "",
    );

    setSaveState(
      initialWork
        ? "kaydedildi"
        : "kaydedilmedi",
    );

    setIsFocusMode(false);

    setStep(
      initialWork
        ? "editor"
        : "create",
    );
  }

  function openFlow() {
    resetFromInitialWork();
    setIsOpen(true);
  }

  function clearAutosave() {
    if (
      autosaveTimeout.current
    ) {
      clearTimeout(
        autosaveTimeout.current,
      );

      autosaveTimeout.current =
        null;
    }
  }

  function closeFlow() {
    if (hasUnsavedChanges) {
      const shouldClose =
        window.confirm(
          "Kaydedilmemiş değişiklikleriniz var. Çıkmak istediğinize emin misiniz?",
        );

      if (!shouldClose) {
        return;
      }
    }

    clearAutosave();
    setIsFocusMode(false);
    setIsOpen(false);
  }

  function updateDraft<
    Key extends keyof WorkDraft,
  >(
    key: Key,
    value: WorkDraft[Key],
  ) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));

    if (step === "editor") {
      setSaveState(
        "kaydedilmedi",
      );
    }
  }

  function selectChapter(
    nextChapter: ChapterSummary,
  ) {
    if (
      nextChapter.id === chapterId
    ) {
      return;
    }

    if (
      saveState === "kaydediliyor" ||
      isSaving
    ) {
      window.alert(
        "Kayıt işlemi tamamlanmadan bölüm değiştiremezsiniz.",
      );

      return;
    }

    if (
      saveState === "kaydedilmedi"
    ) {
      const shouldSwitch =
        window.confirm(
          "Bu bölümde kaydedilmemiş değişiklikler var. Bölüm değiştirmek istediğinize emin misiniz?",
        );

      if (!shouldSwitch) {
        return;
      }
    }

    clearAutosave();

    setChapterId(nextChapter.id);

    setDraft((current) => ({
      ...current,
      chapterTitle:
        nextChapter.title,
      content:
        nextChapter.content,
    }));

    setSaveState("kaydedildi");
  }

  useEffect(() => {
    if (
      !mounted ||
      !isOpen
    ) {
      return;
    }

    document.body.classList.add(
      "writer-flow-open",
    );

    function closeOnEscape(
      event: KeyboardEvent,
    ) {
      if (
        event.key !== "Escape"
      ) {
        return;
      }

      if (hasUnsavedChanges) {
        const shouldClose =
          window.confirm(
            "Kaydedilmemiş değişiklikleriniz var. Çıkmak istediğinize emin misiniz?",
          );

        if (!shouldClose) {
          return;
        }
      }

      clearAutosave();
      setIsFocusMode(false);
      setIsOpen(false);
    }

    document.addEventListener(
      "keydown",
      closeOnEscape,
    );

    return () => {
      document.body.classList.remove(
        "writer-flow-open",
      );

      document.removeEventListener(
        "keydown",
        closeOnEscape,
      );
    };
  }, [
    hasUnsavedChanges,
    isOpen,
    mounted,
  ]);

  useEffect(() => {
    if (!hasUnsavedChanges) {
      return;
    }

    function warnBeforeUnload(
      event: BeforeUnloadEvent,
    ) {
      event.preventDefault();
      event.returnValue = "";
    }

    window.addEventListener(
      "beforeunload",
      warnBeforeUnload,
    );

    return () => {
      window.removeEventListener(
        "beforeunload",
        warnBeforeUnload,
      );
    };
  }, [hasUnsavedChanges]);

  useEffect(() => {
    if (
      !isOpen ||
      step !== "editor"
    ) {
      return;
    }

    if (
      !workId ||
      !chapterId
    ) {
      return;
    }

    if (
      saveState !==
      "kaydedilmedi"
    ) {
      return;
    }

    clearAutosave();

    const autosaveWorkId =
      workId;

    const autosaveChapterId =
      chapterId;

    const autosaveDraft = {
      ...draft,
    };

    autosaveTimeout.current =
      setTimeout(() => {
        const formData =
          new FormData();

        formData.set(
          "workId",
          autosaveWorkId,
        );

        formData.set(
          "chapterId",
          autosaveChapterId,
        );

        formData.set(
          "workTitle",
          autosaveDraft.title,
        );

        formData.set(
          "chapterTitle",
          autosaveDraft.chapterTitle,
        );

        formData.set(
          "genre",
          autosaveDraft.genre,
        );

        formData.set(
          "summary",
          autosaveDraft.summary,
        );

        formData.set(
          "content",
          autosaveDraft.content,
        );

        setSaveState(
          "kaydediliyor",
        );

        startTransition(() => {
          saveAction(formData);
        });
      }, 15000);

    return clearAutosave;
  }, [
    chapterId,
    draft,
    isOpen,
    saveAction,
    saveState,
    step,
    workId,
  ]);

  function openPreview() {
    clearAutosave();
    setStep("preview");
  }

  function finishFlow() {
    clearAutosave();
    setIsOpen(false);
  }

  return (
    <>
      {!autoOpen && (
        <Button
          type="button"
          onClick={openFlow}
        >
          {triggerLabel}
        </Button>
      )}

      {mounted && isOpen
        ? createPortal(
            <>
              {step ===
                "create" && (
                <div
                  className="flow-layer flow-layer--form"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="new-work-title"
                >
                  <section className="new-work-panel">
                    <WriterBrand
                      compact
                    />

                    <div className="new-work-panel__heading">
                      <div>
                        <p>
                          {
                            writerContent
                              .create
                              .eyebrow
                          }
                        </p>

                        <h2 id="new-work-title">
                          {
                            writerContent
                              .create
                              .title
                          }
                        </h2>
                      </div>

                      <button
                        className="flow-close"
                        type="button"
                        onClick={
                          closeFlow
                        }
                        aria-label={
                          writerContent
                            .create
                            .closeLabel
                        }
                      >
                        ×
                      </button>
                    </div>

                    <form
                      action={
                        createAction
                      }
                      className="new-work-form"
                    >
                      <input
                        name="workType"
                        type="hidden"
                        value="novel"
                      />

                      <Field
                        label={
                          writerContent
                            .create
                            .titleLabel
                        }
                        name="title"
                        required
                        autoFocus
                        value={
                          draft.title
                        }
                        onChange={(
                          event,
                        ) =>
                          updateDraft(
                            "title",
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder={
                          writerContent
                            .create
                            .titlePlaceholder
                        }
                      />

                      <Field
                        control="select"
                        label={
                          writerContent
                            .create
                            .genreLabel
                        }
                        name="genre"
                        required
                        value={
                          draft.genre
                        }
                        onChange={(
                          event,
                        ) =>
                          updateDraft(
                            "genre",
                            event
                              .target
                              .value,
                          )
                        }
                      >
                        <option
                          value=""
                          disabled
                        >
                          {
                            writerContent
                              .create
                              .genrePlaceholder
                          }
                        </option>

                        {writerContent.create.genres.map(
                          (
                            genre,
                          ) => (
                            <option
                              value={
                                genre
                              }
                              key={
                                genre
                              }
                            >
                              {
                                genre
                              }
                            </option>
                          ),
                        )}
                      </Field>

                      <Field
                        control="textarea"
                        label={
                          writerContent
                            .create
                            .summaryLabel
                        }
                        name="summary"
                        value={
                          draft.summary
                        }
                        onChange={(
                          event,
                        ) =>
                          updateDraft(
                            "summary",
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder={
                          writerContent
                            .create
                            .summaryPlaceholder
                        }
                        rows={4}
                      />

                      {createState.message && (
                        <p
                          className="work-action-message"
                          data-state={
                            createState.status
                          }
                          role="status"
                        >
                          {
                            createState.message
                          }
                        </p>
                      )}

                      <Button
                        className="new-work-form__submit"
                        loading={
                          isCreating
                        }
                        type="submit"
                      >
                        {
                          writerContent
                            .create
                            .submit
                        }
                      </Button>
                    </form>
                  </section>
                </div>
              )}

              {step ===
                "editor" && (
                <form
                  action={
                    saveAction
                  }
                  className={
                    isFocusMode
                      ? "writer-screen writer-screen--focus"
                      : "writer-screen"
                  }
                  role="dialog"
                  aria-modal="true"
                  aria-label={writerContent.editor.editorLabel(
                    draft.title,
                  )}
                >
                  <input
                    name="workId"
                    type="hidden"
                    value={workId}
                  />

                  <input
                    name="chapterId"
                    type="hidden"
                    value={
                      chapterId
                    }
                  />

                  <input
                    name="genre"
                    type="hidden"
                    value={
                      draft.genre
                    }
                  />

                  <input
                    name="summary"
                    type="hidden"
                    value={
                      draft.summary
                    }
                  />

                  <header className="writer-toolbar">
                    <div className="writer-toolbar__document">
                      <WriterBrand
                        compact
                      />

                      <div className="writer-toolbar__identity">
                        <strong>
                          {
                            draft.title
                          }
                        </strong>

                        <span>
                          {
                            draft.chapterTitle
                          }
                        </span>

                        <small>
                          {
                            saveStatus
                          }
                        </small>
                      </div>
                    </div>

                    <div className="writer-toolbar__session">
                      <span
                        className="writer-save-status"
                        data-state={
                          saveState
                        }
                        role="status"
                      >
                        <i
                          aria-hidden="true"
                        />

                        {
                          saveStatus
                        }
                      </span>

                      <span
                        className="writer-streak"
                        aria-label={
                          writerContent
                            .editor
                            .streakLabel
                        }
                      >
                        {
                          writerContent
                            .editor
                            .streak
                        }
                      </span>
                    </div>

                    <div className="writer-toolbar__actions">
                      <Button
                        type="button"
                        variant="ghost"
                        onClick={
                          closeFlow
                        }
                      >
                        ← Geri
                      </Button>

                      <Button
                        loading={
                          isSaving
                        }
                        type="submit"
                        variant="ghost"
                      >
                        {
                          writerContent
                            .editor
                            .saveDraft
                        }
                      </Button>

                      <Button
                        type="button"
                        variant="outline"
                        onClick={
                          openPreview
                        }
                        disabled={
                          !draft.content.trim()
                        }
                      >
                        {
                          writerContent
                            .editor
                            .preview
                        }
                      </Button>

                      <Button
                        formAction={
                          publishAction
                        }
                        loading={
                          isPublishing
                        }
                        type="submit"
                        disabled={
                          !draft.content.trim()
                        }
                      >
                        {
                          writerContent
                            .editor
                            .publish
                        }
                      </Button>
                    </div>
                  </header>

                  <div className="writer-context-bar">
                    <div
                      className="writer-goal"
                      aria-label={writerContent.editor.goalLabel(
                        goalProgress,
                      )}
                    >
                      <div>
                        <span>
                          {
                            writerContent
                              .editor
                              .dailyGoal
                          }
                        </span>

                        <strong>
                          {
                            wordCount
                          }{" "}
                          /{" "}
                          {
                            dailyWordGoal
                          }
                        </strong>
                      </div>

                      <progress
                        max={
                          100
                        }
                        value={
                          goalProgress
                        }
                      >
                        %
                        {
                          goalProgress
                        }
                      </progress>

                      <span>
                        %
                        {
                          goalProgress
                        }
                      </span>
                    </div>

                    <button
                      className="focus-mode-toggle"
                      type="button"
                      aria-pressed={
                        isFocusMode
                      }
                      onClick={() =>
                        setIsFocusMode(
                          (
                            current,
                          ) =>
                            !current,
                        )
                      }
                    >
                      <span
                        aria-hidden="true"
                      >
                        ◉
                      </span>

                      {isFocusMode
                        ? writerContent
                            .editor
                            .exitFocus
                        : writerContent
                            .editor
                            .focus}
                    </button>
                  </div>

                  <div className="writer-editor-layout">
                    <aside
                      className="writer-chapters"
                      aria-label="Eser bölümleri"
                    >
                      <div className="writer-chapters__header">
                        <div>
                          <span>
                            Bölümler
                          </span>

                          <strong>
                            {
                              chapters.length
                            }
                          </strong>
                        </div>

                        <button
                          type="button"
                          disabled
                          title="Yeni bölüm ekleme bir sonraki adımda açılacak."
                          aria-label="Yeni bölüm ekle"
                        >
                          +
                        </button>
                      </div>

                      <div className="writer-chapters__summary">
                        <span>
                          Toplam
                        </span>

                        <strong>
                          {totalWordCount.toLocaleString(
                            "tr-TR",
                          )}{" "}
                          kelime
                        </strong>
                      </div>

                      <nav className="writer-chapters__list">
                        {chapters.map(
                          (
                            chapter,
                          ) => {
                            const isActive =
                              chapter.id ===
                              chapterId;

                            const chapterWords =
                              isActive
                                ? wordCount
                                : chapter.wordCount;

                            return (
                              <button
                                type="button"
                                className="writer-chapter-item"
                                data-active={
                                  isActive
                                }
                                aria-current={
                                  isActive
                                    ? "page"
                                    : undefined
                                }
                                onClick={() =>
                                  selectChapter(
                                    chapter,
                                  )
                                }
                                key={
                                  chapter.id
                                }
                              >
                                <span className="writer-chapter-item__position">
                                  {
                                    chapter.position
                                  }
                                </span>

                                <span className="writer-chapter-item__content">
                                  <strong>
                                    {
                                      chapter.title
                                    }
                                  </strong>

                                  <small>
                                    {chapterWords.toLocaleString(
                                      "tr-TR",
                                    )}{" "}
                                    kelime
                                  </small>
                                </span>

                                <span
                                  className="writer-chapter-item__status"
                                  aria-hidden="true"
                                >
                                  {isActive
                                    ? "●"
                                    : "›"}
                                </span>
                              </button>
                            );
                          },
                        )}
                      </nav>

                      {activeChapter && (
                        <p className="writer-chapters__updated">
                          Son düzenleme:{" "}
                          {new Intl.DateTimeFormat(
                            "tr-TR",
                            {
                              dateStyle:
                                "medium",
                              timeStyle:
                                "short",
                            },
                          ).format(
                            new Date(
                              activeChapter.updatedAt,
                            ),
                          )}
                        </p>
                      )}
                    </aside>

                    <main className="writer-canvas">
                      <input
                        className="writer-work-title"
                        name="workTitle"
                        aria-label={
                          writerContent
                            .create
                            .titleLabel
                        }
                        value={
                          draft.title
                        }
                        onChange={(
                          event,
                        ) =>
                          updateDraft(
                            "title",
                            event
                              .target
                              .value,
                          )
                        }
                      />

                      <input
                        className="writer-title"
                        name="chapterTitle"
                        aria-label={
                          writerContent
                            .editor
                            .chapterTitleLabel
                        }
                        value={
                          draft.chapterTitle
                        }
                        onChange={(
                          event,
                        ) =>
                          updateDraft(
                            "chapterTitle",
                            event
                              .target
                              .value,
                          )
                        }
                        autoFocus
                      />

                      <p className="writer-subtitle">
                        {
                          writerContent
                            .editor
                            .subtitle
                        }
                      </p>

                      <textarea
                        className="writer-textarea"
                        name="content"
                        aria-label={
                          writerContent
                            .editor
                            .bodyLabel
                        }
                        value={
                          draft.content
                        }
                        onChange={(
                          event,
                        ) =>
                          updateDraft(
                            "content",
                            event
                              .target
                              .value,
                          )
                        }
                        placeholder={
                          writerContent
                            .editor
                            .bodyPlaceholder
                        }
                      />

                      {(draftState.message ||
                        publishState.message) && (
                        <p
                          className="work-action-message"
                          data-state={
                            publishState.status ===
                            "error"
                              ? "error"
                              : draftState.status
                          }
                          role="status"
                        >
                          {publishState.status ===
                          "error"
                            ? publishState.message
                            : draftState.message}
                        </p>
                      )}
                    </main>
                  </div>

                  <footer
                    className="writer-footer"
                    aria-label={
                      writerContent
                        .editor
                        .statisticsLabel
                    }
                  >
                    <div className="writer-footer__stat">
                      <span>
                        {
                          writerContent
                            .editor
                            .wordCount
                        }
                      </span>

                      <strong>
                        {
                          wordCount
                        }
                      </strong>
                    </div>

                    <div className="writer-footer__stat">
                      <span>
                        {
                          writerContent
                            .editor
                            .characterCount
                        }
                      </span>

                      <strong>
                        {
                          characterCount
                        }
                      </strong>
                    </div>

                    <div className="writer-footer__stat">
                      <span>
                        {
                          writerContent
                            .editor
                            .readingTime
                        }
                      </span>

                      <strong>
                        {
                          readingTime
                        }{" "}
                        {
                          writerContent
                            .editor
                            .minuteUnit
                        }
                      </strong>
                    </div>

                    <div className="writer-footer__stat">
                      <span>
                        Toplam eser
                      </span>

                      <strong>
                        {totalWordCount.toLocaleString(
                          "tr-TR",
                        )}
                      </strong>
                    </div>
                  </footer>
                </form>
              )}

              {step ===
                "preview" && (
                <div
                  className="publish-preview"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="preview-title"
                >
                  <header className="preview-toolbar">
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() =>
                        setStep(
                          "editor",
                        )
                      }
                    >
                      {
                        writerContent
                          .preview
                          .back
                      }
                    </Button>

                    <div className="preview-toolbar__brand">
                      <WriterBrand
                        compact
                      />

                      <span>
                        {
                          writerContent
                            .preview
                            .title
                        }
                      </span>
                    </div>

                    <form
                      action={
                        publishAction
                      }
                    >
                      <input
                        name="workId"
                        type="hidden"
                        value={
                          workId
                        }
                      />

                      <input
                        name="chapterId"
                        type="hidden"
                        value={
                          chapterId
                        }
                      />

                      <input
                        name="workTitle"
                        type="hidden"
                        value={
                          draft.title
                        }
                      />

                      <input
                        name="genre"
                        type="hidden"
                        value={
                          draft.genre
                        }
                      />

                      <input
                        name="summary"
                        type="hidden"
                        value={
                          draft.summary
                        }
                      />

                      <input
                        name="chapterTitle"
                        type="hidden"
                        value={
                          draft.chapterTitle
                        }
                      />

                      <input
                        name="content"
                        type="hidden"
                        value={
                          draft.content
                        }
                      />

                      <Button
                        loading={
                          isPublishing
                        }
                        type="submit"
                      >
                        {
                          writerContent
                            .preview
                            .publish
                        }
                      </Button>
                    </form>
                  </header>

                  <article className="preview-article">
                    <p>
                      {
                        draft.genre
                      }
                    </p>

                    <h1 id="preview-title">
                      {
                        draft.chapterTitle
                      }
                    </h1>

                    <span>
                      {
                        draft.title
                      }
                    </span>

                    <div className="preview-article__body">
                      {
                        draft.content
                      }
                    </div>
                  </article>
                </div>
              )}

              {step ===
                "success" && (
                <div
                  className="publish-success"
                  role="dialog"
                  aria-modal="true"
                  aria-labelledby="success-title"
                >
                  <WriterBrand
                    compact
                  />

                  <div className="publish-success__content">
                    <h2 id="success-title">
                      {
                        writerContent
                          .success
                          .title
                      }
                    </h2>

                    <p>
                      {
                        writerContent
                          .success
                          .description
                      }
                    </p>

                    <Button
                      type="button"
                      onClick={
                        finishFlow
                      }
                    >
                      {
                        writerContent
                          .success
                          .action
                      }
                    </Button>
                  </div>
                </div>
              )}
            </>,
            document.body,
          )
        : null}
    </>
  );
}