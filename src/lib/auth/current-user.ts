import { clearSessionCookie, getSessionCookie } from "./cookies";
import { hashSessionToken } from "./session";

export async function getCurrentSessionContext() {
  const token = await getSessionCookie();

  if (!token) {
    return null;
  }

  try {
    const { prisma } = await import("@/lib/prisma");
    const session = await prisma.session.findUnique({
      where: {
        tokenHash: hashSessionToken(token),
      },
      include: {
        user: true,
      },
    });

    if (!session) {
      await clearSessionCookie();
      return null;
    }

    const accountUnavailable =
      session.user.status !== "active" ||
      session.user.isBanned ||
      session.user.deletedAt !== null;

    if (
      session.expiresAt <= new Date() ||
      accountUnavailable
    ) {
      await prisma.session.deleteMany({
        where: {
          id: session.id,
        },
      });
      await clearSessionCookie();

      return null;
    }

    return {
      sessionId: session.id,
      user: session.user,
    };
  } catch {
    try {
      await clearSessionCookie();
    } catch {
      // Server Component bağlamında çerez silme yanıt katmanına bırakılır.
    }

    return null;
  }
}

export async function getCurrentUser() {
  const context = await getCurrentSessionContext();
  return context?.user ?? null;
}
