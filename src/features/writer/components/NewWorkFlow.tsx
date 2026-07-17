"use client";

import { useActionState, useMemo, useState } from "react";
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

function countWords(value: string) {
  const normalized = value.trim();
  return normalized ? normalized.split(/\s+/u).length : 0;
}

type SaveState = "kaydedilmedi" | "kaydediliyor" | "kaydedildi";

const dailyWordGoal = 1000;

type NewWorkFlowProps = {
  autoOpen?: boolean;
  initialWork?: WorkWithChapterSummary;
  triggerLabel?: string;
};

function workToDraft(work?: WorkWithChapterSummary): WorkDraft {
  if (!work) return initialDraft;
  return {
    chapterTitle: work.latestChapter?.title ?? writerContent.initialChapter,
    content: work.latestChapter?.content ?? "",
    genre: work.genre,
    summary: work.summary ?? "",
    title: work.title,
  };
}

export function NewWorkFlow({ autoOpen = false, initialWork, triggerLabel = dashboardContent.newWork }: NewWorkFlowProps) {
  const [isOpen, setIsOpen] = useState(autoOpen);
  const [step, setStep] = useState<WriterStep>(autoOpen && initialWork ? "editor" : "create");
  const [draft, setDraft] = useState<WorkDraft>(() => workToDraft(initialWork));
  const [workId, setWorkId] = useState(initialWork?.id ?? "");
  const [chapterId, setChapterId] = useState(initialWork?.latestChapter?.id ?? "");
  const [saveState, setSaveState] = useState<SaveState>("kaydedilmedi");
  const [isFocusMode, setIsFocusMode] = useState(false);

  async function handleCreate(state: typeof initialWorkActionState, formData: FormData) {
    const nextState = await createWorkAction(state, formData);
    if (nextState.status === "success" && nextState.workId && nextState.chapterId) {
      setWorkId(nextState.workId);
      setChapterId(nextState.chapterId);
      setSaveState("kaydedildi");
      setStep("editor");
    }
    return nextState;
  }

  async function handleSave(state: typeof initialWorkActionState, formData: FormData) {
    const nextState = await saveChapterDraftAction(state, formData);
    setSaveState(nextState.status === "success" ? "kaydedildi" : "kaydedilmedi");
    return nextState;
  }

  async function handlePublish(state: typeof initialWorkActionState, formData: FormData) {
    const nextState = await publishWorkAction(state, formData);
    if (nextState.status === "success") {
      setSaveState("kaydedildi");
      setStep("success");
    }
    return nextState;
  }

  const [createState, createAction, isCreating] = useActionState(handleCreate, initialWorkActionState);
  const [draftState, saveAction, isSaving] = useActionState(handleSave, initialWorkActionState);
  const [publishState, publishAction, isPublishing] = useActionState(handlePublish, initialWorkActionState);
  const wordCount = useMemo(() => countWords(draft.content), [draft.content]);
  const characterCount = draft.content.length;
  const readingTime = Math.max(1, Math.ceil(wordCount / 200));
  const goalProgress = Math.min(100, Math.round((wordCount / dailyWordGoal) * 100));

  const saveStatus = {
    kaydedilmedi: writerContent.saveStatus.unsaved,
    kaydediliyor: writerContent.saveStatus.saving,
    kaydedildi: writerContent.saveStatus.saved,
  }[saveState];

  function openFlow() {
    setDraft(workToDraft(initialWork));
    setWorkId(initialWork?.id ?? "");
    setChapterId(initialWork?.latestChapter?.id ?? "");
    setSaveState(initialWork ? "kaydedildi" : "kaydedilmedi");
    setIsFocusMode(false);
    setStep(initialWork ? "editor" : "create");
    setIsOpen(true);
  }

  function closeFlow() {
    setIsOpen(false);
  }

  function updateDraft<Key extends keyof WorkDraft>(key: Key, value: WorkDraft[Key]) {
    setDraft((current) => ({ ...current, [key]: value }));
    if (step === "editor") setSaveState("kaydedilmedi");
  }

  function openPreview() {
    setStep("preview");
  }

  function finishFlow() {
    setIsOpen(false);
  }

  return (
    <>
      <Button onClick={openFlow}>{triggerLabel}</Button>

      {isOpen && step === "create" && (
        <div className="flow-layer flow-layer--form" role="dialog" aria-modal="true" aria-labelledby="new-work-title">
          <section className="new-work-panel">
            <WriterBrand compact />
            <div className="new-work-panel__heading">
              <div>
                <p>{writerContent.create.eyebrow}</p>
                <h2 id="new-work-title">{writerContent.create.title}</h2>
              </div>
              <button className="flow-close" type="button" onClick={closeFlow} aria-label={writerContent.create.closeLabel}>×</button>
            </div>
            <form action={createAction} className="new-work-form">
              <input name="workType" type="hidden" value="novel" />
              <Field label={writerContent.create.titleLabel} name="title" required autoFocus value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} placeholder={writerContent.create.titlePlaceholder} />
              <Field control="select" label={writerContent.create.genreLabel} name="genre" required value={draft.genre} onChange={(event) => updateDraft("genre", event.target.value)}>
                <option value="" disabled>{writerContent.create.genrePlaceholder}</option>
                {writerContent.create.genres.map((genre) => <option value={genre} key={genre}>{genre}</option>)}
              </Field>
              <Field control="textarea" label={writerContent.create.summaryLabel} name="summary" value={draft.summary} onChange={(event) => updateDraft("summary", event.target.value)} placeholder={writerContent.create.summaryPlaceholder} rows={4} />
              {createState.message && <p className="work-action-message" data-state={createState.status} role="status">{createState.message}</p>}
              <Button className="new-work-form__submit" loading={isCreating} type="submit">{writerContent.create.submit}</Button>
            </form>
          </section>
        </div>
      )}

      {isOpen && step === "editor" && (
        <form action={saveAction} className={isFocusMode ? "writer-screen writer-screen--focus" : "writer-screen"} role="dialog" aria-modal="true" aria-label={writerContent.editor.editorLabel(draft.title)}>
          <input name="workId" type="hidden" value={workId} />
          <input name="chapterId" type="hidden" value={chapterId} />
          <input name="genre" type="hidden" value={draft.genre} />
          <input name="summary" type="hidden" value={draft.summary} />
          <header className="writer-toolbar">
            <div className="writer-toolbar__document">
              <WriterBrand compact />
              <div className="writer-toolbar__identity">
                <strong>{draft.title}</strong>
                <span>{draft.chapterTitle}</span>
                <small>{saveStatus}</small>
              </div>
            </div>
            <div className="writer-toolbar__session">
              <span className="writer-save-status" data-state={saveState} role="status">
                <i aria-hidden="true" />
                {saveStatus}
              </span>
              <span className="writer-streak" aria-label={writerContent.editor.streakLabel}>{writerContent.editor.streak}</span>
            </div>
            <div className="writer-toolbar__actions">
              <Button loading={isSaving} type="submit" variant="ghost">{writerContent.editor.saveDraft}</Button>
              <Button variant="outline" onClick={openPreview} disabled={!draft.content.trim()}>{writerContent.editor.preview}</Button>
              <Button formAction={publishAction} loading={isPublishing} type="submit" disabled={!draft.content.trim()}>{writerContent.editor.publish}</Button>
            </div>
          </header>

          <div className="writer-context-bar">
            <div className="writer-goal" aria-label={writerContent.editor.goalLabel(goalProgress)}>
              <div>
                <span>{writerContent.editor.dailyGoal}</span>
                <strong>{wordCount} / {dailyWordGoal}</strong>
              </div>
              <progress max={100} value={goalProgress}>%{goalProgress}</progress>
              <span>%{goalProgress}</span>
            </div>
            <button
              className="focus-mode-toggle"
              type="button"
              aria-pressed={isFocusMode}
              onClick={() => setIsFocusMode((current) => !current)}
            >
              <span aria-hidden="true">◉</span>
              {isFocusMode ? writerContent.editor.exitFocus : writerContent.editor.focus}
            </button>
          </div>

          <main className="writer-canvas">
            <input className="writer-work-title" name="workTitle" aria-label={writerContent.create.titleLabel} value={draft.title} onChange={(event) => updateDraft("title", event.target.value)} />
            <input className="writer-title" name="chapterTitle" aria-label={writerContent.editor.chapterTitleLabel} value={draft.chapterTitle} onChange={(event) => updateDraft("chapterTitle", event.target.value)} autoFocus />
            <p className="writer-subtitle">{writerContent.editor.subtitle}</p>
            <textarea className="writer-textarea" name="content" aria-label={writerContent.editor.bodyLabel} value={draft.content} onChange={(event) => updateDraft("content", event.target.value)} placeholder={writerContent.editor.bodyPlaceholder} />
            {(draftState.message || publishState.message) && (
              <p className="work-action-message" data-state={publishState.status === "error" ? "error" : draftState.status} role="status">
                {publishState.status === "error" ? publishState.message : draftState.message}
              </p>
            )}
          </main>
          <footer className="writer-footer" aria-label={writerContent.editor.statisticsLabel}>
            <div className="writer-footer__stat"><span>{writerContent.editor.wordCount}</span><strong>{wordCount}</strong></div>
            <div className="writer-footer__stat"><span>{writerContent.editor.characterCount}</span><strong>{characterCount}</strong></div>
            <div className="writer-footer__stat"><span>{writerContent.editor.readingTime}</span><strong>{readingTime} {writerContent.editor.minuteUnit}</strong></div>
            <div className="writer-footer__stat"><span>{writerContent.editor.writingGoal}</span><strong>%{goalProgress}</strong></div>
          </footer>
        </form>
      )}

      {isOpen && step === "preview" && (
        <div className="publish-preview" role="dialog" aria-modal="true" aria-labelledby="preview-title">
          <header className="preview-toolbar">
            <Button variant="ghost" onClick={() => setStep("editor")}>{writerContent.preview.back}</Button>
            <div className="preview-toolbar__brand">
              <WriterBrand compact />
              <span>{writerContent.preview.title}</span>
            </div>
            <form action={publishAction}>
              <input name="workId" type="hidden" value={workId} />
              <input name="chapterId" type="hidden" value={chapterId} />
              <input name="workTitle" type="hidden" value={draft.title} />
              <input name="genre" type="hidden" value={draft.genre} />
              <input name="summary" type="hidden" value={draft.summary} />
              <input name="chapterTitle" type="hidden" value={draft.chapterTitle} />
              <input name="content" type="hidden" value={draft.content} />
              <Button loading={isPublishing} type="submit">{writerContent.preview.publish}</Button>
            </form>
          </header>
          <article className="preview-article">
            <p>{draft.genre}</p>
            <h1 id="preview-title">{draft.chapterTitle}</h1>
            <span>{draft.title}</span>
            <div className="preview-article__body">{draft.content}</div>
          </article>
        </div>
      )}

      {isOpen && step === "success" && (
        <div className="publish-success" role="dialog" aria-modal="true" aria-labelledby="success-title">
          <WriterBrand compact />
          <div className="publish-success__content">
            <h2 id="success-title">{writerContent.success.title}</h2>
            <p>{writerContent.success.description}</p>
            <Button onClick={finishFlow}>{writerContent.success.action}</Button>
          </div>
        </div>
      )}
    </>
  );
}
