"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import {
  completeProfessionalReviewAction,
  saveProfessionalReviewDraftAction,
} from "../actions";
import { initialEditorActionState } from "../types";

type Draft = {
  category: string;
  content: string;
  priority: "normal" | "important";
  title: string;
} | null;

export function ProfessionalReviewTools({
  draft,
  workId,
}: {
  draft: Draft;
  workId: string;
}) {
  const [draftState, draftAction, draftPending] = useActionState(
    saveProfessionalReviewDraftAction,
    initialEditorActionState,
  );
  const [completeState, completeAction, completePending] = useActionState(
    completeProfessionalReviewAction,
    initialEditorActionState,
  );

  return (
    <form className="professional-review-tools">
      <input name="workId" type="hidden" value={workId} />
      <header>
        <p>Yalnızca size görünür</p>
        <h2>Profesyonel inceleme</h2>
        <span>Taslağınız tamamlanana kadar yazara gösterilmez.</span>
      </header>

      <Field
        control="select"
        defaultValue={draft?.category ?? "genel"}
        label="Değerlendirme alanı"
        name="category"
      >
        <option value="genel">Genel değerlendirme</option>
        <option value="kurgu">Kurgu</option>
        <option value="dil">Dil ve anlatım</option>
        <option value="karakter">Karakter</option>
        <option value="tempo">Tempo</option>
        <option value="ozgunluk">Özgünlük</option>
      </Field>
      <Field
        defaultValue={draft?.title ?? ""}
        label="Rapor başlığı"
        maxLength={160}
        minLength={3}
        name="title"
        placeholder="Eserin profesyonel değerlendirmesi"
        required
      />
      <Field
        control="textarea"
        defaultValue={draft?.content ?? ""}
        label="Tam editör raporu"
        maxLength={10000}
        minLength={20}
        name="content"
        placeholder="Güçlü yönler, gelişim alanları ve somut öneriler…"
        required
        rows={12}
      />
      <label className="professional-review-tools__priority">
        <input
          defaultChecked={draft?.priority === "important"}
          name="priority"
          type="checkbox"
          value="important"
        />
        <span>Önemli değerlendirme</span>
      </label>

      <div className="professional-review-tools__actions">
        <Button
          formAction={draftAction}
          loading={draftPending}
          type="submit"
          variant="secondary"
        >
          Taslak Kaydet
        </Button>
        <Button
          formAction={completeAction}
          loading={completePending}
          type="submit"
        >
          İncelemeyi Tamamla
        </Button>
      </div>

      {[draftState, completeState]
        .filter((state) => state.message)
        .map((state) => (
          <p
            className={`editor-action-status editor-action-status--${state.status}`}
            key={`${state.status}-${state.message}`}
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.message}
          </p>
        ))}
    </form>
  );
}
