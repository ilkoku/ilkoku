"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { authContent } from "@/content";
import { PublisherApplicationFields } from "@/features/publisher-applications/components/PublisherApplicationFields";
import { registerAction } from "../actions";
import { roleOptions } from "../data";
import { initialAuthState } from "../state";
import type { RegistrationRole } from "../types";

export function RegisterForm({
  editorInviteToken,
  initialRole,
  nextPath = "",
}: {
  editorInviteToken?: string;
  initialRole?: RegistrationRole;
  nextPath?: string;
}) {
  const [selectedRole, setSelectedRole] = useState<RegistrationRole>(
    editorInviteToken ? "editor" : initialRole ?? "reader",
  );
  const [state, formAction, pending] = useActionState(registerAction, initialAuthState);
  const loginHref = nextPath
    ? `/giris?sonraki=${encodeURIComponent(nextPath)}`
    : "/giris";

  return (
    <div className="auth-form-card">
      <header><p>{authContent.register.cardEyebrow}</p><h2>{authContent.register.cardTitle}</h2><span>{authContent.register.cardDescription}</span></header>
      <form className="auth-form" action={formAction}>
        {editorInviteToken && (
          <input
            name="editor-invite-token"
            type="hidden"
            value={editorInviteToken}
          />
        )}
        <input name="next" type="hidden" value={nextPath} />
        <Field label={authContent.register.fullName} name="full-name" autoComplete="name" placeholder={authContent.register.fullNamePlaceholder} required />
        <Field control="email" label={authContent.common.email} name="email" autoComplete="email" placeholder={authContent.common.emailPlaceholder} required />
        <Field control="password" label={authContent.common.password} name="password" autoComplete="new-password" placeholder={authContent.register.passwordPlaceholder} minLength={8} required />
        <Field control="password" label={authContent.register.passwordConfirmation} name="password-confirmation" autoComplete="new-password" placeholder={authContent.register.passwordConfirmationPlaceholder} minLength={8} required />
        <input name="role" type="hidden" value={selectedRole} />
        <fieldset className="auth-register-role">
          <legend>{authContent.register.roleLegend}</legend>
          <p>{authContent.register.roleDescription}</p>
          <div className="auth-register-role__grid">
            {roleOptions
              .filter((role) => !editorInviteToken || role.id === "editor")
              .map((role) => {
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
        {selectedRole === "publisher" ? <PublisherApplicationFields /> : null}
        <label className="auth-checkbox auth-terms">
          <input name="terms" required type="checkbox" value="accepted" />
          <span>
            <Link href="/uyelik-sozlesmesi">İlkOku Platform Kullanım ve Gizlilik Taahhüdü</Link>
            {"’nü okudum ve kabul ediyorum."}
          </span>
        </label>
        <p className="auth-switch">
          Kişisel verilerin işlenmesine ilişkin bilgilendirme için{" "}
          <Link href="/yasal/kvkk">KVKK Aydınlatma Metni</Link>’ni inceleyebilirsin.
        </p>
        <Button className="auth-submit" type="submit" loading={pending}>{authContent.register.submit}</Button>
      </form>
      {state.message && <p className={`auth-status auth-status--${state.status}`} role={state.status === "error" ? "alert" : "status"}>{state.message}</p>}
      <p className="auth-switch">{authContent.register.hasAccount} <Link href={loginHref}>{authContent.register.login}</Link></p>
    </div>
  );
}
