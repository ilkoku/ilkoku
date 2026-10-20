import Link from "next/link";
import { AdminEmailRetryButton } from "@/components/admin/AdminEmailRetryButton";
import { canSafelyRetryEmailTemplate } from "@/features/admin-email/retry-policy";
import { prisma } from "@/lib/prisma";

const STALE_PENDING_MS = 10 * 60 * 1000;
const FAILURE_ALERT_THRESHOLD = 3;

type CountRow = {
  count: bigint | number | string | null;
};

type RetryRow = {
  actorName: string | null;
  createdAt: Date;
  failureMessage: string | null;
  retryDeliveryId: string | null;
  sourceDeliveryId: string;
  status: string;
};

function toNumber(value: unknown) {
  if (typeof value === "bigint") return Number(value);
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  // MySQL COUNT may return BigInt; SUM(CASE...) may be a Prisma Decimal.
  if (typeof value === "string" || (value !== null && typeof value === "object")) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function formatDate(value: Date | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(value);
}

type FailureBreakdownRow = CountRow & {
  testCount: bigint | number | string | null;
  notificationCount: bigint | number | string | null;
  smtpAuthCount: bigint | number | string | null;
  recentCount: bigint | number | string | null;
};

async function loadUnresolvedFailureBreakdown(since: Date) {
  try {
    const rows = await prisma.$queryRaw<FailureBreakdownRow[]>`
      SELECT
        COUNT(*) AS count,
        SUM(CASE WHEN delivery.template = 'admin_test_email' THEN 1 ELSE 0 END) AS testCount,
        SUM(CASE WHEN delivery.template <> 'admin_test_email' THEN 1 ELSE 0 END) AS notificationCount,
        SUM(CASE WHEN delivery.failureMessage LIKE '%535 5.7.8%' THEN 1 ELSE 0 END) AS smtpAuthCount,
        SUM(CASE WHEN delivery.attemptedAt >= ${since} THEN 1 ELSE 0 END) AS recentCount
      FROM EmailDelivery delivery
      WHERE delivery.status = 'failed'
        AND NOT EXISTS (
          SELECT 1
          FROM EmailDeliveryRetry retryRecord
          WHERE retryRecord.sourceDeliveryId = delivery.id
            AND retryRecord.status = 'sent'
        )
    `;
    const row = rows[0];
    return {
      total: toNumber(row?.count ?? 0),
      test: toNumber(row?.testCount ?? 0),
      notification: toNumber(row?.notificationCount ?? 0),
      smtpAuth: toNumber(row?.smtpAuthCount ?? 0),
      recent: toNumber(row?.recentCount ?? 0),
      readError: false,
    };
  } catch (error) {
    console.error("EMAIL_OPERATIONS_UNRESOLVED_BREAKDOWN_FAILED", error);
    return { total: 0, test: 0, notification: 0, smtpAuth: 0, recent: 0, readError: true };
  }
}

async function loadRetriesToday(today: Date) {
  try {
    const rows = await prisma.$queryRaw<CountRow[]>`
      SELECT COUNT(*) AS count
      FROM EmailDeliveryRetry
      WHERE createdAt >= ${today}
    `;

    return toNumber(rows[0]?.count ?? 0);
  } catch (error) {
    console.error("EMAIL_OPERATIONS_RETRY_COUNT_FAILED", error);
    return 0;
  }
}

async function loadRecentRetries() {
  try {
    return await prisma.$queryRaw<RetryRow[]>`
      SELECT
        retryRecord.sourceDeliveryId,
        retryRecord.retryDeliveryId,
        retryRecord.status,
        retryRecord.failureMessage,
        retryRecord.createdAt,
        COALESCE(actor.displayName, actor.fullName) AS actorName
      FROM EmailDeliveryRetry retryRecord
      LEFT JOIN User actor ON actor.id = retryRecord.actorId
      ORDER BY retryRecord.createdAt DESC
      LIMIT 200
    `;
  } catch (error) {
    console.error("EMAIL_OPERATIONS_RETRY_LIST_FAILED", error);
    return [];
  }
}

export default async function AdminEmailOperationsPage() {
  const now = new Date();
  const staleBefore = new Date(now.getTime() - STALE_PENDING_MS);
  const hourStart = new Date(now.getTime() - 60 * 60 * 1000);
  const dayStart = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const [
    stalePendingCount,
    failedLastHour,
    pendingCount,
    unresolved,
    retriesToday,
    records,
    retryRows,
    lastSmtpAcceptance,
  ] = await Promise.all([
    prisma.emailDelivery.count({
      where: {
        attemptedAt: {
          lte: staleBefore,
        },
        status: "pending",
      },
    }),
    prisma.emailDelivery.count({
      where: {
        attemptedAt: {
          gte: hourStart,
        },
        status: "failed",
      },
    }),
    prisma.emailDelivery.count({
      where: {
        status: "pending",
      },
    }),
    loadUnresolvedFailureBreakdown(dayStart),
    loadRetriesToday(today),
    prisma.emailDelivery.findMany({
      where: {
        OR: [
          {
            status: "failed",
          },
          {
            attemptedAt: {
              lte: staleBefore,
            },
            status: "pending",
          },
        ],
      },
      orderBy: {
        attemptedAt: "desc",
      },
      take: 50,
    }),
    loadRecentRetries(),
    prisma.emailDelivery.findFirst({
      where: {
        deliveryMode: "smtp",
        providerMessageId: { not: null },
        status: "sent",
      },
      orderBy: [{ sentAt: "desc" }, { attemptedAt: "desc" }],
      select: { sentAt: true, attemptedAt: true },
    }),
  ]);

  const latestRetryBySource = new Map<string, RetryRow>();
  for (const retry of retryRows) {
    if (!latestRetryBySource.has(retry.sourceDeliveryId)) {
      latestRetryBySource.set(retry.sourceDeliveryId, retry);
    }
  }

  const critical =
    unresolved.readError
    || stalePendingCount > 0
    || failedLastHour >= FAILURE_ALERT_THRESHOLD;
  const warning = !critical && (unresolved.total > 0 || pendingCount > 0);
  const healthLabel = unresolved.readError
    ? "Ölçüm hatası"
    : critical
      ? "Müdahale gerekiyor"
    : warning
      ? "İzleniyor"
      : "Sağlıklı";

  return (
    <div className="admin-email-operations-page">
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Teslim güvenliği</span>
          <h1>E-posta Operasyonları</h1>
          <p>
            Zaman aşımına uğrayan gönderimleri, başarısız teslimleri,
            güvenli tekrar bildirimlerini ve saatlik hata eşiğini yönetin.
          </p>
        </div>

        <div
          className="admin-email-operations-health"
          data-status={critical ? "critical" : warning ? "warning" : "healthy"}
        >
          <span>Operasyon durumu</span>
          <strong>{healthLabel}</strong>
        </div>
      </header>

      <section className="admin-email-operations-summary">
        <article>
          <span>Son 1 saat hata</span>
          <strong>{failedLastHour}</strong>
          <small>Uyarı eşiği: {FAILURE_ALERT_THRESHOLD}</small>
        </article>
        <article>
          <span>10 dk aşımı</span>
          <strong>{stalePendingCount}</strong>
          <small>Bir sonraki saatlik kontrolde kapatılır</small>
        </article>
        <article>
          <span>Toplam bekleyen</span>
          <strong>{pendingCount}</strong>
          <small>Henüz tamamlanmamış kayıt</small>
        </article>
        <article>
          <span>Çözümlenmemiş hata</span>
          <strong>{unresolved.readError ? "—" : unresolved.total}</strong>
          <small>Başarılı tekrar bildirimi bulunmayan</small>
        </article>
        <article>
          <span>Geçmiş sistem testi hatası</span>
          <strong>{unresolved.readError ? "—" : unresolved.test}</strong>
          <small>admin_test_email · gerçek bildirimden ayrı</small>
        </article>
        <article>
          <span>Bildirim hatası</span>
          <strong>{unresolved.readError ? "—" : unresolved.notification}</strong>
          <small>Test dışı, henüz başarılı tekrar kaydı yok</small>
        </article>
        <article>
          <span>Son 24 saatte çözümlenmemiş</span>
          <strong>{unresolved.readError ? "—" : unresolved.recent}</strong>
          <small>Eski arşivden bağımsız dönem</small>
        </article>
        <article>
          <span>Son SMTP sağlayıcı kabulü</span>
          <strong className="admin-email-operations-last-smtp">{lastSmtpAcceptance ? formatDate(lastSmtpAcceptance.sentAt || lastSmtpAcceptance.attemptedAt) : "Kayıt yok"}</strong>
          <small>SMTP mesaj kimliği kayıtlı; gelen kutusuna teslim kanıtı değildir</small>
        </article>
        <article>
          <span>Bugünkü tekrarlar</span>
          <strong>{retriesToday}</strong>
          <small>Admin operasyon kaydı</small>
        </article>
      </section>

      <section className="admin-panel admin-email-operations-history" aria-label="Geçmiş SMTP hata ayrımı">
        <div className="admin-panel__heading">
          <div>
            <span>Geçmişe dönük inceleme</span>
            <h2>SMTP hatalarının kaynağı</h2>
          </div>
          <Link href="/sistem-yonetimi/epostalar?durum=failed">Başarısız gönderim geçmişi →</Link>
        </div>
        {unresolved.readError ? (
          <p>Hata dökümü yüklenemedi. Başarısız kayıt sayısı sıfır kabul edilmedi; sunucu kayıtları incelenmeli.</p>
        ) : (
          <p>
            Çözümlenmemiş <strong>{unresolved.total}</strong> başarısız kaydın <strong>{unresolved.test}</strong> tanesi
            yönetici sistem testi, <strong>{unresolved.notification}</strong> tanesi bildirim kaynaklı.
            <strong> {unresolved.smtpAuth}</strong> kayıtta SMTP 535 5.7.8 kimlik doğrulama hatası bulunuyor.
            Son 24 saatteki çözümlenmemiş kayıt sayısı <strong>{unresolved.recent}</strong>.
            Bu ayrım hata geçmişini silmez, teslim edildi olarak işaretlemez veya yeni e-posta göndermez.
          </p>
        )}
      </section>

      <section className="admin-panel admin-email-operations-rules">
        <div className="admin-panel__heading">
          <div>
            <span>Otomatik koruma</span>
            <h2>Çalışan kurallar</h2>
          </div>
          <Link href="/admin/epostalar">Tüm gönderim geçmişi →</Link>
        </div>

        <div className="admin-email-operations-rule-grid">
          <article>
            <strong>30 saniye tekilleştirme</strong>
            <p>
              Aynı isteğe bağlı şablon, alıcı ve konu kısa süre içinde ikinci kez
              oluşursa yeni SMTP gönderimi yapılmaz.
            </p>
          </article>
          <article>
            <strong>10 dakika zaman aşımı</strong>
            <p>
              Beklemede kalan kayıtlar saatlik kontrolde başarısız olarak işaretlenir
              ve admin incelemesine açılır.
            </p>
          </article>
          <article>
            <strong>Saatlik admin uyarısı</strong>
            <p>
              Bir saatte üç veya daha fazla hata ya da yeni zaman aşımı oluşursa
              admin hesaplarına uygulama içi uyarı gönderilir.
            </p>
          </article>
          <article>
            <strong>Token saklamayan tekrar</strong>
            <p>
              Şifre, doğrulama ve davet bağlantıları yeniden kullanılmaz. Yalnızca
              güvenli şablonlar için genel durum bildirimi gönderilir.
            </p>
          </article>
        </div>
      </section>

      <section className="admin-panel admin-email-operations-list">
        <div className="admin-panel__heading">
          <div>
            <span>Müdahale kuyruğu</span>
            <h2>Başarısız ve zaman aşımındaki kayıtlar</h2>
          </div>
          <b>{records.length}</b>
        </div>

        {records.length ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table admin-email-operations-table">
              <thead>
                <tr>
                  <th>Durum</th>
                  <th>Alıcı</th>
                  <th>Mesaj</th>
                  <th>Hata</th>
                  <th>Son operasyon</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const stale = record.status === "pending"
                    && record.attemptedAt <= staleBefore;
                  const latestRetry = latestRetryBySource.get(record.id);
                  const safeRetry = canSafelyRetryEmailTemplate(record.template);

                  return (
                    <tr key={record.id}>
                      <td>
                        <span
                          className="admin-email-operations-status"
                          data-status={stale ? "stale" : "failed"}
                        >
                          {stale ? "Zaman aşımı" : "Başarısız"}
                        </span>
                        <small>{formatDate(record.attemptedAt)}</small>
                      </td>
                      <td>
                        <strong>{record.toAddress}</strong>
                        <small>{record.channel}</small>
                      </td>
                      <td>
                        <strong>{record.subject}</strong>
                        <small>{record.template}</small>
                      </td>
                      <td>
                        <strong>{record.failureCode || (stale ? "DELIVERY_STALLED" : "EMAIL_ERROR")}</strong>
                        <small>
                          {record.failureMessage || (stale
                            ? "Gönderim 10 dakikadan uzun süredir tamamlanmadı."
                            : "Ayrıntı kaydedilmedi.")}
                        </small>
                      </td>
                      <td>
                        {latestRetry ? (
                          <>
                            <strong data-retry-status={latestRetry.status}>
                              {latestRetry.status === "sent"
                                ? "Tekrar bildirildi"
                                : latestRetry.status === "failed"
                                  ? "Tekrar başarısız"
                                  : "Tekrar bekliyor"}
                            </strong>
                            <small>
                              {latestRetry.actorName || "Sistem"} · {formatDate(latestRetry.createdAt)}
                            </small>
                            {latestRetry.failureMessage ? (
                              <small>{latestRetry.failureMessage}</small>
                            ) : null}
                          </>
                        ) : (
                          <small>Henüz operasyon yapılmadı.</small>
                        )}
                      </td>
                      <td>
                        {safeRetry ? (
                          <AdminEmailRetryButton deliveryId={record.id} />
                        ) : (
                          <div className="admin-email-operations-blocked">
                            <strong>Kaynak akış gerekli</strong>
                            <small>
                              Güvenlik bağlantısı veya süreli içerik saklanmadığı için
                              kullanıcı, davet ya da şifre ekranından yeniden oluşturun.
                            </small>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>Müdahale gerektiren e-posta yok</strong>
            <p>Başarısız veya 10 dakikayı aşmış bekleyen gönderim bulunmuyor.</p>
          </div>
        )}
      </section>

      <section className="admin-email-security-note">
        <strong>Güvenli tekrar politikası</strong>
        <p>
          Yeniden bildirim işlemi önceki e-postanın gövdesini, şifre sıfırlama
          bağlantısını, doğrulama tokenını veya davet kodunu tekrar kullanmaz.
          Güvenlik şablonları ilgili kaynak akıştan yeni tokenla oluşturulmalıdır.
        </p>
      </section>
    </div>
  );
}
