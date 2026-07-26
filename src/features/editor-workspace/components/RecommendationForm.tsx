"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { recommendWorkToEditorAction } from "../actions";
import { initialEditorActionState } from "../types";

export function RecommendationForm({ workId }: { workId: string }) {
  const [state, formAction, pending] = useActionState(
    recommendWorkToEditorAction,
    initialEditorActionState,
  );

  return (
    <form className="editor-recommend-form" action={formAction}>
      <input name="workId" type="hidden" value={workId} />
      <Field
        id={`editor-recipient-${workId}`}
        label="Editör adı veya e-posta"
        name="recipient"
        placeholder="Editör adı ya da e-posta adresi"
        required
      />
      <Button type="submit" variant="outline" loading={pending}>
        Editöre Öner
      </Button>

      {state.message && (
        <p
          className={`editor-action-status editor-action-status--${state.status}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      )}

      {state.inviteUrl && (
        <label className="editor-invite-link">
          <span>Tek kullanımlık davet bağlantısı</span>
          <input readOnly value={state.inviteUrl} />
        </label>
      )}
    </form>
  );
}
