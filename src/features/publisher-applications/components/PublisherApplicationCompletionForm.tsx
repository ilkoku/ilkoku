"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { completePublisherApplicationAction } from "../actions";
import { initialPublisherApplicationState } from "../state";
import type { PublisherApplicationDefaults } from "../schema";
import { PublisherApplicationFields } from "./PublisherApplicationFields";

export function PublisherApplicationCompletionForm({
  defaults,
}: {
  defaults?: Partial<PublisherApplicationDefaults>;
}) {
  const [state, formAction, pending] = useActionState(
    completePublisherApplicationAction,
    initialPublisherApplicationState,
  );

  return (
    <form action={formAction} className="publisher-application-completion">
      <PublisherApplicationFields defaults={defaults} />
      <Button loading={pending} type="submit">
        Bilgileri incelemeye gönder
      </Button>
      {state.message ? (
        <p
          className="publisher-application-message"
          data-status={state.status}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
