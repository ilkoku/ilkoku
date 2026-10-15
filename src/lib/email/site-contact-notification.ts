import { getEmailSiteUrl } from "./config";
import { sendEmail } from "./send-email";
import { siteContact } from "@/lib/site-contact";

export type SiteContactSubmission = {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function recipient() {
  const configured = process.env.SITE_CONTACT_NOTIFICATION_EMAIL?.trim();
  if (configured && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(configured)) {
    return configured;
  }
  return siteContact.generalEmail;
}

export async function sendSiteContactNotification(input: SiteContactSubmission) {
  const dashboardUrl = new URL("/icerik/formlar", getEmailSiteUrl()).toString();
  const safeSubject = input.subject || "Genel talep";
  const rows = [
    ["Gönderen", input.name],
    ["E-posta", input.email],
    ["Konu", safeSubject],
  ].map(([label, value]) =>
    `<p><strong>${escapeHtml(label)}:</strong> ${escapeHtml(value)}</p>`
  ).join("\n");

  return sendEmail({
    channel: "support",
    to: recipient(),
    subject: "İlkOku — Yeni iletişim formu mesajı",
    template: "site_contact_notification",
    // A browser retry or notification retry must not duplicate an email for this saved submission.
    idempotencyKey: `site-contact-notification:${input.id}`,
    text: [
      "İlkOku — Yeni iletişim formu mesajı",
      "",
      `Gönderen: ${input.name}`,
      `E-posta: ${input.email}`,
      `Konu: ${safeSubject}`,
      "",
      "Mesaj:",
      input.message,
      "",
      `Formlar & Talepler: ${dashboardUrl}`,
    ].join("\n"),
    html: [
      "<h1>Yeni iletişim formu mesajı</h1>",
      rows,
      `<p><strong>Mesaj:</strong></p><pre style="white-space:pre-wrap;font-family:inherit">${escapeHtml(input.message)}</pre>`,
      `<p><a href="${escapeHtml(dashboardUrl)}">Formlar &amp; Talepler panelini aç</a></p>`,
    ].join("\n"),
  });
}
