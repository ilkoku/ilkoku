import {
  getEmailSiteUrl,
} from "./config";
import {
  sendEmail,
} from "./send-email";

function escapeHtml(
  value: string,
) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll(
      "'",
      "&#039;",
    );
}

function createLink(
  pathname: string,
  token: string,
) {
  const url = new URL(
    pathname,
    getEmailSiteUrl(),
  );

  url.searchParams.set(
    "token",
    token,
  );

  return url.toString();
}

export async function sendVerificationEmail(
  input: {
    email: string;
    fullName: string;
    token: string;
  },
) {
  const verificationUrl =
    createLink(
      "/auth/confirm",
      input.token,
    );

  const safeName =
    escapeHtml(
      input.fullName,
    );

  return sendEmail({
    channel: "system",
    html: `
      <h1>E-posta adresinizi doğrulayın</h1>
      <p>Merhaba ${safeName},</p>
      <p>İlkOku hesabınızı doğrulamak için aşağıdaki bağlantıyı kullanın.</p>
      <p><a href="${verificationUrl}">E-posta adresimi doğrula</a></p>
      <p>Bu bağlantı 24 saat geçerlidir.</p>
    `.trim(),
    subject:
      "İlkOku e-posta doğrulaması",
    template:
      "email_verification",
    text: [
      `Merhaba ${input.fullName},`,
      "",
      "İlkOku hesabınızı doğrulamak için:",
      verificationUrl,
      "",
      "Bu bağlantı 24 saat geçerlidir.",
    ].join("\n"),
    to: input.email,
  });
}

export async function sendPasswordResetEmail(
  input: {
    email: string;
    fullName: string;
    token: string;
  },
) {
  const resetUrl =
    createLink(
      "/sifre-yenile",
      input.token,
    );

  const safeName =
    escapeHtml(
      input.fullName,
    );

  return sendEmail({
    channel: "system",
    html: `
      <h1>Şifrenizi yenileyin</h1>
      <p>Merhaba ${safeName},</p>
      <p>İlkOku şifrenizi yenilemek için aşağıdaki bağlantıyı kullanın.</p>
      <p><a href="${resetUrl}">Şifremi yenile</a></p>
      <p>Bu bağlantı 1 saat geçerlidir.</p>
    `.trim(),
    subject:
      "İlkOku şifre yenileme bağlantısı",
    template:
      "password_reset",
    text: [
      `Merhaba ${input.fullName},`,
      "",
      "İlkOku şifrenizi yenilemek için:",
      resetUrl,
      "",
      "Bu bağlantı 1 saat geçerlidir.",
    ].join("\n"),
    to: input.email,
  });
}
