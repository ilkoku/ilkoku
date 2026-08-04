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

export async function sendExternalEditorInvitationEmail(input: {
  email: string;
  inviterName: string;
  inviteUrl: string;
  workTitle: string;
}) {
  const inviterName = escapeHtml(input.inviterName);
  const workTitle = escapeHtml(input.workTitle);
  const inviteUrl = escapeHtml(input.inviteUrl);

  return sendEmail({
    channel: "editor",
    html: `
      <h1>İlkOku editör daveti</h1>
      <p><strong>${inviterName}</strong>, sizi <strong>${workTitle}</strong> eseri için editör olarak davet etti.</p>
      <p><a href="${inviteUrl}">Daveti kabul et</a></p>
      <p>Bu güvenli bağlantı 7 gün geçerlidir.</p>
    `.trim(),
    subject: `Editör daveti: ${input.workTitle}`,
    template: "external_editor_invitation",
    text: [
      "İlkOku editör daveti",
      "",
      `${input.inviterName}, sizi ${input.workTitle} eseri için editör olarak davet etti.`,
      input.inviteUrl,
      "",
      "Bu güvenli bağlantı 7 gün geçerlidir.",
    ].join("\n"),
    to: input.email,
  });
}

export async function sendEditorRecommendationEmail(input: {
  editorName: string;
  email: string;
  senderName: string;
  workId: string;
  workTitle: string;
}) {
  const editorName = escapeHtml(input.editorName);
  const senderName = escapeHtml(input.senderName);
  const workTitle = escapeHtml(input.workTitle);
  const workUrl = absoluteUrl(
    `/editor/incelemeler/${encodeURIComponent(input.workId)}`,
  );

  return sendEmail({
    channel: "editor",
    html: `
      <h1>Size bir eser önerildi</h1>
      <p>Merhaba ${editorName},</p>
      <p><strong>${senderName}</strong>, <strong>${workTitle}</strong> eserini size önerdi.</p>
      <p><a href="${escapeHtml(workUrl)}">Eseri incele</a></p>
    `.trim(),
    subject: `Editör önerisi: ${input.workTitle}`,
    template: "editor_work_recommendation",
    text: [
      `Merhaba ${input.editorName},`,
      "",
      `${input.senderName}, ${input.workTitle} eserini size önerdi.`,
      workUrl,
    ].join("\n"),
    to: input.email,
  });
}

export async function sendSecondEditorAssignmentEmail(input: {
  editorName: string;
  email: string;
  workId: string;
  workTitle: string;
}) {
  const workUrl = absoluteUrl(
    `/editor/incelemeler/${encodeURIComponent(input.workId)}`,
  );

  return sendEmail({
    channel: "editor",
    html: `
      <h1>İkinci editör görevi</h1>
      <p>Merhaba ${escapeHtml(input.editorName)},</p>
      <p><strong>${escapeHtml(input.workTitle)}</strong> eseri ikinci editör incelemesi için size atandı.</p>
      <p><a href="${escapeHtml(workUrl)}">Görevi aç</a></p>
    `.trim(),
    subject: `İkinci editör görevi: ${input.workTitle}`,
    template: "second_editor_assignment",
    text: [
      `Merhaba ${input.editorName},`,
      "",
      `${input.workTitle} eseri ikinci editör incelemesi için size atandı.`,
      workUrl,
    ].join("\n"),
    to: input.email,
  });
}

export async function sendAuthorEditorStatusEmail(input: {
  email: string;
  fullName: string;
  stage:
    | "claimed"
    | "first_completed"
    | "completed";
  workId: string;
  workTitle: string;
}) {
  const states = {
    claimed: {
      subject: "Eseriniz editör incelemesine alındı",
      text: "Eseriniz profesyonel bir editör tarafından incelemeye alındı.",
      title: "Editör incelemesi başladı",
    },
    first_completed: {
      subject: "Birinci editör incelemesi tamamlandı",
      text: "Birinci editör raporu tamamlandı. Eseriniz ikinci editör aşamasına hazır.",
      title: "Birinci editör raporu tamamlandı",
    },
    completed: {
      subject: "Profesyonel editör incelemesi tamamlandı",
      text: "Eserinizin profesyonel editör incelemesi tamamlandı. Raporunuzu görüntüleyebilirsiniz.",
      title: "Editör incelemesi tamamlandı",
    },
  } as const;

  const state = states[input.stage];
  const feedbackUrl = absoluteUrl("/geri-bildirimler");

  return sendEmail({
    channel: "editor",
    html: `
      <h1>${escapeHtml(state.title)}</h1>
      <p>Merhaba ${escapeHtml(input.fullName)},</p>
      <p><strong>${escapeHtml(input.workTitle)}</strong> için ${escapeHtml(state.text)}</p>
      <p><a href="${escapeHtml(feedbackUrl)}">Editör sürecini görüntüle</a></p>
    `.trim(),
    subject: `${state.subject}: ${input.workTitle}`,
    template: `author_editor_${input.stage}`,
    text: [
      `Merhaba ${input.fullName},`,
      "",
      `${input.workTitle} için ${state.text}`,
      feedbackUrl,
    ].join("\n"),
    to: input.email,
  });
}
