import { createHash, randomUUID } from "node:crypto";

import { allocatePublicId } from "@/lib/public-id";
import { prisma } from "@/lib/prisma";

type CreateWorkInput = {
  authorId: string;
  title: string;
  subtitle?: string;
  description?: string;
  language?: string;
};

function createSlug(title: string): string {
  const normalized = title
    .toLocaleLowerCase("tr-TR")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ı/g, "i")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return `${normalized || "eser"}-${randomUUID().slice(0, 8)}`;
}

function createContentHash(input: CreateWorkInput): string {
  return createHash("sha256")
    .update(
      JSON.stringify({
        title: input.title.trim(),
        subtitle: input.subtitle?.trim() ?? null,
        description: input.description?.trim() ?? null,
        language: input.language ?? "tr",
      }),
    )
    .digest("hex");
}

export async function createWork(input: CreateWorkInput) {
  const title = input.title.trim();

  if (title.length < 2) {
    throw new Error("Eser başlığı en az 2 karakter olmalıdır.");
  }

  const slug = createSlug(title);
  const contentHash = createContentHash(input);
  const stampCode = `ILKOKU-${new Date().getFullYear()}-${randomUUID()
    .replaceAll("-", "")
    .slice(0, 12)
    .toUpperCase()}`;

  return prisma.$transaction(async (tx) => {
    const workCreatedAt = new Date();
    const publicId = await allocatePublicId(
      tx,
      "work",
      workCreatedAt,
    );

    const work = await tx.work.create({
      data: {
        authorId: input.authorId,
        createdAt: workCreatedAt,
        publicId,
        title,
        slug,
        subtitle: input.subtitle?.trim() || null,
        description: input.description?.trim() || null,
        language: input.language ?? "tr",
        status: "draft",
        visibility: "private",
      },
    });

    await tx.workVersion.create({
      data: {
        workId: work.id,
        versionNumber: 1,
        title: work.title,
        subtitle: work.subtitle,
        description: work.description,
        contentHash,
      },
    });

    const ownershipStamp = await tx.ownershipStamp.create({
      data: {
        workId: work.id,
        authorId: input.authorId,
        stampCode,
        contentHash,
        version: 1,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: input.authorId,
        action: "work_created",
        entityType: "Work",
        entityId: work.id,
        metadata: JSON.stringify({
          title: work.title,
          slug: work.slug,
          stampCode,
        }),
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: input.authorId,
        action: "ownership_stamp_created",
        entityType: "OwnershipStamp",
        entityId: ownershipStamp.id,
        metadata: JSON.stringify({
          stampCode,
          workId: work.id,
          workPublicId: work.publicId,
        }),
      },
    });

    return work;
  });
}