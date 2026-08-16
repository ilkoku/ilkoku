import { getEmailSiteUrl } from "./config";
import { sendEmail } from "./send-email";

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

export async function sendPublisherDiscoveryShareEmail(input: {
  email: string;
  entityKind: "author" | "work";
  entityTitle: string;
  idempotencyKey: string;
  note: string;
  publisherName: string;
  targetPath: string;
}) {
  const targetUrl = new URL(
    input.targetPath,
    getEmailSiteUrl(),
  ).toString();
  const entityLabel =
    input.entityKind === "work"
      ? "eseri"
      : "yazarı";

  return sendEmail({
    channel: "publisher",
    html: `
      <h1>${escapeHtml(input.publisherName)} sizinle bir İlkOku kaydı paylaştı</h1>
      <p><strong>${escapeHtml(input.entityTitle)}</strong> ${entityLabel} incelemeniz için paylaşıldı.</p>
      <blockquote>${escapeHtml(input.note)}</blockquote>
      <p><a href="${escapeHtml(targetUrl)}">Paylaşılan kaydı aç</a></p>
    `.trim(),
    idempotencyKey: input.idempotencyKey,
    subject:
      `${input.publisherName} bir ${input.entityKind === "work" ? "eser" : "yazar"} paylaştı`,
    template: "publisher_discovery_share_email",
    text: [
      `${input.publisherName} sizinle bir İlkOku kaydı paylaştı.`,
      "",
      input.entityTitle,
      input.note,
      "",
      targetUrl,
    ].join("\n"),
    to: input.email,
  });
}