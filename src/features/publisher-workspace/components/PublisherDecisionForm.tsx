"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { updateSecurePublisherDecisionAction } from "@/features/publisher-submissions/actions";
import type { PublisherDecisionActionState, PublisherWorkspaceSubmissionStatus } from "../types";

const initialState: PublisherDecisionActionState = { message: "", status: "idle" };

export function PublisherDecisionForm({ currentStatus, publisherNote, submissionId }: {
  currentStatus: PublisherWorkspaceSubmissionStatus;
  publisherNote: string | null;
  submissionId: string;
}) {
  const [state, formAction, pending] = useActionState(updateSecurePublisherDecisionAction, initialState);

  if (currentStatus === "withdrawn") {
    return <p className="publisher-decision__notice">Bu başvuru yazar tarafından geri çekildi.</p>;
  }

  if (currentStatus === "accepted" || currentStatus === "rejected") {
    return <p className="publisher-decision__notice">Bu başvuru nihai karara bağlandı. Kabul veya red kararı yeniden açılamaz.</p>;
  }

  return (
    <form action={formAction} className="publisher-decision">
      <input name="submissionId" type="hidden" value={submissionId} />
      <label>
        <span>Karar notu</span>
        <textarea defaultValue={publisherNote ?? ""} name="publisherNote" placeholder="Editör raporları ve yayınevi kararının gerekçesi..." rows={6} />
      </label>
      <div className="publisher-decision__actions">
        <Button disabled={pending || currentStatus === "reviewing"} name="status" type="submit" value="reviewing" variant="outline">İncelemeye al</Button>
        <Button disabled={pending} name="status" type="submit" value="accepted">Kabul et</Button>
        <Button disabled={pending} name="status" type="submit" value="rejected" variant="danger">Reddet</Button>
      </div>
      {state.message ? <p data-status={state.status}>{state.message}</p> : null}
    </form>
  );
}
