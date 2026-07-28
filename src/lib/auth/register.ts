import { prisma } from "@/lib/prisma";
import { createHash } from "node:crypto";
import { hashPassword } from "./password";
import {
  generateSessionToken,
  hashSessionToken,
} from "./session";

type RegistrationRole = "reader" | "writer" | "editor" | "publisher";

export async function registerUser(input: {
  fullName: string;
  email: string;
  password: string;
  role: RegistrationRole;
  termsAcceptedAt: Date;
  editorInviteToken?: string;
}) {
  const normalizedEmail = input.email.trim().toLowerCase();
  const inviteTokenHash = input.editorInviteToken
    ? createHash("sha256").update(input.editorInviteToken).digest("hex")
    : null;

  const existing = await prisma.user.findUnique({
    where: {
      email: normalizedEmail,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    throw new Error("EMAIL_EXISTS");
  }

  const passwordHash = await hashPassword(input.password);
  const editorInvite = inviteTokenHash
    ? await prisma.editorInvite.findFirst({
        where: {
          expiresAt: {
            gt: new Date(),
          },
          invitedEmail: normalizedEmail,
          tokenHash: inviteTokenHash,
          usedAt: null,
        },
        select: {
          id: true,
          invitedById: true,
          workId: true,
        },
      })
    : null;

  if (inviteTokenHash && !editorInvite) {
    throw new Error("INVALID_EDITOR_INVITE");
  }

  const requestedRole = editorInvite ? "editor" : input.role;
  const requiresApproval =
    requestedRole === "editor" || requestedRole === "publisher";

  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  const user = await prisma.$transaction(async (transaction) => {
    const createdUser = await transaction.user.create({
      data: {
        fullName: input.fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        role: editorInvite
          ? "editor_pending"
          : requiresApproval
            ? "reader"
            : input.role,
        termsAcceptedAt: input.termsAcceptedAt,
      },
    });

    if (requiresApproval) {
      await transaction.roleRequest.create({
        data: {
          userId: createdUser.id,
          requestedRole,
        },
      });
    }

    if (editorInvite) {
      await transaction.editorRecommendation.create({
        data: {
          recipientEditorId: createdUser.id,
          senderEditorId: editorInvite.invitedById,
          workId: editorInvite.workId,
        },
      });

      await transaction.editorInvite.update({
        where: {
          id: editorInvite.id,
        },
        data: {
          acceptedById: createdUser.id,
          usedAt: new Date(),
        },
      });
    }

    await transaction.session.create({
      data: {
        tokenHash,
        userId: createdUser.id,
        expiresAt,
      },
    });

    return createdUser;
  });

  return {
    user,
    token,
    requestedRole: requiresApproval ? requestedRole : null,
  };
}
