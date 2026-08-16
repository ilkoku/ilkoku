import Link from "next/link";
import type { AuditAction, Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

const PAGE_SIZE = 30;
const actionLabels: Record<AuditAction, string> = {
  user_status_changed: "Kullanıcı durumu değiştirildi",
  work_status_changed: "Eser / iş akışı olayı",
  publisher_status_changed: "Yayınevi durumu değiştirildi",
  comment_status_changed: "Yorum durumu değiştirildi",
  reading_access_flagged: "Şüpheli okuma erişimi işaretlendi",
  admin_role_view_changed: "Admin rol görünümü değiştirildi",
  publisher_permission_requested: "Yayınevi yetkisi talep edildi",
  publisher_permission_reviewed: "Yayınevi yetki talebi sonuçlandırıldı",
  publisher_work_liked: "Yayınevi eseri beğendi",
  publisher_author_liked: "Yayınevi yazarı beğendi",
  publisher_work_favorited: "Yayınevi eseri favoriledi",
  publisher_author_favorited: "Yayınevi yazarı favoriledi",
  publisher_author_followed: "Yayınevi yazarı takip etti",
  publisher_discovery_shared: "Yayınevi keşif kaydını paylaştı",
  email_test_sent: "Admin test e-postası gönderdi",
  email_verified: "E-posta doğrulandı",
  login: "Oturum açıldı",
  logout: "Oturum kapatıldı",
  ownership_stamp_created: "Sahiplik kaydı oluşturuldu",
  password_changed: "Şifre değiştirildi",
  password_reset_requested: "Şifre sıfırlama istendi",
  profile_updated: "Profil güncellendi",
  register: "Kullanıcı kaydoldu",
  role_request_reviewed: "Rol başvurusu sonuçlandırıldı",
  role_requested: "Rol başvurusu oluşturuldu",
  work_created: "Eser oluşturuldu",
  work_published: "Eser yayımlandı",
};
const actions = Object.keys(actionLabels) as AuditAction[];

const sourceLabels: Record<string, string> = {
  publisher_submission_created: "Yayınevi başvurusu oluşturuldu",
  publisher_submission_withdrawn: "Yayınevi başvurusu geri çekildi",
  publisher_submission_decision_updated: "Yayınevi başvuru kararı güncellendi",
  publisher_submission_internal_note_added: "Yayınevi iç notu eklendi",
  publisher_editor_request_created: "Yayınevi editör talebi oluşturuldu",
  publisher_editor_request_claimed: "Yayınevi editör görevi alındı",
  publisher_editor_request_completed: "Yayınevi editör incelemesi tamamlandı",
  publisher_editor_request_cancelled: "Yayınevi editör talebi iptal edildi",
  publisher_editor_request_auto_cancelled_ineligible: "Yayınevi editör talebi otomatik kapatıldı",
};

type SearchParams = Promise<{ baslangic?: string; islem?: string; kullanici?: string; page?: string }>;

function isAction(value: string | undefined): value is AuditAction {
  return actions.some((action) => action === value);
}

function validDate(value: string | undefined) {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "medium", timeStyle: "short" }).format(value);
}

function maskIp(value: string | null) {
  if (!value) return "Kaydedilmedi";
  if (value.includes(":")) return `${value.split(":").slice(0, 2).join(":")}:…`;
  const parts = value.split(".");
  return parts.length === 4 ? `${parts[0]}.${parts[1]}.…` : "Maskelendi";
}

function safeMetadata(value: string | null) {
  if (!value) return { lines: [] as string[], source: null as string | null };
  try {
    const parsed = JSON.parse(value) as Record<string, unknown>;
    const allowed = [
      "channel",
      "decision",
      "deliveryId",
      "deliveryMode",
      "from",
      "newStatus",
      "noteChanged",
      "noteLength",
      "oldStatus",
      "publisherId",
      "publisherSubmissionId",
      "recipient",
      "requestedRole",
      "role",
      "sessionsRevoked",
      "source",
      "status",
      "template",
      "to",
      "userId",
    ];
    const source = typeof parsed.source === "string" ? parsed.source : null;
    return {
      lines: allowed.flatMap((key) => key in parsed ? [`${key}: ${String(parsed[key])}`] : []),
      source,
    };
  } catch {
    return {
      lines: ["Yapılandırılmış metadata okunamadı."],
      source: null,
    };
  }
}

function actionLabel(action: AuditAction, source: string | null) {
  return source ? sourceLabels[source] ?? actionLabels[action] : actionLabels[action];
}

function pageHref(user: string, action: string, start: string, page: number) {
  const params = new URLSearchParams({ page: String(page) });
  if (user) params.set("kullanici", user);
  if (action) params.set("islem", action);
  if (start) params.set("baslangic", start);
  return `/admin/audit-log?${params.toString()}`;
}

export default async function AuditLogPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const userQuery = params.kullanici?.trim() ?? "";
  const selectedAction = isAction(params.islem) ? params.islem : "";
  const startDate = validDate(params.baslangic);
  const requestedPage = Number.parseInt(params.page ?? "1", 10);
  const currentPage = Number.isFinite(requestedPage) && requestedPage > 0 ? requestedPage : 1;
  const where: Prisma.AuditLogWhereInput = {
    ...(selectedAction ? { action: selectedAction } : {}),
    ...(startDate ? { createdAt: { gte: startDate } } : {}),
    ...(userQuery ? { actor: { is: { OR: [{ email: { contains: userQuery } }, { fullName: { contains: userQuery } }, { displayName: { contains: userQuery } }] } } } : {}),
  };
  const filteredCount = await prisma.auditLog.count({ where });
  const totalPages = Math.max(1, Math.ceil(filteredCount / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const records = await prisma.auditLog.findMany({ where, include: { actor: { select: { displayName: true, email: true, fullName: true } } }, orderBy: { createdAt: "desc" }, skip: (safePage - 1) * PAGE_SIZE, take: PAGE_SIZE });
  const first = filteredCount ? (safePage - 1) * PAGE_SIZE + 1 : 0;
  const last = Math.min(safePage * PAGE_SIZE, filteredCount);

  return <div className="admin-directory-page"><header className="admin-page-heading"><div><span className="admin-eyebrow">Denetlenebilirlik</span><h1>Audit Log</h1><p>Gerçek sistem hareketlerini kullanıcı, işlem ve tarihe göre inceleyin.</p></div></header><section className="admin-panel admin-directory-panel"><form className="admin-directory-filters" method="get"><label><span>Kullanıcı</span><input defaultValue={userQuery} name="kullanici" placeholder="Ad veya e-posta" type="search" /></label><label><span>İşlem</span><select defaultValue={selectedAction} name="islem"><option value="">Tüm işlemler</option>{actions.map((action) => <option key={action} value={action}>{actionLabels[action]}</option>)}</select></label><label><span>Başlangıç tarihi</span><input defaultValue={params.baslangic ?? ""} name="baslangic" type="date" /></label><button type="submit">Filtrele</button>{(userQuery || selectedAction || startDate) ? <Link href="/admin/audit-log">Temizle</Link> : null}</form>{records.length ? <div className="admin-table-wrap"><table className="admin-data-table"><thead><tr><th>İşlemi yapan</th><th>İşlem</th><th>Etkilenen kayıt</th><th>Özet</th><th>Teknik bilgi</th><th>Tarih</th></tr></thead><tbody>{records.map((record) => { const metadata = safeMetadata(record.metadata); return <tr key={record.id}><td><strong>{record.actor?.displayName || record.actor?.fullName || "Sistem"}</strong><span>{record.actor?.email || "Otomatik işlem"}</span></td><td>{actionLabel(record.action, metadata.source)}</td><td><span>{record.entityType || "—"}</span><small>{record.entityId || "Kimlik yok"}</small></td><td>{metadata.lines.length ? <details><summary>Güvenli özeti aç</summary><ul>{metadata.lines.map((item) => <li key={item}>{item}</li>)}</ul></details> : "Metadata yok"}</td><td><span>IP: {maskIp(record.ipAddress)}</span><small>{record.userAgent ? "İstemci bilgisi kaydedildi" : "İstemci bilgisi yok"}</small></td><td><time dateTime={record.createdAt.toISOString()}>{formatDate(record.createdAt)}</time></td></tr>; })}</tbody></table></div> : <div className="admin-empty-state"><strong>Audit kaydı bulunamadı</strong><p>Sahte veri gösterilmez; filtreleri temizleyerek yeniden deneyin.</p></div>}<footer className="admin-pagination"><span>{first}–{last} / {filteredCount} kayıt</span><div>{safePage > 1 ? <Link href={pageHref(userQuery, selectedAction, params.baslangic ?? "", safePage - 1)}>← Önceki</Link> : <span>← Önceki</span>}<b>{safePage} / {totalPages}</b>{safePage < totalPages ? <Link href={pageHref(userQuery, selectedAction, params.baslangic ?? "", safePage + 1)}>Sonraki →</Link> : <span>Sonraki →</span>}</div></footer></section></div>;
}
