import type { Metadata } from "next";
import { ContentShell } from "@/components/content/ContentShell";
import { requireCmsManager } from "@/lib/cms-access";
import "./content.css";

export const metadata: Metadata = {
  title: "İlkOku İçerik Yönetimi",
  description: "İlkOku site içerik yönetim merkezi",
};

export const dynamic = "force-dynamic";

export default async function ContentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const access = await requireCmsManager("/icerik");
  const user = access.user!;

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
