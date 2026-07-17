import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { NewWorkFlow } from "@/features/writer/components/NewWorkFlow";
import { CreateChapterForm } from "@/features/works/components/CreateChapterForm";
import { getContinueWritingWork } from "@/features/works/queries";

export const metadata: Metadata = {
  title: "Yazmaya Devam Et | İlkOku",
  description: "Son eserinde kaldığın yerden yazmaya devam et.",
};
export const dynamic = "force-dynamic";

export default async function ContinueWritingPage({ searchParams }: { searchParams: Promise<{ bolum?: string; eser?: string }> }) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/giris?sonraki=/yazmaya-devam");
  if (profile.role !== "writer") redirect("/erisim-reddedildi");
  const parameters = await searchParams;
  const latestWork = await getContinueWritingWork(profile.id, parameters.eser, parameters.bolum);

  return (
    <AppShell profile={profile}>
      <section className="continue-writing">
        <p>Yazma Alanı</p>
        <h1>{latestWork ? `${latestWork.title} eserine dönülüyor…` : "İlk eserini oluşturmaya başla."}</h1>
        {latestWork && !latestWork.latestChapter
          ? <CreateChapterForm workId={latestWork.id} />
          : <NewWorkFlow autoOpen initialWork={latestWork} triggerLabel={latestWork ? "Editörü Aç" : "Yeni Eser"} />}
      </section>
    </AppShell>
  );
}
