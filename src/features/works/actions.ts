"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getCurrentUser } from "@/features/auth/current-user";
import {
  archiveWork,
  createNextChapter,
  createWorkWithFirstChapter,
  publishWork,
  restoreWork,
  saveChapterDraft,
} from "./repository";
import {
  initialWorkActionState,
  type WorkActionState,
} from "./types";
import {
  createWorkSchema,
  saveChapterDraftSchema,
  workIdSchema,
} from "./validation";

function error(message: string): WorkActionState {
  return {
    ...initialWorkActionState,
    message,
    status: "error",
  };
}

async function authenticatedAuthor() {
  const user = await getCurrentUser();

  if (!user || user.role !== "author") {
    return null;
  }

  return {
    authorId: user.id,
    user,
  };
}

function revalidateWorkPaths() {
  revalidatePath("/yazar");
  revalidatePath("/eserlerim");
  revalidatePath("/yazmaya-devam");
}

export async function createWorkAction(
  _state: WorkActionState,
  formData: FormData,
): Promise<WorkActionState> {
  const parsed = createWorkSchema.safeParse({
    title: formData.get("title"),
    genre: formData.get("genre"),
    summary: formData.get("summary"),
    workType: formData.get("workType"),
  });

  if (!parsed.success) {
    return error(
      parsed.error.issues[0]?.message ??
        "Eser bilgileri doğrulanamadı.",
    );
  }

  const auth = await authenticatedAuthor();

  if (!auth) {
    return error(
      "Yeni eser oluşturmak için yazar hesabınla giriş yapmalısın.",
    );
  }

  try {
    const created = await createWorkWithFirstChapter(
      auth.authorId,
      parsed.data,
    );

    revalidateWorkPaths();

    return {
      chapterId: created.chapterId,
      message: "Eser ve ilk bölüm oluşturuldu.",
      status: "success",
      workId: created.workId,
    };
  } catch (caughtError) {
    console.error("CREATE_WORK_ERROR:", caughtError);

    return error(
      caughtError instanceof Error
        ? caughtError.message
        : "Eser oluşturulamadı. Lütfen tekrar dene.",
    );
  }
}

export async function saveChapterDraftAction(
  _state: WorkActionState,
  formData: FormData,
): Promise<WorkActionState> {
  const parsed = saveChapterDraftSchema.safeParse({
    chapterId: formData.get("chapterId"),
    chapterTitle: formData.get("chapterTitle"),
    content: formData.get("content"),
    genre: formData.get("genre"),
    summary: formData.get("summary"),
    workId: formData.get("workId"),
    workTitle: formData.get("workTitle"),
  });

  if (!parsed.success) {
    return error(
      parsed.error.issues[0]?.message ??
        "Taslak bilgileri doğrulanamadı.",
    );
  }

  const auth = await authenticatedAuthor();

  if (!auth) {
    return error(
      "Taslağı kaydetmek için yeniden giriş yapmalısın.",
    );
  }

  try {
    await saveChapterDraft(auth.authorId, parsed.data);
    revalidateWorkPaths();

    return {
      chapterId: parsed.data.chapterId,
      message: "Taslak kaydedildi.",
      status: "success",
      workId: parsed.data.workId,
    };
  } catch (caughtError) {
    console.error("SAVE_CHAPTER_DRAFT_ERROR:", caughtError);

    return error(
      caughtError instanceof Error
        ? caughtError.message
        : "Taslak kaydedilemedi. Lütfen tekrar dene.",
    );
  }
}

export async function publishWorkAction(
  _state: WorkActionState,
  formData: FormData,
): Promise<WorkActionState> {
  const parsed = saveChapterDraftSchema.safeParse({
    chapterId: formData.get("chapterId"),
    chapterTitle: formData.get("chapterTitle"),
    content: formData.get("content"),
    genre: formData.get("genre"),
    summary: formData.get("summary"),
    workId: formData.get("workId"),
    workTitle: formData.get("workTitle"),
  });

  if (!parsed.success) {
    return error(
      parsed.error.issues[0]?.message ??
        "Yayın bilgileri doğrulanamadı.",
    );
  }

  const auth = await authenticatedAuthor();

  if (!auth) {
    return error(
      "Eseri yayınlamak için yeniden giriş yapmalısın.",
    );
  }

  try {
    await publishWork(auth.authorId, parsed.data);
    revalidateWorkPaths();

    return {
      chapterId: parsed.data.chapterId,
      message: "Eser yayınlandı.",
      status: "success",
      workId: parsed.data.workId,
    };
  } catch (caughtError) {
    console.error("PUBLISH_WORK_ERROR:", caughtError);

    return error(
      caughtError instanceof Error
        ? caughtError.message
        : "Eser yayınlanamadı. Lütfen tekrar dene.",
    );
  }
}

export async function archiveWorkAction(
  _state: WorkActionState,
  formData: FormData,
): Promise<WorkActionState> {
  const parsed = workIdSchema.safeParse({
    workId: formData.get("workId"),
  });

  if (!parsed.success) {
    return error(
      parsed.error.issues[0]?.message ??
        "Geçerli bir eser seçilmelidir.",
    );
  }

  const auth = await authenticatedAuthor();

  if (!auth) {
    return error(
      "Eseri arşivlemek için yeniden giriş yapmalısın.",
    );
  }

  try {
    await archiveWork(
      auth.authorId,
      parsed.data.workId,
    );

    revalidateWorkPaths();

    return {
      message:
        "Eser arşive taşındı. 30 gün boyunca geri yükleyebilirsin. Bu sürenin sonunda eser ve bölümleri kalıcı olarak silinecektir.",
      status: "success",
      workId: parsed.data.workId,
    };
  } catch (caughtError) {
    console.error("ARCHIVE_WORK_ERROR:", caughtError);

    return error(
      caughtError instanceof Error
        ? caughtError.message
        : "Eser arşive taşınamadı.",
    );
  }
}

export async function restoreWorkAction(
  _state: WorkActionState,
  formData: FormData,
): Promise<WorkActionState> {
  const parsed = workIdSchema.safeParse({
    workId: formData.get("workId"),
  });

  if (!parsed.success) {
    return error(
      parsed.error.issues[0]?.message ??
        "Geçerli bir eser seçilmelidir.",
    );
  }

  const auth = await authenticatedAuthor();

  if (!auth) {
    return error(
      "Eseri geri almak için yazar hesabınla giriş yapmalısın.",
    );
  }

  try {
    await restoreWork(
      auth.authorId,
      parsed.data.workId,
    );

    revalidateWorkPaths();

    return {
      message:
        "Eser arşivden çıkarıldı ve yeniden kullanıma açıldı.",
      status: "success",
      workId: parsed.data.workId,
    };
  } catch (caughtError) {
    console.error("RESTORE_WORK_ERROR:", caughtError);

    return error(
      caughtError instanceof Error
        ? caughtError.message
        : "Eser arşivden çıkarılamadı.",
    );
  }
}

export async function createNextChapterAction(
  formData: FormData,
) {
  const parsed = workIdSchema.safeParse({
    workId: formData.get("workId"),
  });

  if (!parsed.success) {
    redirect("/eserlerim");
  }

  const auth = await authenticatedAuthor();

  if (!auth) {
    redirect("/giris?sonraki=/yazmaya-devam");
  }

  await createNextChapter(
    auth.authorId,
    parsed.data.workId,
  );

  revalidateWorkPaths();
  redirect("/yazmaya-devam");
}
