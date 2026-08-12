import Link from "next/link";
import type { Metadata } from "next";

import { AppShell } from "@/components/layout/AppShell";
import { requireEditorProfile } from "@/features/editor-workspace/access";
import { EditorPageHeader } from "@/features/editor-workspace/components/EditorPageHeader";
import { PublisherEditorClaimForm } from "@/features/publisher-editor-requests/components/PublisherEditorClaimForm";
import { getEditorPublisherRequestLists } from "@/features/publisher-editor-requests/repository";
import "@/features/publisher-editor-requests/publisher-editor-requests.css";

export const metadata: Metadata = {
  description:
    "Yayınevlerinin İlkOku platform editörlerinden istediği profesyonel inceleme görevleri.",
  title: "Yayınevi Editör Talepleri | İlkOku",
};

export const dynamic = "force-dynamic";

function dateLabel(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(new Date(value));
}

function RequestCard({
  action,
  item,
}: {
  action: "claim" | "open" | "review";
  item: Awaited<ReturnType<typeof getEditorPublisherRequestLists>>["open"][number];
}) {
  return (
    <article className="publisher-editor-request-card">
      <div className="publisher-editor-request-card__head">
        <div>
          <h3>{item.work.title}</h3>
          <p>{item.work.authorName}</p>
        </div>
        <span className="publisher-editor-request-status">
          {item.publisherName}
        </span>
      </div>

      <div className="publisher-editor-request-card__meta">
        <span>Talep: {dateLabel(item.createdAt)}</span>
        <span>Talebi açan: {item.requestedByName}</span>
        {item.compensationEligible ? (
          <span>Görev kaydı: ücret hakkına uygun</span>
        ) : null}
      </div>

      <p><strong>Yayınevi notu:</strong> {item.requestNote}</p>

      <div className="publisher-editor-request-card__actions">
        <Link className="button button--outline" href={`/kitap/${item.work.slug}`}>
          Eseri Aç
        </Link>
        {action === "claim" ? (
          <PublisherEditorClaimForm requestId={item.id} />
        ) : (
          <Link
            className="button button--primary"
            href={`/editor/yayinevi-talepleri/${item.id}`}
          >
            {action === "review" ? "İncelemeye Devam Et" : "Raporu Aç"}
          </Link>
        )}
      </div>
    </article>
  );
}

export default async function PublisherEditorRequestsForEditorPage() {
  const profile = await requireEditorProfile("/editor/yayinevi-talepleri");
  const data = await getEditorPublisherRequestLists(profile.id);

  return (
    <AppShell profile={profile}>
      <div className="editor-workspace">
        <EditorPageHeader
          description="Yayınevlerinin özellikle İlkOku platform editörlerinden istediği inceleme görevleri. Bu alan Genel Editör Havuzu'ndan ayrıdır. Bir görevi ilk alan editör merkezi claim kilidiyle görevi üzerine alır."
          title="Yayınevi Editör Talepleri"
        />

        <section className="publisher-editor-request-section">
          <EditorPageHeader
            description="Henüz hiçbir editör tarafından alınmamış yayınevi talepleri."
            title={`Açık Talepler (${data.open.length})`}
          />
          {data.open.length === 0 ? (
            <div className="editor-empty">
              <h2>Açık yayınevi talebi bulunmuyor</h2>
              <p>Yeni talepler geldiğinde burada listelenecek.</p>
            </div>
          ) : (
            <div className="publisher-editor-request-grid">
              {data.open.map((item) => (
                <RequestCard action="claim" item={item} key={item.id} />
              ))}
            </div>
          )}
        </section>

        <section className="publisher-editor-request-section">
          <EditorPageHeader
            description="Üzerinize aldığınız ve henüz tamamlamadığınız yayınevi görevleri."
            title={`İncelemede (${data.active.length})`}
          />
          {data.active.length === 0 ? (
            <div className="editor-empty">
              <p>Aktif yayınevi editör göreviniz yok.</p>
            </div>
          ) : (
            <div className="publisher-editor-request-grid">
              {data.active.map((item) => (
                <RequestCard action="review" item={item} key={item.id} />
              ))}
            </div>
          )}
        </section>

        <section className="publisher-editor-request-section">
          <EditorPageHeader
            description="Tamamladığınız yayınevi editör görevleri ve raporları."
            title={`Tamamlananlar (${data.completed.length})`}
          />
          {data.completed.length === 0 ? (
            <div className="editor-empty">
              <p>Henüz tamamlanmış yayınevi editör göreviniz yok.</p>
            </div>
          ) : (
            <div className="publisher-editor-request-grid">
              {data.completed.map((item) => (
                <RequestCard action="open" item={item} key={item.id} />
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
