import { cache } from "react";
import { headers } from "next/headers";
import {
  INTERNAL_SESSION_USER_HEADER,
  type SessionUserSnapshot,
} from "./request-session";
import { clearSessionCookie, getSessionCookie } from "./cookies";
import { hashSessionToken } from "./session";

function decodeSessionUser(value: string): SessionUserSnapshot | null {
  try {
    const parsed = JSON.parse(
      decodeURIComponent(value),
    ) as Partial<SessionUserSnapshot>;

    if (
      typeof parsed.id !== "string" ||
      typeof parsed.email !== "string" ||
      typeof parsed.fullName !== "string" ||
      typeof parsed.role !== "string" ||
      typeof parsed.status !== "string"
    ) {
      return null;
    }

    return {
      avatarUrl:
        typeof parsed.avatarUrl === "string"
          ? parsed.avatarUrl
          : null,
      displayName:
        typeof parsed.displayName === "string"
          ? parsed.displayName
          : null,
      email: parsed.email,
      fullName: parsed.fullName,
      id: parsed.id,
      role: parsed.role as SessionUserSnapshot["role"],
      status: parsed.status,
    };
  } catch {
    return null;
  }
}

export const getCurrentUser = cache(async () => {
  /*
   * Proxy oturumu doğruladıysa kullanıcı bilgisi iç başlıktan okunur.
   * Böylece layout aynı session sorgusunu tekrar çalıştırmaz.
   */
  const requestHeaders = await headers();
  const encodedUser = requestHeaders.get(
    INTERNAL_SESSION_USER_HEADER,
  );

  if (encodedUser) {
    const proxyUser = decodeSessionUser(encodedUser);

    if (proxyUser) {
      return proxyUser;
    }
  }

  /*
   * Proxy üzerinden geçmeyen Server Action ve diğer sunucu
   * bağlamları için veritabanı fallback'i.
   */
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

    if (!session?.user) {
      await clearSessionCookie();
      return null;
    }

    if (session.user.deletedAt !== null) {
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

    /*
     * deletedAt burada özellikle döndürülmüyor.
     * Bu fonksiyon yalnızca aktif kullanıcı döndürür.
     */
    return {
      avatarUrl: session.user.avatarUrl,
      displayName: session.user.displayName,
      email: session.user.email,
      fullName: session.user.fullName,
      id: session.user.id,
      role: session.user.role,
      status: session.user.status,
    };
  } catch {
    try {
      await clearSessionCookie();
    } catch {
      // Server Component bağlamında cookie yazımı mümkün olmayabilir.
    }

    return null;
  }
});