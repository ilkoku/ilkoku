"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { canAccessReaderWorkspace } from "@/features/auth/data";
import { discoveryAuthorWhereFromWorkPool } from "@/features/discovery/common-author-scope";
import type { Prisma } from "@/generated/prisma/client";
import { readerAuthorDiscoveryWorkWhere } from "@/features/reader/author-discovery-scope";
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
      ...discoveryAuthorWhereFromWorkPool(readerAuthorDiscoveryWorkWhere),
      publicId,
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

  const existing = await prisma.readerAuthorFavorite.findUnique({
    where: {
      userId_authorId: {
        userId: reader.id,
        authorId: author.id,
      },
    },
    select: { id: true },
  });

  if (existing) {
    await prisma.readerAuthorFavorite.delete({
      where: { id: existing.id },
    });
  } else {
    await prisma.readerAuthorFavorite.create({
      data: {
        authorId: author.id,
        userId: reader.id,
      },
    });
  }

  revalidatePath("/favorilerim");
  revalidatePath("/yazar-kesfet");
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

  const favorite = await prisma.readerAuthorFavorite.findUnique({
    where: {
      userId_authorId: {
        userId,
        authorId: author.id,
      },
    },
    select: { id: true },
  });

  return Boolean(favorite);
}

export async function getReaderAuthorFavoritePublicIds(userId: string) {
  const favorites = await prisma.readerAuthorFavorite.findMany({
    where: {
      userId,
      author: {
        is: discoveryAuthorWhereFromWorkPool(readerAuthorDiscoveryWorkWhere),
      },
    },
    select: {
      author: {
        select: { publicId: true },
      },
    },
  });

  return new Set(
    favorites.map((favorite) => favorite.author.publicId),
  );
}

export async function getReaderFavoriteAuthors(
  userId: string,
  workFilters: Prisma.WorkWhereInput = {},
) {
  const workWhere: Prisma.WorkWhereInput = {
    ...readerAuthorDiscoveryWorkWhere,
    ...workFilters,
  };
  const favorites = await prisma.readerAuthorFavorite.findMany({
    where: {
      userId,
      author: {
        is: discoveryAuthorWhereFromWorkPool(workWhere),
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      author: {
        select: {
          _count: {
            select: {
              works: { where: workWhere },
            },
          },
          bio: true,
          displayName: true,
          fullName: true,
          publicId: true,
          username: true,
          works: {
            where: workWhere,
            orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
            select: {
              contentRating: true,
              editorReviewStatus: true,
              genre: true,
              publishedAt: true,
              slug: true,
              title: true,
            },
            take: 3,
          },
        },
      },
    },
  });

  return favorites.map((favorite) => favorite.author);
}
