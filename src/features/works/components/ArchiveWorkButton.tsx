"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { dashboardContent } from "@/content";
import { archiveWorkAction } from "../actions";
import { initialWorkActionState } from "../types";

export function ArchiveWorkButton({ workId }: { workId: string }) {
  const [state, action, pending] = useActionState(archiveWorkAction, initialWorkActionState);

  return (
    <form action={action}>
      <input name="workId" type="hidden" value={workId} />
      <Button type="submit" variant="ghost" loading={pending}>{dashboardContent.archive}</Button>
      {state.message && <span className={`work-action-status work-action-status--${state.status}`} role="status">{state.message}</span>}
    </form>
  );
}
