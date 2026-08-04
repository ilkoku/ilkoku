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

export async function sendEditorInviteAcceptedEmail(input: {
  acceptedEditorName: string;
  email: string;
  inviterName: string;
  workId: string;
  workTitle: string;
}) {
  const workUrl = absoluteUrl(
    `/editor/incelemeler/${encodeURIComponent(input.workId)}`,
  );

  return sendEmail({
    channel: "editor",
    html: `
      <h1>Editör davetiniz kabul edildi</h1>
      <p>Merhaba ${escapeHtml(input.inviterName)},</p>
      <p><strong>${escapeHtml(input.acceptedEditorName)}</strong>, <strong>${escapeHtml(input.workTitle)}</strong> eseri için gönderdiğiniz editör davetini kabul etti.</p>
      <p><a href="${escapeHtml(workUrl)}">Eser sürecini görüntüle</a></p>
    `.trim(),
    subject: `Editör daveti kabul edildi: ${input.workTitle}`,
    template: "editor_invitation_accepted",
    text: [
      `Merhaba ${input.inviterName},`,
      "",
      `${input.acceptedEditorName}, ${input.workTitle} eseri için gönderdiğiniz editör davetini kabul etti.`,
      workUrl,
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

export async function sendAuthorReviewRequestReceivedEmail(input: {
  email: string;
  fullName: string;
  workId: string;
  workTitle: string;
}) {
  const feedbackUrl = absoluteUrl("/geri-bildirimler");

  return sendEmail({
    channel: "editor",
    html: `
      <h1>Editör inceleme talebiniz alındı</h1>
      <p>Merhaba ${escapeHtml(input.fullName)},</p>
      <p><strong>${escapeHtml(input.workTitle)}</strong> için profesyonel editör inceleme talebiniz genel editör havuzuna alındı.</p>
      <p>Bir editör görevi aldığında ayrıca bilgilendirileceksiniz.</p>
      <p><a href="${escapeHtml(feedbackUrl)}">Editör sürecini görüntüle</a></p>
    `.trim(),
    subject: `Editör inceleme talebi alındı: ${input.workTitle}`,
    template: "author_editor_request_received",
    text: [
      `Merhaba ${input.fullName},`,
      "",
      `${input.workTitle} için profesyonel editör inceleme talebiniz genel editör havuzuna alındı.`,
      "Bir editör görevi aldığında ayrıca bilgilendirileceksiniz.",
      feedbackUrl,
    ].join("\n"),
    to: input.email,
  });
}

export async function sendAuthorSecondEditorStatusEmail(input: {
  email: string;
  fullName: string;
  stage: "assigned" | "started";
  workId: string;
  workTitle: string;
}) {
  const states = {
    assigned: {
      subject: "Eseriniz ikinci editöre atandı",
      text: "Eseriniz ikinci editör incelemesi için bir platform editörüne atandı.",
      title: "İkinci editör atandı",
    },
    started: {
      subject: "İkinci editör incelemesi başladı",
      text: "İkinci editör görevi aldı ve bağımsız inceleme süreci başladı.",
      title: "İkinci editör incelemesi başladı",
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
    template: `author_second_editor_${input.stage}`,
    text: [
      `Merhaba ${input.fullName},`,
      "",
      `${input.workTitle} için ${state.text}`,
      feedbackUrl,
    ].join("\n"),
    to: input.email,
  });
}

export async function sendFirstEditorSecondReviewStatusEmail(input: {
  editorName: string;
  email: string;
  stage: "started" | "completed";
  workId: string;
  workTitle: string;
}) {
  const states = {
    started: {
      subject: "İkinci editör görevi alındı",
      text: "İkinci editör görevi aldı ve bağımsız inceleme sürecine başladı.",
      title: "İkinci editör süreci başladı",
    },
    completed: {
      subject: "İkinci editör incelemesi tamamlandı",
      text: "İkinci editör bağımsız incelemesini tamamladı. Nihai sonuç yazara iletildi.",
      title: "İkinci editör raporu tamamlandı",
    },
  } as const;
  const state = states[input.stage];
  const workUrl = absoluteUrl(
    `/editor/incelemeler/${encodeURIComponent(input.workId)}`,
  );

  return sendEmail({
    channel: "editor",
    html: `
      <h1>${escapeHtml(state.title)}</h1>
      <p>Merhaba ${escapeHtml(input.editorName)},</p>
      <p><strong>${escapeHtml(input.workTitle)}</strong> için ${escapeHtml(state.text)}</p>
      <p><a href="${escapeHtml(workUrl)}">Editör sürecini görüntüle</a></p>
    `.trim(),
    subject: `${state.subject}: ${input.workTitle}`,
    template: `first_editor_second_review_${input.stage}`,
    text: [
      `Merhaba ${input.editorName},`,
      "",
      `${input.workTitle} için ${state.text}`,
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
