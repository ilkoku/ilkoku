"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import {
  saveBirthDateAction,
  type AdultGateActionState,
} from "./actions";

const initialAdultGateActionState: AdultGateActionState = {
  message: "",
  status: "idle",
};

export function AgeVerificationForm({ returnTo }: { returnTo: string }) {
  const [state, action, pending] = useActionState(
    saveBirthDateAction,
    initialAdultGateActionState,
  );

  return (
    <form action={action} className="age-verification-form">
      <input name="returnTo" type="hidden" value={returnTo} />
      <label className="field">
        <span className="field__label">Doğum tarihi</span>
        <input
          autoComplete="bday"
          max={new Date().toISOString().slice(0, 10)}
          name="birthDate"
          required
          type="date"
        />
        <small>
          Yalnızca yaş uygunluğunuzu hesaplamak için kullanılır; public profilinizde gösterilmez.
        </small>
      </label>

      {state.message ? (
        <p
          className={`profile-status profile-status--${state.status}`}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}

      <Button loading={pending} type="submit">
        Yaş bilgimi doğrula
      </Button>
    </form>
  );
}
