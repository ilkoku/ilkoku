"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { workspaceContent } from "@/content";
import {
  archiveWorkAction,
  restoreWorkAction,
} from "../actions";
import { initialWorkActionState } from "../types";

export function WorkArchiveAction({
  archived,
  workId,
}: {
  archived: boolean;
  workId: string;
}) {
  const selectedAction = archived
    ? restoreWorkAction
    : archiveWorkAction;

  const [state, action, pending] = useActionState(
    selectedAction,
    initialWorkActionState,
  );

  return (
    <form
      action={action}
      className="workspace-archive-action"
      onSubmit={(event) => {
        if (archived) {
          return;
        }

        const confirmed = window.confirm(
          "Bu eser arşive taşınacak. 30 gün boyunca geri yükleyebilirsin; sürenin sonunda eser ve tüm bölümleri kalıcı olarak silinecektir. Devam edilsin mi?",
        );

        if (!confirmed) {
          event.preventDefault();
        }
      }}
    >
      <input
        name="workId"
        type="hidden"
        value={workId}
      />

      <Button
        type="submit"
        variant="ghost"
        loading={pending}
      >
        {archived
          ? workspaceContent.restore
          : workspaceContent.archive}
      </Button>

      {archived && (
        <small className="workspace-archive-retention">
          Arşivdeki eserler 30 gün içinde geri yüklenebilir.
        </small>
      )}

      {state.message && (
        <span
          className="work-action-message"
          data-state={state.status}
          role="status"
        >
          {state.message}
        </span>
      )}
    </form>
  );
}
