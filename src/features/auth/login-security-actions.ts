"use server";

import { headers } from "next/headers";
import {
  redirect,
  unstable_rethrow,
} from "next/navigation";
import {
  validationContent,
} from "@/content";
import {
  setSessionCookie,
} from "@/lib/auth/cookies";
import {
  createKnownDeviceToken,
  getKnownDeviceToken,
  hashKnownDeviceToken,
  setKnownDeviceCookie,
} from "@/lib/auth/known-device";
import { loginUser } from "@/lib/auth/login";
import {
  sendNewDeviceLoginEmail,
} from "@/lib/email/auth-emails";
import {
  getAuthenticatedDestination,
} from "./destination";
import type {
  UserRole,
} from "./types";

export type LoginSecurityActionState = {
  message: string;
  status:
    | "idle"
    | "error"
    | "success";
};

const loginRoles: UserRole[] = [
  "reader",
  "writer",
  "editor_pending",
  "editor",
  "publisher",
  "admin",
];

function error(
  message: string,
): LoginSecurityActionState {
  return {
    message,
    status: "error",
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

function getRequestIp(
  requestHeaders: Headers,
) {
  const forwarded =
    requestHeaders
      .get("x-forwarded-for")
      ?.split(",")[0]
      ?.trim();
  const candidate =
    requestHeaders.get(
      "cf-connecting-ip",
    ) ||
    forwarded ||
    requestHeaders.get("x-real-ip") ||
    "";

  if (
    !candidate ||
    candidate.length > 45 ||
    !/^[0-9a-fA-F:.]+$/.test(
      candidate,
    )
  ) {
    return null;
  }

  return candidate;
}

function describeUserAgent(
  userAgent: string,
) {
  const platform =
    /iPhone/i.test(userAgent)
      ? "iPhone"
      : /iPad/i.test(userAgent)
        ? "iPad"
        : /Android/i.test(userAgent)
          ? "Android"
          : /Macintosh|Mac OS X/i.test(
                userAgent,
              )
            ? "macOS"
            : /Windows/i.test(userAgent)
              ? "Windows"
              : /Linux/i.test(userAgent)
                ? "Linux"
                : "Bilinmeyen cihaz";

  const browser =
    /Edg\//i.test(userAgent)
      ? "Microsoft Edge"
      : /OPR\//i.test(userAgent)
        ? "Opera"
        : /CriOS\//i.test(userAgent)
          ? "Chrome"
          : /Chrome\//i.test(userAgent)
            ? "Chrome"
            : /FxiOS\//i.test(userAgent)
              ? "Firefox"
              : /Firefox\//i.test(userAgent)
                ? "Firefox"
                : /Safari\//i.test(userAgent)
                  ? "Safari"
                  : "Bilinmeyen tarayıcı";

  return `${browser} · ${platform}`;
}

export async function loginAction(
  _state: LoginSecurityActionState,
  formData: FormData,
): Promise<LoginSecurityActionState> {
  const email = getText(
    formData,
    "email",
  );
  const password = getText(
    formData,
    "password",
  );
  const nextPath = getText(
    formData,
    "next",
  );
  const safeNextPath =
    nextPath.startsWith("/") &&
    !nextPath.startsWith("//")
      ? nextPath
      : "";

  if (!email || !password) {
    return error(
      validationContent.requiredCredentials,
    );
  }

  try {
    const requestHeaders =
      await headers();
    const userAgent =
      requestHeaders
        .get("user-agent")
        ?.trim()
        .slice(0, 500) || "";
    const ipAddress =
      getRequestIp(requestHeaders);
    const existingDeviceToken =
      await getKnownDeviceToken();
    const deviceToken =
      existingDeviceToken ||
      createKnownDeviceToken();
    const deviceHash =
      hashKnownDeviceToken(
        deviceToken,
      );

    const result = await loginUser({
      deviceHash,
      email,
      ipAddress,
      password,
      userAgent,
    });
    const role =
      result.user.role as UserRole;

    if (!loginRoles.includes(role)) {
      return error(
        validationContent.genericFailure,
      );
    }

    await setSessionCookie(result.token);
    await setKnownDeviceCookie(
      deviceToken,
    );

    if (result.isNewDevice) {
      try {
        await sendNewDeviceLoginEmail({
          device:
            describeUserAgent(
              userAgent,
            ),
          email: result.user.email,
          fullName:
            result.user.fullName,
          ipAddress,
          loggedInAt:
            result.loggedInAt,
        });
      } catch (emailError) {
        console.error(
          "NEW_DEVICE_LOGIN_DELIVERY_FAILED",
          emailError,
        );
      }
    }

    redirect(
      safeNextPath ||
        await getAuthenticatedDestination({
          id: result.user.id,
          role,
        }),
    );
  } catch (loginError) {
    unstable_rethrow(loginError);

    if (
      loginError instanceof Error &&
      loginError.message ===
        "INVALID_CREDENTIALS"
    ) {
      return error(
        validationContent.invalidCredentials,
      );
    }

    return error(
      validationContent.genericFailure,
    );
  }
}
