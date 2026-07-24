"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import {
  archiveWork,
  createNextChapter,
  createWorkWithFirstChapter,
  publishWork,
  restoreWork,
  saveChapterDraft,
  updateWork,
} from "./mutations";
import type { WorkActionState } from "./types";
import {
  chapterDraftSchema,
  createWorkSchema,
  updateWorkSchema,
  workIdSchema,
} from "./validators";

function error(message: string): WorkActionState {
  return {
    message,
    status: "error",
  };
}

async function authenticatedAuthor() {
  const user = await getCurrentUser();

  if (!user || user.role !== "writer") {
    return null;
  }

  return {
    authorId: user.id,
  };
}

function revalidateWorkPaths(slug?: string) {
  revalidatePath("/yazar");
  revalidatePath("/eserlerim");
  revalidatePath("/yazmaya-devam");

  if (slug) {
    revalidatePath(`/kitap/${slug}`);
  }
}

async function updateSubmittedMetadata(
  authorId: string,
  formData: FormData,
) {
  const workTitle = formData.get("workTitle");

  if (typeof workTitle !== "string" || !workTitle.trim()) {
    return;
  }

  const parsed = updateWorkSchema.safeParse({
    genre: formData.get("genre") || undefined,
    id: formData.get("workId"),
    summary: formData.get("summary") || undefined,
    title: workTitle,
  });

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ??
        "Eser bilgileri geçersiz.",
    );
  }

  await updateWork(authorId, parsed.data);
}

export async function createWorkAction(
  _state: WorkActionState,
  formData: FormData,
): Promise<WorkActionState> {
  const parsed = createWorkSchema.safeParse({
    genre: formData.get("genre"),
    summary: formData.get("summary"),
    title: formData.get("title"),
    workType: formData.get("workType") || undefined,
  });

  if (!parsed.success) {
    return error(
      parsed.error.issues[0]?.message ??
        "Eser bilgileri geçersiz.",
    );
  }

  const auth = await authenticatedAuthor();

  if (!auth) {
    return error(
      "Eser oluşturmak için yazar hesabınla yeniden giriş yapmalısın.",
    );
  }

  try {
    const { chapter, work } =
      await createWorkWithFirstChapter(
        auth.authorId,
        parsed.data,
      );

    revalidateWorkPaths(work.slug);

    return {
      chapterId: chapter.id,
      message:
        "Eserin oluşturuldu. İlk bölümünü yazmaya başlayabilirsin.",
      status: "success",
      workId: work.id,
      workSlug: work.slug,
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

export async function updateWorkAction(
  _state: WorkActionState,
  formData: FormData,
): Promise<WorkActionState> {
  const parsed = updateWorkSchema.safeParse({
    coverUrl: formData.get("coverUrl") ?? undefined,
    genre: formData.get("genre") || undefined,
    id: formData.get("workId"),
    language: formData.get("language") || undefined,
    status: formData.get("status") || undefined,
    summary: formData.get("summary") || undefined,
    title: formData.get("title") || undefined,
    workType: formData.get("workType") || undefined,
  });

  if (!parsed.success) {
    return error(
      parsed.error.issues[0]?.message ??
        "Eser bilgileri geçersiz.",
    );
  }

  const auth = await authenticatedAuthor();

  if (!auth) {
    return error(
      "Eseri güncellemek için yeniden giriş yapmalısın.",
    );
  }

  try {
    const work = await updateWork(
      auth.authorId,
      parsed.data,
    );

    revalidateWorkPaths(work.slug);

    return {
      message: "Eser bilgileri güncellendi.",
      status: "success",
      workId: parsed.data.id,
      workSlug: work.slug,
    };
  } catch (caughtError) {
    console.error("UPDATE_WORK_ERROR:", caughtError);

    return error(
      caughtError instanceof Error
        ? caughtError.message
        : "Eser bilgileri güncellenemedi.",
    );
  }
}

export async function saveChapterDraftAction(
  _state: WorkActionState,
  formData: FormData,
): Promise<WorkActionState> {
  const parsed = chapterDraftSchema.safeParse({
    chapterId: formData.get("chapterId"),
    content: formData.get("content"),
    title: formData.get("chapterTitle"),
    workId: formData.get("workId"),
  });

  if (!parsed.success) {
    return error(
      parsed.error.issues[0]?.message ??
        "Bölüm bilgileri geçersiz.",
    );
  }

  const auth = await authenticatedAuthor();

  if (!auth) {
    return error(
      "Taslağı kaydetmek için yeniden giriş yapmalısın.",
    );
  }

  try {
    await updateSubmittedMetadata(
      auth.authorId,
      formData,
    );

    await saveChapterDraft(
      auth.authorId,
      parsed.data,
    );

    revalidateWorkPaths();

    return {
      chapterId: parsed.data.chapterId,
      message: "Taslak kaydedildi.",
      status: "success",
      workId: parsed.data.workId,
    };
  } catch (caughtError) {
    console.error(
      "SAVE_CHAPTER_DRAFT_ERROR:",
      caughtError,
    );

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
  const parsed = chapterDraftSchema.safeParse({
    chapterId: formData.get("chapterId"),
    content: formData.get("content"),
    title: formData.get("chapterTitle"),
    workId: formData.get("workId"),
  });

  if (!parsed.success) {
    return error(
      parsed.error.issues[0]?.message ??
        "Bölüm bilgileri geçersiz.",
    );
  }

  if (!parsed.data.content.trim()) {
    return error(
      "Yayınlamadan önce bölüm metnini yazmalısın.",
    );
  }

  const auth = await authenticatedAuthor();

  if (!auth) {
    return error(
      "Eseri yayınlamak için yeniden giriş yapmalısın.",
    );
  }

  try {
    await updateSubmittedMetadata(
      auth.authorId,
      formData,
    );

    const work = await publishWork(
      auth.authorId,
      parsed.data,
    );

    revalidateWorkPaths(work.slug);
    revalidatePath(`/kitap/${work.slug}`);
    revalidatePath(`/oku/${work.slug}/bolum-1`);

    return {
      chapterId: parsed.data.chapterId,
      message: "Eserin yayınlandı.",
      status: "success",
      workId: parsed.data.workId,
      workSlug: work.slug,
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
      message: "Eser arşive taşındı.",
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
      message: "Eser arşivden çıkarıldı.",
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