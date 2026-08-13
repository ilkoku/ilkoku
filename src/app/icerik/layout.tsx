import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ContentShell } from "@/components/content/ContentShell";
import { getCurrentUser } from "@/lib/auth/current-user";
import { prisma } from "@/lib/prisma";
import "./content.css";

export const metadata: Metadata = {
  title: "İlkOku İçerik Yönetimi",
  description: "İlkOku site içerik yönetim merkezi",
};

export const dynamic = "force-dynamic";

type AccessRow = { canPublish: boolean };

export default async function ContentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/giris?sonraki=/icerik");
  }

  let canAccess = user.role === "admin";

  if (!canAccess) {
    try {
      const rows = await prisma.$queryRaw<AccessRow[]>`
        SELECT canPublish
        FROM ContentManagerAccess
        WHERE userId = ${user.id}
          AND active = true
          AND revokedAt IS NULL
        LIMIT 1
      `;
      canAccess = rows.length > 0;
    } catch {
      canAccess = false;
    }
  }

  if (!canAccess) {
    redirect("/erisim-reddedildi?kaynak=icerik");
  }

  return (
    <ContentShell
      user={{
        email: user.email,
        fullName: user.displayName || user.fullName,
      }}
    >
      {children}
    </ContentShell>
  );
}
