import Link from "next/link";
import { getSystemMapWorkspaceData } from "@/features/system-map/workspace-data";

const completedStages = [
  {
    title: "Temel üyelik sözleşmesi",
    description: "Yeni üyelikte Platform Kullanım ve Gizlilik Taahhüdü kabulü aynı kayıt transaction'ında değişmez UserContract snapshot + accepted event olarak saklanır.",
    routes: ["/kayit", "/uyelik-sozlesmesi"],
    evidence: "registration-agreement.ts · UserContract · UserContractEvent",
  },
  {
    title: "Soft Taslaklar",
    description: "Dokuz olgun soft metin kaynak olarak korunur; doğrudan aktifleştirilemez veya kullanıcıya gönderilemez.",
    routes: ["/sozlesme/taslaklar"],
    evidence: "SOFT_* · lifecycleStatus=soft · DB fail-closed",
  },
  {
    title: "Şablon Kütüphanesi",
    description: "Operasyon şablonları Taslak → İncelemede → Onaylı → Aktif yaşam döngüsünden geçer. İçerik değişikliği aktif/onaylı şablonu yeniden incelemeye düşürür ve sürümü artırır.",
    routes: ["/sozlesme/sablonlar", "/sozlesme/sablonlar/[templateId]"],
    evidence: "template-lifecycle.ts · lifecycle DB CHECK",
  },
  {
    title: "Aktivasyon öncesi inceleme, ürün politikası ve hukukçu paketi",
    description: "Dokuz LIB çalışma şablonunun ürün politikası kararları sürüm kontrollü kaydedilir; tam metin ve açık hukuki inceleme notları hukukçuya yazdırılabilir/PDF teslim edilebilir salt-okunur pakette toplanır.",
    routes: ["/sozlesme/inceleme", "/sozlesme/hukuk-inceleme"],
    evidence: "review-readiness.ts · ContractLegalReviewPrintButton · LIB_* readiness registry",
  },
  {
    title: "Sürüme bağlı hukukçu inceleme kanıtı",
    description: "Şablon İncelemede aşamasındayken hukukçu/inceleyen ve sonuç notu mevcut templateVersion'a append-only kanıt olarak kaydedilir. Aynı sürümde legal_review kanıtı yoksa review → approved geçişi transaction içinde reddedilir; metin değişirse eski kanıt yeni sürüme taşınmaz.",
    routes: ["/sozlesme/sablonlar/[templateId]"],
    evidence: "ContractTemplateReviewEvidence · review-evidence.ts · review_evidence_required",
  },
  {
    title: "Atama ve gönderim",
    description: "Admin rol, kullanıcı, aktif şablon ve gerektiğinde eser seçer; önizleme ve açık gönderim onayı sonrası immutable snapshot oluşturulur. Mükerrer aktif atama engellenir.",
    routes: ["/sozlesme"],
    evidence: "manual-dispatch.ts · activeKey · row locks",
  },
  {
    title: "Kullanıcı sözleşme kutusu",
    description: "Alıcı yalnız kendi sözleşmelerini görür. Detay gerçekten tarayıcıda açıldığında görüntülendi kanıtı oluşturulur; server prefetch görüntülenme sayılmaz.",
    routes: ["/sozlesmelerim", "/sozlesmelerim/[contractId]"],
    evidence: "recipient ownership · mounted viewed marker",
  },
  {
    title: "Kabul / ret ve iptal",
    description: "Kullanıcı kabul/ret, admin iptal işlemlerinde açık onay gerekir. Terminal durumlar tekrar değiştirilemez ve activeKey serbest bırakılır.",
    routes: ["/sozlesmelerim/[contractId]", "/sozlesme/[contractId]"],
    evidence: "guarded-response-actions.ts · terminal state guard",
  },
  {
    title: "Takip ve hatırlatma",
    description: "Bekleme süresi, gerçek görüntülenme ve hatırlatma kanıtı izlenir. Yanıt bekleyen manuel sözleşmeye İstanbul gününde en fazla bir hatırlatma gönderilebilir.",
    routes: ["/sozlesme/takip", "/sozlesme/[contractId]"],
    evidence: "tracking-activity.ts · reminders.ts · UserContractEvent",
  },
  {
    title: "Bildirim ve e-posta",
    description: "İlk gönderim ve hatırlatmada in-app + güvenli e-posta çalışır. Contract body/admin notu e-postaya taşınmaz; kullanıcı/admin deep-link hedefleri DB sahipliği ile doğrulanır.",
    routes: ["/sozlesme/bildirimler", "/harita/olaylar"],
    evidence: "EmailDelivery · user_contract resolver · idempotency",
  },
] as const;

const remainingItems = [
  "Her operasyon şablonunun gerçek hukukçu kontrolü; sonuç aynı templateVersion için kanıt olarak kaydedilmeden Onaylı durumuna geçilemez.",
  "Yayın niyeti şablonları ürün politikası tanımlı olsa da şimdilik pasif kalır ve ayrıca aktivasyon kararı verilmeden gönderime açılmaz.",
  "Yazar–Yayınevi nihai yayın hakları sözleşmesi: ticari hak modeli kesinleşmeden bağlayıcı metin üretilmeyecek.",
  "Final Release UAT #263 sözleşme satırları: yalnız gerçek authenticated insan testiyle HUMAN_PASS olabilir.",
] as const;

function routeExists(route: string, inventory: Array<{ route: string }>) {
  return inventory.some((item) => item.route === route);
}

export default async function ContractSystemMapPage() {
  const { snapshot } = await getSystemMapWorkspaceData();
  const routeChecks = completedStages.flatMap((stage) => stage.routes);
  const presentRoutes = routeChecks.filter((route) => routeExists(route, snapshot.routes)).length;

  return (
    <main className="system-map-page">
      <header className="system-map-workspace-header">
        <div>
          <p className="system-map-eyebrow">HARİTA · SÖZLEŞME YÖNETİMİ</p>
          <h1>Sözleşme Akışı</h1>
          <p>
            Kayıt sözleşmesinden şablon yaşam döngüsü, ürün politikası ve sürüme bağlı hukukçu kanıtına; gönderimden kullanıcı kararına,
            hatırlatma ve bildirim zincirine kadar sözleşme sisteminin kanonik teknik haritası.
          </p>
        </div>
        <Link href="/sozlesme">Sözleşme Merkezi →</Link>
      </header>

      <section className="system-map-integrity" aria-label="Sözleşme haritası route kanıtı">
        <div>
          <span className="system-map-live-dot" />
          <strong>Sözleşme route kanıtı</strong>
          <span>{presentRoutes}/{routeChecks.length} route envanterde</span>
        </div>
        <p>Route envanteri build-time sistem haritasından okunur; bu sayfa ayrı bir veri kaynağı oluşturmaz.</p>
      </section>

      <div className="system-map-workspace-body">
        <section className="system-map-overview-workbenches" aria-labelledby="contract-map-completed-title">
          <div className="system-map-section-heading">
            <div>
              <p>TEKNİK ZİNCİR</p>
              <h2 id="contract-map-completed-title">Tamamlanan sözleşme çalışma alanları</h2>
            </div>
            <span>{completedStages.length} aşama</span>
          </div>

          <div className="system-map-overview-groups">
            <section>
              <h3>KANONİK AKIŞ</h3>
              <div>
                {completedStages.map((stage, index) => {
                  const stageRoutesPresent = stage.routes.filter((route) => routeExists(route, snapshot.routes)).length;
                  return (
                    <article key={stage.title}>
                      <strong>{index + 1}. {stage.title}</strong>
                      <span>{stage.description}</span>
                      <small>Route: {stage.routes.join(" → ")}</small>
                      <small>Kanıt: {stage.evidence}</small>
                      <small>{stageRoutesPresent}/{stage.routes.length} route doğrulandı</small>
                    </article>
                  );
                })}
              </div>
            </section>
          </div>
        </section>

        <section className="system-map-overview-workbenches" aria-labelledby="contract-map-remaining-title">
          <div className="system-map-section-heading">
            <div>
              <p>KALAN SINIR</p>
              <h2 id="contract-map-remaining-title">Teknik kapanış sonrası bilinçli açıklar</h2>
            </div>
            <span>{remainingItems.length} başlık</span>
          </div>
          <div className="system-map-overview-groups">
            <section>
              <h3>HUKUKİ / AKTİVASYON / HUMAN UAT</h3>
              <div>
                {remainingItems.map((item) => (
                  <article key={item}>
                    <strong>Bekliyor</strong>
                    <span>{item}</span>
                  </article>
                ))}
              </div>
            </section>
          </div>
        </section>
      </div>
    </main>
  );
}
