import { getEmailSiteUrl } from "./config";
import { sendEmail } from "./send-email";

export type WeeklyDiscoverySummaryMetrics = {
  editorActivity: number;
  followedContentActivity: number;
  publisherActivity: number;
  socialActivity: number;
  systemActivity: number;
  totalNotifications: number;
  unreadNotifications: number;
};

export type WeeklyDiscoverySummaryItem = {
  categoryLabel: string;
  createdAtLabel: string;
  message: string;
  title: string;
};

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function absoluteUrl(pathname: string) {
  return new URL(pathname, getEmailSiteUrl()).toString();
}

function metricRow(label: string, value: number) {
  return `<tr><td style="padding:8px 12px;border-bottom:1px solid #e8e4dc">${escapeHtml(label)}</td><td style="padding:8px 12px;border-bottom:1px solid #e8e4dc;text-align:right"><strong>${value.toLocaleString("tr-TR")}</strong></td></tr>`;
}

function activityRows(metrics: WeeklyDiscoverySummaryMetrics) {
  const rows = [
    ["Toplam hareket", metrics.totalNotifications],
    ["Okunmamış bildirim", metrics.unreadNotifications],
    ["Sosyal hareket", metrics.socialActivity],
    ["Takip edilen içerik", metrics.followedContentActivity],
    ["Editör süreci", metrics.editorActivity],
    ["Yayınevi ve ekip", metrics.publisherActivity],
    ["Diğer sistem hareketleri", metrics.systemActivity],
  ] as const;

  return rows
    .filter(([label, value]) => label === "Toplam hareket" || label === "Okunmamış bildirim" || value > 0)
    .map(([label, value]) => metricRow(label, value))
    .join("");
}

function highlightList(items: WeeklyDiscoverySummaryItem[]) {
  if (!items.length) return "";

  return `<h2>Haftanın öne çıkanları</h2><ul style="padding-left:20px">${items
    .map(
      (item) => `<li style="margin-bottom:12px"><strong>${escapeHtml(item.title)}</strong><br><span>${escapeHtml(item.message)}</span><br><small style="color:#6b6b6b">${escapeHtml(item.categoryLabel)} · ${escapeHtml(item.createdAtLabel)}</small></li>`,
    )
    .join("")}</ul>`;
}

export async function sendWeeklyDiscoverySummaryEmail(input: {
  destinationPath: string;
  email: string;
  fullName: string;
  items: WeeklyDiscoverySummaryItem[];
  metrics: WeeklyDiscoverySummaryMetrics;
  periodLabel: string;
}) {
  const notificationsUrl = absoluteUrl(input.destinationPath);
  const preferencesUrl = absoluteUrl("/hesabim#bildirim-tercihleri");
  const rows = activityRows(input.metrics);
  const highlights = highlightList(input.items);
  const textHighlights = input.items.flatMap((item) => [
    `${item.title} — ${item.message}`,
    `${item.categoryLabel} · ${item.createdAtLabel}`,
  ]);

  return sendEmail({
    channel: "system",
    html: `
      <h1>${escapeHtml(input.periodLabel)} haftalık İlkOku özeti</h1>
      <p>Merhaba ${escapeHtml(input.fullName)},</p>
      <p>Takip, keşif ve çalışma alanınızdaki haftalık hareketler aşağıdadır.</p>
      <table style="width:100%;max-width:560px;border-collapse:collapse">${rows}</table>
      ${highlights}
      <p><a href="${escapeHtml(notificationsUrl)}">Bildirimleri görüntüle</a></p>
      <p style="font-size:12px;color:#6b6b6b">Bu özet yalnızca hafta içinde hareket bulunduğunda gönderilir. <a href="${escapeHtml(preferencesUrl)}">Bildirim tercihlerini düzenle</a>.</p>
    `.trim(),
    subject: `${input.periodLabel} İlkOku haftalık özetiniz`,
    template: "weekly_discovery_summary",
    text: [
      `${input.periodLabel} haftalık İlkOku özeti`,
      "",
      `Merhaba ${input.fullName},`,
      "",
      `Toplam hareket: ${input.metrics.totalNotifications.toLocaleString("tr-TR")}`,
      `Okunmamış bildirim: ${input.metrics.unreadNotifications.toLocaleString("tr-TR")}`,
      `Sosyal hareket: ${input.metrics.socialActivity.toLocaleString("tr-TR")}`,
      `Takip edilen içerik: ${input.metrics.followedContentActivity.toLocaleString("tr-TR")}`,
      `Editör süreci: ${input.metrics.editorActivity.toLocaleString("tr-TR")}`,
      `Yayınevi ve ekip: ${input.metrics.publisherActivity.toLocaleString("tr-TR")}`,
      `Diğer sistem hareketleri: ${input.metrics.systemActivity.toLocaleString("tr-TR")}`,
      ...(textHighlights.length ? ["", "Haftanın öne çıkanları", ...textHighlights] : []),
      "",
      notificationsUrl,
      "",
      `Bildirim tercihleri: ${preferencesUrl}`,
    ].join("\n"),
    to: input.email,
  });
}
