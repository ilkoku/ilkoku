"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { authContent } from "@/content";
import { updatePasswordAction } from "../actions";
import { initialAuthState } from "../state";

export function UpdatePasswordForm({ token }: { token: string }) {
  const [state, formAction, pending] = useActionState(updatePasswordAction, initialAuthState);
  return (
    <div className="auth-form-card">
      <header><p>{authContent.updatePassword.cardEyebrow}</p><h2>{authContent.updatePassword.cardTitle}</h2><span>{authContent.updatePassword.cardDescription}</span></header>
      <form className="auth-form" action={formAction}>
        <input name="token" type="hidden" value={token} />
        <Field control="password" label={authContent.updatePassword.password} name="password" autoComplete="new-password" placeholder={authContent.updatePassword.passwordPlaceholder} minLength={8} required />
        <Field control="password" label={authContent.updatePassword.confirmation} name="password-confirmation" autoComplete="new-password" placeholder={authContent.updatePassword.confirmationPlaceholder} minLength={8} required />
        <Button className="auth-submit" type="submit" loading={pending}>{authContent.updatePassword.submit}</Button>
      </form>
      {state.message && <p className={`auth-status auth-status--${state.status}`} role="alert">{state.message}</p>}
    </div>
  );
}
