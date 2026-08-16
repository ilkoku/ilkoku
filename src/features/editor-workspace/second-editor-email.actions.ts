"use server";

import {
  sendAuthorSecondEditorStatusEmail,
  sendFirstEditorSecondReviewStatusEmail,
} from "@/lib/email/editor-emails";
import { prisma } from "@/lib/prisma";
import {
  claimSecondEditorReviewAction as claimSecondEditorReviewCoreAction,
  sendToSecondEditorAction as sendToSecondEditorCoreAction,
} from "./second-editor.actions";
import {
  completeSecondEditorReviewAction as completeSecondEditorReviewCoreAction,
  saveSecondEditorReviewDraftAction,
} from "./second-editor-review-state.actions";
import type { EditorActionState } from "./types";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function logDeliveryFailure(
  event: string,
  workId: string,
  error: unknown,
) {
  console.error(
    "EDITOR_EMAIL_DELIVERY_FAILED",
    {
      event,
      workId,
      error:
        error instanceof Error
          ? error.message
          : "UNKNOWN_ERROR",
    },
  );
}

async function getSecondReviewPeople(workId: string) {
  return prisma.work.findUnique({
    where: {
      id: workId,
    },
    select: {
      author: {
        select: {
          email: true,
          fullName: true,
          id: true,
        },
      },
      editorReviewAssignments: {
        where: {
          stage: "first",
        },
        select: {
          editor: {
            select: {
              email: true,
              fullName: true,
              id: true,
            },
          },
        },
        take: 1,
      },
      id: true,
      title: true,
    },
  });
}

export async function sendToSecondEditorAction(
  state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  const workId = value(formData, "workId");
  const mode = value(formData, "mode");
  const result = await sendToSecondEditorCoreAction(
    state,
    formData,
  );

  if (
    result.status !== "success" ||
    mode !== "specific" ||
    !workId
  ) {
    return result;
  }

  try {
    const work =
      await getSecondReviewPeople(workId);

    if (!work) {
      return result;
    }

    await prisma.notification.create({
      data: {
        message: `${work.title} adlı eseriniz ikinci editör incelemesi için bir platform editörüne atandı.`,
        relatedEntityId: work.id,
        relatedEntityType: "work",
        title: "İkinci editör atandı",
        type: "editor_review",
        userId: work.author.id,
      },
    });

    try {
      await sendAuthorSecondEditorStatusEmail({
        email: work.author.email,
        fullName: work.author.fullName,
        stage: "assigned",
        workId: work.id,
        workTitle: work.title,
      });
    } catch (emailError) {
      logDeliveryFailure(
        "author_second_editor_assigned",
        work.id,
        emailError,
      );
    }
  } catch (notificationError) {
    console.error(
      "SECOND_EDITOR_ROLE_NOTIFICATION_FAILED",
      notificationError,
    );
  }

  return result;
}

export async function claimSecondEditorReviewAction(
  state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  const workId = value(formData, "workId");
  const result = await claimSecondEditorReviewCoreAction(
    state,
    formData,
  );

  if (
    result.status !== "success" ||
    !workId
  ) {
    return result;
  }

  try {
    const work =
      await getSecondReviewPeople(workId);

    if (!work) {
      return result;
    }

    const firstEditor =
      work.editorReviewAssignments[0]
        ?.editor ?? null;

    const notifications = [
      prisma.notification.create({
        data: {
          message: `${work.title} adlı eseriniz için ikinci editör bağımsız incelemeye başladı.`,
          relatedEntityId: work.id,
          relatedEntityType: "work",
          title: "İkinci editör incelemesi başladı",
          type: "editor_review",
          userId: work.author.id,
        },
      }),
    ];

    if (firstEditor) {
      notifications.push(
        prisma.notification.create({
          data: {
            message: `${work.title} adlı eser için ikinci editör görevi alındı.`,
            relatedEntityId: work.id,
            relatedEntityType: "work",
            title: "İkinci editör süreci başladı",
            type: "editor_review",
            userId: firstEditor.id,
          },
        }),
      );
    }

    await prisma.$transaction(notifications);

    try {
      await sendAuthorSecondEditorStatusEmail({
        email: work.author.email,
        fullName: work.author.fullName,
        stage: "started",
        workId: work.id,
        workTitle: work.title,
      });
    } catch (emailError) {
      logDeliveryFailure(
        "author_second_editor_started",
        work.id,
        emailError,
      );
    }

    if (firstEditor) {
      try {
        await sendFirstEditorSecondReviewStatusEmail({
          editorName: firstEditor.fullName,
          email: firstEditor.email,
          stage: "started",
          workId: work.id,
          workTitle: work.title,
        });
      } catch (emailError) {
        logDeliveryFailure(
          "first_editor_second_review_started",
          work.id,
          emailError,
        );
      }
    }
  } catch (notificationError) {
    console.error(
      "SECOND_EDITOR_ROLE_NOTIFICATION_FAILED",
      notificationError,
    );
  }

  return result;
}

export async function completeSecondEditorReviewAction(
  state: EditorActionState,
  formData: FormData,
): Promise<EditorActionState> {
  const workId = value(formData, "workId");
  const result = await completeSecondEditorReviewCoreAction(
    state,
    formData,
  );

  if (
    result.status !== "success" ||
    !workId
  ) {
    return result;
  }

  try {
    const work =
      await getSecondReviewPeople(workId);
    const firstEditor =
      work?.editorReviewAssignments[0]
        ?.editor ?? null;

    if (!work || !firstEditor) {
      return result;
    }

    await prisma.notification.create({
      data: {
        message: `${work.title} adlı eser için ikinci editör incelemesi tamamlandı ve nihai sonuç yazara iletildi.`,
        relatedEntityId: work.id,
        relatedEntityType: "work",
        title: "İkinci editör raporu tamamlandı",
        type: "editor_review",
        userId: firstEditor.id,
      },
    });

    try {
      await sendFirstEditorSecondReviewStatusEmail({
        editorName: firstEditor.fullName,
        email: firstEditor.email,
        stage: "completed",
        workId: work.id,
        workTitle: work.title,
      });
    } catch (emailError) {
      logDeliveryFailure(
        "first_editor_second_review_completed",
        work.id,
        emailError,
      );
    }
  } catch (notificationError) {
    console.error(
      "SECOND_EDITOR_ROLE_NOTIFICATION_FAILED",
      notificationError,
    );
  }

  return result;
}

export {
  saveSecondEditorReviewDraftAction,
};