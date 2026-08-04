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

function valueOf(key: string) {
  return process.env[key]?.trim() || "";
}

function shouldUseChannelSenderAddresses() {
  return (
    valueOf("MAIL_ALLOW_CHANNEL_SENDERS")
      .toLowerCase() === "true"
  );
}

export function getEmailSender(
  channel: EmailChannel,
) {
  const key =
    environmentKeys[channel];
  const smtpUser =
    valueOf("SMTP_USER");
  const configuredAddress =
    valueOf(key);
  const forceAuthenticatedSender =
    process.env.NODE_ENV === "production" &&
    Boolean(smtpUser) &&
    !shouldUseChannelSenderAddresses();

  return {
    address:
      forceAuthenticatedSender
        ? smtpUser
        : configuredAddress ||
          smtpUser ||
          addresses[channel],
    name: displayNames[channel],
  };
}

export function getEmailReplyTo() {
  return (
    valueOf("MAIL_REPLY_TO") ||
    valueOf("SMTP_USER") ||
    addresses.support
  );
}

export function getEmailDeliveryMode() {
  const configuredMode =
    valueOf("EMAIL_DELIVERY_MODE")
      .toLowerCase();

  if (configuredMode === "smtp") {
    return "smtp";
  }

  if (configuredMode === "local") {
    return "local";
  }

  const smtpReady = Boolean(
    valueOf("SMTP_HOST") &&
    valueOf("SMTP_USER") &&
    valueOf("SMTP_PASSWORD"),
  );

  return (
    process.env.NODE_ENV === "production" &&
    smtpReady
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
