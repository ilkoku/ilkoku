import { prisma } from "@/lib/prisma";
import { clearSessionCookie, getSessionCookie } from "./cookies";
import { hashSessionToken } from "./session";

export async function getCurrentUser() {
  const token = await getSessionCookie();

  if (!token) {
    return null;
  }

  try {
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

    if (session.expiresAt <= new Date()) {
      await prisma.session.deleteMany({
        where: {
          id: session.id,
        },
      });
      await clearSessionCookie();

      return null;
    }

    return session.user;
  } catch {
    try {
      await clearSessionCookie();
    } catch {
      // Server Component bağlamında çerez silme yanıt katmanına bırakılır.
    }

    return null;
  }
}
