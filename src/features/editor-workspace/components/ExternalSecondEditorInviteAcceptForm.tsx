"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { acceptExternalSecondEditorInviteAction } from "../editor-workflow.actions";
import { initialEditorActionState } from "../types";

export function ExternalSecondEditorInviteAcceptForm({
  token,
}: {
  token: string;
}) {
  const [state, formAction, pending] = useActionState(
    acceptExternalSecondEditorInviteAction,
    initialEditorActionState,
  );

  return (
    <form action={formAction} className="professional-review-tools">
      <input name="token" type="hidden" value={token} />

      <p>
        Görevi kabul ettiğinizde eser 2. Editör İncelemelerim alanınıza
        eklenecek. Birinci editör raporu size gösterilmeyecek.
      </p>

      {state.message && (
        <p
          className={`editor-action-status editor-action-status--${state.status}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      )}

      <Button loading={pending} type="submit">
        Dış İkinci Editör Görevini Kabul Et
      </Button>
    </form>
  );
}
