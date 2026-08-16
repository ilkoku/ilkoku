import "server-only";

import { createHash } from "node:crypto";
import type { PublisherMemberRole } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { getCustomizablePublisherPermissions } from "./permissions";

type LockedInviteUserRow = {
  deletedAt: Date | string | null;
  email: string;
  id: string;
  isBanned: boolean | number;
  status: "active" | "suspended" | "disabled";
};

type LockedPublisherRow = {
  active: boolean | number;
  archivedAt: Date | string | null;
  id: string;
  verified: boolean | number;
};

type LockedInvitationRow = {
  expiresAt: Date | string;
  id: string;
  invitedEmail: string;
  permissionOverrides: unknown;
  publisherId: string;
  role: PublisherMemberRole;
  status: "pending" | "accepted" | "declined" | "cancelled" | "expired";
  tokenHash: string;
};

function asDate(value: Date | string) {
  return value instanceof Date ? value : new Date(value);
}

export async function acceptPublisherInvitationLocked(input: {
  token: string;
  userId: string;
}) {
  const normalizedToken = input.token.trim();
  if (!normalizedToken) return { status: "invalid" as const };

  const tokenHash = createHash("sha256")
    .update(normalizedToken)
    .digest("hex");
  const candidate = await prisma.publisherInvitation.findUnique({
    where: { tokenHash },
    select: { id: true, publisherId: true },
  });

  if (!candidate) return { status: "invalid" as const };

  const now = new Date();

  return prisma.$transaction(async (transaction) => {
    const users = await transaction.$queryRaw<LockedInviteUserRow[]>`
      SELECT id, email, status, isBanned, deletedAt
      FROM User
      WHERE id = ${input.userId}
      LIMIT 1
      FOR UPDATE
    `;
    const user = users[0] ?? null;

    if (
      !user ||
      user.status !== "active" ||
      Boolean(user.isBanned) ||
      user.deletedAt
    ) {
      return { status: "invalid_user" as const };
    }

    const publishers = await transaction.$queryRaw<LockedPublisherRow[]>`
      SELECT id, active, verified, archivedAt
      FROM Publisher
      WHERE id = ${candidate.publisherId}
      LIMIT 1
      FOR UPDATE
    `;
    const publisher = publishers[0] ?? null;

    if (
      !publisher ||
      !Boolean(publisher.active) ||
      !Boolean(publisher.verified) ||
      publisher.archivedAt
    ) {
      return { status: "invalid" as const };
    }

    const invitations = await transaction.$queryRaw<LockedInvitationRow[]>`
      SELECT id, publisherId, invitedEmail, role, permissionOverrides,
             tokenHash, status, expiresAt
      FROM PublisherInvitation
      WHERE id = ${candidate.id}
        AND publisherId = ${publisher.id}
      LIMIT 1
      FOR UPDATE
    `;
    const invitation = invitations[0] ?? null;

    if (
      !invitation ||
      invitation.tokenHash !== tokenHash ||
      invitation.status !== "pending" ||
      asDate(invitation.expiresAt).getTime() <= now.getTime()
    ) {
      return { status: "invalid" as const };
    }

    if (
      invitation.invitedEmail.trim().toLowerCase() !==
      user.email.trim().toLowerCase()
    ) {
      return {
        invitedEmail: invitation.invitedEmail,
        status: "email_mismatch" as const,
      };
    }

    const claimed = await transaction.publisherInvitation.updateMany({
      where: {
        expiresAt: { gt: now },
        id: invitation.id,
        publisherId: publisher.id,
        status: "pending",
        tokenHash,
      },
      data: {
        acceptedAt: now,
        acceptedById: user.id,
        status: "accepted",
      },
    });

    if (claimed.count !== 1) return { status: "invalid" as const };

    const invitationPermissions = getCustomizablePublisherPermissions(
      invitation.role,
      invitation.permissionOverrides,
    );
    const existingMembership = await transaction.publisherMembership.findUnique({
      where: {
        publisherId_userId: {
          publisherId: publisher.id,
          userId: user.id,
        },
      },
      select: { role: true },
    });

    await transaction.publisherMembership.upsert({
      where: {
        publisherId_userId: {
          publisherId: publisher.id,
          userId: user.id,
        },
      },
      create: {
        active: true,
        permissionOverrides: invitationPermissions,
        publisherId: publisher.id,
        role: invitation.role,
        userId: user.id,
      },
      update:
        existingMembership?.role === "owner"
          ? { active: true, role: "owner" }
          : {
              active: true,
              permissionOverrides: invitationPermissions,
              role: invitation.role,
            },
    });

    return {
      publisherId: publisher.id,
      status: "accepted" as const,
    };
  });
}
