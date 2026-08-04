import {
  getEmailSiteUrl,
} from "./config";
import {
  sendEmail,
} from "./send-email";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function absoluteUrl(pathname: string) {
  return new URL(
    pathname,
    getEmailSiteUrl(),
  ).toString();
}

export async function sendReaderCommentReplyEmail(input: {
  chapterPosition: number;
  commentId: string;
  email: string;
  readerName: string;
  workSlug: string;
  workTitle: string;
  writerName: string;
}) {
  const targetUrl = absoluteUrl(
    `/oku/${encodeURIComponent(input.workSlug)}/bolum-${input.chapterPosition}#yorum-${encodeURIComponent(input.commentId)}`,
  );

  return sendEmail({
    channel: "system",
    html: `
      <h1>Yazar yorumunuza yanıt verdi</h1>
      <p>Merhaba ${escapeHtml(input.readerName)},</p>
      <p><strong>${escapeHtml(input.writerName)}</strong>, <strong>${escapeHtml(input.workTitle)}</strong> eserindeki yorumunuza yanıt verdi.</p>
      <p><a href="${escapeHtml(targetUrl)}">Yanıtı görüntüle</a></p>
    `.trim(),
    subject:
      `Yazar yorumunuza yanıt verdi: ${input.workTitle}`,
    template:
      "reader_comment_reply",
    text: [
      `Merhaba ${input.readerName},`,
      "",
      `${input.writerName}, ${input.workTitle} eserindeki yorumunuza yanıt verdi.`,
      targetUrl,
    ].join("\n"),
    to: input.email,
  });
}

export async function sendReaderFavoriteWorkUpdateEmail(input: {
  chapterPosition: number;
  chapterTitle: string;
  email: string;
  readerName: string;
  workSlug: string;
  workTitle: string;
}) {
  const targetUrl = absoluteUrl(
    `/oku/${encodeURIComponent(input.workSlug)}/bolum-${input.chapterPosition}`,
  );

  return sendEmail({
    channel: "system",
    html: `
      <h1>Favorinizdeki esere yeni bölüm eklendi</h1>
      <p>Merhaba ${escapeHtml(input.readerName)},</p>
      <p><strong>${escapeHtml(input.workTitle)}</strong> eserinin <strong>${escapeHtml(input.chapterTitle)}</strong> bölümü yayımlandı.</p>
      <p><a href="${escapeHtml(targetUrl)}">Yeni bölümü oku</a></p>
    `.trim(),
    subject:
      `Yeni bölüm: ${input.workTitle}`,
    template:
      "reader_favorite_work_new_chapter",
    text: [
      `Merhaba ${input.readerName},`,
      "",
      `${input.workTitle} eserinin ${input.chapterTitle} bölümü yayımlandı.`,
      targetUrl,
    ].join("\n"),
    to: input.email,
  });
}
