import Link from "next/link";
import { listContractTemplates } from "@/features/contracts/repository";
import { softContractDraftCatalog } from "@/features/contracts/soft-draft-catalog";

const roleLabels: Record<string, string> = {
  any: "Tüm roller",
  editor: "Editör",
  editor_pending: "Editör adayı",
  publisher: "Yayınevi",
  reader: "Okuyucu",
  writer: "Yazar",
};

export default async function ContractSoftDraftsPage() {
  const templates = await listContractTemplates({ includeInactive: true });
  const templateByCode = new Map(templates.map((template) => [template.code, template]));
  const installed = softContractDraftCatalog.filter((item) => templateByCode.has(item.code)).length;
  const activated = softContractDraftCatalog.filter((item) => templateByCode.get(item.code)?.active).length;

  return (
    <main className="contract-soft-page">
      <header className="contract-soft-page__header">
        <div>
          <p>ÜRÜN + SİSTEM ANALİZİ</p>
          <h1>Soft Sözleşme Taslakları</h1>
          <p>
            İlkOku&apos;nun yazar, editör ve yayınevi akışlarından türetilen başlangıç metinleri. Bunlar nihai hukuki görüş veya imzaya hazır sözleşme değildir; iş modeli ve hukuk incelemesi tamamlanana kadar pasif tutulur.
          </p>
        </div>
        <Link href="/sozlesme/sablonlar/yeni">Yeni şablon oluştur</Link>
      </header>

      <div className="contract-soft-legal-note">
        Bu kütüphane ürün gereksinimini görünür kılar. Özellikle telif devri, lisans süresi, bölge, münhasırlık, royalty, avans, baskı adedi ve ödeme koşulları sistemde kanonik ticari veri haline gelmeden nihai yayın sözleşmesi üretilmez.
      </div>

      <section className="contract-soft-summary" aria-label="Soft taslak özeti">
        <article><strong>{softContractDraftCatalog.length}</strong><span>Önerilen soft taslak</span></article>
        <article><strong>{installed}</strong><span>Veritabanında hazır</span></article>
        <article><strong>{activated}</strong><span>Admin tarafından aktif edilmiş</span></article>
      </section>

      <section className="contract-soft-grid" aria-label="Önerilen sözleşme taslakları">
        {softContractDraftCatalog.map((item) => {
          const template = templateByCode.get(item.code) ?? null;
          return (
            <article className="contract-soft-card" key={item.code}>
              <div className="contract-soft-card__top">
                <span>{item.area}</span>
                <small>{roleLabels[item.targetRole] ?? item.targetRole}</small>
              </div>
              <h2>{item.title}</h2>
              <p>{item.reason}</p>
              <dl>
                <div><dt>Ne zaman?</dt><dd>{item.trigger}</dd></div>
                <div><dt>Şablon kodu</dt><dd><code>{item.code}</code></dd></div>
              </dl>
              <footer>
                <span data-ready={template ? "true" : "false"}>
                  {template ? (template.active ? "Aktif — gönderimde kullanılabilir" : "Pasif soft taslak") : "Migration bekleniyor"}
                </span>
                {template ? <Link href={`/sozlesme/sablonlar/${template.id}`}>Taslağı aç →</Link> : null}
              </footer>
            </article>
          );
        })}
      </section>
    </main>
  );
}
