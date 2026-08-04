export type EmailChannel =
  | "default"
  | "system"
  | "support"
  | "editor"
  | "publisher";

const addresses: Record<
  EmailChannel,
  string
> = {
  default: "ilkoku@ilkoku.com",
  support: "destek@ilkoku.com",
  editor: "editor@ilkoku.com",
  system: "noreply@ilkoku.com",
  publisher: "yayinevi@ilkoku.com",
};

const environmentKeys: Record<
  EmailChannel,
  string
> = {
  default: "MAIL_FROM_DEFAULT",
  support: "MAIL_FROM_SUPPORT",
  editor: "MAIL_FROM_EDITOR",
  system: "MAIL_FROM_SYSTEM",
  publisher: "MAIL_FROM_PUBLISHER",
};

const displayNames: Record<
  EmailChannel,
  string
> = {
  default: "İlkOku",
  support: "İlkOku Destek",
  editor: "İlkOku Editör",
  system: "İlkOku Sistem",
  publisher: "İlkOku Yayınevi",
};

export function getEmailSender(
  channel: EmailChannel,
) {
  const key =
    environmentKeys[channel];

  return {
    address:
      process.env[key] ||
      addresses[channel],
    name: displayNames[channel],
  };
}

export function getEmailReplyTo() {
  return (
    process.env.MAIL_REPLY_TO ||
    addresses.support
  );
}

export function getEmailDeliveryMode() {
  return (
    process.env.EMAIL_DELIVERY_MODE ===
      "smtp"
      ? "smtp"
      : "local"
  );
}

export function getEmailSiteUrl() {
  if (
    getEmailDeliveryMode() ===
    "local"
  ) {
    return (
      process.env
        .EMAIL_LOCAL_SITE_URL ||
      "http://localhost:3000"
    );
  }

  return (
    process.env
      .NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    "https://ilkoku.com"
  );
}
