import { randomUUID } from "node:crypto";
import { prisma } from "@/lib/prisma";

export type OptionalEmailCategory =
  | "social"
  | "followed_content"
  | "editor_workflow"
  | "publisher_workflow"
  | "daily_summary"
  | "weekly_summary"
  | "product_updates";

export type NotificationPreferences = {
  socialEmail: boolean;
  followedContentEmail: boolean;
  editorWorkflowEmail: boolean;
  publisherWorkflowEmail: boolean;
  dailySummaryEmail: boolean;
  weeklySummaryEmail: boolean;
  productUpdatesEmail: boolean;
};

type NotificationPreferenceRow = {
  socialEmail: number | boolean;
  followedContentEmail: number | boolean;
  editorWorkflowEmail: number | boolean;
  publisherWorkflowEmail: number | boolean;
  dailySummaryEmail: number | boolean;
  weeklySummaryEmail: number | boolean;
  productUpdatesEmail: number | boolean;
};

export const defaultNotificationPreferences: NotificationPreferences = {
  socialEmail: true,
  followedContentEmail: true,
  editorWorkflowEmail: true,
  publisherWorkflowEmail: true,
  dailySummaryEmail: false,
  weeklySummaryEmail: false,
  productUpdatesEmail: false,
};

function asBoolean(value: number | boolean) {
  return value === true || value === 1;
}

function normalize(row: NotificationPreferenceRow): NotificationPreferences {
  return {
    socialEmail: asBoolean(row.socialEmail),
    followedContentEmail: asBoolean(row.followedContentEmail),
    editorWorkflowEmail: asBoolean(row.editorWorkflowEmail),
    publisherWorkflowEmail: asBoolean(row.publisherWorkflowEmail),
    dailySummaryEmail: asBoolean(row.dailySummaryEmail),
    weeklySummaryEmail: asBoolean(row.weeklySummaryEmail),
    productUpdatesEmail: asBoolean(row.productUpdatesEmail),
  };
}

function logReadFailure(
  operation: string,
  error: unknown,
) {
  console.error(
    "NOTIFICATION_PREFERENCES_READ_FAILED",
    {
      operation,
      error:
        error instanceof Error
          ? error.message
          : "UNKNOWN_ERROR",
    },
  );
}

export async function getNotificationPreferences(
  userId: string,
): Promise<NotificationPreferences> {
  try {
    const rows = await prisma.$queryRaw<NotificationPreferenceRow[]>`
      SELECT
        socialEmail,
        followedContentEmail,
        editorWorkflowEmail,
        publisherWorkflowEmail,
        dailySummaryEmail,
        weeklySummaryEmail,
        productUpdatesEmail
      FROM NotificationPreference
      WHERE userId = ${userId}
      LIMIT 1
    `;

    return rows[0]
      ? normalize(rows[0])
      : { ...defaultNotificationPreferences };
  } catch (error) {
    logReadFailure(
      "get_by_user_id",
      error,
    );

    return {
      ...defaultNotificationPreferences,
    };
  }
}

export async function saveNotificationPreferences(
  userId: string,
  preferences: NotificationPreferences,
) {
  await prisma.$executeRaw`
    INSERT INTO NotificationPreference (
      id,
      userId,
      socialEmail,
      followedContentEmail,
      editorWorkflowEmail,
      publisherWorkflowEmail,
      dailySummaryEmail,
      weeklySummaryEmail,
      productUpdatesEmail,
      createdAt,
      updatedAt
    ) VALUES (
      ${randomUUID()},
      ${userId},
      ${preferences.socialEmail},
      ${preferences.followedContentEmail},
      ${preferences.editorWorkflowEmail},
      ${preferences.publisherWorkflowEmail},
      ${preferences.dailySummaryEmail},
      ${preferences.weeklySummaryEmail},
      ${preferences.productUpdatesEmail},
      CURRENT_TIMESTAMP(3),
      CURRENT_TIMESTAMP(3)
    )
    ON DUPLICATE KEY UPDATE
      socialEmail = VALUES(socialEmail),
      followedContentEmail = VALUES(followedContentEmail),
      editorWorkflowEmail = VALUES(editorWorkflowEmail),
      publisherWorkflowEmail = VALUES(publisherWorkflowEmail),
      dailySummaryEmail = VALUES(dailySummaryEmail),
      weeklySummaryEmail = VALUES(weeklySummaryEmail),
      productUpdatesEmail = VALUES(productUpdatesEmail),
      updatedAt = CURRENT_TIMESTAMP(3)
  `;
}

function categoryEnabled(
  preferences: NotificationPreferences,
  category: OptionalEmailCategory,
) {
  const map: Record<OptionalEmailCategory, boolean> = {
    social: preferences.socialEmail,
    followed_content: preferences.followedContentEmail,
    editor_workflow: preferences.editorWorkflowEmail,
    publisher_workflow: preferences.publisherWorkflowEmail,
    daily_summary: preferences.dailySummaryEmail,
    weekly_summary: preferences.weeklySummaryEmail,
    product_updates: preferences.productUpdatesEmail,
  };

  return map[category];
}

export async function shouldSendOptionalEmail(
  email: string,
  category: OptionalEmailCategory,
) {
  try {
    const users = await prisma.$queryRaw<Array<{ id: string }>>`
      SELECT id
      FROM User
      WHERE LOWER(email) = LOWER(${email.trim()})
        AND status = 'active'
        AND deletedAt IS NULL
      LIMIT 1
    `;

    const user = users[0];

    if (!user) {
      return true;
    }

    const preferences = await getNotificationPreferences(user.id);
    return categoryEnabled(preferences, category);
  } catch (error) {
    logReadFailure(
      "should_send_optional_email",
      error,
    );

    return true;
  }
}

export function getOptionalEmailCategory(
  template: string,
): OptionalEmailCategory | null {
  if (
    template === "reader_comment_reply" ||
    template === "author_publisher_work_liked" ||
    template === "author_publisher_work_favorited" ||
    template === "author_publisher_author_liked" ||
    template === "author_publisher_author_favorited" ||
    template === "author_publisher_followed"
  ) {
    return "social";
  }

  if (
    template === "reader_favorite_work_new_chapter" ||
    template === "publisher_followed_author_published"
  ) {
    return "followed_content";
  }

  if (
    template === "editor_invitation_accepted" ||
    template === "editor_work_recommendation" ||
    template === "second_editor_assignment" ||
    template.startsWith("author_editor_") ||
    template.startsWith("author_second_editor_") ||
    template.startsWith("first_editor_second_review_")
  ) {
    return "editor_workflow";
  }

  if (
    template === "publisher_team_invitation_accepted" ||
    template === "publisher_contract_sent" ||
    template.startsWith("publisher_submission_")
  ) {
    return "publisher_workflow";
  }

  if (template === "writer_daily_summary") {
    return "daily_summary";
  }

  if (template === "weekly_discovery_summary") {
    return "weekly_summary";
  }

  if (template.startsWith("product_update_")) {
    return "product_updates";
  }

  return null;
}
