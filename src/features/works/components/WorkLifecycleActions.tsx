"use client";

import { useActionState, useRef } from "react";

import { Button } from "@/components/ui/Button";
import {
  permanentlyDeleteWorkAction,
  restoreTrashedWorkAction,
  setWorkActiveAction,
  trashWorkAction,
} from "../lifecycle-actions";
import { initialWorkActionState } from "../types";

export function WorkActivationAction({
  isActive,
  workId,
}: {
  isActive: boolean;
  workId: string;
}) {
  const [state, action, pending] = useActionState(
    setWorkActiveAction,
    initialWorkActionState,
  );

  return (
    <div className="workspace-lifecycle-action">
      <form action={action}>
        <input type="hidden" name="workId" value={workId} />
        <input type="hidden" name="active" value={String(!isActive)} />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Kaydediliyor…" : isActive ? "Pasife Al" : "Aktif Et"}
        </Button>
      </form>
      {state.message ? (
        <span className="work-action-message" data-state={state.status} role="status">
          {state.message}
        </span>
      ) : null}
    </div>
  );
}

export function WorkTrashAction({
  title,
  workId,
}: {
  title: string;
  workId: string;
}) {
  const [state, action, pending] = useActionState(
    trashWorkAction,
    initialWorkActionState,
  );

  return (
    <div className="workspace-lifecycle-action workspace-lifecycle-action--danger">
      <form
        action={action}
        onSubmit={(event) => {
          if (!window.confirm(`“${title}” çöp kutusuna taşınsın mı?`)) {
            event.preventDefault();
          }
        }}
      >
        <input type="hidden" name="workId" value={workId} />
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Siliniyor…" : "Sil"}
        </Button>
      </form>
      {state.message ? (
        <span className="work-action-message" data-state={state.status} role="status">
          {state.message}
        </span>
      ) : null}
    </div>
  );
}

export function TrashedWorkActions({
  title,
  workId,
}: {
  title: string;
  workId: string;
}) {
  const confirmationRef = useRef<HTMLInputElement>(null);
  const [restoreState, restoreAction, restoring] = useActionState(
    restoreTrashedWorkAction,
    initialWorkActionState,
  );
  const [deleteState, deleteAction, deleting] = useActionState(
    permanentlyDeleteWorkAction,
    initialWorkActionState,
  );

  return (
    <div className="workspace-trash-actions">
      <form action={restoreAction}>
        <input type="hidden" name="workId" value={workId} />
        <Button type="submit" variant="outline" disabled={restoring || deleting}>
          {restoring ? "Geri yükleniyor…" : "Geri Yükle"}
        </Button>
      </form>

      <form
        action={deleteAction}
        onSubmit={(event) => {
          const confirmation = window.prompt(
            `“${title}” kalıcı olarak silinecek. Bu işlem geri alınamaz. Devam etmek için SİL yaz.`,
          );
          if (confirmation !== "SİL") {
            event.preventDefault();
            return;
          }
          if (confirmationRef.current) confirmationRef.current.value = confirmation;
        }}
      >
        <input type="hidden" name="workId" value={workId} />
        <input ref={confirmationRef} type="hidden" name="confirmation" defaultValue="" />
        <Button type="submit" variant="outline" disabled={restoring || deleting}>
          {deleting ? "Kalıcı siliniyor…" : "Kalıcı Sil"}
        </Button>
      </form>

      {restoreState.message ? (
        <span className="work-action-message" data-state={restoreState.status} role="status">
          {restoreState.message}
        </span>
      ) : null}
      {deleteState.message ? (
        <span className="work-action-message" data-state={deleteState.status} role="status">
          {deleteState.message}
        </span>
      ) : null}
    </div>
  );
}
