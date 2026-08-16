"use client";

import { useActionState } from "react";

import {
  cancelPublisherEditorRequestAction,
  type PublisherEditorActionState,
} from "../actions";

const initialState: PublisherEditorActionState = {
  message: "",
  status: "idle",
};

export function PublisherEditorCancelForm({
  requestId,
}: {
  requestId: string;
}) {
  const [state, action, pending] = useActionState(
    cancelPublisherEditorRequestAction,
    initialState,
  );

  return (
    <form action={action} className="publisher-editor-claim-form">
      <input name="requestId" type="hidden" value={requestId} />
      <button
        className="button button--outline"
        disabled={pending}
        type="submit"
      >
        {pending ? "İptal ediliyor…" : "Talebi İptal Et"}
      </button>
      {state.message ? (
        <small data-status={state.status}>{state.message}</small>
      ) : null}
    </form>
  );
}
