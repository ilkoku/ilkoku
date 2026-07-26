"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { claimProfessionalReviewAction } from "../actions";
import { initialEditorActionState } from "../types";

export function ReviewClaimDialog({
  workId,
  workTitle,
}: {
  workId: string;
  workTitle: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [state, formAction, pending] = useActionState(
    claimProfessionalReviewAction,
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
        Profesyonel İncelemeye Al
      </Button>

      <dialog
        className="editor-confirm-dialog"
        ref={dialogRef}
        aria-labelledby={`inceleme-onayi-${workId}`}
      >
        <form className="editor-confirm-dialog__card" action={formAction}>
          <input name="workId" type="hidden" value={workId} />

          <p>Profesyonel inceleme</p>
          <h2 id={`inceleme-onayi-${workId}`}>Eseri incelemeye al?</h2>
          <span>
            “{workTitle}” yalnızca size atanacak ve yazar bilgilendirilecek.
          </span>

          {state.status === "error" && (
            <div className="editor-action-status editor-action-status--error" role="alert">
              {state.message}
            </div>
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
              İncelemeye Al
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
