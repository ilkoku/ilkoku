"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/current-user";
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
      const updated = await transaction.work.updateMany({
        where: {
          id: workId,
          authorId: user.id,
          archivedAt: null,
          status: "published",
          editorReviewStatus: "not_requested",
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
        return false;
      }

      await transaction.editorReviewAssignment.upsert({
        where: {
          workId_stage: {
            stage: "first",
            workId,
          },
        },
        create: {
          source: "pool",
          stage: "first",
          status: "waiting",
          workId,
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

      return true;
    },
  );

  if (!submitted) {
    throw new Error("WORK_NOT_FOUND");
  }

  revalidatePath("/yazar");
  revalidatePath("/eserlerim");
  revalidatePath("/yazmaya-devam");
  revalidatePath("/editor/kesfet");
  revalidatePath("/editor/talepler");
}
