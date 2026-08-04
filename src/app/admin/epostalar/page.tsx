import Link from "next/link";
import type {
  EmailDeliveryMode,
  EmailDeliveryStatus,
  Prisma,
} from "@/generated/prisma/client";
import {
  AdminEmailTestForm,
} from "@/components/admin/AdminEmailTestForm";
import {
  getCurrentUser,
} from "@/lib/auth/current-user";
import {
  getEmailDeliveryMode,
  getEmailReplyTo,
  getEmailSender,
  type EmailChannel,
} from "@/lib/email/config";
import {
  prisma,
} from "@/lib/prisma";

const PAGE_SIZE = 30;

const channels = [
  "default",
  "system",
  "support",
  "editor",
  "publisher",
] as const satisfies readonly EmailChannel[];

const channelLabels:
  Record<EmailChannel, string> = {
    default: "Genel",
    system: "Sistem",
    support: "Destek",
    editor: "Editör",
    publisher: "Yayınevi",
  };

const statusLabels:
  Record<EmailDeliveryStatus, string> = {
    pending: "Bekliyor",
    sent: "Gönderildi",
    failed: "Başarısız",
  };

const modeLabels:
  Record<EmailDeliveryMode, string> = {
    local: "Local outbox",
    smtp: "Gerçek SMTP",
  };

type SearchParams = Promise<{
  alici?: string;
  baslangic?: string;
  durum?: string;
  kanal?: string;
  mod?: string;
  page?: string;
}>;

function validStatus(
  value: string | undefined,
): value is EmailDeliveryStatus {
  return (
    value === "pending" ||
    value === "sent" ||
    value === "failed"
  );
}

function validMode(
  value: string | undefined,
): value is EmailDeliveryMode {
  return (
    value === "local" ||
    value === "smtp"
  );
}

function validChannel(
  value: string | undefined,
): value is EmailChannel {
  return channels.some(
    (channel) =>
      channel === value,
  );
}

function validDate(
  value: string | undefined,
) {
  if (
    !value ||
    !/^\d{4}-\d{2}-\d{2}$/.test(
      value,
    )
  ) {
    return null;
  }

  const date =
    new Date(
      `${value}T00:00:00`,
    );

  return Number.isNaN(
    date.getTime(),
  )
    ? null
    : date;
}

function formatDate(
  value: Date | null,
) {
  if (!value) return "—";

  return new Intl.DateTimeFormat(
    "tr-TR",
    {
      dateStyle: "medium",
      timeStyle: "short",
    },
  ).format(value);
}

function pageHref(
  values: {
    recipient: string;
    start: string;
    status: string;
    channel: string;
    mode: string;
  },
  page: number,
) {
  const params =
    new URLSearchParams({
      page:
        String(page),
    });

  if (values.recipient) {
    params.set(
      "alici",
      values.recipient,
    );
  }

  if (values.start) {
    params.set(
      "baslangic",
      values.start,
    );
  }

  if (values.status) {
    params.set(
      "durum",
      values.status,
    );
  }

  if (values.channel) {
    params.set(
      "kanal",
      values.channel,
    );
  }

  if (values.mode) {
    params.set(
      "mod",
      values.mode,
    );
  }

  return (
    `/admin/epostalar?${params.toString()}`
  );
}

export default async function AdminEmailPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params =
    await searchParams;

  const currentUser =
    await getCurrentUser();

  const recipient =
    params.alici?.trim() ?? "";

  const selectedStatus =
    validStatus(params.durum)
      ? params.durum
      : "";

  const selectedMode =
    validMode(params.mod)
      ? params.mod
      : "";

  const selectedChannel =
    validChannel(params.kanal)
      ? params.kanal
      : "";

  const startDate =
    validDate(params.baslangic);

  const requestedPage =
    Number.parseInt(
      params.page ?? "1",
      10,
    );

  const currentPage =
    Number.isFinite(requestedPage) &&
    requestedPage > 0
      ? requestedPage
      : 1;

  const where:
    Prisma.EmailDeliveryWhereInput = {
    ...(recipient
      ? {
          OR: [
            {
              toAddress: {
                contains: recipient,
              },
            },
            {
              subject: {
                contains: recipient,
              },
            },
            {
              template: {
                contains: recipient,
              },
            },
          ],
        }
      : {}),
    ...(selectedStatus
      ? {
          status:
            selectedStatus,
        }
      : {}),
    ...(selectedMode
      ? {
          deliveryMode:
            selectedMode,
        }
      : {}),
    ...(selectedChannel
      ? {
          channel:
            selectedChannel,
        }
      : {}),
    ...(startDate
      ? {
          createdAt: {
            gte:
              startDate,
          },
        }
      : {}),
  };

  const today =
    new Date();

  today.setHours(
    0,
    0,
    0,
    0,
  );

  const filteredCount =
    await prisma.emailDelivery.count({
      where,
    });

  const totalPages =
    Math.max(
      1,
      Math.ceil(
        filteredCount /
        PAGE_SIZE,
      ),
    );

  const safePage =
    Math.min(
      currentPage,
      totalPages,
    );

  const [
    totalCount,
    sentToday,
    failedToday,
    pendingCount,
    records,
  ] = await Promise.all([
    prisma.emailDelivery.count(),
    prisma.emailDelivery.count({
      where: {
        createdAt: {
          gte: today,
        },
        status: "sent",
      },
    }),
    prisma.emailDelivery.count({
      where: {
        createdAt: {
          gte: today,
        },
        status: "failed",
      },
    }),
    prisma.emailDelivery.count({
      where: {
        status: "pending",
      },
    }),
    prisma.emailDelivery.findMany({
      where,
      orderBy: {
        createdAt: "desc",
      },
      skip:
        (safePage - 1) *
        PAGE_SIZE,
      take:
        PAGE_SIZE,
    }),
  ]);

  const deliveryMode =
    getEmailDeliveryMode();

  const senders =
    channels.map(
      (channel) => ({
        channel,
        ...getEmailSender(
          channel,
        ),
      }),
    );

  const smtpChecks = [
    {
      label: "SMTP sunucusu",
      ready:
        Boolean(
          process.env.SMTP_HOST,
        ),
    },
    {
      label: "SMTP portu",
      ready:
        Boolean(
          process.env.SMTP_PORT,
        ),
    },
    {
      label: "SMTP kullanıcısı",
      ready:
        Boolean(
          process.env.SMTP_USER,
        ),
    },
    {
      label: "SMTP parolası",
      ready:
        Boolean(
          process.env.SMTP_PASSWORD,
        ),
    },
  ];

  const first =
    filteredCount
      ? (
          safePage - 1
        ) * PAGE_SIZE + 1
      : 0;

  const last =
    Math.min(
      safePage * PAGE_SIZE,
      filteredCount,
    );

  const filters = {
    recipient,
    start:
      params.baslangic ?? "",
    status:
      selectedStatus,
    channel:
      selectedChannel,
    mode:
      selectedMode,
  };

  return (
    <div className="admin-email-page">
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">
            Sistem iletişimi
          </span>
          <h1>
            E-posta Kontrol Merkezi
          </h1>
          <p>
            Kimlik doğrulama, editör,
            yayınevi ve destek mesajlarını
            tek merkezden izleyin.
          </p>
        </div>

        <div className="admin-email-mode">
          <span>Çalışma modu</span>
          <strong>
            {modeLabels[deliveryMode]}
          </strong>
        </div>
      </header>

      <section className="admin-email-summary">
        <article>
          <span>Toplam kayıt</span>
          <strong>{totalCount}</strong>
          <small>Tüm zamanlar</small>
        </article>

        <article>
          <span>Bugün gönderildi</span>
          <strong>{sentToday}</strong>
          <small>Başarılı teslim işlemi</small>
        </article>

        <article>
          <span>Bugün başarısız</span>
          <strong>{failedToday}</strong>
          <small>İncelenmesi gereken</small>
        </article>

        <article>
          <span>Bekleyen</span>
          <strong>{pendingCount}</strong>
          <small>Tamamlanmamış işlem</small>
        </article>
      </section>

      <div className="admin-email-top-grid">
        <section className="admin-panel admin-email-addresses">
          <div className="admin-panel__heading">
            <div>
              <span>Gönderen haritası</span>
              <h2>İlkOku adresleri</h2>
            </div>
          </div>

          <div className="admin-email-address-list">
            {senders.map((sender) => (
              <div key={sender.channel}>
                <span>
                  {channelLabels[sender.channel]}
                </span>
                <strong>
                  {sender.address}
                </strong>
                <small>
                  {sender.name}
                </small>
              </div>
            ))}
          </div>

          <p className="admin-email-reply">
            Yanıt adresi:
            <strong>
              {getEmailReplyTo()}
            </strong>
          </p>
        </section>

        <section className="admin-panel admin-email-smtp">
          <div className="admin-panel__heading">
            <div>
              <span>Canlı hazırlık</span>
              <h2>SMTP durumu</h2>
            </div>
          </div>

          <div className="admin-email-smtp-list">
            {smtpChecks.map((check) => (
              <div key={check.label}>
                <span>{check.label}</span>
                <strong
                  className={
                    check.ready
                      ? "is-ready"
                      : "is-missing"
                  }
                >
                  {check.ready
                    ? "Hazır"
                    : "Eksik"}
                </strong>
              </div>
            ))}
          </div>

          <p>
            SMTP parolası güvenlik
            nedeniyle hiçbir zaman
            gösterilmez.
          </p>
        </section>
      </div>

      <section className="admin-panel admin-email-test">
        <div className="admin-panel__heading">
          <div>
            <span>Kontrollü doğrulama</span>
            <h2>Test mesajı gönder</h2>
          </div>
        </div>

        <AdminEmailTestForm
          defaultEmail={
            currentUser?.email ?? ""
          }
          deliveryMode={
            deliveryMode
          }
        />
      </section>

      <section className="admin-panel admin-email-history">
        <div className="admin-panel__heading">
          <div>
            <span>Gönderim geçmişi</span>
            <h2>E-posta kayıtları</h2>
          </div>

          <b>{filteredCount}</b>
        </div>

        <form
          className="admin-email-filters"
          method="get"
        >
          <label>
            <span>Arama</span>
            <input
              defaultValue={recipient}
              name="alici"
              placeholder="Alıcı, konu veya şablon"
              type="search"
            />
          </label>

          <label>
            <span>Durum</span>
            <select
              defaultValue={
                selectedStatus
              }
              name="durum"
            >
              <option value="">
                Tümü
              </option>
              <option value="sent">
                Gönderildi
              </option>
              <option value="pending">
                Bekliyor
              </option>
              <option value="failed">
                Başarısız
              </option>
            </select>
          </label>

          <label>
            <span>Kanal</span>
            <select
              defaultValue={
                selectedChannel
              }
              name="kanal"
            >
              <option value="">
                Tümü
              </option>

              {channels.map((channel) => (
                <option
                  key={channel}
                  value={channel}
                >
                  {channelLabels[channel]}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span>Mod</span>
            <select
              defaultValue={
                selectedMode
              }
              name="mod"
            >
              <option value="">
                Tümü
              </option>
              <option value="local">
                Local
              </option>
              <option value="smtp">
                SMTP
              </option>
            </select>
          </label>

          <label>
            <span>Başlangıç</span>
            <input
              defaultValue={
                params.baslangic ?? ""
              }
              name="baslangic"
              type="date"
            />
          </label>

          <button type="submit">
            Filtrele
          </button>

          {(recipient ||
            selectedStatus ||
            selectedChannel ||
            selectedMode ||
            startDate) ? (
            <Link href="/admin/epostalar">
              Temizle
            </Link>
          ) : null}
        </form>

        {records.length ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table admin-email-table">
              <thead>
                <tr>
                  <th>Durum</th>
                  <th>Alıcı</th>
                  <th>Mesaj</th>
                  <th>Gönderen</th>
                  <th>Mod</th>
                  <th>Teknik sonuç</th>
                  <th>Tarih</th>
                </tr>
              </thead>

              <tbody>
                {records.map((record) => (
                  <tr key={record.id}>
                    <td>
                      <span
                        className={
                          `admin-email-status admin-email-status--${record.status}`
                        }
                      >
                        {statusLabels[record.status]}
                      </span>
                    </td>

                    <td>
                      <strong>
                        {record.toAddress}
                      </strong>
                      <small>
                        {channelLabels[
                          record.channel as EmailChannel
                        ] || record.channel}
                      </small>
                    </td>

                    <td>
                      <strong>
                        {record.subject}
                      </strong>
                      <small>
                        {record.template}
                      </small>
                    </td>

                    <td>
                      <span>
                        {record.fromName}
                      </span>
                      <small>
                        {record.fromAddress}
                      </small>
                    </td>

                    <td>
                      {modeLabels[
                        record.deliveryMode
                      ]}
                    </td>

                    <td>
                      {record.status === "failed" ? (
                        <details>
                          <summary>
                            Hatayı görüntüle
                          </summary>
                          <p>
                            {record.failureCode ||
                              "EMAIL_ERROR"}
                          </p>
                          <small>
                            {record.failureMessage ||
                              "Açıklama kaydedilmedi."}
                          </small>
                        </details>
                      ) : (
                        <>
                          <span>
                            {record.providerMessageId
                              ? "Mesaj kimliği var"
                              : "Mesaj kimliği bekleniyor"}
                          </span>
                          <small>
                            Deneme: {record.attemptCount}
                          </small>
                        </>
                      )}
                    </td>

                    <td>
                      <time
                        dateTime={
                          record.createdAt.toISOString()
                        }
                      >
                        {formatDate(
                          record.sentAt ||
                          record.attemptedAt,
                        )}
                      </time>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>
              E-posta kaydı bulunamadı
            </strong>
            <p>
              Sahte kayıt gösterilmez.
              Güvenli test formuyla ilk
              local kaydı oluşturabilirsiniz.
            </p>
          </div>
        )}

        <footer className="admin-pagination">
          <span>
            {first}–{last} / {filteredCount} kayıt
          </span>

          <div>
            {safePage > 1 ? (
              <Link
                href={pageHref(
                  filters,
                  safePage - 1,
                )}
              >
                ← Önceki
              </Link>
            ) : (
              <span>← Önceki</span>
            )}

            <b>
              {safePage} / {totalPages}
            </b>

            {safePage < totalPages ? (
              <Link
                href={pageHref(
                  filters,
                  safePage + 1,
                )}
              >
                Sonraki →
              </Link>
            ) : (
              <span>Sonraki →</span>
            )}
          </div>
        </footer>
      </section>

      <section className="admin-email-security-note">
        <strong>Güvenli kayıt politikası</strong>
        <p>
          E-posta gövdeleri, parola
          bağlantıları ve doğrulama tokenları
          veritabanında tutulmaz. Güvenli
          bağlantı içeren başarısız mesajlar
          ilgili kullanıcı veya başvuru
          akışından yeniden oluşturulur.
        </p>
      </section>
    </div>
  );
}
