"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { acceptPublisherInvitationAction } from "../actions";
import type { PublisherActionState } from "../types";

const initialState: PublisherActionState = {
  message: "",
  status: "idle",
};

export function PublisherInvitationAcceptForm({
  token,
}: {
  token: string;
}) {
  const [state, action, pending] = useActionState(
    acceptPublisherInvitationAction,
    initialState,
  );

  return (
    <form action={action} className="publisher-invite-form">
      <input name="token" type="hidden" value={token} />

      <Button loading={pending} type="submit">
        Daveti kabul et
      </Button>

      {state.message ? (
        <p
          className="publisher-invite-form__message"
          data-status={state.status}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
