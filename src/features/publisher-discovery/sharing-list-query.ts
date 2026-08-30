import "server-only";

import type { Prisma } from "@/generated/prisma/client";
import { commonDiscoveryAuthorWhereFor } from "@/features/discovery/common-author-scope";
import { commonDiscoveryWorkWhereFor } from "@/features/discovery/common-work-scope";
import {
  getPublisherMembership,
  isPublisherAdminReadOnlyMembership,
} from "@/features/publisher-workspace/repository";
import { hasPublisherPermission } from "@/features/publisher-workspace/permissions";
import { getAdultContentAccess } from "@/lib/adult-content-access";
import { DISCOVERY_PAGE_SIZE } from "@/lib/discovery-list-standard";
import { prisma } from "@/lib/prisma";
import type { PublisherSharedItem } from "./sharing-repository";

export type PublisherSharedKind = "all" | "author" | "work";

export type PublisherSharedListFilters = {
  kind: PublisherSharedKind;
  page: number;
  query: string;
  unreadOnly: boolean;
};

export type PublisherSharedListData = {
  adminReadOnly: boolean;
  companyName: string;
  currentPage: number;
  items: PublisherSharedItem[];
  totalCount: number;
  totalPages: number;
};

function firstValue(value: string | string[] | undefined) {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

export function normalizePublisherSharedListFilters(
  input: Record<string, string | string[] | undefined>,
): PublisherSharedListFilters {
  const rawPage = Number.parseInt(firstValue(input.sayfa), 10);
  const rawKind = firstValue(input.tip);

  return {
    kind: rawKind === "eser" ? "work" : rawKind === "yazar" ? "author" : "all",
    page: Number.isFinite(rawPage) && rawPage > 0 ? rawPage : 1,
    query: firstValue(input.arama).slice(0, 220),
    unreadOnly: firstValue(input.okunma) === "okunmamis",
  };
}

function displayName(user: {
  displayName: string | null;
  fullName: string;
}) {
  return user.displayName?.trim() || user.fullName.trim();
}

function publicAuthorName(author: {
  displayName: string | null;
  publicId: string;
  username: string | null;
}) {
  return author.displayName?.trim() || author.username?.trim() || author.publicId;
}

const sharedItemSelect = {
  author: {
    select: {
      displayName: true,
      id: true,
      publicId: true,
      username: true,
    },
  },
  createdAt: true,
  createdBy: {
    select: {
      displayName: true,
      fullName: true,
    },
  },
  id: true,
  note: true,
  work: {
    select: {
      id: true,
      slug: true,
      title: true,
    },
  },
} as const;

type SharedRecord = {
  author: {
    displayName: string | null;
    id: string;
    publicId: string;
    username: string | null;
  } | null;
  createdAt: Date;
  createdBy: {
    displayName: string | null;
    fullName: string;
  } | null;
  id: string;
  note: string;
  work: {
    id: string;
    slug: string;
    title: string;
  } | null;
};

function mapShareRecord(record: SharedRecord, readAt: Date | null): PublisherSharedItem {
  return {
    author: record.author
      ? {
          id: record.author.id,
          name: publicAuthorName(record.author),
          publicId: record.author.publicId,
        }
      : null,
    createdAt: record.createdAt.toISOString(),
    createdByName: record.createdBy
      ? displayName(record.createdBy)
      : "Yayınevi ekibi",
    id: record.id,
    note: record.note,
    readAt: readAt?.toISOString() ?? null,
    work: record.work,
  };
}

function shareWhere(
  filters: PublisherSharedListFilters,
  canAccessAdultContent: boolean,
): Prisma.PublisherDiscoveryShareWhereInput {
  const workWhere = commonDiscoveryWorkWhereFor(canAccessAdultContent);
  const authorWhere = commonDiscoveryAuthorWhereFor(canAccessAdultContent);
  const entityWhere: Prisma.PublisherDiscoveryShareWhereInput =
    filters.kind === "work"
      ? { work: { is: workWhere } }
      : filters.kind === "author"
        ? { author: { is: authorWhere } }
        : {
            OR: [
              { work: { is: workWhere } },
              { author: { is: authorWhere } },
            ],
          };
  const queryWhere: Prisma.PublisherDiscoveryShareWhereInput = filters.query
    ? {
        OR: [
          { note: { contains: filters.query } },
          { work: { is: { ...workWhere, title: { contains: filters.query } } } },
          {
            author: {
              is: {
                ...authorWhere,
                OR: [
                  { displayName: { contains: filters.query } },
                  { username: { contains: filters.query } },
                  { publicId: { contains: filters.query } },
                ],
              },
            },
          },
          {
            createdBy: {
              is: {
                OR: [
                  { displayName: { contains: filters.query } },
                  { fullName: { contains: filters.query } },
                ],
              },
            },
          },
        ],
      }
    : {};

  return {
    channel: "team",
    AND: [entityWhere, queryWhere],
  };
}

export async function getPublisherSharedItemsPage(
  userId: string,
  filters: PublisherSharedListFilters,
): Promise<PublisherSharedListData | null> {
  const membership = await getPublisherMembership(userId);

  if (
    !membership ||
    !hasPublisherPermission(
      membership.role,
      "view_shared_items",
      membership.permissionOverrides,
    )
  ) {
    return null;
  }

  const adminReadOnly = isPublisherAdminReadOnlyMembership(membership);
  const canAccessAdultContent = adminReadOnly
    ? true
    : (await getAdultContentAccess(userId)).canAccessAdultContent;
  const baseShareWhere = shareWhere(filters, canAccessAdultContent);

  if (adminReadOnly) {
    const where: Prisma.PublisherDiscoveryShareWhereInput = {
      ...baseShareWhere,
      publisherId: membership.publisherId,
    };
    const totalCount = await prisma.publisherDiscoveryShare.count({ where });
    const totalPages = Math.max(1, Math.ceil(totalCount / DISCOVERY_PAGE_SIZE));
    const currentPage = Math.min(filters.page, totalPages);
    const records = await prisma.publisherDiscoveryShare.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (currentPage - 1) * DISCOVERY_PAGE_SIZE,
      take: DISCOVERY_PAGE_SIZE,
      select: sharedItemSelect,
    });

    return {
      adminReadOnly: true,
      companyName: membership.publisher.companyName,
      currentPage,
      items: records.map((record) => mapShareRecord(record, null)),
      totalCount,
      totalPages,
    };
  }

  const where: Prisma.PublisherDiscoveryShareRecipientWhereInput = {
    membershipId: membership.id,
    ...(filters.unreadOnly ? { readAt: null } : {}),
    share: baseShareWhere,
  };
  const totalCount = await prisma.publisherDiscoveryShareRecipient.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalCount / DISCOVERY_PAGE_SIZE));
  const currentPage = Math.min(filters.page, totalPages);
  const records = await prisma.publisherDiscoveryShareRecipient.findMany({
    where,
    orderBy: { createdAt: "desc" },
    skip: (currentPage - 1) * DISCOVERY_PAGE_SIZE,
    take: DISCOVERY_PAGE_SIZE,
    select: {
      readAt: true,
      share: {
        select: sharedItemSelect,
      },
    },
  });

  return {
    adminReadOnly: false,
    companyName: membership.publisher.companyName,
    currentPage,
    items: records.map((record) => mapShareRecord(record.share, record.readAt)),
    totalCount,
    totalPages,
  };
}
