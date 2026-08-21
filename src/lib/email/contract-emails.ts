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

function absoluteUrl(pathname: string) {
  return new URL(pathname, getEmailSiteUrl()).toString();
}

export async function sendUserContractAssignedEmail(input: {
  contractId: string;
  email: string;
  fullName: string;
  title: string;
}) {
  const targetUrl = absoluteUrl(
    `/sozlesmelerim/${encodeURIComponent(input.contractId)}`,
  );

  return sendEmail({
    channel: "system",
    html: `
      <h1>Yeni sözleşmeniz var</h1>
      <p>Merhaba ${escapeHtml(input.fullName)},</p>
      <p><strong>${escapeHtml(input.title)}</strong> inceleme ve yanıtınız için İlkOku hesabınıza gönderildi.</p>
      <p>Sözleşmenin tam ve değişmez kopyasını güvenli hesabınızdan görüntüleyebilirsiniz.</p>
      <p><a href="${escapeHtml(targetUrl)}">Sözleşmeyi görüntüle</a></p>
      <p>Bu e-posta sözleşme metninin kendisini içermez.</p>
    `.trim(),
    idempotencyKey: `user-contract:${input.contractId}:sent`,
    subject: `İlkOku · Yeni sözleşme: ${input.title}`,
    template: "user_contract_sent",
    text: [
      `Merhaba ${input.fullName},`,
      "",
      `${input.title} inceleme ve yanıtınız için İlkOku hesabınıza gönderildi.`,
      "Sözleşmenin tam ve değişmez kopyasını güvenli hesabınızdan görüntüleyebilirsiniz.",
      "",
      targetUrl,
      "",
      "Bu e-posta sözleşme metninin kendisini içermez.",
    ].join("\n"),
    to: input.email,
  });
}
