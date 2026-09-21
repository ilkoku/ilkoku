import "server-only";

import type {
  PublicChapterDetail,
  PublicWorkDetail,
  PublicWorkSummary,
} from "./types";
import {
  getLatestPublicationSnapshot,
  getLatestPublicationSnapshots,
  getLatestPublishedBookSnapshot,
} from "./publication-snapshots";
import { prisma } from "@/lib/prisma";
import { getActiveReaderPurchaseTerms } from "@/features/commerce/checkout-terms";
import { resolveEffectiveCommerceState } from "@/features/commerce/effective-state";
import { hasOperationalPaymentProvider } from "@/features/commerce/payment-providers";
import { isCommerceCheckoutEnabled } from "@/features/commerce/runtime";
import { BLOCKED_PUBLIC_WORK_SLUGS } from "@/lib/public-content-safety";
import {
  adultContentWorkVisibility,
  getAdultContentAccess,
} from "@/lib/adult-content-access";

function memberPublicWhere(canAccessAdultContent: boolean) {
  return {
    archivedAt: null,
    ...adultContentWorkVisibility(canAccessAdultContent),
    author: {
      is: {
        deletedAt: null,
        status: "active" as const,
      },
    },
    isActive: true,
    language: "tr",
    publishedAt: { not: null },
    slug: { notIn: [...BLOCKED_PUBLIC_WORK_SLUGS] },
    status: "published" as const,
    visibility: "public" as const,
  };
}

type MemberPublicQueryOptions = {
  bypassCommerce?: boolean;
};

async function canAccessAdult(userId: string | null | undefined) {
  if (!userId) return false;
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role === "admin") return true;
  const access = await getAdultContentAccess(userId);
  return access.canAccessAdultContent;
}

export async function getPublicWorkAgeRating(slug: string) {
  return prisma.work.findFirst({
    where: {
      archivedAt: null,
      author: {
        is: { deletedAt: null, status: "active" },
      },
      isActive: true,
      publishedAt: { not: null },
      slug,
      status: "published",
      visibility: "public",
    },
    select: {
      contentRating: true,
      id: true,
      slug: true,
    },
  });
}

export async function getMemberPublicWorkBySlug(
  slug: string,
  userId?: string | null,
  options: MemberPublicQueryOptions = {},
): Promise<PublicWorkDetail | null> {
  const canAccessAdultContent = await canAccessAdult(userId);
  const scope = memberPublicWhere(canAccessAdultContent);

  const work = await prisma.work.findFirst({
    where: { ...scope, slug },
    include: {
      _count: {
        select: {
          chapters: { where: { archivedAt: null } },
        },
      },
      author: {
        select: {
          avatarUrl: true,
          displayName: true,
          fullName: true,
          id: true,
          publicId: true,
          username: true,
        },
      },
      chapters: {
        where: {
          archivedAt: null,
          publishedAt: { not: null },
          status: "published",
        },
        orderBy: { position: "asc" },
        include: {
          commerceAccess: {
            select: {
              accessType: true,
            },
          },
        },
      },
      saleConfiguration: {
        select: {
          saleModel: true,
          priceAmount: true,
          currency: true,
          status: true,
          activatedAt: true,
        },
      },
      publicationConsents: {
        orderBy: { confirmedAt: "desc" },
        take: 1,
        select: {
          publicationModel: true,
          priceAmount: true,
          currency: true,
          accessPlanSnapshot: true,
        },
      },
    },
  });

  if (!work) return null;

  const saleConfiguration = work.saleConfiguration;
  const latestConsent = work.publicationConsents[0] ?? null;
  const effectiveCommerce = resolveEffectiveCommerceState({
    configuration: saleConfiguration,
    latestConsent,
  });
  const paymentPathReady =
    isCommerceCheckoutEnabled() && hasOperationalPaymentProvider();
  const stagedZeroCandidate =
    !saleConfiguration?.activatedAt &&
    effectiveCommerce.saleModel === "paid" &&
    effectiveCommerce.status === "ready" &&
    effectiveCommerce.priceAmount === BigInt(0);
  const livePaidCandidate =
    paymentPathReady &&
    effectiveCommerce.saleModel === "paid" &&
    effectiveCommerce.status === "active" &&
    effectiveCommerce.priceAmount !== null &&
    effectiveCommerce.priceAmount > BigInt(0);
  const readerPurchaseTerms =
    stagedZeroCandidate || livePaidCandidate
      ? await getActiveReaderPurchaseTerms()
      : null;
  const stagedZeroPurchaseAvailable =
    stagedZeroCandidate && Boolean(readerPurchaseTerms);
  const livePaidPurchaseAvailable =
    livePaidCandidate && Boolean(readerPurchaseTerms);
  const commerceEnforcementActive =
    effectiveCommerce.saleModel === "paid" &&
    (Boolean(saleConfiguration?.activatedAt) ||
      stagedZeroPurchaseAvailable ||
      livePaidPurchaseAvailable);
  const purchaseAvailable =
    stagedZeroPurchaseAvailable || livePaidPurchaseAvailable;

  const entitlement =
    commerceEnforcementActive && userId && !options.bypassCommerce
      ? await prisma.workEntitlement.findUnique({
          where: {
            readerId_workId: {
              readerId: userId,
              workId: work.id,
            },
          },
          select: {
            status: true,
          },
        })
      : null;

  const hasEntitlement = entitlement?.status === "active";
  const chapterAccess = Object.fromEntries(
    work.chapters.map((chapter) => [
      chapter.id,
      effectiveCommerce.useConfirmedSnapshot
        ? effectiveCommerce.accessPlan[chapter.id] ?? "locked"
        : chapter.commerceAccess?.accessType ?? "locked",
    ]),
  ) as Record<string, "preview" | "locked">;

  const canReadChapter = (chapterId: string) =>
    Boolean(
      options.bypassCommerce ||
        !commerceEnforcementActive ||
        hasEntitlement ||
        chapterAccess[chapterId] === "preview",
    );

  const [publicationBook, snapshots] = await Promise.all([
    getLatestPublishedBookSnapshot(work.id),
    getLatestPublicationSnapshots(
      work.chapters.map((chapter) => chapter.id),
    ),
  ]);
  const bookChapterSnapshots = new Map(
    (publicationBook?.items ?? [])
      .filter((item) => item.type === "chapter")
      .map((item) => [item.chapterId, item] as const),
  );
  const publishedChapters = work.chapters.map((chapter) => {
    const { commerceAccess: _commerceAccess, ...chapterModel } = chapter;
    const readable = canReadChapter(chapter.id);
    const bookChapter = bookChapterSnapshots.get(chapter.id);

    if (bookChapter) {
      return {
        ...chapterModel,
        content: readable ? bookChapter.content : "",
        title: bookChapter.title,
      };
    }

    const snapshot = snapshots.get(chapter.id);
    return snapshot
      ? {
          ...chapterModel,
          content: readable ? snapshot.content : "",
          title: snapshot.title,
        }
      : {
          ...chapterModel,
          content: readable ? chapter.content : "",
        };
  });

  const safePublicationBook = publicationBook
    ? {
        ...publicationBook,
        items: publicationBook.items.map((item) =>
          item.type === "chapter" && !canReadChapter(item.chapterId)
            ? {
                ...item,
                content: "",
                formatting: null,
              }
            : item,
        ),
      }
    : null;

  const relatedSelect = {
    _count: {
      select: {
        chapters: {
          where: {
            archivedAt: null,
            publishedAt: { not: null },
            status: "published" as const,
          },
        },
      },
    },
    author: {
      select: {
        displayName: true,
        fullName: true,
      },
    },
    editorReviewStatus: true,
    genre: true,
    id: true,
    slug: true,
    title: true,
  } as const;

  const [sameAuthor, similar] = await Promise.all([
    prisma.work.findMany({
      where: {
        ...scope,
        authorId: work.authorId,
        id: { not: work.id },
      },
      orderBy: { createdAt: "desc" },
      select: relatedSelect,
      take: 3,
    }),
    work.genre
      ? prisma.work.findMany({
          where: {
            ...scope,
            authorId: { not: work.authorId },
            genre: work.genre,
            id: { not: work.id },
          },
          orderBy: { createdAt: "desc" },
          select: relatedSelect,
          take: 3,
        })
      : Promise.resolve([]),
  ]);

  function mapRelated(related: (typeof sameAuthor)[number]): PublicWorkSummary {
    return {
      authorName: related.author.displayName ?? related.author.fullName,
      chapterCount: related._count.chapters,
      editorReviewStatus: related.editorReviewStatus,
      genre: related.genre,
      id: related.id,
      slug: related.slug,
      title: related.title,
    };
  }

  const {
    chapters: _rawChapters,
    saleConfiguration: _saleConfiguration,
    publicationConsents: _publicationConsents,
    ...publicWork
  } = work;

  return {
    ...publicWork,
    chapters: publishedChapters,
    authorName: work.author.displayName ?? work.author.fullName,
    authorPublicId: work.author.publicId,
    chapterCount: publishedChapters.length,
    commerce: {
      chapterAccess,
      currency: effectiveCommerce.currency,
      enforcementActive: commerceEnforcementActive,
      hasEntitlement,
      priceAmount: effectiveCommerce.priceAmount,
      purchaseAvailable,
      saleModel: effectiveCommerce.saleModel,
      saleStatus: saleConfiguration?.status ?? "draft",
    },
    isCompleted:
      publishedChapters.length > 0 &&
      work._count.chapters === publishedChapters.length,
    publicationBook: safePublicationBook,
    sameAuthorWorks: sameAuthor.map(mapRelated),
    similarWorks: similar.map(mapRelated),
  };
}

export async function getMemberPublicChapter(
  workSlug: string,
  chapterNumber: string,
  userId: string,
  options: MemberPublicQueryOptions = {},
): Promise<PublicChapterDetail | null> {
  const work = await getMemberPublicWorkBySlug(
    workSlug,
    userId,
    options,
  );
  if (!work) return null;

  const normalizedChapterNumber = chapterNumber.replace(/^bolum-/u, "");
  const position = Number(normalizedChapterNumber);
  if (!Number.isInteger(position) || position < 1) return null;

  const chapter = await prisma.chapter.findFirst({
    where: {
      archivedAt: null,
      publishedAt: { not: null },
      position,
      status: "published",
      workId: work.id,
    },
  });
  if (!chapter) return null;

  const commerceAllowsContent =
    options.bypassCommerce ||
    !work.commerce?.enforcementActive ||
    work.commerce.hasEntitlement ||
    work.commerce.chapterAccess[chapter.id] === "preview";

  if (!commerceAllowsContent) {
    return {
      ...chapter,
      content: "",
      formatting: "",
      publicationLayout: null,
      publicationVersion: null,
      title: chapter.title,
      work,
    };
  }

  const publication = await getLatestPublicationSnapshot(chapter.id);
  const bookChapter = work.publicationBook?.items.find(
    (item) => item.type === "chapter" && item.chapterId === chapter.id,
  );
  const publishedFormatting =
    bookChapter?.type === "chapter" && bookChapter.formatting
      ? JSON.stringify(bookChapter.formatting)
      : "";

  return {
    ...chapter,
    content: bookChapter?.content ?? publication?.content ?? chapter.content,
    formatting: publishedFormatting,
    publicationLayout: bookChapter?.layout ?? publication?.layout ?? null,
    publicationVersion: publication?.versionNumber ?? null,
    title: bookChapter?.title ?? publication?.title ?? chapter.title,
    work,
  };
}
