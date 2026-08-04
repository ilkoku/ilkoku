"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import {
  completeProfessionalReviewAction,
  saveProfessionalReviewDraftAction,
} from "../actions";
import {
  completeSecondEditorReviewAction,
  saveSecondEditorReviewDraftAction,
} from "../second-editor-email.actions";
import { initialEditorActionState } from "../types";

type Draft = {
  category: string;
  content: string;
  priority: "normal" | "important";
  title: string;
} | null;

type ReviewStage = "first" | "second";

export function ProfessionalReviewTools({
  draft,
  stage,
  workId,
}: {
  draft: Draft;
  stage: ReviewStage;
  workId: string;
}) {
  const saveAction =
    stage === "second"
      ? saveSecondEditorReviewDraftAction
      : saveProfessionalReviewDraftAction;

  const completeAction =
    stage === "second"
      ? completeSecondEditorReviewAction
      : completeProfessionalReviewAction;

  const [draftState, draftAction, draftPending] = useActionState(
    saveAction,
    initialEditorActionState,
  );

  const [completeState, completeFormAction, completePending] =
    useActionState(
      completeAction,
      initialEditorActionState,
    );

  const stageLabel =
    stage === "second" ? "İkinci editör incelemesi" : "Birinci editör incelemesi";

  return (
    <form className="professional-review-tools">
      <input name="workId" type="hidden" value={workId} />

      <header>
        <p>Yalnızca size görünür</p>
        <h2>{stageLabel}</h2>
        <span>
          {stage === "second"
            ? "İkinci editör raporu tamamlanana kadar her iki rapor da yazara gösterilmez."
            : "Raporu doğrudan yazara gönderebilir veya isteğe bağlı olarak ikinci editör incelemesine aktarabilirsiniz."}
        </span>
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
        <Link
          className="button button--outline"
          href={`/editor/incelemeler/${workId}/pasaport`}
        >
          Eser Pasaportu
        </Link>

        <Button
          formAction={draftAction}
          loading={draftPending}
          type="submit"
          variant="secondary"
        >
          Taslak Kaydet
        </Button>

        {stage === "second" ? (
          <Button
            formAction={completeFormAction}
            loading={completePending}
            type="submit"
          >
            Nihai İncelemeyi Tamamla
          </Button>
        ) : (
          <>
            <Button
              formAction={completeFormAction}
              loading={completePending}
              name="intent"
              type="submit"
              value="complete"
            >
              Raporu Yazara Gönder ve Tamamla
            </Button>

            <Button
              formAction={completeFormAction}
              loading={completePending}
              name="intent"
              type="submit"
              value="second"
              variant="outline"
            >
              2. Editöre Gönder
            </Button>
          </>
        )}
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
