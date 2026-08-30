import {
  DiscoveryAuthorCard,
  DiscoveryAuthorGrid,
} from "@/components/discovery/DiscoveryAuthorCard";

import { togglePublisherAuthorFollowAction } from "../engagement-actions";
import {
  togglePublisherAuthorFavoriteAction,
  togglePublisherAuthorLikeAction,
} from "../engagement-extended-actions";
import type { PublisherAuthorDiscoveryRow } from "../author-query";
import type { PublisherShareRecipientOption } from "../sharing-repository";
import { PublisherDiscoveryShareForm } from "./PublisherDiscoveryShareForm";

export function PublisherAuthorsTable({
  canFavorite,
  canFollow,
  canLike,
  canShareEmail,
  canShareInternal,
  favoriteAuthorIds,
  followedAuthorIds,
  likedAuthorIds,
  returnTo,
  rows,
  shareMembers,
}: {
  canFavorite: boolean;
  canFollow: boolean;
  canLike: boolean;
  canShareEmail: boolean;
  canShareInternal: boolean;
  favoriteAuthorIds: string[];
  followedAuthorIds: string[];
  likedAuthorIds: string[];
  returnTo: string;
  rows: PublisherAuthorDiscoveryRow[];
  shareMembers: PublisherShareRecipientOption[];
}) {
  const followed = new Set(followedAuthorIds);
  const liked = new Set(likedAuthorIds);
  const favorited = new Set(favoriteAuthorIds);

  return (
    <DiscoveryAuthorGrid>
      {rows.map((author) => {
        const latest = author.latestWorks[0] ?? null;
        const profileHref = `/yazarlar/${author.publicId}?from=${encodeURIComponent(returnTo)}`;
        const signals = [
          author.city || "Şehir belirtilmedi",
          author.country || "Ülke belirtilmedi",
          ...author.genres.slice(0, 2),
          `${author.completedWorkCount} tamamlanan eser`,
          `${author.reviewedWorkCount} editörden geçen eser`,
        ];

        return (
          <DiscoveryAuthorCard
            actions={
              <>
                {canLike ? (
                  <form action={togglePublisherAuthorLikeAction}>
                    <input name="authorId" type="hidden" value={author.id} />
                    <input
                      name="active"
                      type="hidden"
                      value={liked.has(author.id) ? "false" : "true"}
                    />
                    <input name="returnPath" type="hidden" value={returnTo} />
                    <button
                      className={
                        liked.has(author.id)
                          ? "button button--primary"
                          : "button button--outline"
                      }
                      type="submit"
                    >
                      {liked.has(author.id) ? "Beğenildi" : "Beğen"}
                    </button>
                  </form>
                ) : null}

                {canFavorite ? (
                  <form action={togglePublisherAuthorFavoriteAction}>
                    <input name="authorId" type="hidden" value={author.id} />
                    <input
                      name="active"
                      type="hidden"
                      value={favorited.has(author.id) ? "false" : "true"}
                    />
                    <input name="returnPath" type="hidden" value={returnTo} />
                    <button
                      className={
                        favorited.has(author.id)
                          ? "button button--primary"
                          : "button button--outline"
                      }
                      type="submit"
                    >
                      {favorited.has(author.id) ? "Favoride" : "Favorile"}
                    </button>
                  </form>
                ) : null}

                {canFollow ? (
                  <form action={togglePublisherAuthorFollowAction}>
                    <input name="authorId" type="hidden" value={author.id} />
                    <input
                      name="active"
                      type="hidden"
                      value={followed.has(author.id) ? "false" : "true"}
                    />
                    <input name="returnPath" type="hidden" value={returnTo} />
                    <button
                      className={
                        followed.has(author.id)
                          ? "button button--primary"
                          : "button button--outline"
                      }
                      type="submit"
                    >
                      {followed.has(author.id) ? "Takipte" : "Takip et"}
                    </button>
                  </form>
                ) : null}

                <PublisherDiscoveryShareForm
                  canShareEmail={canShareEmail}
                  canShareInternal={canShareInternal}
                  entityId={author.id}
                  entityKind="author"
                  members={shareMembers}
                  returnPath={returnTo}
                />

                {!canLike &&
                !canFavorite &&
                !canFollow &&
                !canShareInternal &&
                !canShareEmail ? (
                  <span className="publisher-discovery-table__permission">
                    Etkileşim yetkisi gerekli
                  </span>
                ) : null}
              </>
            }
            alias={author.alias}
            bio={author.bio}
            key={author.id}
            latestWork={
              latest
                ? {
                    href: `/kitap/${latest.slug}?from=${encodeURIComponent(returnTo)}`,
                    meta: `${latest.genre || "Tür belirtilmedi"} · ${latest.chapterCount} bölüm`,
                    title: latest.title,
                  }
                : null
            }
            matchedWorkCount={author.publicWorkCount}
            metrics={[
              { label: "Eser", value: author.publicWorkCount },
              { label: "Okur", value: author.readerCount },
              { label: "Beğeni", value: author.favoriteCount },
              { label: "Yorum", value: author.commentCount },
            ]}
            name={author.name}
            profileHref={profileHref}
            signals={signals}
          />
        );
      })}
    </DiscoveryAuthorGrid>
  );
}
