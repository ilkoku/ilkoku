"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canAccessReaderWorkspace } from "@/features/auth/data";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

const authorPublicIdSchema = z.string().trim().min(3).max(24);
const returnPathSchema = z
  .string()
  .max(1500)
  .refine(
    (value) => value.startsWith("/") && !value.startsWith("//"),
    "INVALID_RETURN_PATH",
  );

const readerVisibleAuthorWorkWhere = {
  archivedAt: null,
  contentRating: { not: "adult_18" as const },
  publishedAt: { not: null },
  status: "published" as const,
  visibility: "public" as const,
};

type FavoriteAuthorRecord = {
  authorId: string;
  createdAt: Date;
};

async function requireReader() {
  const user = await getCurrentUser();

  if (
    !user ||
    !canAccessReaderWorkspace(user.role) ||
    user.status !== "active"
  ) {
    throw new Error("READER_PERMISSION_REQUIRED");
  }

  return user;
}

async function findVisibleAuthor(publicId: string) {
  return prisma.user.findFirst({
    where: {
      deletedAt: null,
      publicId,
      status: "active",
      works: { some: readerVisibleAuthorWorkWhere },
    },
    select: {
      displayName: true,
      fullName: true,
      id: true,
      publicId: true,
      username: true,
    },
  });
}

export async function toggleReaderAuthorFavoriteAction(
  formData: FormData,
): Promise<void> {
  const reader = await requireReader();
  const parsedPublicId = authorPublicIdSchema.safeParse(
    formData.get("authorPublicId"),
  );
  const rawReturnPath = formData.get("returnPath");
  const parsedReturnPath =
    rawReturnPath === null
      ? null
      : returnPathSchema.safeParse(rawReturnPath);

  if (!parsedPublicId.success) throw new Error("INVALID_AUTHOR_PUBLIC_ID");
  if (parsedReturnPath && !parsedReturnPath.success) {
    throw new Error("INVALID_RETURN_PATH");
  }

  const author = await findVisibleAuthor(parsedPublicId.data);
  if (!author) throw new Error("AUTHOR_NOT_AVAILABLE");
  if (author.id === reader.id) throw new Error("SELF_FAVORITE_NOT_ALLOWED");

  const existing = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM ReaderAuthorFavorite
    WHERE userId = ${reader.id}
      AND authorId = ${author.id}
    LIMIT 1
  `;

  if (existing.length > 0) {
    await prisma.$executeRaw`
      DELETE FROM ReaderAuthorFavorite
      WHERE userId = ${reader.id}
        AND authorId = ${author.id}
    `;
  } else {
    await prisma.$executeRaw`
      INSERT INTO ReaderAuthorFavorite (id, userId, authorId, createdAt)
      VALUES (${randomUUID()}, ${reader.id}, ${author.id}, NOW(3))
    `;
  }

  revalidatePath("/favorilerim");
  revalidatePath("/yazarlar");
  revalidatePath(`/yazarlar/${author.publicId}`);
  revalidatePath("/okuyucu");

  if (parsedReturnPath?.success) {
    revalidatePath(parsedReturnPath.data);
  }
}

export async function getReaderAuthorFavoriteStatus(
  userId: string,
  authorPublicId: string,
) {
  const author = await findVisibleAuthor(authorPublicId);
  if (!author) return false;

  const rows = await prisma.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM ReaderAuthorFavorite
    WHERE userId = ${userId}
      AND authorId = ${author.id}
    LIMIT 1
  `;

  return rows.length > 0;
}

export async function getReaderAuthorFavoritePublicIds(userId: string) {
  const rows = await prisma.$queryRaw<Array<{ publicId: string }>>`
    SELECT author.publicId
    FROM ReaderAuthorFavorite favorite
    INNER JOIN User author ON author.id = favorite.authorId
    WHERE favorite.userId = ${userId}
      AND author.status = 'active'
      AND author.deletedAt IS NULL
  `;

  return new Set(rows.map((row) => row.publicId));
}

export async function getReaderFavoriteAuthors(userId: string) {
  const favoriteRows = await prisma.$queryRaw<FavoriteAuthorRecord[]>`
    SELECT favorite.authorId, favorite.createdAt
    FROM ReaderAuthorFavorite favorite
    INNER JOIN User author ON author.id = favorite.authorId
    WHERE favorite.userId = ${userId}
      AND author.status = 'active'
      AND author.deletedAt IS NULL
    ORDER BY favorite.createdAt DESC
  `;

  if (favoriteRows.length === 0) return [];

  const order = new Map(
    favoriteRows.map((favorite, index) => [favorite.authorId, index]),
  );
  const authors = await prisma.user.findMany({
    where: {
      id: { in: favoriteRows.map((favorite) => favorite.authorId) },
      deletedAt: null,
      status: "active",
      works: { some: readerVisibleAuthorWorkWhere },
    },
    select: {
      bio: true,
      displayName: true,
      fullName: true,
      publicId: true,
      username: true,
      works: {
        where: readerVisibleAuthorWorkWhere,
        orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
        select: {
          contentRating: true,
          genre: true,
          publishedAt: true,
          slug: true,
          title: true,
        },
        take: 3,
      },
      _count: {
        select: {
          works: { where: readerVisibleAuthorWorkWhere },
        },
      },
      id: true,
    },
  });

  return authors
    .sort(
      (left, right) =>
        (order.get(left.id) ?? Number.MAX_SAFE_INTEGER) -
        (order.get(right.id) ?? Number.MAX_SAFE_INTEGER),
    )
    .map(({ id: _id, ...author }) => author);
}
