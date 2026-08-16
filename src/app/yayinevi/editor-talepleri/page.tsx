import Link from "next/link";
import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { requirePublisherAnyDiscoveryAccess } from "@/features/publisher-discovery/access";
import { PublisherEditorCancelForm } from "@/features/publisher-editor-requests/components/PublisherEditorCancelForm";
import { getPublisherEditorRequestsForMember } from "@/features/publisher-editor-requests/repository";
import "@/features/publisher-editor-requests/publisher-editor-requests.css";

export const metadata: Metadata = {
  description:
    "Yayınevinizin İlkOku platform editörlerine açtığı inceleme taleplerini takip edin.",
  title: "Editör Talepleri | İlkOku Yayınevi",
};

export const dynamic = "force-dynamic";

const statusLabels = {
  cancelled: "İptal edildi",
  completed: "Tamamlandı",
  in_progress: "İncelemede",
  waiting: "Editör bekliyor",
} as const;

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

export default async function PublisherEditorRequestsPage() {
  const access = await requirePublisherAnyDiscoveryAccess(
    "/yayinevi/editor-talepleri",
    ["view_editor_requests", "request_editor_review"],
  );
  const data = await getPublisherEditorRequestsForMember(access.profile.id);

  if (!data) {
    return null;
  }

  return (
    <AppShell profile={access.profile}>
      <div className="publisher-discovery">
        <EditorPageHeader
          description="Yayınevinizin tamamlanmış eserler için İlkOku platform editörlerine açtığı talepleri ve tamamlanan raporları tek yerde takip edin."
          eyebrow={data.companyName}
          title="Editör Talepleri"
        />

        {data.adminReadOnly ? (
          <section className="publisher-discovery-summary">
            <p>Admin görünümünde bu alan salt okunurdur.</p>
          </section>
        ) : null}

        {data.items.length === 0 ? (
          <section className="publisher-discovery-empty">
            <h2>Henüz editör talebi bulunmuyor</h2>
            <p>
              Eser Keşfet alanından tamamlanmış bir eser için İlkOku editörü incelemesi isteyebilirsiniz.
            </p>
            <Link className="button button--primary" href="/yayinevi/kesfet/eserler">
              Eser Keşfet
            </Link>
          </section>
        ) : (
          <div className="publisher-editor-request-grid">
            {data.items.map((item) => (
              <article className="publisher-editor-request-card" key={item.id}>
                <div className="publisher-editor-request-card__head">
                  <div>
                    <h3>{item.work.title}</h3>
                    <p>{item.work.authorName}</p>
                  </div>
                  <span className="publisher-editor-request-status">
                    {statusLabels[item.status]}
                  </span>
                </div>

                <div className="publisher-editor-request-card__meta">
                  <span>Talebi açan: {item.requestedByName}</span>
                  <span>Talep: {dateLabel(item.createdAt)}</span>
                  {item.assignedEditorName ? (
                    <span>Editör: {item.assignedEditorName}</span>
                  ) : null}
                  {item.status === "completed" && item.compensationEligible ? (
                    <span>Ücret sistemi için uygun tamamlanmış görev kaydı</span>
                  ) : null}
                </div>

                <p><strong>Talep notu:</strong> {item.requestNote}</p>

                {item.review?.status === "completed" ? (
                  <section className="publisher-editor-review-summary">
                    <h4>{item.review.title}</h4>
                    <small>{item.review.category}</small>
                    <p>{item.review.content}</p>
                  </section>
                ) : null}

                <div className="publisher-editor-request-card__actions">
                  <Link
                    className="button button--outline"
                    href={`/kitap/${item.work.slug}`}
                  >
                    Eser sayfası
                  </Link>
                  {item.status === "waiting" && data.canCancelWaitingRequests ? (
                    <PublisherEditorCancelForm requestId={item.id} />
                  ) : null}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
