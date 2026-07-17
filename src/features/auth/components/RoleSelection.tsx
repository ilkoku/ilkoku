"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/Button";
import { authContent } from "@/content";
import { updateRoleAction } from "../actions";
import { initialAuthState } from "../state";
import { roleOptions } from "../data";
import type { UserRole } from "../types";

export function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<UserRole>("writer");
  const [state, formAction, pending] = useActionState(updateRoleAction, initialAuthState);
  const selected = roleOptions.find((role) => role.id === selectedRole) ?? roleOptions[1];

  return (
    <form className="role-selection" action={formAction}>
      <input name="role" type="hidden" value={selectedRole} />
      <fieldset className="role-selection__fieldset">
        <legend className="sr-only">{authContent.roleSelection.legend}</legend>
        <div className="role-grid">
          {roleOptions.map((role) => {
            const isSelected = selectedRole === role.id;
            return (
              <button className="role-card" data-selected={isSelected} key={role.id} type="button" onClick={() => setSelectedRole(role.id)} aria-pressed={isSelected} aria-controls="role-preview">
                <span className="role-card__icon" aria-hidden="true">{role.icon}</span>
                <span className="role-card__copy"><strong>{role.title}</strong><small>{role.description}</small></span>
                <span className="role-card__marker" aria-hidden="true">{isSelected ? "✓" : "→"}</span>
              </button>
            );
          })}
        </div>
      </fieldset>
      <section className="role-preview" id="role-preview" aria-live="polite" aria-labelledby="role-preview-title">
        <div className="role-preview__visual" aria-hidden="true"><span>{selected.icon}</span><div><i /><i /><i /></div></div>
        <div className="role-preview__copy">
          <p>{authContent.roleSelection.previewEyebrow}</p>
          <h2 id="role-preview-title">{selected.previewTitle}</h2>
          <span>{selected.previewDescription}</span>
          <ul>{selected.highlights.map((highlight) => <li key={highlight}>{highlight}</li>)}</ul>
          <Button type="submit" loading={pending}>{selected.actionLabel}</Button>
          {state.message && <small className={`auth-status auth-status--${state.status}`} role="alert">{state.message}</small>}
          <small>{authContent.roleSelection.changeLater}</small>
        </div>
      </section>
    </form>
  );
}
