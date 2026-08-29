import Link from "next/link";
import { workContentRatingDetails } from "@/lib/work-content-classification";
import type { EditorWorkTableData } from "../types";
import { ReviewClaimDialog } from "./ReviewClaimDialog";
import { SecondReviewClaimDialog } from "./SecondReviewClaimDialog";

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function formatDate(value: Date | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("tr-TR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(value);
}

function authorAlias(work: EditorWorkTableData) {
  const value = work.authorUsername ?? work.authorName;

  if (value.startsWith("@")) return value;

  return `@${value
    .trim()
    .toLocaleLowerCase("tr-TR")
    .replace(/\s+/gu, "")
    .replace(/[^a-z0-9çğıöşü_-]/giu, "")}`;
}

function statusInformation(
  work: EditorWorkTableData,
  currentEditorId: string,
) {
  if (work.editorReviewStatus === "completed") {
    return {
      className: "editor-table-status--completed",
      label: "Tamamlandı",
    };
  }

  if (work.editorReviewStatus === "second_in_progress") {
    return {
      className: "editor-table-status--mine",
      label: "İkinci editörde",
    };
  }

  if (work.editorReviewStatus === "awaiting_second_editor") {
    return {
      className: "editor-table-status--new",
      label: "İkinci editör bekliyor",
    };
  }

  if (
    work.editorReviewStatus === "in_progress" &&
    work.assignedEditorId === currentEditorId
  ) {
    return {
      className: "editor-table-status--mine",
      label: "İncelemede",
    };
  }

  if (
    work.editorReviewStatus === "in_progress" &&
    work.assignedEditorId !== currentEditorId
  ) {
    return {
      className: "editor-table-status--locked",
      label: "Başka editörde",
    };
  }

  if (work.editorReviewStatus === "requested") {
    return {
      className: "editor-table-status--new",
      label: "Yeni Talep",
    };
  }

  return {
    className: "editor-table-status--available",
    label: "Keşfedilebilir",
  };
}

function WorkAction({
  currentEditorId,
  mode,
  work,
}: {
  currentEditorId: string;
  mode: "discovery" | "requests" | "secondPool";
  work: EditorWorkTableData;
}) {
  const isMine =
    work.editorReviewStatus === "in_progress" &&
    work.assignedEditorId === currentEditorId;

  if (mode === "discovery") {
    return (
      <Link
        className="editor-table-action"
        href={`/kitap/${work.slug}?from=${encodeURIComponent("/editor/kesfet")}`}
      >
        Eseri Aç
      </Link>
    );
  }

  if (mode === "secondPool") {
    return (
      <SecondReviewClaimDialog
        workId={work.id}
        workTitle={work.title}
      />
    );
  }

  const isLocked =
    (work.editorReviewStatus === "in_progress" &&
      work.assignedEditorId !== currentEditorId) ||
    work.editorReviewStatus === "awaiting_second_editor" ||
    work.editorReviewStatus === "second_in_progress";

  if (isMine) {
    return (
      <Link
        className="editor-table-action editor-table-action--primary"
        href="/editor/incelemeler?asama=birinci"
      >
        Devam Et
      </Link>
    );
  }

  if (work.editorReviewStatus === "completed") {
    return (
      <Link
        className="editor-table-action"
        href="/editor/incelemeler?durum=tamamlanan"
      >
        Raporu Gör
      </Link>
    );
  }

  if (isLocked) {
    return (
      <span
        className="editor-table-action editor-table-action--disabled"
        title="Bu eser başka bir editör tarafından incelemeye alındı."
      >
        Kilitli
      </span>
    );
  }

  return (
    <ReviewClaimDialog
      workId={work.id}
      workTitle={work.title}
    />
  );
}

export function EditorWorksTable({
  currentEditorId,
  mode = "discovery",
  works,
}: {
  currentEditorId: string;
  mode?: "discovery" | "requests" | "secondPool";
  works: EditorWorkTableData[];
}) {
  return (
    <div className="editor-table-shell">
      <div className="editor-table-scroll">
        <table className="editor-works-table">
          <thead>
            <tr>
              <th>Eser</th>
              <th>Rumuz</th>
              <th>Tür</th>
              {mode === "discovery" ? <th>Hitap Yaşı</th> : null}
              <th>Bölüm</th>
              <th>Yayın Tarihi</th>
              <th>
                <span aria-hidden="true">👁</span> Okunma
              </th>
              <th>
                <span aria-hidden="true">❤️</span> Beğeni
              </th>
              <th>
                <span aria-hidden="true">💬</span> Yorum
              </th>
              <th>Durum</th>
              <th>İşlem</th>
            </tr>
          </thead>

          <tbody>
            {works.map((work) => {
              const status = statusInformation(
                work,
                currentEditorId,
              );

              return (
                <tr key={work.id}>
                  <td data-label="Eser">
                    <Link
                      className="editor-table-work"
                      href={`/kitap/${work.slug}`}
                    >
                      {work.title}
                    </Link>
                  </td>

                  <td data-label="Rumuz">
                    <span className="editor-table-alias">
                      {authorAlias(work)}
                    </span>
                  </td>

                  <td data-label="Tür">
                    {work.genre ?? "Belirtilmedi"}
                  </td>

                  {mode === "discovery" ? (
                    <td data-label="Hitap Yaşı">
                      {work.contentRating
                        ? workContentRatingDetails[work.contentRating].shortLabel
                        : "Sınıflandırılmadı"}
                    </td>
                  ) : null}

                  <td data-label="Bölüm">
                    {formatNumber(work.chapterCount)}
                  </td>

                  <td data-label="Yayın Tarihi">
                    {formatDate(work.publishedAt)}
                  </td>

                  <td data-label="Okunma">
                    {formatNumber(work.readerCount)}
                  </td>

                  <td data-label="Beğeni">
                    {formatNumber(work.favoriteCount)}
                  </td>

                  <td data-label="Yorum">
                    {formatNumber(work.commentCount)}
                  </td>

                  <td data-label="Durum">
                    <span
                      className={`editor-table-status ${status.className}`}
                    >
                      {status.label}
                    </span>
                  </td>

                  <td data-label="İşlem">
                    <div className="editor-table-actions">
                      <WorkAction
                        currentEditorId={currentEditorId}
                        mode={mode}
                        work={work}
                      />
                      {mode === "discovery" ? (
                        <Link
                          className="editor-table-action"
                          href={`/kitap/${work.slug}/pasaport?from=${encodeURIComponent("/editor/kesfet")}`}
                        >
                          Eser Pasaportu
                        </Link>
                      ) : null}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
