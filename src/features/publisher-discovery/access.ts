import { redirect } from "next/navigation";

import {
  getCurrentProfile,
  type AuthProfile,
} from "@/features/auth/profile";
import {
  getPublisherPermissions,
  hasPublisherPermission,
  type PublisherPermission,
} from "@/features/publisher-workspace/permissions";
import {
  getPublisherMembership,
} from "@/features/publisher-workspace/repository";
import { prisma } from "@/lib/prisma";

export interface PublisherDiscoveryAccess {
  companyName: string;
  permissions: PublisherPermission[];
  profile: AuthProfile;
  publisherId: string;
}

export interface PublisherWorkPassportAccess
  extends PublisherDiscoveryAccess {
  canViewContent: boolean;
  source: "discovery" | "shared";
}

async function requirePublisherMembership(
  path: string,
) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect(
      `/giris?sonraki=${encodeURIComponent(path)}`,
    );
  }

  const membership =
    await getPublisherMembership(profile.id);

  if (!membership) {
    const actualProfile = await getCurrentProfile({
      ignoreAdminRoleView: true,
    });

    if (actualProfile?.role === "admin") {
      redirect("/admin/yayinevleri");
    }

    redirect(
      "/erisim-reddedildi?gerekli=publisher_membership",
    );
  }

  const permissions = getPublisherPermissions(
    membership.role,
    membership.permissionOverrides,
  );

  return {
    membership,
    permissions,
    profile,
  };
}

export async function getPublisherNavigationPermissions(
  userId: string,
): Promise<PublisherPermission[]> {
  const membership =
    await getPublisherMembership(userId);

  if (!membership) {
    return [];
  }

  return getPublisherPermissions(
    membership.role,
    membership.permissionOverrides,
  );
}

export async function requirePublisherDiscoveryAccess(
  path: string,
  permission: PublisherPermission,
): Promise<PublisherDiscoveryAccess> {
  const {
    membership,
    permissions,
    profile,
  } = await requirePublisherMembership(path);

  if (!permissions.includes(permission)) {
    redirect(
      `/erisim-reddedildi?gerekli=${permission}`,
    );
  }

  return {
    companyName:
      membership.publisher.companyName,
    permissions,
    profile,
    publisherId:
      membership.publisherId,
  };
}

export async function requirePublisherWorkPassportAccess(
  path: string,
  workId: string,
): Promise<PublisherWorkPassportAccess> {
  const {
    membership,
    permissions,
    profile,
  } = await requirePublisherMembership(path);

  if (
    !hasPublisherPermission(
      membership.role,
      "view_authorized_passport",
      membership.permissionOverrides,
    )
  ) {
    redirect(
      "/erisim-reddedildi?gerekli=view_authorized_passport",
    );
  }

  const canDiscoverWorks =
    permissions.includes("discover_works");
  const canViewSharedItems =
    permissions.includes("view_shared_items");

  let source: "discovery" | "shared" | null =
    canDiscoverWorks
      ? "discovery"
      : null;

  if (
    !source &&
    canViewSharedItems &&
    !membership.id.startsWith("admin-preview:")
  ) {
    const sharedRecord =
      await prisma.publisherDiscoveryShareRecipient.findFirst({
        where: {
          membershipId: membership.id,
          share: {
            is: {
              publisherId:
                membership.publisherId,
              workId,
            },
          },
        },
        select: {
          id: true,
        },
      });

    if (sharedRecord) {
      source = "shared";
    }
  }

  if (!source) {
    redirect(
      "/erisim-reddedildi?gerekli=discover_works_or_shared_item",
    );
  }

  return {
    canViewContent:
      permissions.includes(
        "view_authorized_content",
      ),
    companyName:
      membership.publisher.companyName,
    permissions,
    profile,
    publisherId:
      membership.publisherId,
    source,
  };
}
