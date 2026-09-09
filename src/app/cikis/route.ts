import { NextResponse } from "next/server";
import { clearAdminRoleViewCookie } from "@/features/admin-role-view/cookie";
import { clearSessionCookie, getSessionCookie } from "@/lib/auth/cookies";
import { hashSessionToken } from "@/lib/auth/session";
import { prisma } from "@/lib/prisma";

function getLogoutRedirectUrl(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return new URL("https://ilkoku.com/");
  }

  return new URL("/", request.url);
}

export async function POST(request: Request) {
  const token = await getSessionCookie();
  let userId: string | null = null;

  if (token) {
    const tokenHash = hashSessionToken(token);

    try {
      const session = await prisma.session.findUnique({
        where: {
          tokenHash,
        },
        select: {
          userId: true,
        },
      });

      userId = session?.userId ?? null;

      await prisma.session.deleteMany({
        where: {
          tokenHash,
        },
      });
    } catch (sessionError) {
      console.error("LOGOUT_SESSION_REVOKE_FAILED", sessionError);
    }

    if (userId) {
      try {
        await prisma.auditLog.create({
          data: {
            action: "logout",
            actorId: userId,
            entityId: userId,
            entityType: "User",
          },
        });
      } catch (auditError) {
        console.error("LOGOUT_AUDIT_FAILED", auditError);
      }
    }
  }

  try {
    await clearSessionCookie();
  } catch (cookieError) {
    console.error("LOGOUT_SESSION_COOKIE_CLEAR_FAILED", cookieError);
  }

  try {
    await clearAdminRoleViewCookie();
  } catch (cookieError) {
    console.error("LOGOUT_ADMIN_COOKIE_CLEAR_FAILED", cookieError);
  }

  return NextResponse.redirect(getLogoutRedirectUrl(request), 303);
}
