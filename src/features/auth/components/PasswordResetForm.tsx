"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { authContent } from "@/content";
import { resetPasswordAction } from "../actions";
import { initialAuthState } from "../state";

export function PasswordResetForm() {
  const [state, formAction, pending] = useActionState(resetPasswordAction, initialAuthState);
  return (
    <div className="auth-form-card">
      <header><p>{authContent.forgotPassword.cardEyebrow}</p><h2>{authContent.forgotPassword.cardTitle}</h2><span>{authContent.forgotPassword.cardDescription}</span></header>
      <form className="auth-form" action={formAction}>
        <Field control="email" label={authContent.common.email} name="email" autoComplete="email" placeholder={authContent.common.emailPlaceholder} required />
        <Button className="auth-submit" type="submit" loading={pending}>{authContent.forgotPassword.submit}</Button>
      </form>
      {state.message && <p className={`auth-status auth-status--${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p>}
      <p className="auth-switch"><Link href="/giris">{authContent.forgotPassword.backToLogin}</Link></p>
    </div>
  );
}
