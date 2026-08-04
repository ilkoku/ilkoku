import {
  createCommentReplyAction,
} from "@/features/reader/comment-email.actions";
import {
  type ReaderCommentFeed,
  type ReaderCommentReplyItem,
} from "@/features/reader/comments";

import styles from "./ReaderCommentList.module.css";

function initials(value: string) {
  return value
    .split(/\s+/u)
    .filter(Boolean)
    .map((part) => part.charAt(0))
    .join("")
    .slice(0, 2)
    .toLocaleUpperCase("tr-TR");
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(value);
}

function usernameLabel(
  value: string,
) {
  return value.startsWith("@")
    ? value
    : `@${value}`;
}

function Reply({
  reply,
}: {
  reply: ReaderCommentReplyItem;
}) {
  return (
    <article
      className={styles.reply}
      data-author-reply={
        reply.isAuthorReply ||
        undefined
      }
      id={`yanit-${reply.id}`}
    >
      <span
        aria-hidden="true"
        className={styles.replyAvatar}
      >
        {initials(reply.userName)}
      </span>

      <div className={styles.body}>
        <header className={styles.meta}>
          <div className={styles.identity}>
            <div
              className={
                styles.replyIdentity
              }
            >
              <strong>
                {reply.userName}
              </strong>

              {reply.isAuthorReply && (
                <span
                  className={
                    styles.authorBadge
                  }
                >
                  Yazarın Yanıtı
                </span>
              )}
            </div>

            {reply.username && (
              <small>
                {usernameLabel(
                  reply.username,
                )}
              </small>
            )}
          </div>

          <time
            dateTime={reply.createdAt.toISOString()}
          >
            {formatDate(
              reply.createdAt,
            )}
          </time>
        </header>

        <p className={styles.content}>
          {reply.content}
        </p>
      </div>
    </article>
  );
}

export function ReaderCommentList({
  authorMode = false,
  emptyText,
  feed,
  returnPath = "/yorumlarim",
}: {
  authorMode?: boolean;
  emptyText: string;
  feed: ReaderCommentFeed;
  returnPath?: string;
}) {
  if (feed.items.length === 0) {
    return (
      <p className={styles.empty}>
        {emptyText}
      </p>
    );
  }

  return (
    <div className={styles.list}>
      {feed.items.map((comment) => {
        const hasAuthorReply =
          comment.replies.some(
            (reply) =>
              reply.isAuthorReply,
          );

        return (
          <article
            className={styles.comment}
            id={`yorum-${comment.id}`}
            key={comment.id}
          >
            <span
              aria-hidden="true"
              className={styles.avatar}
            >
              {initials(
                comment.userName,
              )}
            </span>

            <div className={styles.body}>
              <header
                className={styles.meta}
              >
                <div
                  className={
                    styles.identity
                  }
                >
                  <strong>
                    {comment.userName}
                  </strong>

                  {comment.username && (
                    <small>
                      {usernameLabel(
                        comment.username,
                      )}
                    </small>
                  )}

                  {(comment.workTitle ||
                    comment.chapterTitle) && (
                    <span
                      className={
                        styles.context
                      }
                    >
                      {[
                        comment.workTitle,
                        comment.chapterTitle,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </span>
                  )}
                </div>

                <time
                  dateTime={comment.createdAt.toISOString()}
                >
                  {formatDate(
                    comment.createdAt,
                  )}
                </time>
              </header>

              <p className={styles.content}>
                {comment.content}
              </p>

              {authorMode && (
                <span
                  className={
                    hasAuthorReply
                      ? styles.answeredBadge
                      : styles.waitingBadge
                  }
                >
                  {hasAuthorReply
                    ? "Yanıtlandı"
                    : "Yanıt bekliyor"}
                </span>
              )}

              {comment.replies.length >
                0 && (
                <div
                  aria-label="Yorum yanıtları"
                  className={
                    styles.replies
                  }
                >
                  {comment.replies.map(
                    (reply) => (
                      <Reply
                        key={reply.id}
                        reply={reply}
                      />
                    ),
                  )}
                </div>
              )}

              {authorMode &&
                !hasAuthorReply && (
                <details
                  className={
                    styles.replyComposer
                  }
                >
                  <summary>
                    Okura Yanıt Ver
                  </summary>

                  <form
                    action={
                      createCommentReplyAction
                    }
                  >
                    <input
                      name="parentId"
                      type="hidden"
                      value={comment.id}
                    />

                    <input
                      name="returnPath"
                      type="hidden"
                      value={returnPath}
                    />

                    <label
                      htmlFor={`yanit-metni-${comment.id}`}
                    >
                      Yazarın yanıtı
                    </label>

                    <textarea
                      id={`yanit-metni-${comment.id}`}
                      maxLength={600}
                      minLength={3}
                      name="content"
                      placeholder="Okurunuza yanıtınızı yazın..."
                      required
                      rows={4}
                    />

                    <div
                      className={
                        styles.replyActions
                      }
                    >
                      <small>
                        En fazla 600 karakter
                      </small>

                      <button
                        className="button button--outline"
                        type="submit"
                      >
                        Yanıtı Gönder
                      </button>
                    </div>
                  </form>
                </details>
              )}
            </div>
          </article>
        );
      })}
    </div>
  );
}
