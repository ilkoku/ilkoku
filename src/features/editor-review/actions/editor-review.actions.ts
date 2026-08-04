"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  sendAuthorReviewRequestReceivedEmail,
} from "@/lib/email/editor-emails";
import { prisma } from "@/lib/prisma";

export async function submitForEditorAction(
  formData: FormData,
): Promise<void> {
  const user = await getCurrentUser();

  if (!user || user.role !== "writer") {
    throw new Error("EDITOR_SUBMISSION_PERMISSION_DENIED");
  }

  const workId = String(
    formData.get("workId") ?? "",
  ).trim();

  if (!workId) {
    throw new Error("WORK_ID_REQUIRED");
  }

  const requestedAt = new Date();

  const submitted = await prisma.$transaction(
    async (transaction) => {
      const work = await transaction.work.findFirst({
        where: {
          archivedAt: null,
          authorId: user.id,
          editorReviewStatus: "not_requested",
          id: workId,
          status: "published",
        },
        select: {
          author: {
            select: {
              email: true,
              fullName: true,
            },
          },
          id: true,
          title: true,
        },
      });

      if (!work) {
        return null;
      }

      const updated = await transaction.work.updateMany({
        where: {
          archivedAt: null,
          authorId: user.id,
          editorReviewStatus: "not_requested",
          id: work.id,
          status: "published",
        },
        data: {
          assignedAt: null,
          assignedEditorId: null,
          editorReviewCompletedAt: null,
          editorReviewRequestedAt: requestedAt,
          editorReviewStatus: "requested",
        },
      });

      if (updated.count !== 1) {
        return null;
      }

      await transaction.editorReviewAssignment.upsert({
        where: {
          workId_stage: {
            stage: "first",
            workId: work.id,
          },
        },
        create: {
          source: "pool",
          stage: "first",
          status: "waiting",
          workId: work.id,
        },
        update: {
          assignedAt: null,
          completedAt: null,
          editorId: null,
          invitedEmail: null,
          source: "pool",
          startedAt: null,
          status: "waiting",
        },
      });

      return work;
    },
  );

  if (!submitted) {
    throw new Error("WORK_NOT_FOUND");
  }

  try {
    await sendAuthorReviewRequestReceivedEmail({
      email: submitted.author.email,
      fullName: submitted.author.fullName,
      workId: submitted.id,
      workTitle: submitted.title,
    });
  } catch (emailError) {
    console.error(
      "EDITOR_EMAIL_DELIVERY_FAILED",
      {
        event: "editor_review_requested",
        workId: submitted.id,
        error:
          emailError instanceof Error
            ? emailError.message
            : "UNKNOWN_ERROR",
      },
    );
  }

  revalidatePath("/yazar");
  revalidatePath("/eserlerim");
  revalidatePath("/yazmaya-devam");
  revalidatePath("/geri-bildirimler");
  revalidatePath("/editor/kesfet");
  revalidatePath("/editor/talepler");
}
