import "server-only";

import { prisma } from "@/lib/prisma";

async function ownedWork(authorId: string, workId: string) {
  return prisma.work.findFirst({
    where: {
      authorId,
      id: workId,
    },
    select: {
      deletedAt: true,
      id: true,
      isActive: true,
      title: true,
    },
  });
}

export async function setWorkActive(
  authorId: string,
  workId: string,
  isActive: boolean,
) {
  const work = await ownedWork(authorId, workId);
  if (!work || work.deletedAt) {
    throw new Error("Eser bulunamadı veya bu işlem için yetkin yok.");
  }

  if (work.isActive === isActive) return work;

  const updated = await prisma.work.update({
    where: { id: work.id },
    data: { isActive },
  });

  await prisma.auditLog.create({
    data: {
      action: "work_status_changed",
      actorId: authorId,
      entityId: work.id,
      entityType: "Work",
      metadata: JSON.stringify({
        change: "active_state",
        from: work.isActive,
        to: isActive,
      }),
    },
  });

  return updated;
}

export async function trashWork(
  authorId: string,
  workId: string,
) {
  const work = await ownedWork(authorId, workId);
  if (!work) {
    throw new Error("Silinecek eser bulunamadı.");
  }
  if (work.deletedAt) return work;

  const deletedAt = new Date();
  const updated = await prisma.work.update({
    where: { id: work.id },
    data: { deletedAt },
  });

  await prisma.auditLog.create({
    data: {
      action: "work_status_changed",
      actorId: authorId,
      entityId: work.id,
      entityType: "Work",
      metadata: JSON.stringify({
        change: "trash",
        deletedAt: deletedAt.toISOString(),
      }),
    },
  });

  return updated;
}

export async function restoreTrashedWork(
  authorId: string,
  workId: string,
) {
  const work = await ownedWork(authorId, workId);
  if (!work || !work.deletedAt) {
    throw new Error("Çöp kutusunda geri yüklenecek eser bulunamadı.");
  }

  const updated = await prisma.work.update({
    where: { id: work.id },
    data: { deletedAt: null },
  });

  await prisma.auditLog.create({
    data: {
      action: "work_status_changed",
      actorId: authorId,
      entityId: work.id,
      entityType: "Work",
      metadata: JSON.stringify({ change: "trash_restore" }),
    },
  });

  return updated;
}

export async function permanentlyDeleteWork(
  authorId: string,
  workId: string,
) {
  const work = await ownedWork(authorId, workId);
  if (!work || !work.deletedAt) {
    throw new Error("Kalıcı olarak silinecek eser çöp kutusunda bulunamadı.");
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.auditLog.create({
      data: {
        action: "work_status_changed",
        actorId: authorId,
        entityId: work.id,
        entityType: "Work",
        metadata: JSON.stringify({
          change: "permanent_delete",
          title: work.title,
        }),
      },
    });

    await transaction.work.delete({
      where: { id: work.id },
    });
  });

  return { id: work.id };
}
