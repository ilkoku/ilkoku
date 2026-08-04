import Link from "next/link";

import {
  togglePublisherAuthorFavoriteAction,
  togglePublisherAuthorLikeAction,
} from "../engagement-extended-actions";
import type {
  PublisherAuthorSavedMode,
  PublisherSavedAuthorRow,
} from "../author-saved-query";

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
  }).format(new Date(value));
}

export function PublisherSavedAuthorsTable({
  canMutate,
  mode,
  returnTo,
  rows,
}: {
  canMutate: boolean;
  mode: PublisherAuthorSavedMode;
  returnTo: string;
  rows: PublisherSavedAuthorRow[];
}) {
  const action =
    mode === "like"
      ? togglePublisherAuthorLikeAction
      : togglePublisherAuthorFavoriteAction;
  const dateLabel =
    mode === "like"
      ? "Beğeni tarihi"
      : "Favori tarihi";
  const removeLabel =
    mode === "like"
      ? "Beğenmekten vazgeç"
      : "Favoriden çıkar";

  return (
    <div className="publisher-author-table-wrap">
      <table className="publisher-author-table">
        <thead>
          <tr>
            <th>Yazar</th>
            <th>Şehir / Türler</th>
            <th>Eser durumu</th>
            <th>Okur etkileşimi</th>
            <th>Son yayımlanan eserler</th>
            <th>{dateLabel}</th>
            <th>İşlem</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((author) => (
            <tr key={author.recordId}>
              <td data-label="Yazar">
                <strong>{author.name}</strong>
                <small>{author.alias}</small>
                <small>{author.publicId}</small>
                <p>
                  {author.bio?.trim() ||
                    "Bu yazar henüz herkese açık kısa bir biyografi eklemedi."}
                </p>
              </td>

              <td data-label="Şehir / Türler">
                <strong>{author.city || "Şehir belirtilmedi"}</strong>
                {author.genres.length ? (
                  <div className="publisher-author-table__genres">
                    {author.genres.map((genre) => (
                      <span key={genre}>{genre}</span>
                    ))}
                  </div>
                ) : (
                  <small>Yazı türü belirtilmedi</small>
                )}
              </td>

              <td data-label="Eser durumu">
                <dl className="publisher-author-table__metrics">
                  <div>
                    <dt>Public eser</dt>
                    <dd>{formatNumber(author.publicWorkCount)}</dd>
                  </div>
                  <div>
                    <dt>Editör incelemesi</dt>
                    <dd>{formatNumber(author.reviewedWorkCount)}</dd>
                  </div>
                </dl>
              </td>

              <td data-label="Okur etkileşimi">
                <dl className="publisher-author-table__metrics">
                  <div>
                    <dt>Okur</dt>
                    <dd>{formatNumber(author.readerCount)}</dd>
                  </div>
                  <div>
                    <dt>Favori</dt>
                    <dd>{formatNumber(author.favoriteCount)}</dd>
                  </div>
                  <div>
                    <dt>Yorum</dt>
                    <dd>{formatNumber(author.commentCount)}</dd>
                  </div>
                </dl>
              </td>

              <td data-label="Son yayımlanan eserler">
                <ul className="publisher-author-table__works">
                  {author.latestWorks.map((work) => (
                    <li key={work.id}>
                      <Link
                        href={`/kitap/${work.slug}?from=${encodeURIComponent(returnTo)}`}
                      >
                        <strong>{work.title}</strong>
                        <span>{work.genre || "Tür belirtilmedi"}</span>
                        <small>{work.chapterCount} bölüm</small>
                      </Link>
                    </li>
                  ))}
                </ul>
              </td>

              <td data-label={dateLabel}>
                <strong>{formatDate(author.savedAt)}</strong>
              </td>

              <td data-label="İşlem">
                <div className="publisher-discovery-table__actions">
                  <Link
                    className="button button--outline"
                    href={`/yayinevi/kesfet/yazarlar?arama=${encodeURIComponent(author.publicId)}`}
                  >
                    Yazarı incele
                  </Link>

                  {canMutate ? (
                    <form
                      action={action}
                      className="publisher-discovery-engagement-form"
                    >
                      <input name="authorId" type="hidden" value={author.id} />
                      <input name="active" type="hidden" value="false" />
                      <input
                        name="returnPath"
                        type="hidden"
                        value={returnTo}
                      />
                      <button
                        className="button button--outline"
                        type="submit"
                      >
                        {removeLabel}
                      </button>
                    </form>
                  ) : (
                    <span className="publisher-discovery-table__permission">
                      Salt okunur
                    </span>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
