"use client";

import { useActionState } from "react";

import {
  claimPublisherEditorRequestAction,
  type PublisherEditorActionState,
} from "../actions";

const initialState: PublisherEditorActionState = {
  message: "",
  status: "idle",
};

export function PublisherEditorClaimForm({
  requestId,
}: {
  requestId: string;
}) {
  const [state, action, pending] = useActionState(
    claimPublisherEditorRequestAction,
    initialState,
  );

  return (
    <form action={action} className="publisher-editor-claim-form">
      <input name="requestId" type="hidden" value={requestId} />
      <button
        className="button button--primary"
        disabled={pending}
        type="submit"
      >
        {pending ? "Görev alınıyor…" : "Görevi Al"}
      </button>
      {state.message ? (
        <small data-status={state.status}>{state.message}</small>
      ) : null}
    </form>
  );
}
