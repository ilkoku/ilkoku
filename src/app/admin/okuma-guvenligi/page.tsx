import Link from "next/link";
import type {
  Prisma,
  ReadingAccessRisk,
  ReadingDeviceClass,
} from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import styles from "./reading-security.module.css";

const PAGE_SIZE = 30;

const riskLabels: Record<ReadingAccessRisk, string> = {
  normal: "Normal",
  watch: "İncelenecek",
};

const deviceLabels: Record<ReadingDeviceClass, string> = {
  bot: "Otomasyon",
  desktop: "Masaüstü",
  mobile: "Mobil",
  tablet: "Tablet",
  unknown: "Bilinmiyor",
};

const flagLabels: Record<string, string> = {
  multiple_devices: "Bir saat içinde çok sayıda cihaz",
  network_churn: "Bir saat içinde çok sayıda ağ değişimi",
  rapid_navigation: "Kısa sürede çok sayıda bölüm",
};

const risks = Object.keys(riskLabels) as ReadingAccessRisk[];
const devices = Object.keys(deviceLabels) as ReadingDeviceClass[];

type SearchParams = Promise<{
  baslangic?: string;
  cihaz?: string;
  page?: string;
  q?: string;
  risk?: string;
}>;

function isRisk(value: string | undefined): value is ReadingAccessRisk {
  return Boolean(value && risks.includes(value as ReadingAccessRisk));
}

function isDevice(
  value: string | undefined,
): value is ReadingDeviceClass {
  return Boolean(
    value && devices.includes(value as ReadingDeviceClass),
  );
}

function validDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

function parseFlags(value: string | null) {
  if (!value) return [];

  try {
    const parsed = JSON.parse(value);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .filter((flag): flag is string => typeof flag === "string")
      .map((flag) => flagLabels[flag] ?? "Tanımsız güvenlik sinyali");
  } catch {
    return ["Güvenlik sinyali okunamadı"];
  }
}

function pageHref(
  query: string,
  risk: string,
  device: string,
  start: string,
  page: number,
) {
  const params = new URLSearchParams({ page: String(page) });
  if (query) params.set("q", query);
  if (risk) params.set("risk", risk);
  if (device) params.set("cihaz", device);
  if (start) params.set("baslangic", start);
  return `/admin/okuma-guvenligi?${params.toString()}`;
}

export default async function AdminReadingSecurityPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const query = params.q?.trim() ?? "";
  const selectedRisk = isRisk(params.risk) ? params.risk : "";
  const selectedDevice = isDevice(params.cihaz) ? params.cihaz : "";
  const startDate = validDate(params.baslangic);
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const currentPage =
    Number.isFinite(requestedPage) && requestedPage > 0
      ? requestedPage
      : 1;
  const dayStart = new Date();
  dayStart.setHours(dayStart.getHours() - 24);

  const where: Prisma.ReadingAccessWhereInput = {
    ...(selectedRisk ? { riskLevel: selectedRisk } : {}),
    ...(selectedDevice ? { deviceClass: selectedDevice } : {}),
    ...(startDate ? { lastSeenAt: { gte: startDate } } : {}),
    ...(query
      ? {
          OR: [
            {
              user: {
                is: {
                  OR: [
                    { displayName: { contains: query } },
                    { email: { contains: query } },
                    { fullName: { contains: query } },
                    { publicId: { contains: query } },
                  ],
                },
              },
            },
            {
              work: {
                is: {
                  OR: [
                    { publicId: { contains: query } },
                    { title: { contains: query } },
                  ],
                },
              },
            },
            {
              chapter: {
                is: { title: { contains: query } },
              },
            },
          ],
        }
      : {}),
  };

  const [
    totalCount,
    watchedCount,
    mobileCount,
    recentCount,
    filteredCount,
  ] = await Promise.all([
    prisma.readingAccess.count(),
    prisma.readingAccess.count({ where: { riskLevel: "watch" } }),
    prisma.readingAccess.count({
      where: { deviceClass: { in: ["mobile", "tablet"] } },
    }),
    prisma.readingAccess.count({
      where: { lastSeenAt: { gte: dayStart } },
    }),
    prisma.readingAccess.count({ where }),
  ]);

  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const records = await prisma.readingAccess.findMany({
    where,
    include: {
      chapter: { select: { position: true, title: true } },
      session: { select: { expiresAt: true } },
      user: {
        select: {
          displayName: true,
          email: true,
          fullName: true,
          publicId: true,
        },
      },
      work: { select: { id: true, publicId: true, title: true } },
    },
    orderBy: [{ riskLevel: "desc" }, { lastSeenAt: "desc" }],
    skip: (safePage - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });

  const first = filteredCount
    ? (safePage - 1) * PAGE_SIZE + 1
    : 0;
  const last = Math.min(safePage * PAGE_SIZE, filteredCount);
  const filtersActive = Boolean(
    query || selectedRisk || selectedDevice || startDate,
  );
  const now = new Date();

  return (
    <div className="admin-directory-page">
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Eser koruması</span>
          <h1>Okuma Güvenliği</h1>
          <p>
            Bölüm erişimlerini, cihaz türlerini ve inceleme gerektiren
            davranışları kişisel teknik verileri göstermeden izleyin.
          </p>
        </div>
        <Link className={styles.auditLink} href="/admin/audit-log">
          Güvenlik Audit kayıtları
        </Link>
      </header>

      <section className={styles.summary} aria-label="Okuma güvenliği özeti">
        <article>
          <span>Toplam erişim penceresi</span>
          <strong>{totalCount}</strong>
          <small>15 dakikalık tekilleştirilmiş kayıt</small>
        </article>
        <article>
          <span>İncelenecek</span>
          <strong>{watchedCount}</strong>
          <small>Otomatik engelleme uygulanmaz</small>
        </article>
        <article>
          <span>Mobil ve tablet</span>
          <strong>{mobileCount}</strong>
          <small>Kişisel cihaz ayrıntısı saklanmaz</small>
        </article>
        <article>
          <span>Son 24 saat</span>
          <strong>{recentCount}</strong>
          <small>Güncel erişim pencereleri</small>
        </article>
      </section>

      <aside className={styles.privacyNote}>
        <strong>Gizlilik koruması etkin</strong>
        <p>
          Ham IP, tarayıcı metni, e-posta, çerez ve oturum tokenı bu
          kayıtlarda tutulmaz. Hash değerleri de yönetim ekranında gösterilmez.
          İşaretler inceleme amaçlıdır ve tek başına kullanıcıyı engellemez.
        </p>
      </aside>

      <section className="admin-panel admin-directory-panel">
        <form
          className={`admin-directory-filters ${styles.filters}`}
          method="get"
        >
          <label>
            <span>Kullanıcı veya eser</span>
            <input
              defaultValue={query}
              name="q"
              placeholder="Ad, e-posta, kullanıcı ya da eser kodu"
              type="search"
            />
          </label>
          <label>
            <span>Risk</span>
            <select defaultValue={selectedRisk} name="risk">
              <option value="">Tümü</option>
              {risks.map((risk) => (
                <option key={risk} value={risk}>
                  {riskLabels[risk]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Cihaz sınıfı</span>
            <select defaultValue={selectedDevice} name="cihaz">
              <option value="">Tümü</option>
              {devices.map((device) => (
                <option key={device} value={device}>
                  {deviceLabels[device]}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span>Başlangıç</span>
            <input
              defaultValue={params.baslangic ?? ""}
              name="baslangic"
              type="date"
            />
          </label>
          <button type="submit">Filtrele</button>
          {filtersActive ? (
            <Link href="/admin/okuma-guvenligi">Temizle</Link>
          ) : null}
        </form>

        {records.length ? (
          <div className="admin-table-wrap">
            <table className={`admin-data-table ${styles.table}`}>
              <thead>
                <tr>
                  <th>Durum</th>
                  <th>Kullanıcı</th>
                  <th>Eser ve bölüm</th>
                  <th>Erişim ortamı</th>
                  <th>Yoğunluk</th>
                  <th>Güvenlik sinyali</th>
                  <th>Son erişim</th>
                </tr>
              </thead>
              <tbody>
                {records.map((record) => {
                  const flags = parseFlags(record.riskFlags);
                  const sessionStatus = !record.session
                    ? "Oturum kaydı sona ermiş"
                    : record.session.expiresAt > now
                      ? "Oturum bağlı"
                      : "Oturum süresi dolmuş";

                  return (
                    <tr key={record.id}>
                      <td>
                        <span
                          className={`${styles.riskBadge} ${
                            record.riskLevel === "watch"
                              ? styles.watch
                              : styles.normal
                          }`}
                        >
                          {riskLabels[record.riskLevel]}
                        </span>
                        <small>Risk puanı: {record.riskScore}/100</small>
                      </td>
                      <td>
                        <Link
                          href={`/admin/kullanicilar/${record.user.publicId}`}
                        >
                          {record.user.displayName || record.user.fullName}
                        </Link>
                        <span>{record.user.publicId}</span>
                        <small>{record.user.email}</small>
                      </td>
                      <td>
                        <Link href={`/admin/eserler/${record.work.id}`}>
                          {record.work.title}
                        </Link>
                        <span>{record.work.publicId}</span>
                        <small>
                          Bölüm {record.chapter.position}: {record.chapter.title}
                        </small>
                      </td>
                      <td>
                        <strong>{deviceLabels[record.deviceClass]}</strong>
                        <small>{sessionStatus}</small>
                      </td>
                      <td>
                        <strong>{record.viewCount} görüntüleme</strong>
                        <small>15 dakikalık erişim penceresi</small>
                      </td>
                      <td>
                        {flags.length ? (
                          <ul className={styles.flags}>
                            {flags.map((flag) => (
                              <li key={flag}>{flag}</li>
                            ))}
                          </ul>
                        ) : (
                          <span>Olağandışı sinyal yok</span>
                        )}
                      </td>
                      <td>
                        <time dateTime={record.lastSeenAt.toISOString()}>
                          {formatDate(record.lastSeenAt)}
                        </time>
                        <small>
                          İlk: {formatDate(record.openedAt)}
                        </small>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>Okuma erişim kaydı bulunamadı</strong>
            <p>
              Gerçek kullanıcı erişimi oluştuğunda kayıtlar burada görünür.
              Sahte veya örnek kayıt gösterilmez.
            </p>
          </div>
        )}

        <footer className="admin-pagination">
          <span>{first}–{last} / {filteredCount} kayıt</span>
          <div>
            {safePage > 1 ? (
              <Link
                href={pageHref(
                  query,
                  selectedRisk,
                  selectedDevice,
                  params.baslangic ?? "",
                  safePage - 1,
                )}
              >
                ← Önceki
              </Link>
            ) : (
              <span>← Önceki</span>
            )}
            <b>{safePage} / {totalPages}</b>
            {safePage < totalPages ? (
              <Link
                href={pageHref(
                  query,
                  selectedRisk,
                  selectedDevice,
                  params.baslangic ?? "",
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
    </div>
  );
}
