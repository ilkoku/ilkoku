import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { PublisherEditorReviewForm } from "@/features/publisher-editor-requests/components/PublisherEditorReviewForm";
import { getEditorPublisherRequestDetail } from "@/features/publisher-editor-requests/repository";
import "@/features/publisher-editor-requests/publisher-editor-requests.css";

export const metadata: Metadata = {
  description: "Yayınevi tarafından talep edilen İlkOku editör incelemesi.",
  title: "Yayınevi Editör İncelemesi | İlkOku",
};

export const dynamic = "force-dynamic";

export default async function PublisherEditorRequestDetailPage({
  params,
}: {
  params: Promise<{ requestId: string }>;
}) {
  const { requestId } = await params;
  const profile = await requireEditorProfile(
    `/editor/yayinevi-talepleri/${requestId}`,
  );
  const item = await getEditorPublisherRequestDetail(profile.id, requestId);

  if (!item) notFound();

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description={`${item.publisherName} tarafından ${item.work.title} eseri için oluşturulan editör talebi.`}
          title="Yayınevi Editör İncelemesi"
        />

        <article className="publisher-editor-request-card">
          <div className="publisher-editor-request-card__head">
            <div>
              <h3>{item.work.title}</h3>
              <p>{item.work.authorName}</p>
            </div>
            <span className="publisher-editor-request-status">
              {item.status === "completed" ? "Tamamlandı" : "İncelemede"}
            </span>
          </div>

          <p><strong>Yayınevi:</strong> {item.publisherName}</p>
          <p><strong>Talep notu:</strong> {item.requestNote}</p>

          <div className="publisher-editor-request-card__actions">
            <Link className="button button--outline" href={`/kitap/${item.work.slug}`}>
              Eseri Aç
            </Link>
            <Link className="button button--ghost" href="/editor/yayinevi-talepleri">
              Yayınevi Taleplerine Dön
            </Link>
          </div>
        </article>

        {item.status === "completed" && item.review ? (
          <section className="publisher-editor-review-summary">
            <h4>{item.review.title}</h4>
            <small>{item.review.category}</small>
            <p>{item.review.content}</p>
            {item.compensationEligible ? (
              <p>
                Bu görev ileride ödeme sistemi devreye alındığında ücret hakkına uygun tamamlanmış görev olarak kayıtlıdır.
              </p>
            ) : null}
          </section>
        ) : (
          <PublisherEditorReviewForm
            initialCategory={item.review?.category ?? "Genel editoryal değerlendirme"}
            initialContent={item.review?.content ?? ""}
            initialTitle={item.review?.title ?? ""}
            requestId={item.id}
          />
        )}
      </div>
    </AppShell>
  );
}
