"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { workspaceContent } from "@/content";
import { archiveWorkAction, restoreWorkAction } from "../actions";
import { initialWorkActionState } from "../types";

export function WorkArchiveAction({ archived, workId }: { archived: boolean; workId: string }) {
  const selectedAction = archived ? restoreWorkAction : archiveWorkAction;
  const [state, action, pending] = useActionState(selectedAction, initialWorkActionState);
  return (
    <form action={action} className="workspace-archive-action">
      <input name="workId" type="hidden" value={workId} />
      <Button type="submit" variant="ghost" loading={pending}>
        {archived ? workspaceContent.restore : workspaceContent.archive}
      </Button>
      {state.message && <span className="work-action-message" data-state={state.status} role="status">{state.message}</span>}
    </form>
  );
}
