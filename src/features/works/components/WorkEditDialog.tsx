"use client";

import { useActionState, useEffect } from "react";
import { createPortal } from "react-dom";

import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { workspaceContent } from "@/content";

import { updateWorkAction } from "../actions";
import {
  initialWorkActionState,
  type WorkWithChapterSummary,
} from "../types";

type WorkEditDialogProps = {
  onClose: () => void;
  work: WorkWithChapterSummary;
};

export function WorkEditDialog({
  onClose,
  work,
}: WorkEditDialogProps) {
  const [state, action, pending] = useActionState(
    updateWorkAction,
    initialWorkActionState,
  );

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;

    document.body.style.overflow = "hidden";

    function closeOnEscape(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }

    document.addEventListener("keydown", closeOnEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      document.removeEventListener(
        "keydown",
        closeOnEscape,
      );
    };
  }, [onClose]);

  return createPortal(
    <div
      className="workspace-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby={`edit-${work.id}`}
    >
      <section className="workspace-dialog__panel">
        <header>
          <div>
            <p>{workspaceContent.eyebrow}</p>

            <h2 id={`edit-${work.id}`}>
              {workspaceContent.editTitle}
            </h2>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label={workspaceContent.closeEdit}
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
            label={workspaceContent.fields.summary}
            name="summary"
            defaultValue={work.description ?? ""}
            rows={4}
          />

          <div className="workspace-edit-form__row">
            <Field
              label={workspaceContent.fields.genre}
              name="genre"
              defaultValue={work.genre ?? ""}
              required
            />

            <Field
              control="select"
              label={workspaceContent.fields.language}
              name="language"
              defaultValue={work.language}
            >
              <option value="tr">Türkçe</option>
              <option value="en">İngilizce</option>
            </Field>
          </div>

          <Field
            label={workspaceContent.fields.coverUrl}
            name="coverUrl"
            defaultValue={work.coverUrl ?? ""}
            placeholder="https://"
          />

          <Field
            control="select"
            label={workspaceContent.fields.status}
            name="status"
            defaultValue={work.status}
          >
            <option value="draft">
              {workspaceContent.statuses.draft}
            </option>

            <option value="in_review">
              İncelemede
            </option>

            <option value="published">
              {workspaceContent.statuses.published}
            </option>

            <option value="archived">
              Arşivlendi
            </option>
          </Field>

          {state.message && (
            <p
              className="work-action-message"
              data-state={state.status}
              role="status"
            >
              {state.message}
            </p>
          )}

          <Button
            type="submit"
            loading={pending}
          >
            {workspaceContent.save}
          </Button>
        </form>
      </section>
    </div>,
    document.body,
  );
}