import "server-only";

import { prisma } from "@/lib/prisma";
import {
  decodePublicationVersionDescription,
  PUBLICATION_VERSION_DESCRIPTION_PREFIX,
  type PublicationLayoutSnapshot,
} from "./publication-layout";

export type PublishedChapterSnapshot = {
  content: string;
  layout: PublicationLayoutSnapshot;
  title: string;
  versionNumber: number;
};

type VersionRow = {
  chapterId: string | null;
  content: string | null;
  description: string | null;
  title: string | null;
  versionNumber: number;
};

function decodeVersion(version: VersionRow): PublishedChapterSnapshot | null {
  if (!version.content || !version.title) return null;
  const layout = decodePublicationVersionDescription(
    version.description,
    version.content,
  );
  if (!layout) return null;

  return {
    content: version.content,
    layout,
    title: version.title,
    versionNumber: version.versionNumber,
  };
}

export async function getLatestPublicationSnapshot(chapterId: string) {
  const versions = await prisma.workVersion.findMany({
    where: {
      chapterId,
      description: {
        startsWith: PUBLICATION_VERSION_DESCRIPTION_PREFIX,
      },
    },
    orderBy: {
      versionNumber: "desc",
    },
    select: {
      chapterId: true,
      content: true,
      description: true,
      title: true,
      versionNumber: true,
    },
    take: 4,
  });

  for (const version of versions) {
    const decoded = decodeVersion(version);
    if (decoded) return decoded;
  }

  return null;
}

export async function getLatestPublicationSnapshots(chapterIds: string[]) {
  const snapshots = new Map<string, PublishedChapterSnapshot>();
  if (chapterIds.length === 0) return snapshots;

  const versions = await prisma.workVersion.findMany({
    where: {
      chapterId: {
        in: chapterIds,
      },
      description: {
        startsWith: PUBLICATION_VERSION_DESCRIPTION_PREFIX,
      },
    },
    orderBy: {
      versionNumber: "desc",
    },
    select: {
      chapterId: true,
      content: true,
      description: true,
      title: true,
      versionNumber: true,
    },
  });

  for (const version of versions) {
    const chapterId = version.chapterId;
    if (!chapterId || snapshots.has(chapterId)) continue;
    const decoded = decodeVersion(version);
    if (decoded) snapshots.set(chapterId, decoded);
  }

  return snapshots;
}
