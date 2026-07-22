import { NextResponse, type NextRequest } from "next/server";
import type { UserRole } from "@/types/database";
import { hashSessionToken, SESSION_COOKIE } from "./session";

export type SessionRole = UserRole | "admin";

export interface SessionProfile {
  role: SessionRole;
  roleApprovedAt: string | null;
}

export async function getRequestSession(request: NextRequest, includeProfile = false) {
  const response = NextResponse.next({ request });
  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (!token) {
    return { authenticated: false, configured: true, profile: null, response };
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const session = await prisma.session.findUnique({
      where: { tokenHash: hashSessionToken(token) },
      include: { user: true },
    });

    if (!session || !session.user) {
      response.cookies.delete(SESSION_COOKIE);
      return { authenticated: false, configured: true, profile: null, response };
    }

    if (session.expiresAt <= new Date()) {
      await prisma.session.deleteMany({ where: { id: session.id } });
      response.cookies.delete(SESSION_COOKIE);
      return { authenticated: false, configured: true, profile: null, response };
    }

    let profile: SessionProfile | null = null;

    if (includeProfile) {
      let roleApprovedAt: string | null = null;

      if (session.user.role === "editor" || session.user.role === "publisher") {
        const approval = await prisma.roleRequest.findFirst({
          where: {
            requestedRole: session.user.role,
            status: "approved",
            userId: session.user.id,
          },
          orderBy: { reviewedAt: "desc" },
          select: { reviewedAt: true },
        });
        roleApprovedAt = approval?.reviewedAt?.toISOString() ?? null;
      }

      profile = {
        role: session.user.role as SessionRole,
        roleApprovedAt,
      };
    }

    return { authenticated: true, configured: true, profile, response };
  } catch {
    response.cookies.delete(SESSION_COOKIE);
    return { authenticated: false, configured: false, profile: null, response };
  }
}
