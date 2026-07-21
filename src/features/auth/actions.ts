"use server";

import { createHash, randomBytes } from "node:crypto";
import { redirect, unstable_rethrow } from "next/navigation";
import { notificationContent, validationContent } from "@/content";
import { getSiteUrl } from "@/lib/supabase/config";
import { roleDestinations } from "./data";
import type { UserRole } from "./types";
import { getCurrentUser } from "@/lib/auth/current-user";
import { loginUser } from "@/lib/auth/login";
import { hashPassword } from "@/lib/auth/password";
import { registerUser } from "@/lib/auth/register";
import { clearSessionCookie, getSessionCookie, setSessionCookie } from "@/lib/auth/cookies";
import { hashSessionToken } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

export type AuthActionState = {
  message: string;
  status: "idle" | "error" | "success";
};

const roles: UserRole[] = ["reader", "writer", "editor", "publisher"];
const standardRoles: UserRole[] = ["reader", "writer"];

function error(message: string): AuthActionState {
  return { message, status: "error" };
}

function success(message: string): AuthActionState {
  return { message, status: "success" };
}

function getText(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function safeNextPath(value: string) {
  return value.startsWith("/") && !value.startsWith("//") ? value : null;
}

function validPassword(password: string) {
  return password.length >= 8 && /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(password) && /\d/.test(password);
}

export async function loginAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = getText(formData, "email");
  const password = getText(formData, "password");
  if (!email || !password) return error(validationContent.requiredCredentials);

  try {
    const result = await loginUser({ email, password });
    const role = result.user.role as UserRole;

    if (!roles.includes(role)) {
      return error(validationContent.genericFailure);
    }

    await setSessionCookie(result.token);

    redirect(roleDestinations[role]);
  } catch (loginError) {
    unstable_rethrow(loginError);

    if (loginError instanceof Error && loginError.message === "INVALID_CREDENTIALS") {
      return error(validationContent.invalidCredentials);
    }

    if (loginError instanceof Error && loginError.message === "ACCOUNT_DISABLED") {
      return error(validationContent.genericFailure);
    }

    return error(validationContent.genericFailure);
  }
}

export async function registerAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const fullName = getText(formData, "full-name");
  const email = getText(formData, "email");
  const password = getText(formData, "password");
  const confirmation = getText(formData, "password-confirmation");
  const role = getText(formData, "role") as UserRole;
  const termsAccepted = formData.get("terms") === "accepted";
  if (fullName.length < 2) return error(validationContent.fullNameRequired);
  if (!/^\S+@\S+\.\S+$/.test(email)) return error(validationContent.invalidEmail);
  if (!validPassword(password)) return error(validationContent.invalidPassword);
  if (password !== confirmation) return error(validationContent.passwordsDoNotMatch);
  if (!roles.includes(role)) return error(validationContent.invalidRole);
  if (!termsAccepted) return error(validationContent.termsRequired);

  let result: Awaited<ReturnType<typeof registerUser>>;

  try {
    result = await registerUser({
      fullName,
      email,
      password,
      role,
      termsAcceptedAt: new Date(),
    });
    await setSessionCookie(result.token);
  } catch (registrationError) {
    if (registrationError instanceof Error && registrationError.message === "EMAIL_EXISTS") {
      return error(validationContent.emailAlreadyRegistered);
    }

    return error(validationContent.genericFailure);
  }

  if (result.requestedRole) {
    redirect(`/rol-secimi?durum=talep-alindi&rol=${result.requestedRole}`);
  }

  redirect(roleDestinations[role]);
}

export async function resetPasswordAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const email = getText(formData, "email").toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) return error(validationContent.invalidEmail);

  try {
    const user = await prisma.user.findUnique({
      where: { email },
      select: { id: true },
    });

    if (user) {
      const token = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(token).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await prisma.$transaction([
        prisma.passwordResetToken.deleteMany({
          where: { userId: user.id, usedAt: null },
        }),
        prisma.passwordResetToken.create({
          data: { expiresAt, tokenHash, userId: user.id },
        }),
      ]);

      const resetUrl = new URL("/sifre-yenile", getSiteUrl());
      resetUrl.searchParams.set("token", token);
      void resetUrl;
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

    const passwordHash = await hashPassword(password);

    await prisma.$transaction(
      async (transaction) => {
        const claimedToken = await transaction.passwordResetToken.updateMany({
          where: {
            expiresAt: { gt: now },
            id: resetToken.id,
            usedAt: null,
          },
          data: { usedAt: now },
        });

        if (claimedToken.count !== 1) {
          throw new Error("INVALID_RESET_TOKEN");
        }

        await transaction.user.update({
          where: { id: resetToken.userId },
          data: { passwordHash },
        });
        await transaction.session.deleteMany({
          where: { userId: resetToken.userId },
        });
        await transaction.passwordResetToken.deleteMany({
          where: {
            id: { not: resetToken.id },
            userId: resetToken.userId,
            usedAt: null,
          },
        });
      },
      { isolationLevel: "Serializable" },
    );
  } catch (resetError) {
    if (resetError instanceof Error && resetError.message === "INVALID_RESET_TOKEN") {
      return error(validationContent.expiredResetLink);
    }

    return error(validationContent.genericFailure);
  }

  await clearSessionCookie();
  redirect("/giris?durum=sifre-guncellendi");
}

export async function updateRoleAction(_state: AuthActionState, formData: FormData): Promise<AuthActionState> {
  const role = getText(formData, "role") as UserRole;
  if (!roles.includes(role)) return error(validationContent.invalidRole);

  const user = await getCurrentUser();
  if (!user) redirect("/giris?sonraki=/rol-secimi");

  if (standardRoles.includes(role)) {
    try {
      await prisma.$transaction([
        prisma.user.update({ where: { id: user.id }, data: { role } }),
        prisma.roleRequest.updateMany({
          where: { userId: user.id, status: "pending" },
          data: { status: "cancelled" },
        }),
      ]);
    } catch {
      return error(validationContent.roleSaveFailed);
    }

    redirect(roleDestinations[role]);
  }

  try {
    await prisma.$transaction(
      async (transaction) => {
        await transaction.user.update({ where: { id: user.id }, data: { role: "reader" } });
        await transaction.roleRequest.updateMany({
          where: { userId: user.id, status: "pending", requestedRole: { not: role } },
          data: { status: "cancelled" },
        });

        const existingRequest = await transaction.roleRequest.findFirst({
          where: { userId: user.id, requestedRole: role, status: "pending" },
          select: { id: true },
        });

        if (!existingRequest) {
          await transaction.roleRequest.create({
            data: { userId: user.id, requestedRole: role },
          });
        }
      },
      { isolationLevel: "Serializable" },
    );
  } catch {
    return error(validationContent.roleRequestFailed);
  }

  return success(
    role === "editor"
      ? notificationContent.editorRoleRequested
      : notificationContent.publisherRoleRequested,
  );
}

export async function logoutAction() {
  const token = await getSessionCookie();

  try {
    if (token) {
      await prisma.session.deleteMany({
        where: {
          tokenHash: hashSessionToken(token),
        },
      });
    }
  } finally {
    await clearSessionCookie();
  }

  redirect("/giris");
}
