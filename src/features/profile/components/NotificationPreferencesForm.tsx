"use client";

import { useActionState } from "react";
import type {
  NotificationPreferences,
} from "@/lib/notification-preferences";
import {
  updateNotificationPreferencesAction,
} from "../notification-preference-actions";
import {
  initialProfileState,
} from "../state";

type PreferenceItem = {
  description: string;
  key: keyof NotificationPreferences;
  label: string;
};

const items: PreferenceItem[] = [
  {
    description:
      "Yorum yanıtları, yayınevi beğenileri ve profil takipleri.",
    key: "socialEmail",
    label: "Yorum ve sosyal hareketler",
  },
  {
    description:
      "Favori eserlerde yeni bölüm ve takip edilen yazarlarda yeni eser.",
    key: "followedContentEmail",
    label: "Takip edilen yazar ve eserler",
  },
  {
    description:
      "Editör görevi, inceleme aşaması ve rapor durumu değişiklikleri.",
    key: "editorWorkflowEmail",
    label: "Editör süreci",
  },
  {
    description:
      "Yayınevi başvurusu, sözleşme ve ekip süreci bildirimleri.",
    key: "publisherWorkflowEmail",
    label: "Yayınevi süreci",
  },
  {
    description:
      "Yazar hesabınız için günlük okuma ve etkileşim özeti.",
    key: "dailySummaryEmail",
    label: "Günlük performans özeti",
  },
  {
    description:
      "Takip, keşif ve çalışma alanı hareketlerinin haftalık özeti.",
    key: "weeklySummaryEmail",
    label: "Haftalık keşif özeti",
  },
  {
    description:
      "Yeni özellikler ve İlkOku ürün duyuruları.",
    key: "productUpdatesEmail",
    label: "Ürün duyuruları",
  },
];

export function NotificationPreferencesForm({
  preferences,
}: {
  preferences: NotificationPreferences;
}) {
  const [state, action, pending] =
    useActionState(
      updateNotificationPreferencesAction,
      initialProfileState,
    );

  return (
    <form
      action={action}
      className="notification-preferences"
    >
      <div className="notification-preferences__locked">
        <div>
          <strong>Hesap ve güvenlik</strong>
          <span>
            Şifre, e-posta doğrulama ve yeni cihaz giriş bildirimleri.
          </span>
        </div>
        <span
          aria-label="Her zaman açık"
          className="notification-preferences__required"
        >
          Her zaman açık
        </span>
      </div>

      <div className="notification-preferences__list">
        {items.map((item) => (
          <label
            className="notification-preferences__item"
            key={item.key}
          >
            <span>
              <strong>{item.label}</strong>
              <small>{item.description}</small>
            </span>
            <input
              defaultChecked={preferences[item.key]}
              name={item.key}
              type="checkbox"
            />
          </label>
        ))}
      </div>

      <div className="notification-preferences__footer">
        <p>
          Kapattığınız isteğe bağlı e-postalar uygulama içi bildirimlerinizi etkilemez.
        </p>
        <button
          className="button button--primary"
          disabled={pending}
          type="submit"
        >
          <span className="button__label">
            {pending
              ? "Kaydediliyor..."
              : "Tercihleri kaydet"}
          </span>
        </button>
      </div>

      {state.message ? (
        <p
          className="notification-preferences__message"
          data-status={state.status}
          role={state.status === "error" ? "alert" : "status"}
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
