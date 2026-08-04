import Link from "next/link";

import { markPublisherSharedItemReadAction } from "../sharing-actions";
import type { PublisherSharedItem } from "../sharing-repository";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PublisherSharedItemsList({
  adminReadOnly,
  canViewPassport,
  items,
}: {
  adminReadOnly: boolean;
  canViewPassport: boolean;
  items: PublisherSharedItem[];
}) {
  return (
    <div className="publisher-shared-list">
      {items.map((item) => {
        const title =
          item.work?.title ||
          item.author?.name ||
          "Paylaşılan kayıt";
        const entityLabel = item.work ? "Eser" : "Yazar";

        return (
          <article
            className="publisher-shared-card"
            data-unread={!adminReadOnly && !item.readAt ? "true" : undefined}
            key={item.id}
          >
            <div className="publisher-shared-card__heading">
              <div>
                <span>{entityLabel}</span>
                <h2>{title}</h2>
              </div>
              <small>
                {item.createdByName} · {formatDate(item.createdAt)}
              </small>
            </div>

            <blockquote>{item.note}</blockquote>

            <div className="publisher-shared-card__footer">
              <div className="publisher-shared-card__actions">
                {item.work ? (
                  <>
                    <Link
                      className="button button--primary"
                      href={`/kitap/${item.work.slug}?from=${encodeURIComponent("/yayinevi/paylasilanlar")}`}
                    >
                      Eser sayfası
                    </Link>
                    {canViewPassport ? (
                      <Link
                        className="button button--outline"
                        href={`/yayinevi/kesfet/eserler/${item.work.id}/pasaport`}
                      >
                        Eser Pasaportu
                      </Link>
                    ) : null}
                  </>
                ) : item.author ? (
                  <Link
                    className="button button--primary"
                    href={`/yayinevi/kesfet/yazarlar?arama=${encodeURIComponent(item.author.publicId)}`}
                  >
                    Yazarı incele
                  </Link>
                ) : null}
              </div>

              {adminReadOnly ? (
                <small>Admin salt okunur görünümü</small>
              ) : item.readAt ? (
                <small>Okundu · {formatDate(item.readAt)}</small>
              ) : (
                <form action={markPublisherSharedItemReadAction}>
                  <input name="shareId" type="hidden" value={item.id} />
                  <button className="button button--outline" type="submit">
                    Okundu işaretle
                  </button>
                </form>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
