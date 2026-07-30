import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { PublisherDashboard } from "@/features/publisher-workspace/components/PublisherDashboard";
import { getPublisherWorkspace, normalizePublisherFilters } from "@/features/publisher-workspace/queries";

export const metadata: Metadata = {
  title: "Yayınevi Paneli | İlkOku",
  description: "Yayınevi eser başvurularını ve değerlendirme sürecini yönetin.",
};
export const dynamic = "force-dynamic";

export default async function PublisherPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/giris?sonraki=/yayinevi");

  const filters = normalizePublisherFilters(await searchParams);
  const workspace = await getPublisherWorkspace(profile.id, filters);

  if (!workspace) {
    return (
      <AppShell profile={profile}>
        <section className="publisher-workspace__empty">
          <h1>Yayınevi bağlantısı bulunamadı</h1>
          <p>Hesabınız onaylandı ancak henüz bir yayınevi kaydıyla eşleştirilmemiş.</p>
        </section>
      </AppShell>
    );
  }

  return <AppShell profile={profile}><PublisherDashboard data={workspace} /></AppShell>;
}
