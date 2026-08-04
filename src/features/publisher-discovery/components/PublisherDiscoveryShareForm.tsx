"use client";

import { useActionState } from "react";

import {
  createPublisherDiscoveryShareAction,
  type PublisherShareActionState,
} from "../sharing-actions";
import type {
  PublisherShareEntityKind,
  PublisherShareRecipientOption,
} from "../sharing-repository";
import "../publisher-sharing.css";

const initialState: PublisherShareActionState = {
  message: "",
  status: "idle",
};

type SharedFieldsProps = {
  entityId: string;
  entityKind: PublisherShareEntityKind;
  returnPath: string;
};

function SharedFields({
  entityId,
  entityKind,
  returnPath,
}: SharedFieldsProps) {
  return (
    <>
      <input name="entityId" type="hidden" value={entityId} />
      <input name="entityKind" type="hidden" value={entityKind} />
      <input name="returnPath" type="hidden" value={returnPath} />
    </>
  );
}

function Result({ state }: { state: PublisherShareActionState }) {
  return state.message ? (
    <p
      className="publisher-share-form__result"
      data-status={state.status}
      role={state.status === "error" ? "alert" : "status"}
    >
      {state.message}
    </p>
  ) : null;
}

function TeamShareForm({
  entityId,
  entityKind,
  members,
  returnPath,
}: SharedFieldsProps & {
  members: PublisherShareRecipientOption[];
}) {
  const [state, action, pending] = useActionState(
    createPublisherDiscoveryShareAction,
    initialState,
  );

  return (
    <form action={action} className="publisher-share-form">
      <SharedFields
        entityId={entityId}
        entityKind={entityKind}
        returnPath={returnPath}
      />
      <input name="channel" type="hidden" value="team" />

      <fieldset>
        <legend>Paylaşılacak ekip üyeleri</legend>
        {members.length ? (
          <div className="publisher-share-form__members">
            {members.map((member) => (
              <label key={member.id}>
                <input
                  name="recipientMembershipIds"
                  type="checkbox"
                  value={member.id}
                />
                <span>
                  <strong>{member.label}</strong>
                  <small>{member.roleLabel}</small>
                </span>
              </label>
            ))}
          </div>
        ) : (
          <p className="publisher-share-form__empty">
            Paylaşımları görme yetkisi bulunan başka aktif ekip üyesi yok.
          </p>
        )}
      </fieldset>

      <label>
        <span>Zorunlu paylaşım notu</span>
        <textarea
          maxLength={1000}
          minLength={3}
          name="note"
          placeholder="Bu kaydın neden incelenmesi gerektiğini yazın."
          required
          rows={4}
        />
      </label>

      <button
        className="button button--primary"
        disabled={pending || members.length === 0}
        type="submit"
      >
        {pending ? "Paylaşılıyor…" : "Ekip içinde paylaş"}
      </button>

      <Result state={state} />
    </form>
  );
}

function EmailShareForm({
  entityId,
  entityKind,
  returnPath,
}: SharedFieldsProps) {
  const [state, action, pending] = useActionState(
    createPublisherDiscoveryShareAction,
    initialState,
  );

  return (
    <form action={action} className="publisher-share-form">
      <SharedFields
        entityId={entityId}
        entityKind={entityKind}
        returnPath={returnPath}
      />
      <input name="channel" type="hidden" value="email" />

      <label>
        <span>Alıcı e-posta adresi</span>
        <input
          autoComplete="email"
          maxLength={320}
          name="recipientEmail"
          placeholder="inceleme@yayinevi.com"
          required
          type="email"
        />
      </label>

      <label>
        <span>Zorunlu paylaşım notu</span>
        <textarea
          maxLength={1000}
          minLength={3}
          name="note"
          placeholder="Alıcının bu kaydı neden incelemesi gerektiğini yazın."
          required
          rows={4}
        />
      </label>

      <button
        className="button button--primary"
        disabled={pending}
        type="submit"
      >
        {pending ? "Gönderiliyor…" : "E-postayla paylaş"}
      </button>

      <Result state={state} />
    </form>
  );
}

export function PublisherDiscoveryShareForm({
  canShareEmail,
  canShareInternal,
  entityId,
  entityKind,
  members,
  returnPath,
}: {
  canShareEmail: boolean;
  canShareInternal: boolean;
  entityId: string;
  entityKind: PublisherShareEntityKind;
  members: PublisherShareRecipientOption[];
  returnPath: string;
}) {
  if (!canShareEmail && !canShareInternal) {
    return null;
  }

  return (
    <details className="publisher-share-panel">
      <summary>Paylaş</summary>
      <div className="publisher-share-panel__content">
        {canShareInternal ? (
          <section>
            <h3>Ekip içi paylaşım</h3>
            <p>Yalnızca aynı yayınevindeki yetkili üyelere görünür.</p>
            <TeamShareForm
              entityId={entityId}
              entityKind={entityKind}
              members={members}
              returnPath={returnPath}
            />
          </section>
        ) : null}

        {canShareEmail ? (
          <section>
            <h3>E-postayla paylaşım</h3>
            <p>Yalnızca public eser veya yazar bağlantısı gönderilir.</p>
            <EmailShareForm
              entityId={entityId}
              entityKind={entityKind}
              returnPath={returnPath}
            />
          </section>
        ) : null}
      </div>
    </details>
  );
}
