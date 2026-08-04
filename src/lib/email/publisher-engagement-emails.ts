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

export async function sendAuthorPublisherInterestEmail(input: {
  email: string;
  fullName: string;
  kind:
    | "author_followed"
    | "work_liked";
  workSlug?: string;
  workTitle?: string;
}) {
  const state =
    input.kind === "work_liked"
      ? {
          detail:
            `Bir yayınevi ${input.workTitle ?? "eserinizi"} beğendi. Yayınevi kimliği, kurumsal anonimlik kuralı gereği bu aşamada paylaşılmaz.`,
          subject:
            "Bir yayınevi eserinizi beğendi",
          targetPath:
            input.workSlug
              ? `/kitap/${encodeURIComponent(input.workSlug)}`
              : "/eserlerim",
          template:
            "author_publisher_work_liked",
        }
      : {
          detail:
            "Bir yayınevi yazar profilinizi takip etmeye başladı. Yayınevi kimliği, kurumsal anonimlik kuralı gereği bu aşamada paylaşılmaz.",
          subject:
            "Bir yayınevi sizi takip etmeye başladı",
          targetPath:
            "/yazar",
          template:
            "author_publisher_followed",
        };
  const targetUrl = absoluteUrl(
    state.targetPath,
  );

  return sendEmail({
    channel: "publisher",
    html: `
      <h1>${escapeHtml(state.subject)}</h1>
      <p>Merhaba ${escapeHtml(input.fullName)},</p>
      <p>${escapeHtml(state.detail)}</p>
      <p><a href="${escapeHtml(targetUrl)}">İlkOku hesabını aç</a></p>
    `.trim(),
    subject: state.subject,
    template: state.template,
    text: [
      `Merhaba ${input.fullName},`,
      "",
      state.detail,
      "",
      targetUrl,
    ].join("\n"),
    to: input.email,
  });
}

export async function sendPublisherFollowedAuthorPublishedEmail(input: {
  authorName: string;
  email: string;
  memberName: string;
  workSlug: string;
  workTitle: string;
}) {
  const targetUrl = absoluteUrl(
    `/kitap/${encodeURIComponent(input.workSlug)}`,
  );

  return sendEmail({
    channel: "publisher",
    html: `
      <h1>Takip ettiğiniz yazar yeni eser yayımladı</h1>
      <p>Merhaba ${escapeHtml(input.memberName)},</p>
      <p><strong>${escapeHtml(input.authorName)}</strong>, <strong>${escapeHtml(input.workTitle)}</strong> adlı yeni eserini yayımladı.</p>
      <p><a href="${escapeHtml(targetUrl)}">Eseri incele</a></p>
    `.trim(),
    subject:
      `Yeni eser: ${input.workTitle}`,
    template:
      "publisher_followed_author_published",
    text: [
      `Merhaba ${input.memberName},`,
      "",
      `${input.authorName}, ${input.workTitle} adlı yeni eserini yayımladı.`,
      targetUrl,
    ].join("\n"),
    to: input.email,
  });
}

export async function sendPublisherInvitationAcceptedEmail(input: {
  acceptedMemberName: string;
  email: string;
  inviterName: string;
  publisherName: string;
}) {
  const targetUrl = absoluteUrl(
    "/yayinevi/uyeler",
  );

  return sendEmail({
    channel: "publisher",
    html: `
      <h1>Yayınevi ekip daveti kabul edildi</h1>
      <p>Merhaba ${escapeHtml(input.inviterName)},</p>
      <p><strong>${escapeHtml(input.acceptedMemberName)}</strong>, <strong>${escapeHtml(input.publisherName)}</strong> ekip davetini kabul etti.</p>
      <p><a href="${escapeHtml(targetUrl)}">Ekip üyelerini görüntüle</a></p>
    `.trim(),
    subject:
      `${input.publisherName} ekip daveti kabul edildi`,
    template:
      "publisher_team_invitation_accepted",
    text: [
      `Merhaba ${input.inviterName},`,
      "",
      `${input.acceptedMemberName}, ${input.publisherName} ekip davetini kabul etti.`,
      targetUrl,
    ].join("\n"),
    to: input.email,
  });
}
