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

export async function sendRoleRequestDecisionEmail(input: {
  decision:
    | "approved"
    | "changes_requested"
    | "rejected";
  email: string;
  fullName: string;
  note?: string | null;
  requestedRole:
    | "editor"
    | "publisher";
}) {
  const roleLabel =
    input.requestedRole === "editor"
      ? "editör"
      : "yayınevi";

  const states = {
    approved: {
      detail:
        `${roleLabel} başvurunuz onaylandı. Çalışma alanınıza erişebilirsiniz.`,
      subject:
        `${roleLabel} başvurunuz onaylandı`,
    },
    changes_requested: {
      detail:
        `${roleLabel} başvurunuz için düzeltme gerekiyor.`,
      subject:
        `${roleLabel} başvurunuz için düzeltme gerekiyor`,
    },
    rejected: {
      detail:
        `${roleLabel} başvurunuz mevcut bilgilerle onaylanmadı.`,
      subject:
        `${roleLabel} başvurunuz sonuçlandı`,
    },
  } as const;

  const state = states[input.decision];

  const targetUrl = absoluteUrl(
    input.requestedRole === "editor"
      ? "/editor"
      : "/yayinevi",
  );

  const noteText =
    input.note?.trim() || "";

  return sendEmail({
    channel:
      input.requestedRole === "editor"
        ? "editor"
        : "publisher",
    html: `
      <h1>${escapeHtml(state.subject)}</h1>
      <p>Merhaba ${escapeHtml(input.fullName)},</p>
      <p>${escapeHtml(state.detail)}</p>
      ${
        noteText
          ? `<p><strong>Yönetici notu:</strong> ${escapeHtml(noteText)}</p>`
          : ""
      }
      <p><a href="${escapeHtml(targetUrl)}">İlkOku hesabını aç</a></p>
    `.trim(),
    subject: state.subject,
    template:
      `${input.requestedRole}_application_${input.decision}`,
    text: [
      `Merhaba ${input.fullName},`,
      "",
      state.detail,
      ...(noteText
        ? ["", `Yönetici notu: ${noteText}`]
        : []),
      "",
      targetUrl,
    ].join("\n"),
    to: input.email,
  });
}

export async function sendPublisherSubmissionDecisionEmail(input: {
  email: string;
  fullName: string;
  note?: string | null;
  status:
    | "reviewing"
    | "accepted"
    | "rejected";
  submissionId: string;
  workTitle: string;
}) {
  const states = {
    reviewing: {
      detail:
        "Yayınevi eser başvurunuzu incelemeye aldı.",
      subject:
        "Eser başvurunuz inceleniyor",
    },
    accepted: {
      detail:
        "Yayınevi eser başvurunuzu kabul etti.",
      subject:
        "Eser başvurunuz kabul edildi",
    },
    rejected: {
      detail:
        "Yayınevi eser başvurunuzu sonuçlandırdı.",
      subject:
        "Eser başvurunuz sonuçlandı",
    },
  } as const;

  const state = states[input.status];
  const noteText =
    input.note?.trim() || "";

  const targetUrl = absoluteUrl(
    `/yayinevleri?basvuru=${encodeURIComponent(input.submissionId)}`,
  );

  return sendEmail({
    channel: "publisher",
    html: `
      <h1>${escapeHtml(state.subject)}</h1>
      <p>Merhaba ${escapeHtml(input.fullName)},</p>
      <p><strong>${escapeHtml(input.workTitle)}</strong> için ${escapeHtml(state.detail)}</p>
      ${
        noteText
          ? `<p><strong>Yayınevi notu:</strong> ${escapeHtml(noteText)}</p>`
          : ""
      }
      <p><a href="${escapeHtml(targetUrl)}">Başvuru durumunu görüntüle</a></p>
    `.trim(),
    subject:
      `${state.subject}: ${input.workTitle}`,
    template:
      `publisher_submission_${input.status}`,
    text: [
      `Merhaba ${input.fullName},`,
      "",
      `${input.workTitle} için ${state.detail}`,
      ...(noteText
        ? ["", `Yayınevi notu: ${noteText}`]
        : []),
      "",
      targetUrl,
    ].join("\n"),
    to: input.email,
  });
}

export async function sendPublisherContractEmail(input: {
  email: string;
  fullName: string;
  idempotencyKey: string;
  submissionId: string;
  workTitle: string;
}) {
  const targetUrl = absoluteUrl(
    `/yayinevleri?basvuru=${encodeURIComponent(input.submissionId)}`,
  );

  return sendEmail({
    channel: "publisher",
    html: `
      <h1>Yayınevi sözleşmesi gönderildi</h1>
      <p>Merhaba ${escapeHtml(input.fullName)},</p>
      <p><strong>${escapeHtml(input.workTitle)}</strong> eseriniz için yayınevi sözleşmesi gönderildi.</p>
      <p><a href="${escapeHtml(targetUrl)}">Sözleşmeyi görüntüle</a></p>
    `.trim(),
    idempotencyKey: input.idempotencyKey,
    subject:
      `Yayınevi sözleşmesi: ${input.workTitle}`,
    template:
      "publisher_contract_sent",
    text: [
      `Merhaba ${input.fullName},`,
      "",
      `${input.workTitle} eseriniz için yayınevi sözleşmesi gönderildi.`,
      targetUrl,
    ].join("\n"),
    to: input.email,
  });
}

export async function sendPublisherTeamInvitationEmail(input: {
  email: string;
  inviterName: string;
  permissions: string[];
  publisherName: string;
  rawToken: string;
  role: string;
}) {
  const inviteUrl = absoluteUrl(
    `/yayinevi/davet/${encodeURIComponent(input.rawToken)}`,
  );
  const permissionItems = input.permissions
    .map((permission) => `<li>${escapeHtml(permission)}</li>`)
    .join("");

  return sendEmail({
    channel: "publisher",
    html: `
      <h1>Yayınevi ekip daveti</h1>
      <p><strong>${escapeHtml(input.inviterName)}</strong>, sizi <strong>${escapeHtml(input.publisherName)}</strong> yayınevi ekibine davet etti.</p>
      <p>Ekip rolü: <strong>${escapeHtml(input.role)}</strong></p>
      <p><strong>Bu çalışma alanındaki yetkileriniz:</strong></p>
      <ul>${permissionItems}</ul>
      <p><a href="${escapeHtml(inviteUrl)}">Daveti kabul et</a></p>
      <p>Bu güvenli bağlantı 7 gün geçerlidir.</p>
    `.trim(),
    subject: `${input.publisherName} ekip daveti`,
    template: "publisher_team_invitation",
    text: [
      "İlkOku yayınevi ekip daveti",
      "",
      `${input.inviterName}, sizi ${input.publisherName} yayınevi ekibine davet etti.`,
      `Ekip rolü: ${input.role}`,
      "Bu çalışma alanındaki yetkileriniz:",
      ...input.permissions.map((permission) => `- ${permission}`),
      "",
      inviteUrl,
      "",
      "Bu güvenli bağlantı 7 gün geçerlidir.",
    ].join("\n"),
    to: input.email,
  });
}
