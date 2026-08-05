"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { sendToSecondEditorAction } from "../editor-workflow.actions";
import { initialEditorActionState } from "../types";

type AvailableEditor = {
  displayName: string | null;
  fullName: string;
  id: string;
};

export function SecondEditorAssignmentDialog({
  editors,
  workAuthorId,
  workId,
  workTitle,
}: {
  editors: AvailableEditor[];
  workAuthorId: string;
  workId: string;
  workTitle: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  const [state, formAction, pending] = useActionState(
    sendToSecondEditorAction,
    initialEditorActionState,
  );

  const availableEditors = editors.filter(
    (editor) => editor.id !== workAuthorId,
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
        İkinci Editöre Gönder
      </Button>

      <dialog
        className="editor-confirm-dialog"
        ref={dialogRef}
        aria-labelledby={`ikinci-editor-${workId}`}
      >
        <form
          className="editor-confirm-dialog__card"
          action={formAction}
        >
          <input name="workId" type="hidden" value={workId} />

          <p>İkinci editör aşaması</p>

          <h2 id={`ikinci-editor-${workId}`}>
            İkinci editörü belirleyin
          </h2>

          <span>
            “{workTitle}” eserini genel havuza bırakabilir, belirli bir
            platform editörüne atayabilir veya dış editöre e-posta daveti
            gönderebilirsiniz.
          </span>

          <Field
            control="select"
            defaultValue="pool"
            label="Gönderim yöntemi"
            name="mode"
          >
            <option value="pool">Genel editör havuzuna bırak</option>
            <option value="specific">Belirli bir platform editörüne ata</option>
            <option value="external">Dış editörü e-posta ile davet et</option>
          </Field>

          <Field
            control="select"
            defaultValue=""
            label="Platform editörü"
            name="editorId"
          >
            <option value="">Editör seçin</option>

            {availableEditors.map((editor) => (
              <option key={editor.id} value={editor.id}>
                {editor.displayName ?? editor.fullName}
              </option>
            ))}
          </Field>

          <Field
            label="Dış editör e-posta adresi"
            name="externalEmail"
            placeholder="editor@example.com"
            type="email"
          />

          <p className="editor-action-status">
            Yalnızca seçtiğiniz gönderim yöntemine ait alan dikkate alınır.
            Dış editör daveti yedi gün geçerlidir.
          </p>

          {availableEditors.length === 0 && (
            <p className="editor-action-status">
              Atanabilecek başka aktif platform editörü bulunmuyor.
              Eseri genel havuza bırakabilir veya dış editör daveti
              oluşturabilirsiniz.
            </p>
          )}

          {state.message && (
            <p
              className={`editor-action-status editor-action-status--${state.status}`}
              role={state.status === "error" ? "alert" : "status"}
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
              Görevi Oluştur
            </Button>
          </div>
        </form>
      </dialog>
    </>
  );
}
