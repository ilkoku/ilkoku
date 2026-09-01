import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/layout/AppShell";
import { getCurrentProfile } from "@/features/auth/profile";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { ReaderCommentList } from "@/features/reader/components/ReaderCommentList";
import { getWriterComments } from "@/features/reader/comments";
import { getWriterCommentAnalysis } from "@/features/writer-comments/reporting";

import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Yorumlarım | İlkOku",
  description:
    "Eserlerinize gelen okur yorumlarını görüntüleyin, analiz edin ve yanıtlayın.",
};

export const dynamic = "force-dynamic";

export default async function WriterCommentsPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect(
      "/giris?sonraki=/yorumlarim",
    );
  }

  if (profile.role !== "writer") {
    redirect(
      "/erisim-reddedildi?kaynak=writer-comments",
    );
  }

  const [comments, analysis] = await Promise.all([
    getWriterComments(profile.id),
    getWriterCommentAnalysis(profile.id),
  ]);

  if (!analysis) {
    redirect(
      "/erisim-reddedildi?kaynak=writer-comments",
    );
  }

  return (
    <AppShell profile={profile}>
      <div className={`${styles.workspace} writer-comments-workspace`}>
        <EditorPageHeader
          description="Yayımlanmış eserlerinize gelen okur yorumlarını takip edin. Yanıt yetkisi yalnızca eserin yazarına aittir."
          eyebrow="Yazar alanı"
          title="Yorumlarım"
        />

        <section
          aria-label="Yorum özeti"
          className={styles.summary}
        >
          <article className={styles.stat}>
            <span>Toplam okur yorumu</span>
            <strong>
              {analysis.total.toLocaleString("tr-TR")}
            </strong>
          </article>

          <article className={styles.stat}>
            <span>Yanıtlanan</span>
            <strong>
              {analysis.answered.toLocaleString("tr-TR")}
            </strong>
          </article>

          <article className={styles.stat}>
            <span>Yanıt bekleyen</span>
            <strong>
              {analysis.unanswered.toLocaleString("tr-TR")}
            </strong>
          </article>

          <article className={styles.stat}>
            <span>Yanıt oranı</span>
            <strong>
              %{analysis.responseRate.toLocaleString("tr-TR")}
            </strong>
          </article>

          <article className={styles.stat}>
            <span>Son 30 gün</span>
            <strong>
              {analysis.last30Days.toLocaleString("tr-TR")}
            </strong>
          </article>
        </section>

        <section className={styles.analytics}>
          <div className={styles.analyticsHeader}>
            <div>
              <h2>Toplu Yorum Analizi</h2>
              <p>
                Analiz yalnızca size ait, herkese açık ve yayımlanmış eserlerdeki görünür ana okur yorumlarını kapsar.
              </p>
            </div>
            <div className={styles.actions}>
              <Link
                className="button button--outline"
                download
                href="/yorumlarim/disa-aktar/csv"
                prefetch={false}
              >
                Tam CSV İndir
              </Link>
              <Link
                className="button button--primary"
                href="/yorumlarim/rapor"
              >
                PDF Raporu
              </Link>
            </div>
          </div>

          {analysis.works.length > 0 ? (
            <div className={styles.workBreakdown}>
              {analysis.works.slice(0, 5).map((work) => (
                <article className={styles.workRow} key={work.id}>
                  <div>
                    <strong>{work.title}</strong>
                    <span>
                      {work.total.toLocaleString("tr-TR")} yorum · {work.unanswered.toLocaleString("tr-TR")} yanıt bekliyor
                    </span>
                  </div>
                  <b>%{work.responseRate.toLocaleString("tr-TR")}</b>
                </article>
              ))}
            </div>
          ) : (
            <p className={styles.emptyAnalysis}>
              Analiz edilecek görünür okur yorumu henüz bulunmuyor.
            </p>
          )}
        </section>

        <ReaderCommentList
          authorMode
          emptyText="Yayımlanmış eserlerinize henüz okur yorumu gelmedi."
          feed={comments}
          returnPath="/yorumlarim"
        />
      </div>
    </AppShell>
  );
}
