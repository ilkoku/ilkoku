"use client";

import { useActionState } from "react";

import {
  completePublisherEditorReviewAction,
  savePublisherEditorReviewDraftAction,
  type PublisherEditorActionState,
} from "../actions";

const initialState: PublisherEditorActionState = {
  message: "",
  status: "idle",
};

function ReviewFields({
  category,
  content,
  requestId,
  title,
}: {
  category: string;
  content: string;
  requestId: string;
  title: string;
}) {
  return (
    <>
      <input name="requestId" type="hidden" value={requestId} />
      <label>
        <span>Rapor başlığı</span>
        <input
          defaultValue={title}
          maxLength={160}
          minLength={3}
          name="title"
          required
        />
      </label>
      <label>
        <span>Kategori</span>
        <input
          defaultValue={category}
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
          defaultValue={content}
          maxLength={10000}
          minLength={20}
          name="content"
          required
          rows={14}
        />
      </label>
    </>
  );
}

function Result({ state }: { state: PublisherEditorActionState }) {
  return state.message ? (
    <p
      className="publisher-editor-review-result"
      data-status={state.status}
      role={state.status === "error" ? "alert" : "status"}
    >
      {state.message}
    </p>
  ) : null;
}

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
  const [draftState, draftAction, draftPending] = useActionState(
    savePublisherEditorReviewDraftAction,
    initialState,
  );
  const [completeState, completeAction, completePending] = useActionState(
    completePublisherEditorReviewAction,
    initialState,
  );

  return (
    <div className="publisher-editor-review-forms">
      <form action={draftAction} className="publisher-editor-review-form">
        <ReviewFields
          category={initialCategory}
          content={initialContent}
          requestId={requestId}
          title={initialTitle}
        />
        <button
          className="button button--outline"
          disabled={draftPending}
          type="submit"
        >
          {draftPending ? "Kaydediliyor…" : "Taslağı Kaydet"}
        </button>
        <Result state={draftState} />
      </form>

      <form action={completeAction} className="publisher-editor-review-complete">
        <ReviewFields
          category={initialCategory}
          content={initialContent}
          requestId={requestId}
          title={initialTitle}
        />
        <p>
          Tamamlama sonrasında rapor yayınevine görünür olur. Ödeme sistemi henüz aktif değildir; görev yalnızca gelecekteki ücret hakkı için uygun kayıt olarak saklanır.
        </p>
        <button
          className="button button--primary"
          disabled={completePending}
          type="submit"
        >
          {completePending ? "Tamamlanıyor…" : "İncelemeyi Tamamla"}
        </button>
        <Result state={completeState} />
      </form>
    </div>
  );
}
