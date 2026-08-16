"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect, unstable_rethrow } from "next/navigation";
import { notificationContent, validationContent } from "@/content";
import { clearAdminRoleViewCookie } from "@/features/admin-role-view/cookie";
import { sendPasswordResetEmail } from "@/lib/email/auth-emails";
import { getCurrentUser } from "@/lib/auth/current-user";
import { loginUser } from "@/lib/auth/login";
import { hashPassword } from "@/lib/auth/password";
import { registerUser } from "@/lib/auth/register";
import { clearSessionCookie, getSessionCookie, setSessionCookie } from "@/lib/auth/cookies";
import { hashSessionToken } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";
import {
  toPublisherApplicationData,
  validatePublisherApplicationFormData,
} from "@/features/publisher-applications/schema";
import { roleDestinations } from "./data";
import { getAuthenticatedDestination } from "./destination";
import type { RegistrationRole, UserRole } from "./types";

export type AuthActionState = {
  message: string;
  status: "idle" | "error" | "success";
};

const loginRoles: UserRole[] = ["reader", "writer", "editor_pending", "editor", "publisher", "admin"];
const registrationRoles: RegistrationRole[] = ["reader", "writer", "editor", "publisher"];
const standardRoles: RegistrationRole[] = ["reader", "writer"];

function error(message: string): AuthActionState {
  return { message, status: "error" };
}

function success(message: string): AuthActionState {
  return { message, status: "success" };
}

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function validPassword(password: string) {
  return password.length >= 8 && /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(password) && /\d/.test(password);
}

export async function loginAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = getText(formData, "email");
  const password = getText(formData, "password");
  const nextPath = getText(formData, "next");
  const safeNextPath =
    nextPath.startsWith("/") && !nextPath.startsWith("//")
      ? nextPath
      : "";

  if (!email || !password) return error(validationContent.requiredCredentials);

  try {
    const result = await loginUser({ email, password });
    const role = result.user.role as UserRole;
    if (!loginRoles.includes(role)) return error(validationContent.genericFailure);
    await setSessionCookie(result.token);
    redirect(
      safeNextPath ||
        await getAuthenticatedDestination({
          id: result.user.id,
          role,
        }),
    );
  } catch (loginError) {
    unstable_rethrow(loginError);
    if (loginError instanceof Error && loginError.message === "INVALID_CREDENTIALS") {
      return error(validationContent.invalidCredentials);
    }
    return error(validationContent.genericFailure);
  }
}

export async function registerAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const fullName = getText(formData, "full-name");
  const email = getText(formData, "email");
  const password = getText(formData, "password");
  const confirmation = getText(formData, "password-confirmation");
  const role = getText(formData, "role") as RegistrationRole;
  const editorInviteToken = getText(formData, "editor-invite-token");
  const termsAccepted = formData.get("terms") === "accepted";

  if (fullName.length < 2) return error(validationContent.fullNameRequired);
  if (!/^\S+@\S+\.\S+$/.test(email)) return error(validationContent.invalidEmail);
  if (!validPassword(password)) return error(validationContent.invalidPassword);
  if (password !== confirmation) return error(validationContent.passwordsDoNotMatch);
  if (!registrationRoles.includes(role)) return error(validationContent.invalidRole);
  if (!termsAccepted) return error(validationContent.termsRequired);

  const publisherApplication = role === "publisher"
    ? validatePublisherApplicationFormData(formData)
    : null;

  if (publisherApplication && !publisherApplication.success) {
    return error(publisherApplication.message);
  }

  try {
    const result = await registerUser({
      editorInviteToken: editorInviteToken || undefined,
      email,
      fullName,
      password,
      publisherApplication: publisherApplication?.success
        ? publisherApplication.data
        : undefined,
      role,
      termsAcceptedAt: new Date(),
    });
    await setSessionCookie(result.token);
    if (result.requestedRole) {
      redirect("/hesabim?sekme=rol-basvurusu");
    }
    redirect(roleDestinations[role]);
  } catch (registrationError) {
    unstable_rethrow(registrationError);
    if (registrationError instanceof Error && registrationError.message === "EMAIL_EXISTS") {
      return error(validationContent.emailAlreadyRegistered);
    }
    return error(validationContent.genericFailure);
  }
}

export async function resetPasswordAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = getText(formData, "email").toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return error(validationContent.invalidEmail);

  try {
    const user = await prisma.user.findUnique({ where: { email }, select: { fullName: true, id: true } });
    if (user) {
      const token = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({
          where: {
            userId: user.id,
            usedAt: null,
          },
        }),
        prisma.passwordResetToken.create({
          data: {
            expiresAt:
              new Date(
                Date.now() + 60 * 60 * 1000,
              ),
            tokenHash,
            userId: user.id,
          },
        }),
        prisma.auditLog.create({
          data: {
            action: "password_reset_requested",
            actorId: user.id,
            entityId: user.id,
            entityType: "User",
          },
        }),
      ]);
      try {
        await sendPasswordResetEmail({
          email,
          fullName:
            user.fullName,
          token,
        });
      } catch (emailError) {
        console.error(
          "PASSWORD_RESET_DELIVERY_FAILED",
          emailError,
        );
      }
    }
  } catch {
    return error(validationContent.genericFailure);
  }

  return success(notificationContent.passwordResetSent);
}

export async function updatePasswordAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const password = getText(formData, "password");
  const confirmation = getText(formData, "password-confirmation");
  const token = getText(formData, "token");
  if (!validPassword(password)) return error(validationContent.invalidPassword);
  if (password !== confirmation) return error(validationContent.passwordsDoNotMatch);
  if (!token) return error(validationContent.expiredResetLink);

  const tokenHash = createHash("sha256").update(token).digest("hex");
  const now = new Date();

  try {
    const resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: { expiresAt: true, id: true, usedAt: true, userId: true },
    });
    if (!resetToken || resetToken.usedAt || resetToken.expiresAt <= now) {
      return error(validationContent.expiredResetLink);
    }

    await prisma.$transaction(async (transaction) => {
      const claimed = await transaction.passwordResetToken.updateMany({
        where: { id: resetToken.id, usedAt: null, expiresAt: { gt: now } },
        data: { usedAt: now },
      });
      if (claimed.count !== 1) throw new Error("INVALID_RESET_TOKEN");
      await transaction.user.update({
        where: { id: resetToken.userId },
        data: { passwordHash: await hashPassword(password) },
      });
      await transaction.session.deleteMany({
        where: {
          userId: resetToken.userId,
        },
      });

      await transaction.auditLog.create({
        data: {
          action: "password_changed",
          actorId: resetToken.userId,
          entityId: resetToken.userId,
          entityType: "User",
          metadata: JSON.stringify({
            source: "password_reset",
          }),
        },
      });
    });
  } catch {
    return error(validationContent.expiredResetLink);
  }

  await clearSessionCookie();
  redirect("/giris?durum=sifre-guncellendi");
}

export async function updateRoleAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const role = getText(formData, "role") as RegistrationRole;
  if (!registrationRoles.includes(role)) return error(validationContent.invalidRole);

  const publisherApplication = role === "publisher"
    ? validatePublisherApplicationFormData(formData)
    : null;

  if (publisherApplication && !publisherApplication.success) {
    return error(publisherApplication.message);
  }

  const user = await getCurrentUser();
  if (!user) redirect("/giris?sonraki=/rol-secimi");
  if (user.role === "admin") {
    return error(validationContent.adminRoleImmutable);
  }

  if (standardRoles.includes(role)) {
    try {
      await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { role } }),
        prisma.roleRequest.updateMany({
          where: { userId: user.id, status: "pending" },
          data: { pendingKey: null, status: "cancelled" },
        }),
      ]);
    } catch {
      return error(validationContent.roleSaveFailed);
    }
    redirect(roleDestinations[role]);
  }

  try {
    await prisma.$transaction(async (transaction) => {
      await transaction.user.update({
        where: { id: user.id },
        data: { role: role === "editor" ? "editor_pending" : "reader" },
      });
      await transaction.roleRequest.updateMany({
        where: { userId: user.id, status: "pending", requestedRole: { not: role } },
        data: { pendingKey: null, status: "cancelled" },
      });
      const existingRequests = await transaction.roleRequest.findMany({
        where: { userId: user.id, requestedRole: role, status: "pending" },
        orderBy: { createdAt: "asc" },
        select: { id: true },
      });
      const [existing, ...duplicates] = existingRequests;
      if (duplicates.length) {
        await transaction.roleRequest.updateMany({
          where: { id: { in: duplicates.map((request) => request.id) } },
          data: { pendingKey: null, status: "cancelled" },
        });
      }
      if (existing) {
        await transaction.roleRequest.update({
          where: { id: existing.id },
          data: { pendingKey: `${user.id}:${role}` },
        });

        if (role === "publisher" && publisherApplication?.success) {
          await transaction.publisherApplication.upsert({
            where: { roleRequestId: existing.id },
            create: {
              ...toPublisherApplicationData(publisherApplication.data),
              applicantUserId: user.id,
              roleRequestId: existing.id,
              submittedAt: new Date(),
              verificationStatus: "submitted",
            },
            update: {
              ...toPublisherApplicationData(publisherApplication.data),
              correctionNote: null,
              submittedAt: new Date(),
              verificationStatus: "submitted",
            },
          });
        }
      } else {
        const roleRequest = await transaction.roleRequest.create({
          data: { pendingKey: `${user.id}:${role}`, requestedRole: role, userId: user.id },
          select: { id: true },
        });

        if (role === "publisher" && publisherApplication?.success) {
          await transaction.publisherApplication.create({
            data: {
              ...toPublisherApplicationData(publisherApplication.data),
              applicantUserId: user.id,
              roleRequestId: roleRequest.id,
              submittedAt: new Date(),
              verificationStatus: "submitted",
            },
          });
        }
      }

      const activeRequest =
        await transaction.roleRequest.findFirst({
          where: {
            requestedRole: role,
            status: "pending",
            userId: user.id,
          },
          orderBy: {
            createdAt: "desc",
          },
          select: {
            id: true,
          },
        });

      if (!activeRequest) {
        throw new Error(
          "ACTIVE_ROLE_REQUEST_NOT_FOUND",
        );
      }

      await transaction.auditLog.create({
        data: {
          action: "role_requested",
          actorId: user.id,
          entityId: activeRequest.id,
          entityType: "RoleRequest",
          metadata: JSON.stringify({
            requestedRole: role,
          }),
        },
      });
    });
  } catch {
    return error(validationContent.roleRequestFailed);
  }

  redirect("/hesabim?sekme=rol-basvurusu");
}

export async function logoutAction() {
  const token = await getSessionCookie();

  try {
    if (token) {
      const tokenHash = hashSessionToken(token);

      await prisma.$transaction(
        async (transaction) => {
          const session =
            await transaction.session.findUnique({
              where: {
                tokenHash,
              },
              select: {
                userId: true,
              },
            });

          await transaction.session.deleteMany({
            where: {
              tokenHash,
            },
          });

          if (session) {
            await transaction.auditLog.create({
              data: {
                action: "logout",
                actorId: session.userId,
                entityId: session.userId,
                entityType: "User",
              },
            });
          }
        },
      );
    }
  } finally {
    await clearSessionCookie();
    await clearAdminRoleViewCookie();
  }

  redirect("/");
}
