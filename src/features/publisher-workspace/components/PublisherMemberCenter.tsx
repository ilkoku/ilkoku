"use client";

import "../publisher-workspace.css";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { publisherRoleLabels } from "../permissions";
import {
  cancelPublisherInvitationAction,
  invitePublisherMemberAction,
  updatePublisherMemberAction,
} from "../actions";
import type {
  PublisherActionState,
  PublisherInvitationData,
  PublisherMemberData,
} from "../types";

const initialState: PublisherActionState = {
  message: "",
  status: "idle",
};

const invitationStatusLabels: Record<
  PublisherInvitationData["status"],
  string
> = {
  pending: "Bekliyor",
  accepted: "Kabul edildi",
  declined: "Reddedildi",
  cancelled: "İptal edildi",
  expired: "Süresi doldu",
};

function formatDate(value: string) {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "Tarih bilinmiyor";
  }

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

function PublisherInviteForm() {
  const [state, action, pending] = useActionState(
    invitePublisherMemberAction,
    initialState,
  );

  return (
    <Card className="publisher-invite-card">
      <div className="publisher-invite-card__heading">
        <div>
          <span>Ekip yönetimi</span>
          <h2>Yeni ekip üyesi davet et</h2>
          <p>
            E-posta adresini ve görev alanını seçin. Davet yedi gün
            boyunca geçerlidir.
          </p>
        </div>
      </div>

      <form action={action} className="publisher-invite-form">
        <label>
          <span>E-posta adresi</span>
          <input
            autoComplete="email"
            maxLength={320}
            name="email"
            placeholder="ekip@yayinevi.com"
            required
            type="email"
          />
        </label>

        <label>
          <span>Yetki</span>
          <select defaultValue="editorial" name="role" required>
            <option value="manager">Yönetici</option>
            <option value="submissions_manager">
              Başvuru yöneticisi
            </option>
            <option value="editorial">Editoryal kullanıcı</option>
            <option value="contract_manager">
              Sözleşme yetkilisi
            </option>
            <option value="reviewer">Değerlendirici</option>
            <option value="viewer">Salt okunur</option>
          </select>
        </label>

        <Button loading={pending} type="submit">
          Davet oluştur
        </Button>

        {state.message ? (
          <p
            className="publisher-invite-form__message"
            data-status={state.status}
            role={state.status === "error" ? "alert" : "status"}
          >
            {state.message}
          </p>
        ) : null}
      </form>
    </Card>
  );
}

function PublisherInvitationCancelForm({
  invitationId,
}: {
  invitationId: string;
}) {
  const [state, action, pending] = useActionState(
    cancelPublisherInvitationAction,
    initialState,
  );

  return (
    <form action={action} className="publisher-invitation-cancel">
      <input
        name="invitationId"
        type="hidden"
        value={invitationId}
      />

      <Button
        disabled={pending}
        type="submit"
        variant="outline"
      >
        {pending ? "İptal ediliyor…" : "Daveti iptal et"}
      </Button>

      {state.message ? (
        <p
          data-status={state.status}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}

function PublisherMemberForm({
  member,
}: {
  member: PublisherMemberData;
}) {
  const [state, action, pending] = useActionState(
    updatePublisherMemberAction,
    initialState,
  );

  return (
    <form action={action} className="publisher-member-form">
      <input name="memberId" type="hidden" value={member.id} />

      <label>
        <span>Yetki</span>
        <select defaultValue={member.role} name="role">
          <option value="manager">Yönetici</option>
          <option value="submissions_manager">
            Başvuru yöneticisi
          </option>
          <option value="editorial">Editoryal kullanıcı</option>
          <option value="contract_manager">
            Sözleşme yetkilisi
          </option>
          <option value="reviewer">Değerlendirici</option>
          <option value="viewer">Salt okunur</option>
        </select>
      </label>

      <label>
        <span>Durum</span>
        <select
          defaultValue={String(member.active)}
          name="active"
        >
          <option value="true">Aktif</option>
          <option value="false">Pasif</option>
        </select>
      </label>

      <Button
        disabled={pending}
        type="submit"
        variant="outline"
      >
        {pending ? "Kaydediliyor…" : "Kaydet"}
      </Button>

      {state.message ? (
        <p data-status={state.status}>{state.message}</p>
      ) : null}
    </form>
  );
}

function PublisherInvitationList({
  invitations,
}: {
  invitations: PublisherInvitationData[];
}) {
  return (
    <section className="publisher-workspace__section">
      <header>
        <div>
          <h2>Ekip davetleri</h2>
          <p>
            Gönderilen davetleri ve güncel durumlarını takip edin.
          </p>
        </div>
        <strong>{invitations.length} davet</strong>
      </header>

      {invitations.length === 0 ? (
        <Card>
          <p className="publisher-member-list__empty">
            Henüz ekip daveti oluşturulmadı.
          </p>
        </Card>
      ) : (
        <div className="publisher-invitation-list">
          {invitations.map((invitation) => (
            <Card key={invitation.id}>
              <div className="publisher-invitation-list__main">
                <span data-status={invitation.status}>
                  {invitationStatusLabels[invitation.status]}
                </span>

                <h3>{invitation.invitedEmail}</h3>

                <strong>
                  {publisherRoleLabels[invitation.role]}
                </strong>

                <dl>
                  <div>
                    <dt>Davet eden</dt>
                    <dd>{invitation.invitedByName}</dd>
                  </div>

                  <div>
                    <dt>Oluşturulma</dt>
                    <dd>{formatDate(invitation.createdAt)}</dd>
                  </div>

                  <div>
                    <dt>Son geçerlilik</dt>
                    <dd>{formatDate(invitation.expiresAt)}</dd>
                  </div>

                  {invitation.acceptedByName ? (
                    <div>
                      <dt>Kabul eden</dt>
                      <dd>{invitation.acceptedByName}</dd>
                    </div>
                  ) : null}
                </dl>
              </div>

              {invitation.status === "pending" ? (
                <PublisherInvitationCancelForm
                  invitationId={invitation.id}
                />
              ) : (
                <p className="publisher-member-list__notice">
                  Bu davet artık değiştirilemez.
                </p>
              )}
            </Card>
          ))}
        </div>
      )}
    </section>
  );
}

export function PublisherMemberCenter({
  canManage,
  companyName,
  invitations,
  members,
}: {
  canManage: boolean;
  companyName: string;
  invitations: PublisherInvitationData[];
  members: PublisherMemberData[];
}) {
  return (
    <div className="publisher-workspace">
      <header className="publisher-workspace__hero">
        <div>
          <p>{companyName}</p>
          <h1>Ekip ve üyeler</h1>
          <span>
            Yayınevi içindeki erişimleri görev alanına göre yönetin.
          </span>
        </div>
      </header>

      {canManage ? <PublisherInviteForm /> : null}

      <section className="publisher-workspace__section">
        <header>
          <div>
            <h2>Mevcut ekip üyeleri</h2>
            <p>Üyelerin rollerini ve erişim durumlarını yönetin.</p>
          </div>
          <strong>{members.length} üye</strong>
        </header>

        <div className="publisher-member-list">
          {members.map((member) => (
            <Card key={member.id}>
              <div>
                <span data-active={member.active}>
                  {member.active ? "Aktif" : "Pasif"}
                </span>
                <h2>{member.displayName}</h2>
                <p>{member.email}</p>
                <strong>
                  {publisherRoleLabels[member.role]}
                </strong>
              </div>

              {canManage && member.role !== "owner" ? (
                <PublisherMemberForm member={member} />
              ) : (
                <p className="publisher-member-list__notice">
                  {member.role === "owner"
                    ? "Sahip hesabı bu ekrandan değiştirilemez."
                    : "Bu hesap salt okunur görüntüleniyor."}
                </p>
              )}
            </Card>
          ))}
        </div>
      </section>

      {canManage ? (
        <PublisherInvitationList invitations={invitations} />
      ) : null}
    </div>
  );
}
