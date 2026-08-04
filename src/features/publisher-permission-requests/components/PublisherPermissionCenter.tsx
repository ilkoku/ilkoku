"use client";

import { useActionState } from "react";
import { Card } from "@/components/ui/Card";
import {
  publisherPermissionLabels,
  publisherRoleLabels,
  type PublisherPermission,
} from "@/features/publisher-workspace/permissions";
import {
  requestPublisherPermissionAction,
  reviewPublisherPermissionRequestAction,
} from "../actions";
import type {
  PublisherPermissionActionState,
  PublisherPermissionCenterData,
  PublisherPermissionRequestData,
} from "../types";
import styles from "./PublisherPermissionCenter.module.css";

const initialState: PublisherPermissionActionState = {
  message: "",
  status: "idle",
};

const statusLabels = {
  approved: "Onaylandı",
  cancelled: "İptal edildi",
  pending: "Bekliyor",
  rejected: "Reddedildi",
} as const;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

function ActionMessage({ state }: { state: PublisherPermissionActionState }) {
  if (state.status === "idle") return null;
  return (
    <p className={styles.actionMessage} data-status={state.status} role="status">
      {state.message}
    </p>
  );
}

function PermissionRequestForm({
  permission,
}: {
  permission: PublisherPermission;
}) {
  const [state, action, pending] = useActionState(
    requestPublisherPermissionAction,
    initialState,
  );

  return (
    <form action={action} className={styles.requestForm}>
      <input name="permission" type="hidden" value={permission} />
      <label>
        Talep açıklaması
        <textarea
          maxLength={500}
          name="requestNote"
          placeholder="Bu yetkiye neden ihtiyaç duyduğunuzu kısaca yazın."
          rows={3}
        />
      </label>
      <button disabled={pending} type="submit">
        {pending ? "İletiliyor…" : "Talep et"}
      </button>
      <ActionMessage state={state} />
    </form>
  );
}

function ReviewRequestForm({
  request,
}: {
  request: PublisherPermissionRequestData;
}) {
  const [state, action, pending] = useActionState(
    reviewPublisherPermissionRequestAction,
    initialState,
  );

  return (
    <form action={action} className={styles.reviewForm}>
      <input name="requestId" type="hidden" value={request.id} />
      <label>
        Karar notu
        <textarea
          maxLength={500}
          name="reviewNote"
          placeholder="Üyeye iletilecek kısa açıklama (isteğe bağlı)."
          rows={2}
        />
      </label>
      <div className={styles.reviewActions}>
        <button disabled={pending} name="decision" type="submit" value="approved">
          Onayla
        </button>
        <button
          className={styles.rejectButton}
          disabled={pending}
          name="decision"
          type="submit"
          value="rejected"
        >
          Reddet
        </button>
      </div>
      <ActionMessage state={state} />
    </form>
  );
}

function RequestHistory({
  requests,
}: {
  requests: PublisherPermissionRequestData[];
}) {
  if (!requests.length) {
    return <p className={styles.emptyText}>Henüz yetki talebiniz yok.</p>;
  }

  return (
    <div className={styles.historyList}>
      {requests.map((request) => (
        <article className={styles.historyItem} key={request.id}>
          <div>
            <strong>{publisherPermissionLabels[request.permission]}</strong>
            <span data-status={request.status}>{statusLabels[request.status]}</span>
          </div>
          {request.requestNote ? <p>{request.requestNote}</p> : null}
          {request.reviewNote ? (
            <p className={styles.reviewNote}>Karar notu: {request.reviewNote}</p>
          ) : null}
          <small>
            {formatDate(request.createdAt)}
            {request.reviewedAt
              ? ` · ${request.reviewedByName ?? "Yönetici"} tarafından ${formatDate(request.reviewedAt)}`
              : ""}
          </small>
        </article>
      ))}
    </div>
  );
}

export function PublisherPermissionCenter({
  data,
}: {
  data: PublisherPermissionCenterData;
}) {
  const pendingSet = new Set(data.pendingPermissions);

  return (
    <div className={styles.workspace}>
      <header className={styles.hero}>
        <div>
          <p>{data.companyName}</p>
          <h1>Yetkilerim</h1>
          <span>
            {publisherRoleLabels[data.membershipRole]} hesabınızın erişimlerini
            inceleyin ve eksik yetki için yöneticinize talep gönderin.
          </span>
        </div>
        <strong>{data.currentPermissions.length} aktif yetki</strong>
      </header>

      <aside className={styles.notice}>
        <strong>Yetki sınırı</strong>
        <p>
          Talepler yalnızca yayınevi içi görev yetkileri içindir. Sözleşme ve
          yayın planı yetkileri rol politikasına bağlıdır ve bu ekrandan talep
          edilemez.
        </p>
      </aside>

      <section className={styles.section}>
        <header>
          <div>
            <p>Mevcut erişim</p>
            <h2>Size tanımlanan yetkiler</h2>
          </div>
        </header>
        <div className={styles.permissionGrid}>
          {data.currentPermissions.map((permission) => (
            <Card className={styles.permissionCard} key={permission}>
              <span className={styles.granted}>Aktif</span>
              <h3>{publisherPermissionLabels[permission]}</h3>
            </Card>
          ))}
        </div>
      </section>

      <section className={styles.section}>
        <header>
          <div>
            <p>Eksik erişim</p>
            <h2>Talep edilebilir yetkiler</h2>
          </div>
        </header>
        {data.missingPermissions.length ? (
          <div className={styles.permissionGrid}>
            {data.missingPermissions.map((permission) => (
              <Card className={styles.permissionCard} key={permission}>
                <span className={styles.missing}>
                  {pendingSet.has(permission) ? "Talep bekliyor" : "Tanımlı değil"}
                </span>
                <h3>{publisherPermissionLabels[permission]}</h3>
                {pendingSet.has(permission) ? (
                  <p className={styles.pendingText}>
                    Yayınevi yöneticisinin kararı bekleniyor.
                  </p>
                ) : (
                  <PermissionRequestForm permission={permission} />
                )}
              </Card>
            ))}
          </div>
        ) : (
          <p className={styles.emptyText}>Talep edilebilir tüm yetkilere sahipsiniz.</p>
        )}
      </section>

      {data.canReview ? (
        <section className={styles.section}>
          <header>
            <div>
              <p>Yönetici alanı</p>
              <h2>Bekleyen ekip talepleri</h2>
            </div>
            <strong>{data.incomingRequests.length}</strong>
          </header>
          {data.incomingRequests.length ? (
            <div className={styles.reviewList}>
              {data.incomingRequests.map((request) => (
                <Card className={styles.reviewCard} key={request.id}>
                  <div>
                    <span>{request.requestedByName}</span>
                    <h3>{publisherPermissionLabels[request.permission]}</h3>
                    <small>{formatDate(request.createdAt)}</small>
                    {request.requestNote ? <p>{request.requestNote}</p> : null}
                  </div>
                  <ReviewRequestForm request={request} />
                </Card>
              ))}
            </div>
          ) : (
            <p className={styles.emptyText}>Bekleyen ekip yetki talebi yok.</p>
          )}
        </section>
      ) : null}

      <section className={styles.section}>
        <header>
          <div>
            <p>Geçmiş</p>
            <h2>Yetki talepleriniz</h2>
          </div>
        </header>
        <RequestHistory requests={data.ownRequests} />
      </section>
    </div>
  );
}
