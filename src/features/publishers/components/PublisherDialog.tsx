"use client";

import { useActionState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { publishersContent } from "@/content";
import { createPublisherSubmissionAction } from "../actions";
import type { PublisherItem, SubmissionWork } from "../types";

const initialState = { message: "", status: "idle" as const };

export function PublisherDialog({ onClose, publisher, works }: { onClose: () => void; publisher: PublisherItem; works: SubmissionWork[] }) {
  const [state, action, pending] = useActionState(createPublisherSubmissionAction, initialState);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeButton.current?.focus();
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => { document.body.style.overflow = overflow; window.removeEventListener("keydown", onKey); };
  }, [onClose]);

  useEffect(() => { if (state.status === "success") onClose(); }, [onClose, state.status]);

  return createPortal(
    <div className="publisher-dialog-layer" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }} role="presentation">
      <section aria-labelledby="publisher-dialog-title" aria-modal="true" className="publisher-dialog" role="dialog">
        <header className="publisher-dialog__header">
          <div><p>{publisher.companyName}</p><h2 id="publisher-dialog-title">{publishersContent.modal.title}</h2></div>
          <button aria-label={publishersContent.modal.close} className="publisher-dialog__close" onClick={onClose} ref={closeButton} type="button">×</button>
        </header>
        <form action={action} className="publisher-dialog__form">
          <input name="publisherId" type="hidden" value={publisher.id} />
          <Field control="select" label={publishersContent.modal.work} name="workId" required defaultValue="">
            <option disabled value="">{publishersContent.modal.chooseWork}</option>
            {works.map((work) => <option key={work.id} value={work.id}>{work.title}</option>)}
          </Field>
          <Field control="textarea" label={publishersContent.modal.coverLetter} maxLength={3000} minLength={20} message={publishersContent.modal.coverLetterHint} name="coverLetter" required rows={8} />
          {state.message && <p className="publisher-dialog__message" data-status={state.status} role="status">{state.message}</p>}
          <div className="publisher-dialog__actions">
            <Button onClick={onClose} type="button" variant="secondary">{publishersContent.modal.cancel}</Button>
            <Button loading={pending} type="submit">{publishersContent.modal.submit}</Button>
          </div>
        </form>
      </section>
    </div>, document.body,
  );
}
