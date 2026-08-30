import "server-only";

import {
  discoverySurfaces,
  type DiscoveryFilterId,
  type DiscoverySurface,
} from "@/lib/discovery-filter-registry";
import { prisma } from "@/lib/prisma";

type DiscoveryFilterOverrideRow = {
  enabled: boolean | number;
  filterId: string;
  surfaceId: string;
};

export type ManagedDiscoverySurface = DiscoverySurface & {
  activeFilters: DiscoveryFilterId[];
  removedFilters: DiscoveryFilterId[];
};

export type DiscoveryFilterConfiguration = {
  storageReady: boolean;
  surfaces: ManagedDiscoverySurface[];
};

function getSurface(surfaceId: string) {
  return discoverySurfaces.find((surface) => surface.id === surfaceId) ?? null;
}

function isSupportedFilter(
  surface: DiscoverySurface,
  filterId: string,
): filterId is DiscoveryFilterId {
  return surface.availableFilters.includes(filterId as DiscoveryFilterId);
}

async function readOverrides(): Promise<{
  rows: DiscoveryFilterOverrideRow[];
  storageReady: boolean;
}> {
  try {
    const rows = await prisma.$queryRaw<DiscoveryFilterOverrideRow[]>`
      SELECT surfaceId, filterId, enabled
      FROM DiscoveryFilterOverride
    `;
    return { rows, storageReady: true };
  } catch {
    // Migration henüz canlıya uygulanmamışsa ürün yüzeyleri mevcut kod varsayılanlarıyla
    // çalışmaya devam eder; Filtreleme Merkezi bunu ayrıca uyarı olarak gösterir.
    return { rows: [], storageReady: false };
  }
}

function effectiveFiltersFor(
  surface: DiscoverySurface,
  rows: readonly DiscoveryFilterOverrideRow[],
) {
  const defaultSet = new Set<DiscoveryFilterId>(surface.filters);
  const states = new Map<DiscoveryFilterId, boolean>(
    surface.availableFilters.map((filterId) => [filterId, defaultSet.has(filterId)]),
  );

  for (const row of rows) {
    if (row.surfaceId !== surface.id || !isSupportedFilter(surface, row.filterId)) {
      continue;
    }
    states.set(row.filterId, Boolean(row.enabled));
  }

  return surface.availableFilters.filter((filterId) => states.get(filterId) === true);
}

export async function getDiscoveryFilterConfiguration(): Promise<DiscoveryFilterConfiguration> {
  const { rows, storageReady } = await readOverrides();

  return {
    storageReady,
    surfaces: discoverySurfaces.map((surface) => {
      const activeFilters = effectiveFiltersFor(surface, rows);
      const activeSet = new Set(activeFilters);

      return {
        ...surface,
        activeFilters,
        removedFilters: surface.availableFilters.filter(
          (filterId) => !activeSet.has(filterId),
        ),
      };
    }),
  };
}

export async function getDiscoverySurfaceFilterIds(
  surfaceId: string,
): Promise<readonly DiscoveryFilterId[]> {
  const surface = getSurface(surfaceId);
  if (!surface) return [];

  const { rows } = await readOverrides();
  return effectiveFiltersFor(surface, rows);
}

export async function setDiscoverySurfaceFilterEnabled({
  actorId,
  enabled,
  filterId,
  surfaceId,
}: {
  actorId: string;
  enabled: boolean;
  filterId: string;
  surfaceId: string;
}) {
  const surface = getSurface(surfaceId);
  if (!surface) throw new Error("FILTRE_YUZEYI_BULUNAMADI");
  if (!isSupportedFilter(surface, filterId)) {
    throw new Error("FILTRE_BU_YUZEYDE_DESTEKLENMIYOR");
  }

  await prisma.$transaction(async (transaction) => {
    await transaction.$executeRaw`
      INSERT INTO DiscoveryFilterOverride
        (id, surfaceId, filterId, enabled, updatedById, createdAt, updatedAt)
      VALUES
        (UUID(), ${surfaceId}, ${filterId}, ${enabled}, ${actorId}, NOW(3), NOW(3))
      ON DUPLICATE KEY UPDATE
        enabled = VALUES(enabled),
        updatedById = VALUES(updatedById),
        updatedAt = NOW(3)
    `;

    await transaction.$executeRaw`
      INSERT INTO AuditLog
        (id, actorId, action, entityType, entityId, metadata, createdAt)
      VALUES
        (
          UUID(),
          ${actorId},
          'profile_updated',
          'DiscoveryFilterConfig',
          ${`${surfaceId}:${filterId}`},
          ${JSON.stringify({ enabled, filterId, surfaceId, source: "cms_filtering_center" })},
          NOW(3)
        )
    `;
  });

  return surface.route.split("?")[0] ?? surface.route;
}
