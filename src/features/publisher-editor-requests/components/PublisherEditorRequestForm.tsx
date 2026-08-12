"use client";

import { useActionState } from "react";

import {
  createPublisherEditorRequestAction,
  type PublisherEditorActionState,
} from "../actions";

const initialState: PublisherEditorActionState = {
  message: "",
  status: "idle",
};

export function PublisherEditorRequestForm({
  active,
  eligible,
  workId,
}: {
  active: boolean;
  eligible: boolean;
  workId: string;
}) {
  const [state, action, pending] = useActionState(
    createPublisherEditorRequestAction,
    initialState,
  );

  if (active) {
    return (
      <span className="publisher-editor-request-note">
        Aktif editör talebi var
      </span>
    );
  }

  if (!eligible) {
    return (
      <span className="publisher-editor-request-note">
        Eser tamamlandığında talep açılabilir
      </span>
    );
  }

  return (
    <details className="publisher-editor-request-panel">
      <summary>Editör incelemesi iste</summary>
      <form action={action} className="publisher-editor-request-form">
        <input name="workId" type="hidden" value={workId} />
        <label>
          <span>Editöre talep notu</span>
          <textarea
            maxLength={1000}
            minLength={10}
            name="note"
            placeholder="Yayıneviniz açısından editörün özellikle değerlendirmesini istediğiniz noktaları yazın."
            required
            rows={4}
          />
        </label>
        <p>
          Talep İlkOku platform editörlerinin ayrı Yayınevi Editör Talepleri havuzuna düşer.
        </p>
        <button
          className="button button--primary"
          disabled={pending}
          type="submit"
        >
          {pending ? "Talep oluşturuluyor…" : "Talebi oluştur"}
        </button>
        {state.message ? (
          <p
            className="publisher-editor-request-result"
            data-status={state.status}
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </details>
  );
}
