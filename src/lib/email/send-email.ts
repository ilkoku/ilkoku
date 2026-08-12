import {
  randomUUID,
} from "node:crypto";
import {
  mkdir,
  writeFile,
} from "node:fs/promises";
import path from "node:path";
import nodemailer from "nodemailer";
import {
  getOptionalEmailCategory,
  shouldSendOptionalEmail,
} from "@/lib/notification-preferences";
import { prisma } from "@/lib/prisma";
import {
  getEmailDeliveryMode,
  getEmailReplyTo,
  getEmailSender,
  type EmailChannel,
} from "./config";
import {
  attachEmailDeliveryDedupe,
  buildEmailDedupeKey,
  claimEmailDeliveryDedupe,
} from "./dedupe";

export type SendEmailInput = {
  channel: EmailChannel;
  html: string;
  idempotencyKey?: string;
  subject: string;
  template: string;
  text: string;
  to: string;
};

function safeRecipient(
  value: string,
) {
  return value
    .toLowerCase()
    .replace(
      /[^a-z0-9@._-]+/g,
      "-",
    )
    .slice(0, 100);
}

async function writeLocalOutbox(
  input: SendEmailInput,
) {
  const directory =
    process.env
      .EMAIL_OUTBOX_DIR ||
    "/tmp/ilkoku-mail-outbox";

  await mkdir(
    directory,
    { recursive: true },
  );

  const sender =
    getEmailSender(
      input.channel,
    );

  const filename = [
    Date.now(),
    safeRecipient(input.to),
    randomUUID(),
  ].join("-") + ".json";

  const fullPath =
    path.join(
      directory,
      filename,
    );

  await writeFile(
    fullPath,
    JSON.stringify(
      {
        channel:
          input.channel,
        createdAt:
          new Date()
            .toISOString(),
        from:
          sender.address,
        fromName:
          sender.name,
        html:
          input.html,
        replyTo:
          getEmailReplyTo(),
        subject:
          input.subject,
        template:
          input.template,
        text:
          input.text,
        to:
          input.to,
      },
      null,
      2,
    ),
    {
      encoding: "utf8",
      mode: 0o600,
    },
  );

  return {
    delivery:
      "local" as const,
    id: filename,
  };
}

function getSmtpPassword() {
  const encoded =
    process.env
      .SMTP_PASSWORD_B64?.trim();

  if (encoded) {
    const decoded =
      Buffer.from(
        encoded,
        "base64",
      ).toString("utf8");

    if (!decoded) {
      throw new Error(
        "SMTP_PASSWORD_B64_INVALID",
      );
    }

    return decoded;
  }

  return process.env.SMTP_PASSWORD;
}

async function sendWithSmtp(
  input: SendEmailInput,
) {
  const host =
    process.env.SMTP_HOST?.trim();

  const port =
    Number(
      process.env.SMTP_PORT ||
      465,
    );

  const user =
    process.env.SMTP_USER?.trim();

  const password =
    getSmtpPassword();

  if (
    !host ||
    !user ||
    !password ||
    !Number.isFinite(port)
  ) {
    throw new Error(
      "SMTP_CONFIGURATION_MISSING",
    );
  }

  const sender =
    getEmailSender(
      input.channel,
    );

  const transport =
    nodemailer.createTransport({
      auth: {
        pass: password,
        user,
      },
      connectionTimeout:
        10_000,
      greetingTimeout:
        10_000,
      host,
      port,
      secure:
        process.env
          .SMTP_SECURE !==
        "false",
      socketTimeout:
        20_000,
    });

  try {
    const result =
      await transport.sendMail({
        envelope: {
          from: user,
          to: input.to,
        },
        from: {
          address:
            sender.address,
          name:
            sender.name,
        },
        html:
          input.html,
        replyTo:
          getEmailReplyTo(),
        subject:
          input.subject,
        text:
          input.text,
        to:
          input.to,
      });

    return {
      delivery:
        "smtp" as const,
      id:
        result.messageId,
    };
  } finally {
    transport.close();
  }
}

function emailFailureDetails(
  error: unknown,
) {
  const message =
    error instanceof Error
      ? error.message
      : "UNKNOWN_EMAIL_ERROR";

  const firstToken =
    message
      .split(/[\s:]+/, 1)[0]
      ?.trim() ||
    "UNKNOWN_EMAIL_ERROR";

  return {
    failureCode:
      firstToken.slice(0, 120),
    failureMessage:
      message.slice(0, 1000),
  };
}

export async function sendEmail(
  input: SendEmailInput,
) {
  const optionalCategory =
    getOptionalEmailCategory(
      input.template,
    );

  if (
    optionalCategory &&
    !(await shouldSendOptionalEmail(
      input.to,
      optionalCategory,
    ))
  ) {
    return {
      delivery:
        "skipped" as const,
      deliveryId: undefined,
      id:
        "preference-disabled",
    };
  }

  const dedupeKey =
    buildEmailDedupeKey(
      input,
      Boolean(optionalCategory),
    );

  const dedupeClaim =
    await claimEmailDeliveryDedupe(
      dedupeKey,
    );

  if (
    !dedupeClaim.claimed &&
    dedupeClaim.duplicateDeliveryId
  ) {
    return {
      delivery:
        "deduplicated" as const,
      deliveryId:
        dedupeClaim.duplicateDeliveryId,
      id:
        "deduplicated",
    };
  }

  const deliveryMode =
    getEmailDeliveryMode();

  const sender =
    getEmailSender(
      input.channel,
    );

  const replyTo =
    getEmailReplyTo();

  const delivery =
    await prisma.emailDelivery.create({
      data: {
        attemptedAt:
          new Date(),
        channel:
          input.channel,
        deliveryMode,
        fromAddress:
          sender.address,
        fromName:
          sender.name,
        replyTo,
        status:
          "pending",
        subject:
          input.subject,
        template:
          input.template,
        toAddress:
          input.to
            .trim()
            .toLowerCase(),
      },
      select: {
        id: true,
      },
    });

  await attachEmailDeliveryDedupe(
    dedupeKey,
    delivery.id,
  );

  let result:
    | Awaited<
        ReturnType<
          typeof writeLocalOutbox
        >
      >
    | Awaited<
        ReturnType<
          typeof sendWithSmtp
        >
      >;

  try {
    result =
      deliveryMode === "local"
        ? await writeLocalOutbox(
            input,
          )
        : await sendWithSmtp(
            input,
          );
  } catch (error) {
    const failure =
      emailFailureDetails(error);

    try {
      await prisma.emailDelivery.update({
        where: {
          id: delivery.id,
        },
        data: {
          ...failure,
          status:
            "failed",
        },
      });
    } catch (logError) {
      console.error(
        "EMAIL_FAILURE_LOG_UPDATE_FAILED",
        {
          deliveryId:
            delivery.id,
          error:
            logError instanceof Error
              ? logError.message
              : "UNKNOWN_ERROR",
        },
      );
    }

    throw error;
  }

  try {
    await prisma.emailDelivery.update({
      where: {
        id: delivery.id,
      },
      data: {
        providerMessageId:
          result.id,
        sentAt:
          new Date(),
        status:
          "sent",
      },
    });
  } catch (error) {
    console.error(
      "EMAIL_SUCCESS_LOG_UPDATE_FAILED",
      {
        deliveryId:
          delivery.id,
        error:
          error instanceof Error
            ? error.message
            : "UNKNOWN_ERROR",
      },
    );
  }

  return {
    ...result,
    deliveryId:
      delivery.id,
  };
}
