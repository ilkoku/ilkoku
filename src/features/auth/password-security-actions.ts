"use server";

import {
  createHash,
  randomBytes,
} from "node:crypto";
import { redirect } from "next/navigation";
import {
  notificationContent,
  validationContent,
} from "@/content";
import {
  clearSessionCookie,
} from "@/lib/auth/cookies";
import {
  hashPassword,
} from "@/lib/auth/password";
import {
  sendPasswordChangedEmail,
  sendPasswordResetEmail,
} from "@/lib/email/auth-emails";
import {
  issuePasswordReset,
  redeemPasswordReset,
} from "./password-reset-state";

export type PasswordSecurityActionState = {
  message: string;
  status:
    | "idle"
    | "error"
    | "success";
};

function error(
  message: string,
): PasswordSecurityActionState {
  return {
    message,
    status: "error",
  };
}

function success(
  message: string,
): PasswordSecurityActionState {
  return {
    message,
    status: "success",
  };
}

function getText(
  formData: FormData,
  key: string,
) {
  return String(
    formData.get(key) ?? "",
  ).trim();
}

function validPassword(
  password: string,
) {
  return (
    password.length >= 8 &&
    /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(
      password,
    ) &&
    /\d/.test(password)
  );
}

export async function resetPasswordAction(
  _state: PasswordSecurityActionState,
  formData: FormData,
): Promise<PasswordSecurityActionState> {
  const email = getText(
    formData,
    "email",
  ).toLowerCase();

  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return error(
      validationContent.invalidEmail,
    );
  }

  try {
    const token =
      randomBytes(32).toString(
        "base64url",
      );
    const tokenHash =
      createHash("sha256")
        .update(token)
        .digest("hex");
    const issued =
      await issuePasswordReset({
        email,
        tokenHash,
      });

    if (issued) {
      try {
        await sendPasswordResetEmail({
          email: issued.email,
          fullName: issued.fullName,
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
    return error(
      validationContent.genericFailure,
    );
  }

  return success(
    notificationContent.passwordResetSent,
  );
}

export async function updatePasswordAction(
  _state: PasswordSecurityActionState,
  formData: FormData,
): Promise<PasswordSecurityActionState> {
  const password = getText(
    formData,
    "password",
  );
  const confirmation = getText(
    formData,
    "password-confirmation",
  );
  const token = getText(
    formData,
    "token",
  );

  if (!validPassword(password)) {
    return error(
      validationContent.invalidPassword,
    );
  }

  if (password !== confirmation) {
    return error(
      validationContent.passwordsDoNotMatch,
    );
  }

  if (!token) {
    return error(
      validationContent.expiredResetLink,
    );
  }

  const tokenHash =
    createHash("sha256")
      .update(token)
      .digest("hex");

  let redeemed:
    | Awaited<ReturnType<typeof redeemPasswordReset>>
    | null = null;

  try {
    const passwordHash =
      await hashPassword(password);
    redeemed =
      await redeemPasswordReset({
        passwordHash,
        tokenHash,
      });

    if (!redeemed) {
      return error(
        validationContent.expiredResetLink,
      );
    }
  } catch {
    return error(
      validationContent.expiredResetLink,
    );
  }

  try {
    await sendPasswordChangedEmail({
      changedAt: redeemed.changedAt,
      email: redeemed.email,
      fullName: redeemed.fullName,
      otherSessionsClosed: true,
      source: "password_reset",
    });
  } catch (emailError) {
    console.error(
      "PASSWORD_CHANGED_DELIVERY_FAILED",
      emailError,
    );
  }

  await clearSessionCookie();
  redirect(
    "/giris?durum=sifre-guncellendi",
  );
}
