import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/types/database";
import { hashSessionToken, SESSION_COOKIE } from "./session";

export const INTERNAL_SESSION_USER_HEADER =
  "x-ilkoku-session-user";

export type SessionRole = UserRole | "admin";

export interface SessionUserSnapshot {
  avatarUrl: string | null;
  displayName: string | null;
  email: string;
  fullName: string;
  id: string;
  role: SessionRole;
  status: string;
}

export interface SessionProfile {
  role: SessionRole;
  roleApprovedAt: string | null;
}

function encodeSessionUser(
  user: SessionUserSnapshot,
): string {
  return encodeURIComponent(JSON.stringify(user));
}

function createRequestHeaders(
  request: NextRequest,
  user: SessionUserSnapshot | null = null,
): Headers {
  const requestHeaders = new Headers(request.headers);

  /*
   * Kullanıcının dışarıdan sahte iç oturum başlığı
   * göndermesini engelle.
   */
  requestHeaders.delete(INTERNAL_SESSION_USER_HEADER);

  if (user) {
    requestHeaders.set(
      INTERNAL_SESSION_USER_HEADER,
      encodeSessionUser(user),
    );
  }

  return requestHeaders;
}

function createNextResponse(
  requestHeaders: Headers,
): NextResponse {
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  });
}

export async function getRequestSession(
  request: NextRequest,
  includeProfile = false,
) {
  const token =
    request.cookies.get(SESSION_COOKIE)?.value ?? null;

  const emptyRequestHeaders =
    createRequestHeaders(request);

  if (!token) {
    return {
      authenticated: false,
      configured: true,
      profile: null,
      requestHeaders: emptyRequestHeaders,
      response: createNextResponse(
        emptyRequestHeaders,
      ),
      user: null,
    };
  }

  try {
    const { prisma } = await import("@/lib/prisma");

    const session =
      await prisma.session.findUnique({
        where: {
          tokenHash: hashSessionToken(token),
        },
        select: {
          expiresAt: true,
          id: true,
          user: {
            select: {
              avatarUrl: true,
              deletedAt: true,
              displayName: true,
              email: true,
              fullName: true,
              id: true,
              role: true,
              status: true,
            },
          },
        },
      });

    /*
     * Oturum bulunamadıysa veya kullanıcı silinmişse
     * oturumu geçersiz kabul et.
     */
    if (
      !session?.user ||
      session.user.deletedAt !== null
    ) {
      const response = createNextResponse(
        emptyRequestHeaders,
      );

      response.cookies.delete(SESSION_COOKIE);

      return {
        authenticated: false,
        configured: true,
        profile: null,
        requestHeaders: emptyRequestHeaders,
        response,
        user: null,
      };
    }

    /*
     * Süresi dolmuş oturumu veritabanından kaldır.
     */
    if (session.expiresAt <= new Date()) {
      await prisma.session.deleteMany({
        where: {
          id: session.id,
        },
      });

      const response = createNextResponse(
        emptyRequestHeaders,
      );

      response.cookies.delete(SESSION_COOKIE);

      return {
        authenticated: false,
        configured: true,
        profile: null,
        requestHeaders: emptyRequestHeaders,
        response,
        user: null,
      };
    }

    /*
     * Buraya ulaşan kullanıcı aktiftir.
     * Bu nedenle deletedAt dışarı taşınmaz.
     */
    const user: SessionUserSnapshot = {
      avatarUrl: session.user.avatarUrl,
      displayName: session.user.displayName,
      email: session.user.email,
      fullName: session.user.fullName,
      id: session.user.id,
      role: session.user.role as SessionRole,
      status: session.user.status,
    };

    let profile: SessionProfile | null = null;

    if (includeProfile) {
      let roleApprovedAt: string | null = null;

      if (
        user.role === "editor" ||
        user.role === "publisher"
      ) {
        const approval =
          await prisma.roleRequest.findFirst({
            where: {
              requestedRole: user.role,
              status: "approved",
              userId: user.id,
            },
            orderBy: {
              reviewedAt: "desc",
            },
            select: {
              reviewedAt: true,
            },
          });

        roleApprovedAt =
          approval?.reviewedAt?.toISOString() ??
          null;
      }

      profile = {
        role: user.role,
        roleApprovedAt,
      };
    }

    const requestHeaders = createRequestHeaders(
      request,
      user,
    );

    return {
      authenticated: true,
      configured: true,
      profile,
      requestHeaders,
      response: createNextResponse(
        requestHeaders,
      ),
      user,
    };
  } catch {
    const response = createNextResponse(
      emptyRequestHeaders,
    );

    response.cookies.delete(SESSION_COOKIE);

    return {
      authenticated: false,
      configured: false,
      profile: null,
      requestHeaders: emptyRequestHeaders,
      response,
      user: null,
    };
  }
}