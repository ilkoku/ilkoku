"use client";

import { useActionState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/Button";
import { addPublisherInternalNoteAction } from "../actions";
import type { PublisherInternalNoteActionState } from "../types";

const initialState: PublisherInternalNoteActionState = { message: "", status: "idle" };

export function PublisherInternalNoteForm({ submissionId }: { submissionId: string }) {
  const [state, formAction, pending] = useActionState(addPublisherInternalNoteAction, initialState);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.status === "success") formRef.current?.reset();
  }, [state.status]);

  return (
    <form action={formAction} className="publisher-internal-note" ref={formRef}>
      <input name="submissionId" type="hidden" value={submissionId} />
      <label>
        <span>Yalnızca yayınevi ekibinin göreceği not</span>
        <textarea
          maxLength={3000}
          minLength={3}
          name="internalNote"
          placeholder="Kurul görüşü, ticari değerlendirme veya takip notu..."
          required
          rows={4}
        />
      </label>
      <Button disabled={pending} type="submit" variant="outline">
        {pending ? "Kaydediliyor..." : "İç not ekle"}
      </Button>
      {state.message ? <p data-status={state.status}>{state.message}</p> : null}
    </form>
  );
}
