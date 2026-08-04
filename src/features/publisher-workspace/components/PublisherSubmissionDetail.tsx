import "../publisher-workspace.css";
import Link from "next/link";
import { Card } from "@/components/ui/Card";
import type { PublisherSubmissionDetail } from "../types";
import { PublisherDecisionForm } from "./PublisherDecisionForm";
import { PublisherInternalNoteForm } from "./PublisherInternalNoteForm";
import { PublisherTimeline } from "./PublisherTimeline";
import { PublisherContractCenter } from "./PublisherContractCenter";

const statusLabel = {
  accepted: "Kabul edildi",
  pending: "Yeni başvuru",
  rejected: "Reddedildi",
  reviewing: "İnceleniyor",
  withdrawn: "Geri çekildi",
} as const;

const formatDate = (value: string) =>
  new Intl.DateTimeFormat("tr-TR", { dateStyle: "long", timeStyle: "short" }).format(new Date(value));

export function PublisherSubmissionDetailView({ data }: { data: PublisherSubmissionDetail }) {
  return (
    <div className="publisher-workspace publisher-submission-detail">
      <header className="publisher-workspace__hero">
        <div>
          <p>{data.publisher.companyName}</p>
          <h1>{data.work.title}</h1>
          <span>{data.author.displayName} tarafından gönderildi.</span>
        </div>
        <span className="publisher-status" data-status={data.status}>{statusLabel[data.status]}</span>
      </header>

      <nav className="publisher-submission-detail__nav" aria-label="Başvuru navigasyonu">
        <Link href="/yayinevi">← Başvuru havuzuna dön</Link>
        <Link href={`/kitap/${data.work.slug}`}>Eser sayfasını aç</Link>
        <Link href={`/yayinevi/basvurular/${data.id}/pasaport`}>
          Eser Pasaportu
        </Link>
      </nav>

      <section className="publisher-submission-detail__grid">
        <div className="publisher-submission-detail__main">
          <Card>
            <p className="publisher-eyebrow">Eser özeti</p>
            <h2>{data.work.title}</h2>
            <p>{data.work.description || "Yazar bu eser için henüz açıklama eklememiş."}</p>
            <dl className="publisher-detail-list">
              <div><dt>Tür</dt><dd>{data.work.genre || "Belirtilmedi"}</dd></div>
              <div><dt>Bölüm</dt><dd>{data.work.chapterCount}</dd></div>
              <div><dt>Editör süreci</dt><dd>{data.work.editorReviewStatus}</dd></div>
            </dl>
          </Card>

          <Card>
            <p className="publisher-eyebrow">Başvuru mektubu</p>
            <h2>Yazarın mesajı</h2>
            <p className="publisher-cover-letter">{data.coverLetter}</p>
          </Card>

          <section className="publisher-reports" aria-labelledby="publisher-reports-title">
            <header><p className="publisher-eyebrow">Editör değerlendirmeleri</p><h2 id="publisher-reports-title">Profesyonel raporlar</h2></header>
            {data.work.feedback.length ? data.work.feedback.map((report) => (
              <Card key={report.id}>
                <div className="publisher-report__meta">
                  <strong>{report.stage === "second" ? "2. Editör" : "1. Editör"}</strong>
                  <span>{report.editorName}</span>
                  <span>{report.category}</span>
                </div>
                <h3>{report.title}</h3>
                <p>{report.content}</p>
              </Card>
            )) : <Card><p>Bu eser için tamamlanmış profesyonel editör raporu bulunmuyor.</p></Card>}
          </section>

          <section className="publisher-reports" aria-labelledby="publisher-files-title">
            <header><p className="publisher-eyebrow">Başvuru belgeleri</p><h2 id="publisher-files-title">Dosyalar</h2></header>
            {data.files.length ? data.files.map((file) => <Card key={file.id}>
              <div className="publisher-report__meta"><strong>{file.fileName}</strong><span>{file.mimeType}</span><span>{file.uploaderName || "Sistem"}</span></div>
              <a href={`/yayinevi/dosyalar/${file.id}/indir`}>Güvenli indir</a>
            </Card>) : <Card><p>Bu başvuruya eklenmiş dosya bulunmuyor.</p></Card>}
          </section>

          {data.status === "accepted" && (data.permissions.manageContract || data.permissions.managePublicationPlan) ? (
            <Card>
              <PublisherContractCenter
                canManageContract={data.permissions.manageContract}
                canManagePlan={data.permissions.managePublicationPlan}
                contract={data.contract}
                plan={data.publicationPlan}
                submissionId={data.id}
              />
            </Card>
          ) : null}

          <Card>
            <p className="publisher-eyebrow">Süreç geçmişi</p>
            <h2>Başvuru zaman çizelgesi</h2>
            <PublisherTimeline events={data.events} />
          </Card>
        </div>

        <aside className="publisher-submission-detail__side">
          <Card>
            <p className="publisher-eyebrow">Başvuru bilgileri</p>
            <dl className="publisher-detail-list publisher-detail-list--stacked">
              <div><dt>Yazar</dt><dd>{data.author.displayName}</dd></div>
              <div><dt>E-posta</dt><dd>{data.author.email}</dd></div>
              <div><dt>Gönderim</dt><dd>{formatDate(data.submittedAt)}</dd></div>
              <div><dt>Son güncelleme</dt><dd>{formatDate(data.updatedAt)}</dd></div>
            </dl>
          </Card>

          {data.permissions.addInternalNote ? <Card>
            <p className="publisher-eyebrow">Ekip içi not</p>
            <h2>Özel değerlendirme</h2>
            <PublisherInternalNoteForm submissionId={data.id} />
          </Card> : null}

          {data.permissions.decide ? <Card>
            <p className="publisher-eyebrow">Yayınevi kararı</p>
            <h2>Başvuruyu değerlendir</h2>
            <PublisherDecisionForm
              currentStatus={data.status}
              publisherNote={data.publisherNote}
              submissionId={data.id}
            />
          </Card> : <Card><p className="publisher-eyebrow">Salt okunur erişim</p><p>Bu başvuruyu görüntüleyebilirsiniz; karar veya iç not işlemi rolünüze açık değil.</p></Card>}
        </aside>
      </section>
    </div>
  );
}
