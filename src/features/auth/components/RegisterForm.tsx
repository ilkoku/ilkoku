"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { authContent } from "@/content";
import { registerAction } from "../actions";
import { roleOptions } from "../data";
import { initialAuthState } from "../state";
import type { RegistrationRole } from "../types";

export function RegisterForm() {
  const [selectedRole, setSelectedRole] = useState<RegistrationRole>("reader");
  const [state, formAction, pending] = useActionState(registerAction, initialAuthState);

  return (
    <div className="auth-form-card">
      <header><p>{authContent.register.cardEyebrow}</p><h2>{authContent.register.cardTitle}</h2><span>{authContent.register.cardDescription}</span></header>
      <form className="auth-form" action={formAction}>
        <Field label={authContent.register.fullName} name="full-name" autoComplete="name" placeholder={authContent.register.fullNamePlaceholder} required />
        <Field control="email" label={authContent.common.email} name="email" autoComplete="email" placeholder={authContent.common.emailPlaceholder} required />
        <Field control="password" label={authContent.common.password} name="password" autoComplete="new-password" placeholder={authContent.register.passwordPlaceholder} minLength={8} required />
        <Field control="password" label={authContent.register.passwordConfirmation} name="password-confirmation" autoComplete="new-password" placeholder={authContent.register.passwordConfirmationPlaceholder} minLength={8} required />
        <input name="role" type="hidden" value={selectedRole} />
        <fieldset className="auth-register-role">
          <legend>{authContent.register.roleLegend}</legend>
          <p>{authContent.register.roleDescription}</p>
          <div className="auth-register-role__grid">
            {roleOptions.map((role) => {
              const descriptionId = `register-role-${role.id}-description`;
              const isSelected = selectedRole === role.id;
              return (
                <label className="auth-register-role__card" data-selected={isSelected} key={role.id}>
                  <input
                    aria-describedby={descriptionId}
                    checked={isSelected}
                    onChange={() => setSelectedRole(role.id)}
                    type="radio"
                    value={role.id}
                  />
                  <span aria-hidden="true">{role.icon}</span>
                  <strong>{role.title}</strong>
                  <small id={descriptionId}>{role.description}</small>
                </label>
              );
            })}
          </div>
        </fieldset>
        <label className="auth-checkbox auth-terms">
          <input name="terms" required type="checkbox" value="accepted" />
          <span>{authContent.register.terms}</span>
        </label>
        <Button className="auth-submit" type="submit" loading={pending}>{authContent.register.submit}</Button>
      </form>
      {state.message && <p className={`auth-status auth-status--${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p>}
      <p className="auth-switch">{authContent.register.hasAccount} <Link href="/giris">{authContent.register.login}</Link></p>
    </div>
  );
}
