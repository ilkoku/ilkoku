import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { WriterThemeEditor } from "@/features/writer-theme/WriterThemeEditor";

export const metadata: Metadata = {
  title: "Sayfa Renkleri | İlkOku",
  description: "Yazar çalışma alanının renklerini kişiselleştir.",
};

export const dynamic = "force-dynamic";

export default async function WriterPageColorsPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/giris?sonraki=/sayfa-renkleri");
  }

  if (profile.role !== "writer") {
    redirect("/erisim-reddedildi");
  }

  return (
    <AppShell profile={profile}>
      <WriterThemeEditor userId={profile.id} />
    </AppShell>
  );
}
