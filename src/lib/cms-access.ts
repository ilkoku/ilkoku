import "server-only";

import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

type AccessRow = { canPublish: boolean };
type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export type CmsAccess = {
  user: CurrentUser | null;
  canManage: boolean;
  canPublish: boolean;
  isAdmin: boolean;
};

export async function getCmsAccess(): Promise<CmsAccess> {
  const user = await getCurrentUser();
  if (!user) return { user: null, canManage: false, canPublish: false, isAdmin: false };

  if (user.role === "admin") {
    return { user, canManage: true, canPublish: true, isAdmin: true };
  }

  try {
    const rows = await prisma.$queryRaw<AccessRow[]>`
      SELECT canPublish
      FROM ContentManagerAccess
      WHERE userId = ${user.id}
        AND active = true
        AND revokedAt IS NULL
      LIMIT 1
    `;
    const row = rows[0];
    if (!row) return { user, canManage: false, canPublish: false, isAdmin: false };
    return { user, canManage: true, canPublish: Boolean(row.canPublish), isAdmin: false };
  } catch {
    return { user, canManage: false, canPublish: false, isAdmin: false };
  }
}

export async function requireCmsManager(next = "/icerik") {
  const access = await getCmsAccess();
  if (!access.user) redirect(`/giris?sonraki=${encodeURIComponent(next)}`);
  if (!access.canManage) redirect("/erisim-reddedildi?kaynak=icerik");
  return access;
}

export async function requireCmsPublisher(next = "/icerik") {
  const access = await requireCmsManager(next);
  if (!access.canPublish) redirect("/erisim-reddedildi?kaynak=icerik-yayin");
  return access;
}
