import { getEmailSiteUrl } from "./config";
import { sendEmail } from "./send-email";

export type WriterDailySummaryMetrics = {
  comments: number;
  completions: number;
  editorFavorites: number;
  favorites: number;
  publisherFavorites: number;
  publisherFollows: number;
  publisherLikes: number;
  publisherShares: number;
  totalReads: number;
  uniqueReaders: number;
};

export type WriterDailySummaryHighlight = {
  reads: number;
  title: string;
} | null;

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

export async function sendWriterDailySummaryEmail(input: {
  email: string;
  fullName: string;
  metrics: WriterDailySummaryMetrics;
  summaryDateLabel: string;
  topChapter: WriterDailySummaryHighlight;
  topWork: WriterDailySummaryHighlight;
}) {
  const dashboardUrl = absoluteUrl("/yazar");
  const preferencesUrl = absoluteUrl("/hesabim#bildirim-tercihleri");
  const rows = [
    metricRow("Toplam okuma", input.metrics.totalReads),
    metricRow("Tekil okur", input.metrics.uniqueReaders),
    metricRow("Okumayı tamamlayan", input.metrics.completions),
    metricRow("Yeni favori", input.metrics.favorites),
    metricRow("Yeni yorum", input.metrics.comments),
    metricRow("Editör favorisi", input.metrics.editorFavorites),
    metricRow("Yayınevi beğenisi", input.metrics.publisherLikes),
    metricRow("Yayınevi favorisi", input.metrics.publisherFavorites),
    metricRow("Yayınevi takibi", input.metrics.publisherFollows),
    metricRow("Yayınevi ekip paylaşımı", input.metrics.publisherShares),
  ].join("");

  const highlights = [
    input.topWork
      ? `<p><strong>En çok okunan eser:</strong> ${escapeHtml(input.topWork.title)} — ${input.topWork.reads.toLocaleString("tr-TR")} okuma</p>`
      : "",
    input.topChapter
      ? `<p><strong>En çok okunan bölüm:</strong> ${escapeHtml(input.topChapter.title)} — ${input.topChapter.reads.toLocaleString("tr-TR")} okuma</p>`
      : "",
  ].filter(Boolean).join("");

  const textHighlights = [
    input.topWork
      ? `En çok okunan eser: ${input.topWork.title} — ${input.topWork.reads.toLocaleString("tr-TR")} okuma`
      : "",
    input.topChapter
      ? `En çok okunan bölüm: ${input.topChapter.title} — ${input.topChapter.reads.toLocaleString("tr-TR")} okuma`
      : "",
  ].filter(Boolean);

  return sendEmail({
    channel: "system",
    html: `
      <h1>${escapeHtml(input.summaryDateLabel)} performans özeti</h1>
      <p>Merhaba ${escapeHtml(input.fullName)},</p>
      <p>Eserlerinizin günlük İlkOku hareketleri aşağıdadır.</p>
      <table style="width:100%;max-width:560px;border-collapse:collapse">${rows}</table>
      ${highlights}
      <p><a href="${escapeHtml(dashboardUrl)}">Yazar çalışma alanını aç</a></p>
      <p style="font-size:12px;color:#6b6b6b">Bu özet yalnızca anlamlı hareket bulunan günlerde gönderilir. <a href="${escapeHtml(preferencesUrl)}">Bildirim tercihlerini düzenle</a>.</p>
    `.trim(),
    subject: `${input.summaryDateLabel} İlkOku yazar performansınız`,
    template: "writer_daily_summary",
    text: [
      `${input.summaryDateLabel} performans özeti`,
      "",
      `Merhaba ${input.fullName},`,
      "",
      `Toplam okuma: ${input.metrics.totalReads.toLocaleString("tr-TR")}`,
      `Tekil okur: ${input.metrics.uniqueReaders.toLocaleString("tr-TR")}`,
      `Okumayı tamamlayan: ${input.metrics.completions.toLocaleString("tr-TR")}`,
      `Yeni favori: ${input.metrics.favorites.toLocaleString("tr-TR")}`,
      `Yeni yorum: ${input.metrics.comments.toLocaleString("tr-TR")}`,
      `Editör favorisi: ${input.metrics.editorFavorites.toLocaleString("tr-TR")}`,
      `Yayınevi beğenisi: ${input.metrics.publisherLikes.toLocaleString("tr-TR")}`,
      `Yayınevi favorisi: ${input.metrics.publisherFavorites.toLocaleString("tr-TR")}`,
      `Yayınevi takibi: ${input.metrics.publisherFollows.toLocaleString("tr-TR")}`,
      `Yayınevi ekip paylaşımı: ${input.metrics.publisherShares.toLocaleString("tr-TR")}`,
      ...textHighlights,
      "",
      dashboardUrl,
      "",
      `Bildirim tercihleri: ${preferencesUrl}`,
    ].join("\n"),
    to: input.email,
  });
}
