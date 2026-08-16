import Link from "next/link";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

import { getCurrentProfile } from "@/features/auth/profile";
import { getWriterCommentAnalysis } from "@/features/writer-comments/reporting";

import { PrintReportButton } from "./PrintReportButton";
import styles from "./page.module.css";

export const metadata: Metadata = {
  title: "Yorum Analizi Raporu | İlkOku",
  description:
    "Yazarın yayımlanmış eserlerine gelen görünür okur yorumlarının toplu analiz raporu.",
};

export const dynamic = "force-dynamic";

function dateTimeLabel(value: Date | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

export default async function WriterCommentReportPage() {
  const profile = await getCurrentProfile();

  if (!profile) {
    redirect(
      "/giris?sonraki=/yorumlarim/rapor",
    );
  }

  if (profile.role !== "writer") {
    redirect(
      "/erisim-reddedildi?kaynak=writer-comment-report",
    );
  }

  const analysis = await getWriterCommentAnalysis(profile.id);

  if (!analysis) {
    redirect(
      "/erisim-reddedildi?kaynak=writer-comment-report",
    );
  }

  const generatedAt = new Date();

  return (
    <main className={styles.report}>
      <div className={styles.actions}>
        <Link className="button button--outline" href="/yorumlarim">
          Yorumlara Dön
        </Link>
        <Link
          className="button button--outline"
          href="/yorumlarim/disa-aktar/csv"
        >
          Tam Veriyi CSV İndir
        </Link>
        <PrintReportButton />
      </div>

      <header className={styles.header}>
        <p>İlkOku · Yazar Alanı</p>
        <h1>Toplu Yorum Analizi</h1>
        <p>
          Yalnızca size ait, herkese açık ve yayımlanmış eserlerdeki görünür ana okur yorumları bu rapora dahildir.
        </p>
        <p className={styles.meta}>
          Rapor oluşturma: {dateTimeLabel(generatedAt)} · Son yorum: {dateTimeLabel(analysis.latestCommentAt)}
        </p>
      </header>

      <section aria-label="Yorum analiz özeti" className={styles.summary}>
        <article className={styles.card}>
          <span>Toplam yorum</span>
          <strong>{analysis.total.toLocaleString("tr-TR")}</strong>
        </article>
        <article className={styles.card}>
          <span>Yanıtlanan</span>
          <strong>{analysis.answered.toLocaleString("tr-TR")}</strong>
        </article>
        <article className={styles.card}>
          <span>Yanıt bekleyen</span>
          <strong>{analysis.unanswered.toLocaleString("tr-TR")}</strong>
        </article>
        <article className={styles.card}>
          <span>Yanıt oranı</span>
          <strong>%{analysis.responseRate.toLocaleString("tr-TR")}</strong>
        </article>
        <article className={styles.card}>
          <span>Son 30 gün</span>
          <strong>{analysis.last30Days.toLocaleString("tr-TR")}</strong>
        </article>
      </section>

      <section>
        <h2>Eser Bazında Yorum Dağılımı</h2>
        {analysis.works.length === 0 ? (
          <p>Raporlanacak görünür okur yorumu bulunmuyor.</p>
        ) : (
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Eser</th>
                  <th>Toplam</th>
                  <th>Yanıt bekleyen</th>
                  <th>Yanıt oranı</th>
                </tr>
              </thead>
              <tbody>
                {analysis.works.map((work) => (
                  <tr key={work.id}>
                    <td>{work.title}</td>
                    <td>{work.total.toLocaleString("tr-TR")}</td>
                    <td>{work.unanswered.toLocaleString("tr-TR")}</td>
                    <td>%{work.responseRate.toLocaleString("tr-TR")}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </main>
  );
}
