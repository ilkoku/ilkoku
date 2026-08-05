import { createHash } from "node:crypto";

import { prisma } from "@/lib/prisma";

export async function getExternalSecondEditorInvite(token: string) {
  const normalizedToken = token.trim();

  if (normalizedToken.length < 20) return null;

  const tokenHash = createHash("sha256")
    .update(normalizedToken)
    .digest("hex");

  return prisma.editorInvite.findUnique({
    where: {
      tokenHash,
    },
    select: {
      acceptedById: true,
      expiresAt: true,
      id: true,
      invitedBy: {
        select: {
          displayName: true,
          fullName: true,
        },
      },
      invitedEmail: true,
      usedAt: true,
      work: {
        select: {
          authorId: true,
          editorReviewAssignments: {
            where: {
              stage: "second",
            },
            select: {
              editorId: true,
              invitedEmail: true,
              source: true,
              status: true,
            },
            take: 1,
          },
          editorReviewStatus: true,
          id: true,
          slug: true,
          title: true,
        },
      },
    },
  });
}
