"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { authContent } from "@/content";
import { registerAction } from "../actions";
import { initialAuthState } from "../state";

export function RegisterForm() {
  const [state, formAction, pending] = useActionState(registerAction, initialAuthState);

  return (
    <div className="auth-form-card">
      <header><p>{authContent.register.cardEyebrow}</p><h2>{authContent.register.cardTitle}</h2><span>{authContent.register.cardDescription}</span></header>
      <form className="auth-form" action={formAction}>
        <Field label={authContent.register.fullName} name="full-name" autoComplete="name" placeholder={authContent.register.fullNamePlaceholder} required />
        <Field control="email" label={authContent.common.email} name="email" autoComplete="email" placeholder={authContent.common.emailPlaceholder} required />
        <Field control="password" label={authContent.common.password} name="password" autoComplete="new-password" placeholder={authContent.register.passwordPlaceholder} minLength={8} required />
        <Field control="password" label={authContent.register.passwordConfirmation} name="password-confirmation" autoComplete="new-password" placeholder={authContent.register.passwordConfirmationPlaceholder} minLength={8} required />
        <p className="auth-form__note">{authContent.register.terms}</p>
        <Button className="auth-submit" type="submit" loading={pending}>{authContent.register.submit}</Button>
      </form>
      {state.message && <p className={`auth-status auth-status--${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p>}
      <p className="auth-switch">{authContent.register.hasAccount} <Link href="/giris">{authContent.register.login}</Link></p>
    </div>
  );
}
