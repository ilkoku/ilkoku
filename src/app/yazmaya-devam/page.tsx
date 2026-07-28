import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { NewWorkFlow } from "@/features/writer/components/NewWorkFlow";
import { ChapterManagementPanel } from "@/features/works/components/ChapterManagementPanel";
import { CreateChapterForm } from "@/features/works/components/CreateChapterForm";
import "@/features/works/components/chapter-management.css";
import { getAuthorWorks, getContinueWritingWork } from "@/features/works/queries";

export const metadata: Metadata = {
  title: "Yazmaya Devam Et | İlkOku",
  description: "Aktif eserlerinden birini seçerek yazmaya devam et.",
};
export const dynamic = "force-dynamic";

type ContinueWritingPageProps = {
  searchParams: Promise<{ bolum?: string; eser?: string }>;
};

function formatDate(value: Date | string) {
  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function statusLabel(status: string) {
  if (status === "published") return "Yayımlandı";
  if (status === "in_review") return "İncelemede";
  return "Taslak";
}

export default async function ContinueWritingPage({ searchParams }: ContinueWritingPageProps) {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/giris?sonraki=/yazmaya-devam");
  if (profile.role !== "writer") redirect("/erisim-reddedildi");

  const parameters = await searchParams;

  if (parameters.eser) {
    const selectedWork = await getContinueWritingWork(
      profile.id,
      parameters.eser,
      parameters.bolum,
    );

    if (!selectedWork || selectedWork.id !== parameters.eser) {
      redirect("/yazmaya-devam");
    }

    return (
      <AppShell profile={profile}>
        <section className="continue-writing">
          <Link className="button button--ghost" href="/yazmaya-devam">
            ← Eser Listesine Dön
          </Link>
          <p>Yazma Alanı</p>
          <h1>{selectedWork.title} eserine dönülüyor…</h1>

          {!selectedWork.latestChapter ? (
            <CreateChapterForm workId={selectedWork.id} />
          ) : (
            <NewWorkFlow
              autoOpen
              initialWork={selectedWork}
              triggerLabel="Editörü Aç"
            />
          )}

          {selectedWork.chapters.length > 0 ? (
            <ChapterManagementPanel
              authorId={profile.id}
              chapters={selectedWork.chapters}
              workId={selectedWork.id}
            />
          ) : null}
        </section>
      </AppShell>
    );
  }

  const works = (await getAuthorWorks(profile.id)).filter(
    (work) => work.status !== "archived" && work.archivedAt === null,
  );

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description="Aktif eserlerini, son düzenlenen bölümü ve çalışma durumunu görüntüle."
          eyebrow="Yazma alanı"
          title="Yazmaya Devam Et"
        />

        {works.length === 0 ? (
          <div className="editor-empty">
            <h2>Devam edilecek eser bulunmuyor</h2>
            <p>Yeni bir eser oluşturarak yazmaya başlayabilirsin.</p>
            <Link className="button button--primary" href="/yazar">
              Yazar Ana Sayfasına Git
            </Link>
          </div>
        ) : (
          <div className="editor-table-shell">
            <div className="editor-table-scroll">
              <table className="editor-works-table">
                <thead>
                  <tr>
                    <th>Eser</th>
                    <th>Son Düzenleme</th>
                    <th>Bölüm</th>
                    <th>Durum</th>
                    <th>Son Çalışılan Bölüm</th>
                    <th>İşlem</th>
                  </tr>
                </thead>
                <tbody>
                  {works.map((work) => (
                    <tr key={work.id}>
                      <td data-label="Eser"><strong>{work.title}</strong></td>
                      <td data-label="Son Düzenleme">{formatDate(work.updatedAt)}</td>
                      <td data-label="Bölüm">{work.chapterCount.toLocaleString("tr-TR")}</td>
                      <td data-label="Durum">
                        <span className="editor-table-status editor-table-status--available">
                          {statusLabel(work.status)}
                        </span>
                      </td>
                      <td data-label="Son Çalışılan Bölüm">
                        {work.latestChapter?.title ?? "Henüz bölüm yok"}
                      </td>
                      <td data-label="İşlem">
                        <Link
                          className="editor-table-action editor-table-action--primary"
                          href={`/yazmaya-devam?eser=${encodeURIComponent(work.id)}${
                            work.latestChapter
                              ? `&bolum=${encodeURIComponent(work.latestChapter.id)}`
                              : ""
                          }`}
                        >
                          Devam Et
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
