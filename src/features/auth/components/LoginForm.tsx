"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { authContent } from "@/content";
import { loginAction } from "../actions";
import { initialAuthState } from "../state";

export function LoginForm({ nextPath = "" }: { nextPath?: string }) {
  const [state, formAction, pending] = useActionState(loginAction, initialAuthState);

  return (
    <div className="auth-form-card">
      <header><p>{authContent.login.cardEyebrow}</p><h2>{authContent.login.cardTitle}</h2><span>{authContent.login.cardDescription}</span></header>
      <form className="auth-form" action={formAction}>
        <input name="next" type="hidden" value={nextPath} />
        <Field control="email" label={authContent.common.email} name="email" autoComplete="email" placeholder={authContent.common.emailPlaceholder} required />
        <Field control="password" label={authContent.common.password} name="password" autoComplete="current-password" placeholder={authContent.login.passwordPlaceholder} minLength={8} required />
        <div className="auth-form__options">
          <label className="auth-checkbox"><input type="checkbox" name="remember" defaultChecked /><span>{authContent.login.rememberMe}</span></label>
          <Link href="/sifremi-unuttum">{authContent.login.forgotPassword}</Link>
        </div>
        <Button className="auth-submit" type="submit" loading={pending}>{authContent.login.submit}</Button>
      </form>
      {state.message && <p className={`auth-status auth-status--${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p>}
      <p className="auth-switch">{authContent.login.noAccount} <Link href="/kayit">{authContent.login.createAccount}</Link></p>
    </div>
  );
}
