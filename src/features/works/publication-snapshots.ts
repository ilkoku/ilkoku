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
  if (!version.description?.startsWith(PUBLICATION_VERSION_DESCRIPTION_PREFIX)) {
    return null;
  }

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

function reportSnapshotReadFailure(scope: "single" | "batch", error: unknown) {
  console.error("PUBLICATION_SNAPSHOT_READ_FAILED", {
    errorName: error instanceof Error ? error.name : "UNKNOWN_ERROR",
    scope,
  });
}

export async function getLatestPublicationSnapshot(chapterId: string) {
  try {
    // Do not push the reserved publication marker into a database string-prefix
    // predicate. Production may use a different MariaDB/Prisma adapter path than
    // CI. Fetch the latest chapter versions and validate the reserved marker in
    // application code so a publication lookup can never take Reader down.
    const versions = await prisma.workVersion.findMany({
      where: {
        chapterId,
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
      take: 12,
    });

    for (const version of versions) {
      const decoded = decodeVersion(version);
      if (decoded) return decoded;
    }
  } catch (error) {
    reportSnapshotReadFailure("single", error);
  }

  return null;
}

export async function getLatestPublicationSnapshots(chapterIds: string[]) {
  const snapshots = new Map<string, PublishedChapterSnapshot>();
  if (chapterIds.length === 0) return snapshots;

  try {
    const versions = await prisma.workVersion.findMany({
      where: {
        chapterId: {
          in: chapterIds,
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
  } catch (error) {
    reportSnapshotReadFailure("batch", error);
  }

  return snapshots;
}
