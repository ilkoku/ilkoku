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
import {
  initialWorkActionState,
  type WorkActionState,
} from "./types";
import {
  chapterDraftSchema,
  createWorkSchema,
  updateWorkSchema,
  workIdSchema,
} from "./validators";

function error(message: string): WorkActionState {
  return {
    ...initialWorkActionState,
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
    user,
  };
}

function revalidateWorkPaths() {
  revalidatePath("/yazar");
  revalidatePath("/eserlerim");
  revalidatePath("/yazmaya-devam");
}

function workClassificationFromFormData(formData: FormData) {
  return {
    contentClassificationConfirmed:
      formData.get("contentClassificationConfirmed") === "true" ||
      formData.get("contentClassificationConfirmed") === "on",
    contentRating: formData.get("contentRating"),
    contentWarnings: formData.getAll("contentWarnings"),
  };
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
    ...workClassificationFromFormData(formData),
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
      chapterId: created.chapter.id,
      message: "Eser ve ilk bölüm oluşturuldu.",
      status: "success",
      workId: created.work.id,
      workSlug: created.work.slug,
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

function parseChapterDraft(formData: FormData) {
  return chapterDraftSchema.safeParse({
    chapterId: formData.get("chapterId"),
    content: formData.get("content"),
    title: formData.get("chapterTitle"),
    workId: formData.get("workId"),
  });
}

async function updateWorkMetadata(
  authorId: string,
  formData: FormData,
  workId: string,
) {
  const parsed = updateWorkSchema.safeParse({
    id: workId,
    title: formData.get("workTitle"),
    genre: formData.get("genre"),
    summary: formData.get("summary"),
    status: "draft",
    ...workClassificationFromFormData(formData),
  });

  if (!parsed.success) {
    throw new Error(
      parsed.error.issues[0]?.message ??
        "Eserin içerik ve yaş sınıfı doğrulanamadı.",
    );
  }

  await updateWork(authorId, parsed.data);
}

export async function saveChapterDraftAction(
  _state: WorkActionState,
  formData: FormData,
): Promise<WorkActionState> {
  const parsed = parseChapterDraft(formData);

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
    await updateWorkMetadata(
      auth.authorId,
      formData,
      parsed.data.workId,
    );
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
  const parsed = parseChapterDraft(formData);

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
    await updateWorkMetadata(
      auth.authorId,
      formData,
      parsed.data.workId,
    );
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

export async function updateWorkAction(
  _state: WorkActionState,
  formData: FormData,
): Promise<WorkActionState> {
  const statusValue = String(formData.get("status") ?? "draft");
  const normalizedStatus =
    statusValue === "in_review" ? "in_progress" : statusValue;

  if (normalizedStatus === "archived") {
    const archiveData = new FormData();
    archiveData.set("workId", String(formData.get("workId") ?? ""));
    return archiveWorkAction(_state, archiveData);
  }

  const parsed = updateWorkSchema.safeParse({
    id: formData.get("workId"),
    title: formData.get("title"),
    summary: formData.get("summary"),
    genre: formData.get("genre"),
    language: formData.get("language"),
    coverUrl: formData.get("coverUrl"),
    status: normalizedStatus,
    ...workClassificationFromFormData(formData),
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
      "Eseri güncellemek için yazar hesabınla giriş yapmalısın.",
    );
  }

  try {
    const updated = await updateWork(auth.authorId, parsed.data);
    revalidateWorkPaths();

    return {
      message: "Eser bilgileri güncellendi.",
      status: "success",
      workId: updated.id,
      workSlug: updated.slug,
    };
  } catch (caughtError) {
    console.error("UPDATE_WORK_ERROR:", caughtError);

    return error(
      caughtError instanceof Error
        ? caughtError.message
        : "Eser güncellenemedi.",
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
    await archiveWork(auth.authorId, parsed.data.workId);
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
    await restoreWork(auth.authorId, parsed.data.workId);
    revalidateWorkPaths();

    return {
      message: "Eser arşivden çıkarıldı ve yeniden kullanıma açıldı.",
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

export async function createNextChapterAction(formData: FormData) {
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

  const chapter = await createNextChapter(
    auth.authorId,
    parsed.data.workId,
  );

  revalidateWorkPaths();

  redirect(
    `/yazmaya-devam?eser=${encodeURIComponent(parsed.data.workId)}&bolum=${encodeURIComponent(chapter.id)}`,
  );
}
