import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";

export default async function FeedbackLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/giris?sonraki=/geri-bildirimler");
  }

  if (profile.role !== "writer") {
    redirect("/erisim-reddedildi");
  }

  return <AppShell profile={profile}>{children}</AppShell>;
}
