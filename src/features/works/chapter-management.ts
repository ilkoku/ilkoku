import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";

function normalizeText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function countWords(value: string) {
  const normalized = normalizeText(value);
  return normalized ? normalized.split(" ").length : 0;
}

function hashContent(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

async function createVersionSnapshot(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  chapter: {
    id: string;
    workId: string;
    title: string;
    content: string;
  },
) {
  const latestVersion = await tx.workVersion.findFirst({
    where: {
      workId: chapter.workId,
    },
    orderBy: {
      versionNumber: "desc",
    },
    select: {
      versionNumber: true,
    },
  });

  return tx.workVersion.create({
    data: {
      chapterId: chapter.id,
      content: chapter.content,
      contentHash: hashContent(chapter.content),
      title: chapter.title,
      versionNumber: (latestVersion?.versionNumber ?? 0) + 1,
      workId: chapter.workId,
    },
  });
}

async function getOwnedChapter(
  tx: Parameters<Parameters<typeof prisma.$transaction>[0]>[0],
  authorId: string,
  chapterId: string,
) {
  const chapter = await tx.chapter.findFirst({
    where: {
      authorId,
      id: chapterId,
    },
    select: {
      archivedAt: true,
      content: true,
      id: true,
      position: true,
      status: true,
      title: true,
      workId: true,
    },
  });

  if (!chapter) {
    throw new Error("Bölüm bulunamadı veya bu bölümü yönetme yetkin yok.");
  }

  return chapter;
}

export async function deleteEmptyChapter(
  authorId: string,
  chapterId: string,
) {
  return prisma.$transaction(async (tx) => {
    const chapter = await getOwnedChapter(tx, authorId, chapterId);

    if (countWords(chapter.content) !== 0) {
      throw new Error("Dolu bölüm kalıcı olarak silinemez. Yeniden Yaz kullanılmalıdır.");
    }

    await tx.chapter.delete({
      where: {
        id: chapter.id,
      },
    });

    return {
      chapterId: chapter.id,
      position: chapter.position,
    };
  });
}

export async function archiveChapter(
  authorId: string,
  chapterId: string,
) {
  return prisma.$transaction(async (tx) => {
    const chapter = await getOwnedChapter(tx, authorId, chapterId);

    if (chapter.status === "archived") {
      return chapter;
    }

    await createVersionSnapshot(tx, chapter);

    return tx.chapter.update({
      where: {
        id: chapter.id,
      },
      data: {
        archivedAt: new Date(),
        publishedAt: null,
        status: "archived",
      },
    });
  });
}

export async function rewriteChapter(
  authorId: string,
  chapterId: string,
) {
  return prisma.$transaction(async (tx) => {
    const chapter = await getOwnedChapter(tx, authorId, chapterId);

    if (countWords(chapter.content) === 0) {
      throw new Error("Boş bölüm yeniden yazılamaz; doğrudan silinmelidir.");
    }

    const archivedVersion = await createVersionSnapshot(tx, chapter);

    const rewrittenChapter = await tx.chapter.update({
      where: {
        id: chapter.id,
      },
      data: {
        archivedAt: null,
        content: "",
        publishedAt: null,
        status: "draft",
      },
    });

    return {
      archivedVersion,
      chapter: rewrittenChapter,
    };
  });
}

export async function restoreChapter(
  authorId: string,
  chapterId: string,
  versionId: string,
) {
  return prisma.$transaction(async (tx) => {
    const chapter = await getOwnedChapter(tx, authorId, chapterId);

    const archivedVersion = await tx.workVersion.findFirst({
      where: {
        chapterId: chapter.id,
        id: versionId,
        workId: chapter.workId,
      },
      select: {
        content: true,
        id: true,
        title: true,
      },
    });

    if (!archivedVersion) {
      throw new Error("Geri yüklenecek bölüm sürümü bulunamadı.");
    }

    const currentVersion = await createVersionSnapshot(tx, chapter);

    const restoredChapter = await tx.chapter.update({
      where: {
        id: chapter.id,
      },
      data: {
        archivedAt: null,
        content: archivedVersion.content ?? "",
        publishedAt: null,
        status: "draft",
        title: archivedVersion.title ?? chapter.title,
      },
    });

    return {
      archivedCurrentVersion: currentVersion,
      chapter: restoredChapter,
      restoredVersionId: archivedVersion.id,
    };
  });
}

export async function getChapterVersions(
  authorId: string,
  chapterId: string,
) {
  const chapter = await prisma.chapter.findFirst({
    where: {
      authorId,
      id: chapterId,
    },
    select: {
      id: true,
    },
  });

  if (!chapter) {
    throw new Error("Bölüm bulunamadı veya sürümleri görüntüleme yetkin yok.");
  }

  return prisma.workVersion.findMany({
    where: {
      chapterId: chapter.id,
    },
    orderBy: {
      versionNumber: "desc",
    },
  });
}
