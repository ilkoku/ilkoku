import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { PublisherPermissionCenter } from "@/features/publisher-permission-requests/components/PublisherPermissionCenter";
import { getPublisherPermissionCenter } from "@/features/publisher-permission-requests/repository";

export const metadata: Metadata = {
  title: "Yayınevi Yetkilerim | İlkOku",
};

export const dynamic = "force-dynamic";

export default async function PublisherPermissionsPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect("/giris?sonraki=/yayinevi/yetkilerim");
  }

  const data = await getPublisherPermissionCenter(profile.id);

  if (!data) {
    const actualProfile = await getCurrentProfile({
      ignoreAdminRoleView: true,
    });

    if (actualProfile?.role === "admin") {
      redirect("/admin/yayinevleri");
    }

    redirect("/erisim-reddedildi?gerekli=publisher_membership");
  }

  return (
    <AppShell profile={profile}>
      <PublisherPermissionCenter data={data} />
    </AppShell>
  );
}
