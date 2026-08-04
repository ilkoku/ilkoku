"use client";

import {
  useActionState,
} from "react";
import {
  sendAdminTestEmailAction,
  type AdminEmailActionState,
} from "@/features/admin-email/actions";

const initialState:
  AdminEmailActionState = {
    message: "",
    status: "idle",
  };

export function AdminEmailTestForm({
  defaultEmail,
  deliveryMode,
}: {
  defaultEmail: string;
  deliveryMode: "local" | "smtp";
}) {
  const [
    state,
    action,
    pending,
  ] = useActionState(
    sendAdminTestEmailAction,
    initialState,
  );

  return (
    <form
      action={action}
      className="admin-email-test-form"
    >
      <div className="admin-email-form-grid">
        <label>
          <span>Alıcı</span>
          <input
            defaultValue={defaultEmail}
            maxLength={320}
            name="recipient"
            required
            type="email"
          />
          <small>
            {deliveryMode === "smtp"
              ? "SMTP modunda yalnızca kendi admin adresinize gönderilebilir."
              : "Local modda mesaj gerçek adrese teslim edilmez."}
          </small>
        </label>

        <label>
          <span>Gönderim kanalı</span>
          <select
            defaultValue="support"
            name="channel"
          >
            <option value="default">
              Genel · ilkoku@
            </option>
            <option value="system">
              Sistem · noreply@
            </option>
            <option value="support">
              Destek · destek@
            </option>
            <option value="editor">
              Editör · editor@
            </option>
            <option value="publisher">
              Yayınevi · yayinevi@
            </option>
          </select>
        </label>
      </div>

      <label className="admin-email-confirmation">
        <input
          name="confirmation"
          required
          type="checkbox"
          value="SEND_ADMIN_TEST_EMAIL"
        />
        <span>
          Bunun yalnızca bir sistem testi
          olduğunu ve gönderimin kayıt altına
          alınacağını onaylıyorum.
        </span>
      </label>

      <div className="admin-email-form-footer">
        <button
          disabled={pending}
          type="submit"
        >
          {pending
            ? "Test hazırlanıyor…"
            : "Güvenli test gönder"}
        </button>

        <span
          className={
            state.status === "error"
              ? "admin-email-result admin-email-result--error"
              : state.status === "success"
                ? "admin-email-result admin-email-result--success"
                : "admin-email-result"
          }
          role="status"
        >
          {state.message}

          {state.deliveryId ? (
            <small>
              Kayıt: {state.deliveryId}
            </small>
          ) : null}
        </span>
      </div>
    </form>
  );
}
