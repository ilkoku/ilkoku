import Link from "next/link";
import type { ReactNode } from "react";

import "./discovery-role-works-table.css";

export type DiscoveryRoleWorkRow = {
  actions: ReactNode;
  authorAlias?: string | null;
  authorName: string;
  chapterCount: number;
  commentCount: number;
  contentRatingLabel: string;
  favoriteCount: number;
  genre: string | null;
  href: string;
  id: string;
  meta?: string | null;
  readerCount: number;
  statusLabel: string;
  statusMeta?: string | null;
  title: string;
};

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

export function DiscoveryRoleWorksTable({ rows }: { rows: DiscoveryRoleWorkRow[] }) {
  return (
    <div className="discovery-role-work-table-shell">
      <div className="discovery-role-work-table-scroll">
        <table className="discovery-role-work-table">
          <thead>
            <tr>
              <th>Eser</th>
              <th>Tür / Yaş</th>
              <th>Bilgi</th>
              <th>Durum</th>
              <th>İşlem</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((work) => (
              <tr key={work.id}>
                <td data-label="Eser">
                  <div className="discovery-role-work-table__work">
                    <span aria-hidden="true" className="discovery-role-work-table__cover">
                      {work.title.trim().charAt(0).toLocaleUpperCase("tr-TR") || "E"}
                    </span>
                    <div>
                      <Link href={work.href}>{work.title}</Link>
                      <span>
                        {work.authorName}
                        {work.authorAlias ? ` · ${work.authorAlias}` : ""}
                      </span>
                      <small>
                        {formatNumber(work.chapterCount)} bölüm
                        {work.meta ? ` · ${work.meta}` : ""}
                      </small>
                    </div>
                  </div>
                </td>
                <td data-label="Tür / Yaş">
                  <div className="discovery-role-work-table__taxonomy">
                    <strong>{work.genre || "Belirtilmedi"}</strong>
                    <span>{work.contentRatingLabel}</span>
                  </div>
                </td>
                <td data-label="Bilgi">
                  <dl className="discovery-role-work-table__metrics">
                    <div>
                      <dt>Okur</dt>
                      <dd>{formatNumber(work.readerCount)}</dd>
                    </div>
                    <div>
                      <dt>Beğeni</dt>
                      <dd>{formatNumber(work.favoriteCount)}</dd>
                    </div>
                    <div>
                      <dt>Yorum</dt>
                      <dd>{formatNumber(work.commentCount)}</dd>
                    </div>
                  </dl>
                </td>
                <td data-label="Durum">
                  <div className="discovery-role-work-table__status">
                    <strong>{work.statusLabel}</strong>
                    {work.statusMeta ? <span>{work.statusMeta}</span> : null}
                  </div>
                </td>
                <td data-label="İşlem">
                  <div className="discovery-role-work-table__actions">{work.actions}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
