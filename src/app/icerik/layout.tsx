import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ContentShell } from "@/components/content/ContentShell";
import { getCurrentUser } from "@/lib/auth/current-user";
import "./content.css";

export const metadata: Metadata = {
  title: "İlkOku İçerik Yönetimi",
  description: "İlkOku site içerik yönetim merkezi",
};

export const dynamic = "force-dynamic";

export default async function ContentLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/giris?sonraki=/icerik");
  }

  if (user.role !== "admin") {
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
