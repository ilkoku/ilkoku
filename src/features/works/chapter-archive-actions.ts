"use server";

import { revalidatePath } from "next/cache";

import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

const ARCHIVE_RETENTION_DAYS = 30;

export type ChapterArchiveActionResult = {
  chapterId?: string;
  message: string;
  status: "error" | "success";
};

function addDays(date: Date, days: number) {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

function revalidateWriterPaths() {
  revalidatePath("/yazar");
  revalidatePath("/eserlerim");
  revalidatePath("/yazmaya-devam");
}

async function getWriterId() {
  const user = await getCurrentUser();

  if (!user || user.role !== "writer") {
    return null;
  }

  return user.id;
}

export async function archiveChapterAction(
  formData: FormData,
): Promise<ChapterArchiveActionResult> {
  const authorId = await getWriterId();

  if (!authorId) {
    return {
      message: "Bölümü arşivlemek için yazar hesabınla yeniden giriş yapmalısın.",
      status: "error",
    };
  }

  const chapterId = String(formData.get("chapterId") ?? "").trim();
  const workId = String(formData.get("workId") ?? "").trim();

  if (!chapterId || !workId) {
    return {
      message: "Arşivlenecek bölüm seçilemedi.",
      status: "error",
    };
  }

  const chapter = await prisma.chapter.findFirst({
    where: {
      authorId,
      id: chapterId,
      status: {
        not: "archived",
      },
      workId,
    },
    select: {
      id: true,
    },
  });

  if (!chapter) {
    return {
      message: "Bölüm bulunamadı veya bu bölümü arşivleme yetkin yok.",
      status: "error",
    };
  }

  const activeChapterCount = await prisma.chapter.count({
    where: {
      authorId,
      status: {
        not: "archived",
      },
      workId,
    },
  });

  if (activeChapterCount <= 1) {
    return {
      message: "Eserde en az bir aktif bölüm kalmalıdır. Son bölüm arşivlenemez.",
      status: "error",
    };
  }

  const archivedAt = new Date();

  await prisma.chapter.update({
    where: {
      id: chapter.id,
    },
    data: {
      archivedAt,
      publishedAt: null,
      status: "archived",
    },
  });

  revalidateWriterPaths();

  return {
    chapterId,
    message: `Bölüm arşive taşındı. ${ARCHIVE_RETENTION_DAYS} gün boyunca geri yüklenebilir.`,
    status: "success",
  };
}

export async function restoreChapterAction(
  formData: FormData,
): Promise<ChapterArchiveActionResult> {
  const authorId = await getWriterId();

  if (!authorId) {
    return {
      message: "Bölümü geri yüklemek için yazar hesabınla yeniden giriş yapmalısın.",
      status: "error",
    };
  }

  const chapterId = String(formData.get("chapterId") ?? "").trim();
  const workId = String(formData.get("workId") ?? "").trim();

  if (!chapterId || !workId) {
    return {
      message: "Geri yüklenecek bölüm seçilemedi.",
      status: "error",
    };
  }

  const chapter = await prisma.chapter.findFirst({
    where: {
      archivedAt: {
        gte: addDays(new Date(), -ARCHIVE_RETENTION_DAYS),
      },
      authorId,
      id: chapterId,
      status: "archived",
      workId,
    },
    select: {
      id: true,
    },
  });

  if (!chapter) {
    return {
      message: "Bölüm bulunamadı, geri yükleme süresi dolmuş olabilir.",
      status: "error",
    };
  }

  await prisma.chapter.update({
    where: {
      id: chapter.id,
    },
    data: {
      archivedAt: null,
      status: "draft",
    },
  });

  revalidateWriterPaths();

  return {
    chapterId,
    message: "Bölüm arşivden çıkarıldı ve taslak olarak geri yüklendi.",
    status: "success",
  };
}

export async function purgeExpiredArchivedChapters() {
  const cutoff = addDays(new Date(), -ARCHIVE_RETENTION_DAYS);

  return prisma.chapter.deleteMany({
    where: {
      archivedAt: {
        lte: cutoff,
      },
      status: "archived",
    },
  });
}

export { ARCHIVE_RETENTION_DAYS };
