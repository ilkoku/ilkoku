"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { claimSecondEditorReviewAction } from "../second-editor-email.actions";
import { initialEditorActionState } from "../types";

export function SecondReviewClaimDialog({
  workId,
  workTitle,
}: {
  workId: string;
  workTitle: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [state, formAction, pending] = useActionState(
    claimSecondEditorReviewAction,
    initialEditorActionState,
  );

  useEffect(() => {
    if (state.status === "success") {
      dialogRef.current?.close();
    }
  }, [state.status]);

  return (
    <>
      <Button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
      >
        İkinci İncelemeyi Al
      </Button>

      <dialog
        className="editor-confirm-dialog"
        ref={dialogRef}
        aria-labelledby={`ikinci-inceleme-${workId}`}
      >
        <form
          className="editor-confirm-dialog__card"
          action={formAction}
        >
          <input name="workId" type="hidden" value={workId} />

          <p>İkinci editör havuzu</p>
          <h2 id={`ikinci-inceleme-${workId}`}>
            İkinci incelemeyi üstlen?
          </h2>

          <span>
            “{workTitle}” bağımsız ikinci değerlendirme için yalnızca
            size atanacak.
          </span>

          {state.status === "error" && (
            <p
              className="editor-action-status editor-action-status--error"
              role="alert"
            >
              {state.message}
            </p>
          )}

          <div className="editor-confirm-dialog__actions">
            <Button
              type="button"
              variant="ghost"
              onClick={() => dialogRef.current?.close()}
            >
              Vazgeç
            </Button>

            <Button type="submit" loading={pending}>
              Görevi Al
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
