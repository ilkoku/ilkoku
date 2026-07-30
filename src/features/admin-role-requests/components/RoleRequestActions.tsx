"use client";

import { useActionState } from "react";
import {
  approveRoleRequestAction,
  rejectRoleRequestAction,
  requestPublisherCorrectionAction,
  type RoleRequestActionState,
} from "../actions/role-request.actions";

type PublisherOption = {
  companyName: string;
  id: string;
};

type RoleRequestActionsProps = {
  applicationComplete?: boolean;
  publishers: PublisherOption[];
  publisherName?: string | null;
  requestId: string;
  requestedRole: string;
};

const initialState: RoleRequestActionState = {
  message: "",
  status: "idle",
};

function ActionMessage({ state }: { state: RoleRequestActionState }) {
  if (!state.message) return null;

  return (
    <p
      aria-live="polite"
      className="admin-role-action-message"
      data-status={state.status}
      role={state.status === "error" ? "alert" : "status"}
    >
      {state.message}
    </p>
  );
}

export function RoleRequestActions({
  applicationComplete = true,
  publishers,
  publisherName,
  requestId,
  requestedRole,
}: RoleRequestActionsProps) {
  const [approvalState, approvalAction, approvalPending] = useActionState(
    approveRoleRequestAction,
    initialState,
  );
  const [rejectionState, rejectionAction, rejectionPending] = useActionState(
    rejectRoleRequestAction,
    initialState,
  );
  const [correctionState, correctionAction, correctionPending] = useActionState(
    requestPublisherCorrectionAction,
    initialState,
  );

  const busy = approvalPending || correctionPending || rejectionPending;

  return (
    <div className="admin-role-actions">
      <form action={approvalAction}>
        <input name="requestId" type="hidden" value={requestId} />

        <label htmlFor={`approval-note-${requestId}`}>
          <span>Yönetici notu</span>
          <textarea
            id={`approval-note-${requestId}`}
            maxLength={2000}
            name="reviewNote"
            placeholder="Onay notu veya kısa değerlendirme…"
          />
        </label>

        {requestedRole === "publisher" ? (
          <fieldset className="admin-publisher-link">
            <legend>Yayınevi bağlantısı</legend>

            <div className="admin-publisher-link__submitted">
              <span>Başvurulan yayınevi adı</span>
              <strong>{publisherName || "Başvuru bilgisi eksik"}</strong>
            </div>

            <label className="admin-publisher-link__choice">
              <input
                defaultChecked
                name="publisherMode"
                type="radio"
                value="new"
              />
              <span>Başvuru bilgileriyle yeni yayınevi oluştur</span>
            </label>

            <details className="admin-publisher-link__advanced">
              <summary>Gelişmiş eşleştirme</summary>
              <label className="admin-publisher-link__choice">
                <input
                  name="publisherMode"
                  type="radio"
                  value="existing"
                />
                <span>Mevcut yayıneviyle eşleştir</span>
              </label>
              <label htmlFor={`publisher-${requestId}`}>
                <span>Mevcut yayınevi</span>
                <select
                  defaultValue=""
                  id={`publisher-${requestId}`}
                  name="publisherId"
                >
                  <option value="">Yayınevi seçin</option>
                  {publishers.map((publisher) => (
                    <option key={publisher.id} value={publisher.id}>
                      {publisher.companyName}
                    </option>
                  ))}
                </select>
              </label>
            </details>

            <small>
              Kullanıcı, etkin owner üyeliği oluşmadan yayınevi rolüne
              geçirilemez.
            </small>
            {!applicationComplete ? (
              <p className="admin-publisher-link__warning" role="alert">
                Kurumsal başvuru tamamlanmadan onay verilemez. Kullanıcıdan
                bilgileri tamamlamasını isteyin.
              </p>
            ) : null}
          </fieldset>
        ) : null}

        <label className="admin-role-confirmation">
          <input
            name="confirmation"
            required
            type="checkbox"
            value="confirmed"
          />
          <span>Onay kararını ve rol değişikliğini teyit ediyorum.</span>
        </label>

        <button
          className="admin-role-button admin-role-button--approve"
          disabled={busy || (requestedRole === "publisher" && !applicationComplete)}
          type="submit"
        >
          {approvalPending ? "Onaylanıyor…" : "Onayla"}
        </button>

        <ActionMessage state={approvalState} />
      </form>

      {requestedRole === "publisher" ? (
        <form action={correctionAction}>
          <input name="requestId" type="hidden" value={requestId} />

          <label htmlFor={`correction-note-${requestId}`}>
            <span>Düzeltme açıklaması</span>
            <textarea
              id={`correction-note-${requestId}`}
              maxLength={2000}
              minLength={5}
              name="reviewNote"
              placeholder="Eksik veya düzeltilmesi gereken bilgileri açıklayın…"
              required
            />
          </label>

          <label className="admin-role-confirmation">
            <input
              name="confirmation"
              required
              type="checkbox"
              value="confirmed"
            />
            <span>Düzeltme isteğini teyit ediyorum.</span>
          </label>

          <button
            className="admin-role-button admin-role-button--correction"
            disabled={busy}
            type="submit"
          >
            {correctionPending ? "Gönderiliyor…" : "Düzeltme İste"}
          </button>

          <ActionMessage state={correctionState} />
        </form>
      ) : null}

      <form action={rejectionAction}>
        <input name="requestId" type="hidden" value={requestId} />

        <label htmlFor={`rejection-note-${requestId}`}>
          <span>Ret gerekçesi</span>
          <textarea
            id={`rejection-note-${requestId}`}
            maxLength={2000}
            minLength={5}
            name="reviewNote"
            placeholder="Başvurunun neden reddedildiğini yazın…"
            required
          />
        </label>

        <label className="admin-role-confirmation">
          <input
            name="confirmation"
            required
            type="checkbox"
            value="confirmed"
          />
          <span>Ret kararını teyit ediyorum.</span>
        </label>

        <button
          className="admin-role-button admin-role-button--reject"
          disabled={busy}
          type="submit"
        >
          {rejectionPending ? "Reddediliyor…" : "Reddet"}
        </button>

        <ActionMessage state={rejectionState} />
      </form>
    </div>
  );
}
