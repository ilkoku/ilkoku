"use client";

import { useActionState } from "react";

import {
  submitPublisherEditorReviewAction,
  type PublisherEditorActionState,
} from "../actions";

const initialState: PublisherEditorActionState = {
  message: "",
  status: "idle",
};

export function PublisherEditorReviewForm({
  initialCategory,
  initialContent,
  initialTitle,
  requestId,
}: {
  initialCategory: string;
  initialContent: string;
  initialTitle: string;
  requestId: string;
}) {
  const [state, action, pending] = useActionState(
    submitPublisherEditorReviewAction,
    initialState,
  );

  return (
    <form action={action} className="publisher-editor-review-form">
      <input name="requestId" type="hidden" value={requestId} />

      <label>
        <span>Rapor başlığı</span>
        <input
          defaultValue={initialTitle}
          maxLength={160}
          minLength={3}
          name="title"
          required
        />
      </label>

      <label>
        <span>Kategori</span>
        <input
          defaultValue={initialCategory}
          maxLength={60}
          minLength={2}
          name="category"
          placeholder="Örn. Genel editoryal değerlendirme"
          required
        />
      </label>

      <label>
        <span>Değerlendirme</span>
        <textarea
          defaultValue={initialContent}
          maxLength={10000}
          minLength={20}
          name="content"
          required
          rows={14}
        />
      </label>

      <p>
        Tamamlama sonrasında rapor yayınevine görünür olur. Ödeme sistemi henüz aktif değildir; görev yalnızca gelecekteki ücret hakkı için uygun kayıt olarak saklanır.
      </p>

      <div className="publisher-editor-request-card__actions">
        <button
          className="button button--outline"
          disabled={pending}
          name="intent"
          type="submit"
          value="save"
        >
          {pending ? "İşleniyor…" : "Taslağı Kaydet"}
        </button>
        <button
          className="button button--primary"
          disabled={pending}
          name="intent"
          type="submit"
          value="complete"
        >
          {pending ? "İşleniyor…" : "İncelemeyi Tamamla"}
        </button>
      </div>

      {state.message ? (
        <p
          className="publisher-editor-review-result"
          data-status={state.status}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
