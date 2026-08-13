import "server-only";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";

export type CmsAccess = {
  canManage: boolean;
  canPublish: boolean;
};

type AccessRow = { canPublish: boolean };

export async function getCmsAccess(userId: string, role: string): Promise<CmsAccess> {
  if (role === "admin") return { canManage: true, canPublish: true };

  try {
    const rows = await prisma.$queryRaw<AccessRow[]>`
      SELECT canPublish
      FROM ContentManagerAccess
      WHERE userId = ${userId}
        AND active = true
        AND revokedAt IS NULL
      LIMIT 1
    `;
    const row = rows[0];
    return row
      ? { canManage: true, canPublish: Boolean(row.canPublish) }
      : { canManage: false, canPublish: false };
  } catch {
    return { canManage: false, canPublish: false };
  }
}

export async function requireCmsEdit() {
  const user = await getCurrentUser();
  if (!user) redirect("/giris?sonraki=/icerik");
  const access = await getCmsAccess(user.id, user.role);
  if (!access.canManage) redirect("/erisim-reddedildi?kaynak=icerik");
  return { user, access };
}

export async function requireCmsPublish() {
  const current = await requireCmsEdit();
  if (!current.access.canPublish) redirect("/erisim-reddedildi?kaynak=icerik-yayinlama");
  return current;
}
