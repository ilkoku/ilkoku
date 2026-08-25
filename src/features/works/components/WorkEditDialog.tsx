"use client";

import {
  useActionState,
  useEffect,
  useSyncExternalStore,
} from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { workspaceContent } from "@/content";
import {
  parseWorkContentWarnings,
  workContentRatingDetails,
  workContentRatings,
  workContentWarningDetails,
  workContentWarnings,
} from "@/lib/work-content-classification";

import { updateWorkAction } from "../actions";
import {
  initialWorkActionState,
  type WorkWithChapterSummary,
} from "../types";


function subscribeToClient() {
  return () => {};
}

function getClientSnapshot() {
  return true;
}

function getServerSnapshot() {
  return false;
}

type WorkEditDialogProps = {
  onClose: () => void;
  work: WorkWithChapterSummary;
};

export function WorkEditDialog({
  onClose,
  work,
}: WorkEditDialogProps) {
  const mounted = useSyncExternalStore(subscribeToClient, getClientSnapshot, getServerSnapshot);

  const [state, action, pending] = useActionState(
    updateWorkAction,
    initialWorkActionState,
  );

  const selectedWarnings = parseWorkContentWarnings(work.contentWarnings);


  useEffect(() => {
    if (!mounted) {
      return;
    }

    document.body.classList.add("writer-flow-open");

    function closeOnEscape(
      event: KeyboardEvent,
    ) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener(
      "keydown",
      closeOnEscape,
    );

    return () => {
      document.body.classList.remove("writer-flow-open");

      document.removeEventListener(
        "keydown",
        closeOnEscape,
      );
    };
  }, [mounted, onClose]);

  useEffect(() => {
    if (state.status === "success") {
      onClose();
    }
  }, [onClose, state.status]);

  if (!mounted) {
    return null;
  }

  return createPortal(
    <div
      className="workspace-dialog"
      role="presentation"
      onMouseDown={(event) => {
        if (
          event.target === event.currentTarget
        ) {
          onClose();
        }
      }}
    >
      <section
        className="workspace-dialog__panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby={`edit-${work.id}`}
        aria-describedby={`edit-description-${work.id}`}
        onMouseDown={(event) => {
          event.stopPropagation();
        }}
      >
        <header className="workspace-dialog__header">
          <div>
            <p>{workspaceContent.eyebrow}</p>

            <h2 id={`edit-${work.id}`}>
              {workspaceContent.editTitle}
            </h2>

            <span
              id={`edit-description-${work.id}`}
              className="workspace-dialog__description"
            >
              {work.title} eserinin bilgilerini
              güncelle.
            </span>
          </div>

          <button
            type="button"
            className="workspace-dialog__close"
            onClick={onClose}
            aria-label={
              workspaceContent.closeEdit
            }
          >
            ×
          </button>
        </header>

        <form
          action={action}
          className="workspace-edit-form"
        >
          <input
            name="workId"
            type="hidden"
            value={work.id}
          />

          <Field
            autoFocus
            label={workspaceContent.fields.title}
            name="title"
            defaultValue={work.title}
            required
          />

          <Field
            control="textarea"
            label={
              workspaceContent.fields.summary
            }
            name="summary"
            defaultValue={
              work.description ?? ""
            }
            rows={4}
          />

          <div className="workspace-edit-form__row">
            <Field
              label={
                workspaceContent.fields.genre
              }
              name="genre"
              defaultValue={work.genre ?? ""}
              required
            />

            <Field
              control="select"
              label={
                workspaceContent.fields
                  .language
              }
              name="language"
              defaultValue={work.language}
            >
              <option value="tr">
                Türkçe
              </option>

              <option value="en">
                İngilizce
              </option>
            </Field>
          </div>

          <Field
            label={
              workspaceContent.fields.coverUrl
            }
            name="coverUrl"
            defaultValue={work.coverUrl ?? ""}
            placeholder="https://"
          />

          <Field
            control="select"
            label={
              workspaceContent.fields.status
            }
            name="status"
            defaultValue={work.status}
          >
            <option value="draft">
              {
                workspaceContent.statuses
                  .draft
              }
            </option>

            <option value="in_review">
              İncelemede
            </option>

            <option value="published">
              {
                workspaceContent.statuses
                  .published
              }
            </option>

            <option value="archived">
              Arşivlendi
            </option>
          </Field>

          <fieldset className="workspace-classification">
            <legend>İçerik ve yaş sınıfı</legend>
            <p>Eser değiştiğinde sınıfı, eserin en yoğun bölümüne göre yeniden kontrol et.</p>
            <label>
              <span>Yaş sınıfı</span>
              <select
                name="contentRating"
                defaultValue={work.contentRating === "unrated" ? "" : work.contentRating}
                required
              >
                <option value="" disabled>Sınıf seç</option>
                {workContentRatings.map((rating) => (
                  <option value={rating} key={rating}>
                    {workContentRatingDetails[rating].label}
                    {rating === "adult_18" ? " — public yayın kapalı" : ""}
                  </option>
                ))}
              </select>
            </label>
            <div className="workspace-classification__warnings">
              {workContentWarnings.map((warning) => (
                <label key={warning}>
                  <input
                    name="contentWarnings"
                    type="checkbox"
                    value={warning}
                    defaultChecked={selectedWarnings.includes(warning)}
                  />
                  <span>{workContentWarningDetails[warning].label}</span>
                </label>
              ))}
            </div>
            <label className="workspace-classification__confirm">
              <input
                name="contentClassificationConfirmed"
                type="checkbox"
                defaultChecked={
                  work.contentRating !== "unrated" &&
                  Boolean(work.contentRatingConfirmedAt)
                }
                required
              />
              <span>Sınıfı eserin en yoğun içeriğine göre kontrol ettiğimi onaylıyorum.</span>
            </label>
          </fieldset>

          {state.message && (
            <p
              className="work-action-message"
              data-state={state.status}
              role="status"
            >
              {state.message}
            </p>
          )}

          <div className="workspace-edit-form__actions">
            <Button
              type="button"
              variant="secondary"
              onClick={onClose}
              disabled={pending}
            >
              Vazgeç
            </Button>

            <Button
              type="submit"
              loading={pending}
            >
              {workspaceContent.save}
            </Button>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
