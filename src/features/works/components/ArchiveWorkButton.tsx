"use client";

import { useActionState } from "react";

import { Button } from "@/components/ui/Button";
import { dashboardContent } from "@/content";
import { archiveWorkAction } from "../actions";
import { initialWorkActionState } from "../types";

export function ArchiveWorkButton({
  workId,
}: {
  workId: string;
}) {
  const [state, action, pending] = useActionState(
    archiveWorkAction,
    initialWorkActionState,
  );

  return (
    <form
      action={action}
      onSubmit={(event) => {
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
        {dashboardContent.archive}
      </Button>

      {state.message && (
        <span
          className={`work-action-status work-action-status--${state.status}`}
          role="status"
        >
          {state.message}
        </span>
      )}
    </form>
  );
}
