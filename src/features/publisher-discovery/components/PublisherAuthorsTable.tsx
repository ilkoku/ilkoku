import Link from "next/link";
import { togglePublisherAuthorFollowAction } from "../engagement-actions";

import type {
  PublisherAuthorDiscoveryRow,
} from "../author-query";

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
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

export function PublisherAuthorsTable({
  canFollow,
  followedAuthorIds,
  returnTo,
  rows,
}: {
  canFollow: boolean;
  followedAuthorIds: string[];
  returnTo: string;
  rows: PublisherAuthorDiscoveryRow[];
}) {
  const followed = new Set(followedAuthorIds);
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
            <th>Yayınevi işlemi</th>
          </tr>
        </thead>

        <tbody>
          {rows.map((author) => (
            <tr key={author.id}>
              <td data-label="Yazar">
                <div className="publisher-author-table__identity">
                  <span
                    aria-hidden="true"
                    className="publisher-author-table__avatar"
                  >
                    {initials(author.name)}
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
                  <div
                    aria-label="Yazı türleri"
                    className="publisher-author-table__genres"
                  >
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
                    <dt>Tamamlanan</dt>
                    <dd>
                      {formatNumber(
                        author.completedWorkCount,
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
                            {" · "}
                            {formatNumber(
                              work.readerCount,
                            )}{" "}
                            okur
                            {" · "}
                            {formatNumber(
                              work.favoriteCount,
                            )}{" "}
                            favori
                            {" · "}
                            {formatNumber(
                              work.commentCount,
                            )}{" "}
                            yorum
                          </small>
                        </Link>
                      </li>
                    ),
                  )}
                </ul>
              </td>

              <td data-label="Yayınevi işlemi">
                {canFollow ? (
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
                      value={
                        followed.has(author.id)
                          ? "false"
                          : "true"
                      }
                    />
                    <input
                      name="returnPath"
                      type="hidden"
                      value={returnTo}
                    />
                    <button
                      className={
                        followed.has(author.id)
                          ? "button button--primary"
                          : "button button--outline"
                      }
                      type="submit"
                    >
                      {followed.has(author.id)
                        ? "Takibi bırak"
                        : "Yazarı takip et"}
                    </button>
                  </form>
                ) : (
                  <span className="publisher-discovery-table__permission">
                    Takip yetkisi gerekli
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
