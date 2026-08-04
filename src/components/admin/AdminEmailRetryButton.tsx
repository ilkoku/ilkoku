"use client";

import { useActionState } from "react";
import {
  retryEmailDeliveryAction,
  type AdminEmailRetryState,
} from "@/features/admin-email/retry-actions";

const initialState: AdminEmailRetryState = {
  message: "",
  status: "idle",
};

export function AdminEmailRetryButton({
  deliveryId,
}: {
  deliveryId: string;
}) {
  const [state, action, pending] = useActionState(
    retryEmailDeliveryAction,
    initialState,
  );

  return (
    <form
      action={action}
      className="admin-email-retry-form"
    >
      <input
        name="deliveryId"
        type="hidden"
        value={deliveryId}
      />

      <button
        disabled={pending}
        type="submit"
      >
        {pending
          ? "Gönderiliyor…"
          : "Güvenli tekrar bildir"}
      </button>

      {state.message ? (
        <small
          className={
            state.status === "success"
              ? "is-success"
              : "is-error"
          }
          role="status"
        >
          {state.message}
        </small>
      ) : null}
    </form>
  );
}
