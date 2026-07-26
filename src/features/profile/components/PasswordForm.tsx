"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Field } from "@/components/ui/Field";
import { changePasswordAction } from "../actions";
import { initialProfileState } from "../state";

export function PasswordForm() {
  const [state, formAction, pending] = useActionState(changePasswordAction, initialProfileState);

  return (
    <form action={formAction} className="profile-password-form">
      <Field control="password" label="Mevcut şifre" name="currentPassword" autoComplete="current-password" required />
      <Field control="password" label="Yeni şifre" name="newPassword" autoComplete="new-password" required message="En az 8 karakter, bir harf ve bir rakam." />
      <Field control="password" label="Yeni şifre tekrar" name="confirmation" autoComplete="new-password" required />
      {state.message && (
        <p className={`profile-status profile-status--${state.status}`} role="status">
          {state.message}
        </p>
      )}
      <Button loading={pending} type="submit" variant="secondary">Şifreyi değiştir</Button>
    </form>
  );
}
