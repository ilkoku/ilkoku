"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

function requiredText(
  formData: FormData,
  key: string,
  minimum: number,
  maximum: number,
) {
  const value = String(formData.get(key) ?? "").trim();

  if (value.length < minimum || value.length > maximum) {
    throw new Error(`INVALID_${key.toUpperCase()}`);
  }

  return value;
}

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
  revalidatePath("/editor-paneli");
}

export async function completeEditorReviewAction(
  formData: FormData,
): Promise<void> {
  const editor = await getCurrentUser();

  if (!editor || editor.role !== "editor") {
    throw new Error("EDITOR_REVIEW_PERMISSION_DENIED");
  }

  const workId = String(
    formData.get("workId") ?? "",
  ).trim();

  const title = requiredText(
    formData,
    "title",
    3,
    160,
  );

  const content = requiredText(
    formData,
    "content",
    20,
    10000,
  );

  const category = requiredText(
    formData,
    "category",
    2,
    60,
  );

  const priority =
    formData.get("priority") === "important"
      ? "important"
      : "normal";

  const scoreRaw = Number(
    formData.get("score"),
  );

  const score = Number.isFinite(scoreRaw)
    ? Math.min(
        100,
        Math.max(0, Math.round(scoreRaw)),
      )
    : 0;

  const work = await prisma.work.findFirst({
    where: {
      id: workId,
      status: "published",
      editorReviewStatus: "requested",
      archivedAt: null,
    },
    select: {
      authorId: true,
    },
  });

  if (!work) {
    throw new Error("WORK_NOT_AVAILABLE_FOR_REVIEW");
  }

  await prisma.$transaction([
    prisma.editorFeedback.create({
      data: {
        authorId: work.authorId,
        category,
        chapterId: null,
        content: `Editör puanı: ${score}/100\n\n${content}`,
        editorId: editor.id,
        priority,
        title,
        workId,
      },
    }),

    prisma.work.update({
      where: {
        id: workId,
      },
      data: {
        editorReviewCompletedAt: new Date(),
        editorReviewStatus: "completed",
      },
    }),
  ]);

  revalidatePath("/editor-paneli");
  revalidatePath("/geri-bildirimler");
  revalidatePath("/yazar");
  revalidatePath("/eserlerim");
  revalidatePath("/yazmaya-devam");

  redirect("/editor-paneli?gonderildi=1");
}
