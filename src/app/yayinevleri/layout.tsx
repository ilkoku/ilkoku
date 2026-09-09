import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";

export default async function PublishersLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/giris?sonraki=/yayinevleri");
  }

  if (profile.role !== "writer") {
    redirect("/erisim-reddedildi?kaynak=writer-publishers");
  }

  return <AppShell profile={profile}>{children}</AppShell>;
}
