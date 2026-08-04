import {
  createHmac,
  timingSafeEqual,
} from "node:crypto";
import { cookies } from "next/headers";
import type { UserRole } from "@/features/auth/types";
import { getCurrentSessionContext } from "@/lib/auth/current-user";
import {
  isAdminPublisherViewRole,
  isAdminRoleViewRole,
  type AdminPublisherViewRole,
  type AdminRoleViewRole,
} from "./config";

export const ADMIN_ROLE_VIEW_COOKIE =
  "ilkoku_admin_role_view";

const ADMIN_ROLE_VIEW_TTL_SECONDS = 60 * 60 * 4;
const uuidPattern =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu;

export type AdminRoleViewPayload = {
  expiresAt: number;
  publisherId: string | null;
  publisherRole: AdminPublisherViewRole | null;
  role: AdminRoleViewRole;
  sessionId: string;
  version: 2;
};

type RoleViewContext = {
  sessionId: string;
  userRole: UserRole;
};

function getSecret() {
  const secret = process.env.ADMIN_ROLE_VIEW_SECRET?.trim();
  return secret && secret.length >= 64 ? secret : null;
}

function sign(body: string, secret: string) {
  return createHmac("sha256", secret)
    .update(body)
    .digest("base64url");
}

function signaturesMatch(left: string, right: string) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);

  return leftBuffer.length === rightBuffer.length &&
    timingSafeEqual(leftBuffer, rightBuffer);
}

function validBasePayload(
  payload: {
    expiresAt?: unknown;
    role?: unknown;
    sessionId?: unknown;
  },
  context: RoleViewContext,
) {
  return (
    isAdminRoleViewRole(payload.role) &&
    payload.sessionId === context.sessionId &&
    typeof payload.expiresAt === "number" &&
    payload.expiresAt > Date.now() &&
    context.userRole === "admin"
  );
}

function decodePayload(
  value: string,
  context: RoleViewContext,
): AdminRoleViewPayload | null {
  const secret = getSecret();
  if (!secret) return null;

  const [body, signature, extra] = value.split(".");
  if (!body || !signature || extra) return null;

  const expected = sign(body, secret);
  if (!signaturesMatch(signature, expected)) return null;

  try {
    const raw = JSON.parse(
      Buffer.from(body, "base64url").toString("utf8"),
    ) as {
      expiresAt?: unknown;
      publisherId?: unknown;
      publisherRole?: unknown;
      role?: unknown;
      sessionId?: unknown;
      version?: unknown;
    };

    if (!validBasePayload(raw, context)) {
      return null;
    }

    if (raw.version === 1) {
      return {
        expiresAt: raw.expiresAt as number,
        publisherId: null,
        publisherRole: null,
        role: raw.role as AdminRoleViewRole,
        sessionId: raw.sessionId as string,
        version: 2,
      };
    }

    if (raw.version !== 2) return null;

    const hasPublisherId =
      typeof raw.publisherId === "string" &&
      uuidPattern.test(raw.publisherId);
    const hasPublisherRole =
      isAdminPublisherViewRole(raw.publisherRole);

    if (
      raw.role === "publisher" &&
      hasPublisherId &&
      hasPublisherRole
    ) {
      return raw as AdminRoleViewPayload;
    }

    if (
      raw.role !== "publisher" &&
      raw.publisherId === null &&
      raw.publisherRole === null
    ) {
      return raw as AdminRoleViewPayload;
    }

    return null;
  } catch {
    return null;
  }
}

function encodePayload(
  payload: AdminRoleViewPayload,
  secret: string,
) {
  const body = Buffer.from(
    JSON.stringify(payload),
  ).toString("base64url");

  return `${body}.${sign(body, secret)}`;
}

async function writeCookie(
  input: {
    publisherId: string | null;
    publisherRole: AdminPublisherViewRole | null;
    role: AdminRoleViewRole;
    sessionId: string;
  },
) {
  const secret = getSecret();

  if (!secret) {
    throw new Error("ADMIN_ROLE_VIEW_NOT_CONFIGURED");
  }

  const payload: AdminRoleViewPayload = {
    expiresAt:
      Date.now() + ADMIN_ROLE_VIEW_TTL_SECONDS * 1000,
    publisherId: input.publisherId,
    publisherRole: input.publisherRole,
    role: input.role,
    sessionId: input.sessionId,
    version: 2,
  };

  const cookieStore = await cookies();

  cookieStore.set(
    ADMIN_ROLE_VIEW_COOKIE,
    encodePayload(payload, secret),
    {
      httpOnly: true,
      maxAge: ADMIN_ROLE_VIEW_TTL_SECONDS,
      path: "/",
      sameSite: "strict",
      secure: process.env.NODE_ENV === "production",
    },
  );
}

export async function readAdminRoleView(
  context: RoleViewContext,
) {
  const cookieStore = await cookies();
  const value = cookieStore.get(
    ADMIN_ROLE_VIEW_COOKIE,
  )?.value;

  return value ? decodePayload(value, context) : null;
}

export async function getCurrentAdminRoleView() {
  const context = await getCurrentSessionContext();

  if (!context || context.user.role !== "admin") {
    return null;
  }

  return readAdminRoleView({
    sessionId: context.sessionId,
    userRole: "admin",
  });
}

export async function setAdminRoleViewCookie(
  role: AdminRoleViewRole,
  sessionId: string,
) {
  await writeCookie({
    publisherId: null,
    publisherRole: null,
    role,
    sessionId,
  });
}

export async function setAdminPublisherRoleViewCookie(
  input: {
    publisherId: string;
    publisherRole: AdminPublisherViewRole;
    sessionId: string;
  },
) {
  await writeCookie({
    publisherId: input.publisherId,
    publisherRole: input.publisherRole,
    role: "publisher",
    sessionId: input.sessionId,
  });
}

export async function clearAdminRoleViewCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_ROLE_VIEW_COOKIE);
}
