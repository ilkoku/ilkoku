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

function absoluteUrl(
  pathname: string,
) {
  return new URL(
    pathname,
    getEmailSiteUrl(),
  ).toString();
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

export async function sendPasswordChangedEmail(
  input: {
    changedAt?: Date;
    email: string;
    fullName: string;
    otherSessionsClosed: boolean;
    source:
      | "password_reset"
      | "profile";
  },
) {
  const changedAt =
    input.changedAt ?? new Date();
  const changedAtText =
    new Intl.DateTimeFormat(
      "tr-TR",
      {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Europe/Istanbul",
      },
    ).format(changedAt);
  const recoveryUrl =
    absoluteUrl(
      "/sifremi-unuttum",
    );
  const loginUrl =
    absoluteUrl("/giris");
  const sourceText =
    input.source === "password_reset"
      ? "şifre yenileme bağlantısı kullanılarak"
      : "hesap güvenliği ekranından";
  const sessionText =
    input.otherSessionsClosed
      ? "Diğer açık oturumlar güvenlik amacıyla kapatıldı."
      : "Bu cihazdaki mevcut oturumunuz açık bırakıldı.";

  return sendEmail({
    channel: "system",
    html: `
      <h1>İlkOku şifreniz değiştirildi</h1>
      <p>Merhaba ${escapeHtml(input.fullName)},</p>
      <p>Hesap şifreniz ${escapeHtml(sourceText)} değiştirildi.</p>
      <p><strong>İşlem zamanı:</strong> ${escapeHtml(changedAtText)}</p>
      <p>${escapeHtml(sessionText)}</p>
      <p>Bu işlemi siz yaptıysanız başka bir işlem yapmanız gerekmez.</p>
      <p>Bu işlemi siz yapmadıysanız hemen yeni bir şifre oluşturun:</p>
      <p><a href="${escapeHtml(recoveryUrl)}">Hesabımı güvene al</a></p>
      <p><a href="${escapeHtml(loginUrl)}">İlkOku giriş sayfası</a></p>
    `.trim(),
    subject:
      "Güvenlik bildirimi: İlkOku şifreniz değiştirildi",
    template:
      "password_changed",
    text: [
      `Merhaba ${input.fullName},`,
      "",
      `Hesap şifreniz ${sourceText} değiştirildi.`,
      `İşlem zamanı: ${changedAtText}`,
      sessionText,
      "",
      "Bu işlemi siz yapmadıysanız hemen yeni bir şifre oluşturun:",
      recoveryUrl,
      "",
      `Giriş: ${loginUrl}`,
    ].join("\n"),
    to: input.email,
  });
}

export async function sendNewDeviceLoginEmail(
  input: {
    device: string;
    email: string;
    fullName: string;
    ipAddress?: string | null;
    loggedInAt?: Date;
  },
) {
  const loggedInAt =
    input.loggedInAt ?? new Date();
  const loggedInAtText =
    new Intl.DateTimeFormat(
      "tr-TR",
      {
        dateStyle: "long",
        timeStyle: "short",
        timeZone: "Europe/Istanbul",
      },
    ).format(loggedInAt);
  const recoveryUrl =
    absoluteUrl(
      "/sifremi-unuttum",
    );
  const accountUrl =
    absoluteUrl("/hesabim");
  const ipText =
    input.ipAddress ||
    "Belirlenemedi";

  return sendEmail({
    channel: "system",
    html: `
      <h1>Yeni bir cihazdan giriş yapıldı</h1>
      <p>Merhaba ${escapeHtml(input.fullName)},</p>
      <p>İlkOku hesabınıza yeni veya daha önce tanınmayan bir cihazdan giriş yapıldı.</p>
      <p><strong>Cihaz:</strong> ${escapeHtml(input.device)}</p>
      <p><strong>İşlem zamanı:</strong> ${escapeHtml(loggedInAtText)}</p>
      <p><strong>IP adresi:</strong> ${escapeHtml(ipText)}</p>
      <p>Bu giriş size aitse herhangi bir işlem yapmanız gerekmez.</p>
      <p>Bu giriş size ait değilse hemen şifrenizi değiştirin:</p>
      <p><a href="${escapeHtml(recoveryUrl)}">Hesabımı güvene al</a></p>
      <p><a href="${escapeHtml(accountUrl)}">Hesap güvenliği ayarları</a></p>
    `.trim(),
    subject:
      "Güvenlik bildirimi: Yeni bir cihazdan giriş yapıldı",
    template:
      "new_device_login",
    text: [
      `Merhaba ${input.fullName},`,
      "",
      "İlkOku hesabınıza yeni veya daha önce tanınmayan bir cihazdan giriş yapıldı.",
      `Cihaz: ${input.device}`,
      `İşlem zamanı: ${loggedInAtText}`,
      `IP adresi: ${ipText}`,
      "",
      "Bu giriş size ait değilse hemen şifrenizi değiştirin:",
      recoveryUrl,
      "",
      `Hesap güvenliği: ${accountUrl}`,
    ].join("\n"),
    to: input.email,
  });
}
