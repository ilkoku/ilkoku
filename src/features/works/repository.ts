import { prisma } from "@/lib/prisma";

export type CreateWorkRecord = {
  authorId: string;
  title: string;
  slug: string;
  description?: string | null;
  genre?: string | null;
  language?: string;
};

export type UpdateWorkRecord = {
  title?: string;
  subtitle?: string | null;
  description?: string | null;
  genre?: string | null;
  language?: string;
  coverUrl?: string | null;
  status?: "draft" | "in_review" | "published" | "archived";
  visibility?: "private" | "unlisted" | "public";
  publishedAt?: Date | null;
  archivedAt?: Date | null;
};

export type CreateChapterRecord = {
  workId: string;
  authorId: string;
  title: string;
  content?: string;
  position: number;
  status?: "draft" | "published" | "archived";
};

export type UpdateChapterRecord = {
  title?: string;
  content?: string;
  status?: "draft" | "published" | "archived";
  publishedAt?: Date | null;
  archivedAt?: Date | null;
};

export const worksRepository = {
  async createWork(input: CreateWorkRecord) {
    return prisma.work.create({
      data: {
        authorId: input.authorId,
        description: input.description ?? null,
        genre: input.genre ?? null,
        language: input.language ?? "tr",
        slug: input.slug,
        status: "draft",
        title: input.title,
        visibility: "private",
      },
    });
  },

  async createChapter(input: CreateChapterRecord) {
    return prisma.chapter.create({
      data: {
        authorId: input.authorId,
        content: input.content ?? "",
        position: input.position,
        status: input.status ?? "draft",
        title: input.title,
        workId: input.workId,
      },
    });
  },

  async findWorkBySlug(slug: string) {
    return prisma.work.findUnique({
      where: {
        slug,
      },
    });
  },

  async findAuthorWorkBySlug(authorId: string, slug: string) {
    return prisma.work.findFirst({
      where: {
        authorId,
        slug,
      },
      select: {
        id: true,
      },
    });
  },

  async getAuthorWorkById(authorId: string, workId: string) {
    return prisma.work.findFirst({
      where: {
        authorId,
        id: workId,
      },
      include: {
        chapters: {
          where: {
            status: {
              not: "archived",
            },
          },
          orderBy: {
            position: "asc",
          },
        },
      },
    });
  },

  async getAuthorWorks(authorId: string, includeArchived = false) {
    return prisma.work.findMany({
      where: {
        authorId,
        ...(includeArchived
          ? {}
          : {
              status: {
                not: "archived" as const,
              },
            }),
      },
      include: {
        chapters: {
          where: {
            status: {
              not: "archived",
            },
          },
          orderBy: {
            position: "asc",
          },
        },
      },
      orderBy: {
        updatedAt: "desc",
      },
    });
  },

  async getChaptersForWorks(authorId: string, workIds: string[]) {
    if (workIds.length === 0) return [];

    return prisma.chapter.findMany({
      where: {
        authorId,
        status: {
          not: "archived",
        },
        workId: {
          in: workIds,
        },
      },
      orderBy: [
        {
          workId: "asc",
        },
        {
          position: "asc",
        },
      ],
    });
  },

  async getAuthorChapterById(
    authorId: string,
    workId: string,
    chapterId: string,
  ) {
    return prisma.chapter.findFirst({
      where: {
        authorId,
        id: chapterId,
        status: {
          not: "archived",
        },
        workId,
      },
    });
  },

  async getPublicWork(slug: string) {
    return prisma.work.findFirst({
      where: {
        publishedAt: {
          not: null,
        },
        slug,
        status: "published",
        visibility: "public",
      },
      include: {
        author: {
          select: {
            avatarUrl: true,
            displayName: true,
            fullName: true,
            id: true,
            username: true,
          },
        },
        chapters: {
          where: {
            publishedAt: {
              not: null,
            },
            status: "published",
          },
          orderBy: {
            position: "asc",
          },
        },
      },
    });
  },

  async getPublicChapter(workId: string, position: number) {
    return prisma.chapter.findFirst({
      where: {
        publishedAt: {
          not: null,
        },
        position,
        status: "published",
        workId,
      },
    });
  },

  async getPublishedChapterCount(workId: string) {
    return prisma.chapter.count({
      where: {
        status: "published",
        workId,
      },
    });
  },

  async getLatestChapterPosition(authorId: string, workId: string) {
    return prisma.chapter.findFirst({
      where: {
        authorId,
        status: {
          not: "archived",
        },
        workId,
      },
      orderBy: {
        position: "desc",
      },
      select: {
        position: true,
      },
    });
  },

  async updateWork(
    authorId: string,
    workId: string,
    input: UpdateWorkRecord,
  ) {
    const existingWork = await prisma.work.findFirst({
      where: {
        authorId,
        id: workId,
      },
      select: {
        id: true,
      },
    });

    if (!existingWork) {
      throw new Error("Eser bulunamadı veya bu eseri düzenleme yetkin yok.");
    }

    return prisma.work.update({
      where: {
        id: existingWork.id,
      },
      data: input,
    });
  },

  async updateChapter(
    authorId: string,
    chapterId: string,
    input: UpdateChapterRecord,
  ) {
    const existingChapter = await prisma.chapter.findFirst({
      where: {
        authorId,
        id: chapterId,
      },
      select: {
        id: true,
      },
    });

    if (!existingChapter) {
      throw new Error("Bölüm bulunamadı veya bu bölümü düzenleme yetkin yok.");
    }

    return prisma.chapter.update({
      where: {
        id: existingChapter.id,
      },
      data: input,
    });
  },

  async publishChapter(authorId: string, chapterId: string) {
    const existingChapter = await prisma.chapter.findFirst({
      where: {
        authorId,
        id: chapterId,
      },
      select: {
        id: true,
      },
    });

    if (!existingChapter) {
      throw new Error("Yayınlanacak bölüm bulunamadı.");
    }

    return prisma.chapter.update({
      where: {
        id: existingChapter.id,
      },
      data: {
        archivedAt: null,
        publishedAt: new Date(),
        status: "published",
      },
    });
  },

  async publishWork(authorId: string, workId: string) {
    const existingWork = await prisma.work.findFirst({
      where: {
        authorId,
        id: workId,
      },
      select: {
        id: true,
      },
    });

    if (!existingWork) {
      throw new Error("Yayınlanacak eser bulunamadı.");
    }

    return prisma.work.update({
      where: {
        id: existingWork.id,
      },
      data: {
        archivedAt: null,
        publishedAt: new Date(),
        status: "published",
        visibility: "public",
      },
    });
  },

  async archiveWork(authorId: string, workId: string) {
    const existingWork = await prisma.work.findFirst({
      where: {
        authorId,
        id: workId,
      },
      select: {
        id: true,
      },
    });

    if (!existingWork) {
      throw new Error("Arşivlenecek eser bulunamadı.");
    }

    return prisma.work.update({
      where: {
        id: existingWork.id,
      },
      data: {
        archivedAt: new Date(),
        status: "archived",
        visibility: "private",
      },
    });
  },

  async restoreWork(authorId: string, workId: string) {
    const existingWork = await prisma.work.findFirst({
      where: {
        authorId,
        id: workId,
        status: "archived",
      },
      select: {
        id: true,
      },
    });

    if (!existingWork) {
      throw new Error("Arşivden çıkarılacak eser bulunamadı.");
    }

    return prisma.work.update({
      where: {
        id: existingWork.id,
      },
      data: {
        archivedAt: null,
        status: "draft",
        visibility: "private",
      },
    });
  },

  async deleteWorkAfterFailedCreation(authorId: string, workId: string) {
    const existingWork = await prisma.work.findFirst({
      where: {
        authorId,
        id: workId,
      },
      select: {
        id: true,
      },
    });

    if (!existingWork) return null;

    return prisma.work.delete({
      where: {
        id: existingWork.id,
      },
    });
  },
};