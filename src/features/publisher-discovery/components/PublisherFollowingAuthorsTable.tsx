import Link from "next/link";

import {
  togglePublisherAuthorFollowAction,
} from "../engagement-actions";
import type {
  PublisherFollowingAuthorRow,
} from "../following-query";

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle: "medium",
    },
  ).format(new Date(value));
}

function initials(value: string) {
  return (
    value
      .trim()
      .split(/\s+/u)
      .slice(0, 2)
      .map((part) =>
        part
          .charAt(0)
          .toLocaleUpperCase("tr-TR"),
      )
      .join("") || "İY"
  );
}

export function PublisherFollowingAuthorsTable({
  canMutate,
  returnTo,
  rows,
}: {
  canMutate: boolean;
  returnTo: string;
  rows: PublisherFollowingAuthorRow[];
}) {
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
            <th>Takip</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((author) => (
            <tr key={author.followId}>
              <td data-label="Yazar">
                <div className="publisher-author-table__identity">
                  <span
                    aria-hidden="true"
                    className="publisher-author-table__avatar"
                  >
                    {initials(
                      author.name,
                    )}
                  </span>

                  <div>
                    <strong>
                      {author.name}
                    </strong>
                    <span>
                      {author.alias}
                    </span>
                    <small>
                      {author.publicId}
                    </small>
                    <p>
                      {author.bio?.trim() ||
                        "Bu yazar henüz herkese açık kısa bir biyografi eklemedi."}
                    </p>
                  </div>
                </div>
              </td>

              <td data-label="Şehir / Türler">
                <strong>
                  {author.city ||
                    "Şehir belirtilmedi"}
                </strong>

                {author.genres.length > 0 ? (
                  <div className="publisher-author-table__genres">
                    {author.genres.map(
                      (genre) => (
                        <span key={genre}>
                          {genre}
                        </span>
                      ),
                    )}
                  </div>
                ) : (
                  <small>
                    Yazı türü belirtilmedi
                  </small>
                )}
              </td>

              <td data-label="Eser durumu">
                <dl className="publisher-author-table__metrics">
                  <div>
                    <dt>Public eser</dt>
                    <dd>
                      {formatNumber(
                        author.publicWorkCount,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Editör incelemesi</dt>
                    <dd>
                      {formatNumber(
                        author.reviewedWorkCount,
                      )}
                    </dd>
                  </div>
                </dl>
              </td>

              <td data-label="Okur etkileşimi">
                <dl className="publisher-author-table__metrics">
                  <div>
                    <dt>Okur</dt>
                    <dd>
                      {formatNumber(
                        author.readerCount,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Favori</dt>
                    <dd>
                      {formatNumber(
                        author.favoriteCount,
                      )}
                    </dd>
                  </div>
                  <div>
                    <dt>Yorum</dt>
                    <dd>
                      {formatNumber(
                        author.commentCount,
                      )}
                    </dd>
                  </div>
                </dl>
              </td>

              <td data-label="Son yayımlanan eserler">
                <ul className="publisher-author-table__works">
                  {author.latestWorks.map(
                    (work) => (
                      <li key={work.id}>
                        <Link
                          href={`/kitap/${work.slug}?from=${encodeURIComponent(returnTo)}`}
                        >
                          <strong>
                            {work.title}
                          </strong>
                          <span>
                            {work.genre ||
                              "Tür belirtilmedi"}
                          </span>
                          <small>
                            {work.chapterCount} bölüm
                          </small>
                        </Link>

                        {work.firstChapterPosition !==
                        null ? (
                          <Link
                            className="publisher-saved-list__read"
                            href={`/oku/${work.slug}/bolum-${work.firstChapterPosition}?from=${encodeURIComponent(returnTo)}`}
                          >
                            Okumaya başla
                          </Link>
                        ) : null}
                      </li>
                    ),
                  )}
                </ul>
              </td>

              <td data-label="Takip">
                <strong>
                  {formatDate(
                    author.followedAt,
                  )}
                </strong>

                {canMutate ? (
                  <form
                    action={togglePublisherAuthorFollowAction}
                    className="publisher-discovery-engagement-form"
                  >
                    <input
                      name="authorId"
                      type="hidden"
                      value={author.id}
                    />
                    <input
                      name="active"
                      type="hidden"
                      value="false"
                    />
                    <input
                      name="returnPath"
                      type="hidden"
                      value={returnTo}
                    />
                    <button
                      className="button button--outline"
                      type="submit"
                    >
                      Takibi bırak
                    </button>
                  </form>
                ) : (
                  <span className="publisher-discovery-table__permission">
                    Salt okunur
                  </span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
