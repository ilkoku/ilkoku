"use client";

import { useState, useTransition } from "react";

import {
  markNotificationReadAction,
  openNotificationTargetAction,
  toggleNotificationReadAction,
} from "@/features/notifications/actions";
import styles from "@/features/notifications/notification-list.module.css";
import { NotificationEnvelopeIcon } from "./NotificationEnvelopeIcon";

type NotificationListItemProps = {
  createdAtIso: string;
  formattedDate: string;
  hasTarget: boolean;
  initialRead: boolean;
  message: string;
  notificationId: string;
  returnPath: "/bildirimler" | "/editor/bildirimler";
  title: string;
};

function notificationFormData(
  notificationId: string,
  returnPath: NotificationListItemProps["returnPath"],
) {
  const formData = new FormData();
  formData.set("notificationId", notificationId);
  formData.set("returnPath", returnPath);
  return formData;
}

export function NotificationListItem({
  createdAtIso,
  formattedDate,
  hasTarget,
  initialRead,
  message,
  notificationId,
  returnPath,
  title,
}: NotificationListItemProps) {
  const [expanded, setExpanded] = useState(false);
  const [read, setRead] = useState(initialRead);
  const [isPending, startTransition] = useTransition();
  const detailsId = `notification-details-${notificationId}`;
  const readActionLabel = read
    ? "Okunmadı olarak işaretle"
    : "Okundu olarak işaretle";

  function markReadIfNeeded() {
    if (read) return;

    setRead(true);
    startTransition(async () => {
      try {
        await markNotificationReadAction(
          notificationFormData(notificationId, returnPath),
        );
      } catch {
        setRead(false);
      }
    });
  }

  function handleToggleDetails() {
    const nextExpanded = !expanded;
    setExpanded(nextExpanded);

    if (nextExpanded) {
      markReadIfNeeded();
    }
  }

  function handleToggleReadState() {
    const previousRead = read;
    const nextRead = !read;

    setRead(nextRead);
    if (!nextRead) {
      setExpanded(false);
    }

    startTransition(async () => {
      try {
        await toggleNotificationReadAction(
          notificationFormData(notificationId, returnPath),
        );
      } catch {
        setRead(previousRead);
      }
    });
  }

  return (
    <article
      className={styles.notificationItem}
      data-expanded={expanded}
      data-read={read}
    >
      <div className={styles.notificationHeader}>
        <button
          aria-controls={detailsId}
          aria-expanded={expanded}
          className={styles.notificationOpenButton}
          onClick={handleToggleDetails}
          type="button"
        >
          <span className={styles.notificationHeadline}>
            <strong className={styles.notificationTitle}>{title}</strong>
            <time
              className={styles.notificationTime}
              dateTime={createdAtIso}
            >
              {formattedDate}
            </time>
          </span>
          <span className={styles.openHint}>
            {expanded ? "Kapat" : "Bildirimi aç"}
          </span>
        </button>

        <button
          aria-label={readActionLabel}
          aria-pressed={read}
          className={styles.readStateButton}
          data-read={read}
          disabled={isPending}
          onClick={handleToggleReadState}
          title={readActionLabel}
          type="button"
        >
          <NotificationEnvelopeIcon read={read} />
        </button>
      </div>

      {expanded ? (
        <div className={styles.notificationDetails} id={detailsId}>
          <p className={styles.notificationMessage}>{message}</p>
          {hasTarget ? (
            <form
              action={openNotificationTargetAction}
              className={styles.relatedAction}
            >
              <input name="notificationId" type="hidden" value={notificationId} />
              <input name="returnPath" type="hidden" value={returnPath} />
              <button className="button button--ghost" type="submit">
                İlgili kayda git
              </button>
            </form>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}
