import Link from "next/link";
import { listContractTemplateWorkbenchRecords } from "@/features/contracts/template-lifecycle";
import type {
  ContractTargetRole,
  ContractTemplateLifecycleStatus,
} from "@/features/contracts/types";

const lifecycleLabels: Record<ContractTemplateLifecycleStatus, string> = {
  soft: "Soft Taslak",
  draft: "Taslak",
  review: "İncelemede",
  approved: "Onaylı",
  active: "Aktif",
};

const roleLabels: Record<ContractTargetRole, string> = {
  any: "Tüm roller",
  admin: "Admin",
  editor: "Editör",
  editor_pending: "Editör adayı",
  publisher: "Yayınevi",
  reader: "Okuyucu",
  writer: "Yazar",
};

const lifecycleFilters = ["all", "draft", "review", "approved", "active"] as const;
const roleFilters = ["all", "any", "writer", "editor", "editor_pending", "publisher", "reader", "admin"] as const;

function formatDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

export default async function ContractTemplateLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ durum?: string; rol?: string }>;
}) {
  const params = await searchParams;
  const allTemplates = await listContractTemplateWorkbenchRecords();
  const templates = allTemplates.filter((template) => template.lifecycleStatus !== "soft");

  const selectedStatus = lifecycleFilters.includes(params.durum as (typeof lifecycleFilters)[number])
    ? (params.durum as (typeof lifecycleFilters)[number])
    : "all";
  const selectedRole = roleFilters.includes(params.rol as (typeof roleFilters)[number])
    ? (params.rol as (typeof roleFilters)[number])
    : "all";

  const visibleTemplates = templates.filter((template) =>
    (selectedStatus === "all" || template.lifecycleStatus === selectedStatus) &&
    (selectedRole === "all" || template.targetRole === selectedRole),
  );

  const counts = {
    active: templates.filter((template) => template.lifecycleStatus === "active").length,
    approved: templates.filter((template) => template.lifecycleStatus === "approved").length,
    draft: templates.filter((template) => template.lifecycleStatus === "draft").length,
    review: templates.filter((template) => template.lifecycleStatus === "review").length,
  };

  return (
    <main className="contract-template-library-page">
      <header className="contract-library-hero">
        <div>
          <p>ŞABLON KÜTÜPHANESİ</p>
          <h1>Gerçek sözleşme çalışma masası</h1>
          <p>
            Soft Taslaklar burada doğrudan gönderilmez. Kullanılacak sözleşme ayrı bir çalışma şablonuna dönüştürülür; Taslak → İncelemede → Onaylı → Aktif zincirini tamamladıktan sonra gönderim ekranına girer.
          </p>
        </div>
        <Link href="/sozlesme/sablonlar/yeni">+ Yeni taslak şablon</Link>
      </header>

      <section className="contract-library-summary" aria-label="Şablon yaşam döngüsü özeti">
        <article><strong>{templates.length}</strong><span>Toplam çalışma şablonu</span></article>
        <article><strong>{counts.draft}</strong><span>Taslak</span></article>
        <article><strong>{counts.review}</strong><span>İncelemede</span></article>
        <article><strong>{counts.approved}</strong><span>Onaylı / pasif</span></article>
        <article><strong>{counts.active}</strong><span>Aktif / gönderilebilir</span></article>
      </section>

      <section className="contract-library-controls">
        <form method="get">
          <label>
            <span>Durum</span>
            <select name="durum" defaultValue={selectedStatus}>
              <option value="all">Tüm durumlar</option>
              <option value="draft">Taslak</option>
              <option value="review">İncelemede</option>
              <option value="approved">Onaylı</option>
              <option value="active">Aktif</option>
            </select>
          </label>
          <label>
            <span>Hedef rol</span>
            <select name="rol" defaultValue={selectedRole}>
              <option value="all">Tüm roller</option>
              {roleFilters.filter((item) => item !== "all").map((item) => (
                <option key={item} value={item}>{roleLabels[item]}</option>
              ))}
            </select>
          </label>
          <button type="submit">Filtrele</button>
          <Link href="/sozlesme/sablonlar">Temizle</Link>
        </form>
        <p>{visibleTemplates.length} kayıt gösteriliyor.</p>
      </section>

      <section className="contract-library-grid" aria-label="Sözleşme şablonları">
        {visibleTemplates.map((template) => (
          <article className="contract-library-card" data-status={template.lifecycleStatus} key={template.id}>
            <div className="contract-library-card__top">
              <span data-status={template.lifecycleStatus}>{lifecycleLabels[template.lifecycleStatus]}</span>
              <small>{roleLabels[template.targetRole]} · v{template.version}</small>
            </div>
            <div>
              <h2>{template.title}</h2>
              <p>{template.description ?? "Açıklama yok"}</p>
            </div>
            <dl>
              <div><dt>Şablon kodu</dt><dd><code>{template.code}</code></dd></div>
              <div><dt>Kaynak</dt><dd>{template.sourceTemplateCode ?? "Manuel oluşturuldu"}</dd></div>
              <div><dt>Son güncelleme</dt><dd>{formatDate(template.updatedAt)}</dd></div>
            </dl>
            <footer>
              {template.sourceTemplateId ? (
                <Link href={`/sozlesme/sablonlar/${template.sourceTemplateId}`}>Soft kaynağı aç</Link>
              ) : <span />}
              <Link href={`/sozlesme/sablonlar/${template.id}`}>Çalışma masasını aç →</Link>
            </footer>
          </article>
        ))}
      </section>

      {visibleTemplates.length === 0 ? (
        <div className="contract-library-empty">
          <strong>Bu filtrede şablon yok.</strong>
          <p>Soft Taslaklar&apos;dan çalışma kopyası oluşturabilir veya yeni bir taslak şablon başlatabilirsiniz.</p>
          <div>
            <Link href="/sozlesme/taslaklar">Soft Taslaklara git</Link>
            <Link href="/sozlesme/sablonlar/yeni">Yeni şablon oluştur</Link>
          </div>
        </div>
      ) : null}
    </main>
  );
}
