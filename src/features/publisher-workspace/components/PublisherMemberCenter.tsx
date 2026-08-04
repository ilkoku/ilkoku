"use client";

import "../publisher-workspace.css";
import { useActionState } from "react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import {
  customizablePublisherPermissionKeys,
  publisherPermissionGroups,
  publisherPermissionLabels,
  publisherRoleLabels,
  type PublisherPermission,
} from "../permissions";
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

const customizablePermissionSet =
  new Set<PublisherPermission>(
    customizablePublisherPermissionKeys,
  );

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

function PublisherPermissionFields({
  selected,
}: {
  selected: readonly PublisherPermission[];
}) {
  const selectedSet = new Set(selected);

  return (
    <fieldset className="publisher-permission-fields">
      <legend>Çalışma alanı yetkileri</legend>
      <p>
        Bu üyeye verilecek işlemleri kategori bazında
        seçin. Sözleşme yetkileri mevcut rol kurallarıyla
        korunur.
      </p>

      <div className="publisher-permission-groups">
        {publisherPermissionGroups.map((group) => {
          const permissions = group.permissions.filter(
            (permission) =>
              customizablePermissionSet.has(permission),
          );

          if (permissions.length === 0) {
            return null;
          }

          return (
            <section
              className="publisher-permission-group"
              key={group.id}
            >
              <header>
                <strong>{group.title}</strong>
                <span>{permissions.length} yetki</span>
              </header>

              <div className="publisher-permission-group__options">
                {permissions.map((permission) => (
                  <label key={permission}>
                    <input
                      defaultChecked={
                        selectedSet.has(permission)
                      }
                      name="permissions"
                      type="checkbox"
                      value={permission}
                    />
                    <span>
                      {publisherPermissionLabels[permission]}
                    </span>
                  </label>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </fieldset>
  );
}

function PublisherPermissionList({
  permissions,
}: {
  permissions: readonly PublisherPermission[];
}) {
  const permissionSet =
    new Set<PublisherPermission>(permissions);

  return (
    <details className="publisher-permission-summary">
      <summary>
        <span>Tanımlı yetkiler</span>
        <strong>{permissions.length} yetki</strong>
      </summary>

      <div className="publisher-permission-summary__groups">
        {publisherPermissionGroups.map((group) => {
          const activePermissions =
            group.permissions.filter((permission) =>
              permissionSet.has(permission),
            );

          if (activePermissions.length === 0) {
            return null;
          }

          return (
            <section key={group.id}>
              <h3>{group.title}</h3>
              <ul>
                {activePermissions.map((permission) => (
                  <li key={permission}>
                    {publisherPermissionLabels[permission]}
                  </li>
                ))}
              </ul>
            </section>
          );
        })}
      </div>
    </details>
  );
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
          <span>Ekip rolü</span>
          <select defaultValue="editorial" name="role" required>
            <option value="manager">Yönetici</option>
            <option value="submissions_manager">
              Editoryal yönetici
            </option>
            <option value="editorial">Editoryal kullanıcı</option>
            <option value="contract_manager">
              Sözleşme yetkilisi
            </option>
            <option value="reviewer">Değerlendirici</option>
            <option value="viewer">Salt okunur</option>
          </select>
        </label>

        <PublisherPermissionFields
          selected={[
            "view_submission",
            "add_internal_note",
            "download_file",
          ]}
        />

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
        <span>Ekip rolü</span>
        <select defaultValue={member.role} name="role">
          <option value="manager">Yönetici</option>
          <option value="submissions_manager">
            Editoryal yönetici
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

      <PublisherPermissionFields selected={member.permissions} />

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

                <PublisherPermissionList
                  permissions={invitation.permissions}
                />

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
          <h1>Ekip ve yetkiler</h1>
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
            <Card
              className="publisher-member-card"
              key={member.id}
            >
              <div className="publisher-member-card__header">
                <div className="publisher-member-card__identity">
                  <span data-active={member.active}>
                    {member.active ? "Aktif" : "Pasif"}
                  </span>
                  <h2>{member.displayName}</h2>
                  <p>{member.email}</p>
                </div>

                <div className="publisher-member-card__role">
                  <strong>
                    {publisherRoleLabels[member.role]}
                  </strong>

                  {member.role === "owner" ? (
                    <span
                      className="publisher-member-card__lock"
                      title="Sahip hesabı"
                    >
                      Sahip hesap
                    </span>
                  ) : null}
                </div>
              </div>

              <PublisherPermissionList
                permissions={member.permissions}
              />

              {canManage && member.role !== "owner" ? (
                <details className="publisher-member-editor">
                  <summary>
                    Rol ve yetkileri düzenle
                  </summary>
                  <PublisherMemberForm member={member} />
                </details>
              ) : (
                <div className="publisher-member-list__notice">
                  <strong>
                    {member.role === "owner"
                      ? "Sahip hesabı korunuyor"
                      : "Salt okunur görünüm"}
                  </strong>
                  <span>
                    {member.role === "owner"
                      ? "Sahip rolü ve üyelik durumu bu ekrandan değiştirilemez."
                      : "Bu hesabın rol ve yetkilerini değiştirme izniniz yok."}
                  </span>
                </div>
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
