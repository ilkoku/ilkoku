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

  const result = await prisma.work.updateMany({
    where: {
      id: workId,
      authorId: user.id,
      archivedAt: null,
      status: "published",
      editorReviewStatus: "not_requested",
    },
    data: {
      editorReviewRequestedAt: new Date(),
      editorReviewStatus: "requested",
    },
  });

  if (result.count === 0) {
    throw new Error("WORK_NOT_FOUND");
  }

  revalidatePath("/yazar");
  revalidatePath("/eserlerim");
  revalidatePath("/yazmaya-devam");
  revalidatePath("/editor/kesfet");
}
