import { sendVerificationEmail } from "@/lib/email/auth-emails";
import {
  sendEditorInviteAcceptedEmail,
} from "@/lib/email/editor-emails";
import { allocatePublicId } from "@/lib/public-id";
import { prisma } from "@/lib/prisma";
import { createHash, randomBytes } from "node:crypto";
import { hashPassword } from "./password";
import {
  generateSessionToken,
  hashSessionToken,
} from "./session";
import {
  toPublisherApplicationData,
  type PublisherApplicationInput,
} from "@/features/publisher-applications/schema";

type RegistrationRole = "reader" | "writer" | "editor" | "publisher";

export async function registerUser(input: {
  fullName: string;
  email: string;
  password: string;
  publisherApplication?: PublisherApplicationInput;
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
          invitedBy: {
            select: {
              email: true,
              fullName: true,
            },
          },
          invitedById: true,
          work: {
            select: {
              title: true,
            },
          },
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

  if (requestedRole === "publisher" && !input.publisherApplication) {
    throw new Error("PUBLISHER_APPLICATION_REQUIRED");
  }

  const token = generateSessionToken();
  const tokenHash = hashSessionToken(token);
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  const emailVerificationToken =
    randomBytes(32).toString("base64url");

  const emailVerificationTokenHash =
    createHash("sha256")
      .update(emailVerificationToken)
      .digest("hex");

  const emailVerificationExpiresAt =
    new Date(
      Date.now() +
        1000 * 60 * 60 * 24,
    );

  const user = await prisma.$transaction(async (transaction) => {
    const userCreatedAt = new Date();
    const publicId = await allocatePublicId(
      transaction,
      "user",
      userCreatedAt,
    );

    const createdUser = await transaction.user.create({
      data: {
        createdAt: userCreatedAt,
        publicId,
        fullName: input.fullName.trim(),
        email: normalizedEmail,
        passwordHash,
        role: requestedRole === "editor"
          ? "editor_pending"
          : requiresApproval
            ? "reader"
            : input.role,
        termsAcceptedAt: input.termsAcceptedAt,
      },
    });

    await transaction.emailVerificationToken.create({
      data: {
        expiresAt:
          emailVerificationExpiresAt,
        tokenHash:
          emailVerificationTokenHash,
        userId:
          createdUser.id,
      },
    });

    if (requiresApproval) {
      const roleRequest = await transaction.roleRequest.create({
        data: {
          pendingKey: `${createdUser.id}:${requestedRole}`,
          userId: createdUser.id,
          requestedRole,
        },
        select: { id: true },
      });

      if (requestedRole === "publisher" && input.publisherApplication) {
        await transaction.publisherApplication.create({
          data: {
            ...toPublisherApplicationData(input.publisherApplication),
            applicantUserId: createdUser.id,
            roleRequestId: roleRequest.id,
            submittedAt: new Date(),
            verificationStatus: "submitted",
          },
        });
      }

      await transaction.auditLog.create({
        data: {
          action: "role_requested",
          actorId: createdUser.id,
          entityId: roleRequest.id,
          entityType: "RoleRequest",
          metadata: JSON.stringify({
            requestedRole,
          }),
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

      await transaction.notification.create({
        data: {
          message: `${createdUser.fullName}, ${editorInvite.work.title} adlı eser için gönderdiğiniz editör davetini kabul etti.`,
          relatedEntityId: editorInvite.workId,
          relatedEntityType: "work",
          title: "Editör daveti kabul edildi",
          type: "editor_recommendation",
          userId: editorInvite.invitedById,
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

    await transaction.auditLog.create({
      data: {
        action: "register",
        actorId: createdUser.id,
        entityId: createdUser.id,
        entityType: "User",
        metadata: JSON.stringify({
          role: createdUser.role,
        }),
      },
    });

    return createdUser;
  });

  let verificationEmailQueued =
    false;

  try {
    await sendVerificationEmail({
      email:
        user.email,
      fullName:
        user.fullName,
      token:
        emailVerificationToken,
    });

    verificationEmailQueued = true;
  } catch (emailError) {
    console.error(
      "EMAIL_VERIFICATION_DELIVERY_FAILED",
      emailError,
    );
  }

  if (editorInvite) {
    try {
      await sendEditorInviteAcceptedEmail({
        acceptedEditorName: user.fullName,
        email: editorInvite.invitedBy.email,
        inviterName: editorInvite.invitedBy.fullName,
        workId: editorInvite.workId,
        workTitle: editorInvite.work.title,
      });
    } catch (emailError) {
      console.error(
        "EDITOR_EMAIL_DELIVERY_FAILED",
        {
          event: "external_editor_invitation_accepted",
          workId: editorInvite.workId,
          error:
            emailError instanceof Error
              ? emailError.message
              : "UNKNOWN_ERROR",
        },
      );
    }
  }

  return {
    user,
    token,
    requestedRole:
      requiresApproval
        ? requestedRole
        : null,
    verificationEmailQueued,
  };
}
