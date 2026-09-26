import {
  collectBookIndexListAction,
  matchPendingBookIndexBooksAction,
} from "@/features/book-index/admin-actions";
import { BOOK_INDEX_LISTS } from "@/lib/book-index/lists";
import { getBookIndexOperationsSnapshot } from "@/lib/book-index/operations";
import { getTurkeyBookIndexPreview } from "@/lib/book-index/read-model";
import { getBookIndexReadinessSnapshot } from "@/lib/book-index/readiness";
import { getBookIndexSeoGateSnapshot } from "@/lib/book-index/seo-gate";
import { BOOK_INDEX_SPONSOR_SLOTS } from "@/lib/book-index/sponsor";
import {
  BOOK_INDEX_SOURCES,
  BOOK_INDEX_V1_SOURCES,
  TURKEY_INDEX_MIN_SOURCES,
  TURKEY_INDEX_V1_SOURCES,
} from "@/lib/book-index/sources";
import { prisma } from "@/lib/prisma";

type SearchParams = Promise<{
  adet?: string;
  durum?: string;
  liste?: string;
  eslesen?: string;
  bekleyen?: string;
}>;

function stateLabel(state: (typeof BOOK_INDEX_SOURCES)[number]["collectionState"]) {
  switch (state) {
    case "active":
      return "Aktif";
    case "ready":
      return "Hazır";
    case "researching":
      return "Araştırılıyor";
    case "paused":
      return "Beklemede";
    case "blocked":
      return "Engelli";
    default:
      return "Planlandı";
  }
}

function runStatusLabel(status: string) {
  switch (status) {
    case "success":
      return "Başarılı";
    case "no_change":
      return "Değişiklik yok";
    case "partial":
      return "Kısmi";
    case "failed":
      return "Hata";
    default:
      return "Çalışıyor";
  }
}

function formatDateTime(value: Date | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "short",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

function cadenceLabel(minutes: number | null) {
  if (minutes === null) return "Manuel";
  if (minutes % 1440 === 0) return `${minutes / 1440} gün`;
  if (minutes % 60 === 0) return `${minutes / 60} saat`;
  return `${minutes} dk`;
}

function seoGateStateLabel(state: string) {
  switch (state) {
    case "eligible":
      return "Kanıt yeterli";
    case "insufficient_evidence":
      return "Kanıt yetersiz";
    case "policy_incomplete":
      return "Politika eksik";
    default:
      return "Gate kapalı";
  }
}

function feedbackMessage(params: Awaited<SearchParams>) {
  switch (params.durum) {
    case "toplandi":
      return `${params.liste ?? "Liste"} başarıyla toplandı · ${params.adet ?? "0"} kayıt snapshot'a eklendi.`;
    case "degisiklik-yok":
      return `${params.liste ?? "Liste"} kontrol edildi · kaynak sıralaması değişmedi.`;
    case "toplama-hatasi":
      return `${params.liste ?? "Liste"} için toplama başarısız. Son fetch run hata kaydını aşağıdan kontrol edin.`;
    case "liste-bulunamadi":
      return "İstenen Kitap Endeksi listesi aktif değil veya bulunamadı.";
    case "eslestirme-tamamlandi":
      return `Eşleştirme tamamlandı · ${params.adet ?? "0"} kayıt işlendi · ${params.eslesen ?? "0"} eşleşti · ${params.bekleyen ?? "0"} manuel inceleme bekliyor.`;
    case "eslestirme-hatasi":
      return "Kitap eşleştirme işlemi tamamlanamadı. Sistem kayıtlarını kontrol edin.";
    default:
      return null;
  }
}

export default async function BookIndexAdminPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const feedback = feedbackMessage(params);

  const [
    sourceRows,
    listCount,
    masterBookCount,
    externalBookCount,
    observationCount,
    unmatchedCount,
    successfulRuns,
    failedRuns,
    recentRuns,
  ] = await Promise.all([
    prisma.bookIndexSource.findMany({
      orderBy: { code: "asc" },
      select: {
        code: true,
        status: true,
        updatedAt: true,
      },
    }),
    prisma.bookIndexList.count(),
    prisma.bookIndexBook.count(),
    prisma.bookIndexExternalBook.count(),
    prisma.bookIndexObservation.count(),
    prisma.bookIndexExternalBook.count({
      where: { matchStatus: "unmatched" },
    }),
    prisma.bookIndexFetchRun.count({
      where: { status: { in: ["success", "no_change"] } },
    }),
    prisma.bookIndexFetchRun.count({
      where: { status: "failed" },
    }),
    prisma.bookIndexFetchRun.findMany({
      orderBy: { startedAt: "desc" },
      take: 8,
      include: {
        list: {
          select: {
            code: true,
            title: true,
            source: { select: { name: true } },
          },
        },
      },
    }),
  ]);

  const [turkeyPreview, operations, readiness, seoGate] = await Promise.all([
    getTurkeyBookIndexPreview(30),
    getBookIndexOperationsSnapshot(),
    getBookIndexReadinessSnapshot(),
    getBookIndexSeoGateSnapshot(),
  ]);

  const dbSourceByCode = new Map(
    sourceRows.map((source) => [source.code, source] as const),
  );
  const manualLists = BOOK_INDEX_LISTS.filter((list) => list.enabled);

  return (
    <>
      <header className="admin-page-heading">
        <div>
          <span className="admin-eyebrow">Veri ürünü</span>
          <h1>Kitap Endeksi</h1>
          <p>
            Dış çok satan listelerinin kaynak kapsamını, snapshot veri
            omurgasını ve Türkiye Endeksi hazırlığını tek noktadan izleyin.
          </p>
        </div>
        <span className="admin-table-badge" data-status="pending">
          Collector V1
        </span>
      </header>

      {feedback ? (
        <section className="admin-panel">
          <strong>{feedback}</strong>
        </section>
      ) : null}

      <section className="admin-settings-grid">
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">V1 kaynak</span>
          <h2>{BOOK_INDEX_V1_SOURCES.length}</h2>
          <p>İlk collector dalgasındaki çekirdek kaynaklar.</p>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Türkiye Endeksi</span>
          <h2>{TURKEY_INDEX_V1_SOURCES.length}</h2>
          <p>Amazon ABD hariç V1 Türkiye oy kaynakları.</p>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Master kitap</span>
          <h2>{masterBookCount.toLocaleString("tr-TR")}</h2>
          <p>Kaynak kayıtlarının bağlandığı tekilleştirilmiş kitaplar.</p>
        </article>
        <article className="admin-panel admin-settings-card">
          <span className="admin-eyebrow">Snapshot</span>
          <h2>{observationCount.toLocaleString("tr-TR")}</h2>
          <p>Silinmeden saklanan tarihsel rank gözlemleri.</p>
        </article>
      </section>

      <section className="admin-detail-grid">
        <article className="admin-panel">
          <span className="admin-eyebrow">Endeks kontratı</span>
          <h2>1 bağımsız işletmeci grubu = 1 oy</h2>
          <p>
            Türkiye Endeksi için en az {TURKEY_INDEX_MIN_SOURCES} bağımsız
            işletmeci grubu gerekir. Aynı işletmeciye ait storefront kaynakları
            tek oyda birleşir; bağımsız işletmeci oyları eşit ağırlıkla hesaplanır.
          </p>
        </article>

        <article className="admin-panel">
          <span className="admin-eyebrow">Eşleştirme</span>
          <h2>{unmatchedCount.toLocaleString("tr-TR")} bekleyen</h2>
          <p>
            Öncelik ISBN-13, ISBN-10, başlık+yazar ve son aşamada manuel admin
            eşleştirmesidir.
          </p>
          <small>
            Dış kitap kaydı: {externalBookCount.toLocaleString("tr-TR")} ·
            Liste: {listCount.toLocaleString("tr-TR")}
          </small>
          <form action={matchPendingBookIndexBooksAction}>
            <button className="admin-button admin-button--secondary" type="submit">
              Bekleyenleri eşleştir
            </button>
          </form>
        </article>

        <article className="admin-panel">
          <span className="admin-eyebrow">Collector sağlığı</span>
          <h2>
            {successfulRuns.toLocaleString("tr-TR")} başarılı ·{" "}
            {failedRuns.toLocaleString("tr-TR")} hata
          </h2>
          <p>
            Adaptörler kaynak bazında izole çalışır; tek kaynağın bozulması
            diğer kaynakları durdurmaz.
          </p>
        </article>

        <article className="admin-panel">
          <span className="admin-eyebrow">Scheduler hazırlığı</span>
          <h2>GitHub OIDC hazır</h2>
          <p>
            {operations.dueCount.toLocaleString("tr-TR")} liste şu anda kontrol
            zamanında. Saatlik scheduler aktif; gerçek çekim sıklığını her
            listenin kendi cadence değeri belirler.
          </p>
          <small>
            Kısa ömürlü GitHub kimliği kullanılır. Legacy secret fallback:{" "}
            {operations.schedulerSecretConfigured ? "hazır" : "tanımsız"}.
          </small>
        </article>

        <article className="admin-panel">
          <span className="admin-eyebrow">Sponsor</span>
          <h2>{BOOK_INDEX_SPONSOR_SLOTS.length} slot · default OFF</h2>
          <p>
            Genel endeks, kategori ve kaynak yüzeyi için entegrasyon noktaları
            tanımlıdır. Aktivasyon Banner / Reklam Alanları üzerinden
            yapılacaktır; sponsor organik rankı değiştiremez ve sıra numarası
            alamaz.
          </p>
        </article>
      </section>

      <section className="admin-panel admin-directory-panel">
        <header className="admin-page-heading">
          <div>
            <span className="admin-eyebrow">Türkiye Endeksi önizleme</span>
            <h2>Kaynaklar arası bileşik sıralama</h2>
            <p>
              Yalnız eşleşmiş master kitaplar ve en az {TURKEY_INDEX_MIN_SOURCES}
              bağımsız Türkiye kaynağı bulunan kayıtlar gösterilir. Bu ekran
              yönetim önizlemesidir; henüz public veya sitemap&apos;te değildir.
            </p>
          </div>
        </header>

        {turkeyPreview.length ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Kitap</th>
                  <th>Endeks</th>
                  <th>Kaynak</th>
                  <th>Kaynak sıraları</th>
                </tr>
              </thead>
              <tbody>
                {turkeyPreview.map((row, index) => (
                  <tr key={row.masterBookId}>
                    <td><strong>{index + 1}</strong></td>
                    <td>
                      <strong>{row.title}</strong>
                      <small>{row.authorName ?? "Yazar bilgisi bekleniyor"}</small>
                    </td>
                    <td><strong>{row.score.toLocaleString("tr-TR")}</strong></td>
                    <td>{row.sourceCount}</td>
                    <td>
                      {row.sources
                        .map((source) => `${source.sourceName} #${source.rank}`)
                        .join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>Türkiye Endeksi için henüz yeterli ortak kitap yok.</strong>
            <p>
              Canlı listeleri kontrol edin ve bekleyen eşleştirmeleri çalıştırın.
              En az üç bağımsız kaynakta eşleşen kitaplar burada görünür.
            </p>
          </div>
        )}
      </section>

      <section className="admin-panel admin-directory-panel">
        <header className="admin-page-heading">
          <div>
            <span className="admin-eyebrow">Operasyon görünümü</span>
            <h2>Liste cadence ve scheduler hazırlığı</h2>
            <p>
              Son kontrol, son başarılı snapshot ve bir sonraki kontrol zamanı
              tek tabloda izlenir. Bu görünüm otomatik cron&apos;u çalıştırmaz.
            </p>
          </div>
          <span
            className="admin-table-badge"
            data-status="active"
          >
            Saatlik scheduler aktif
          </span>
        </header>

        <div className="admin-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Kaynak liste</th>
                <th>Cadence</th>
                <th>Son kontrol</th>
                <th>Son başarılı</th>
                <th>Sonraki due</th>
                <th>Operasyon durumu</th>
              </tr>
            </thead>
            <tbody>
              {operations.rows.map((row) => (
                <tr key={row.listCode}>
                  <td>
                    <strong>{row.title}</strong>
                    <small>{row.listCode}</small>
                  </td>
                  <td>{cadenceLabel(row.cadenceMinutes)}</td>
                  <td>
                    <strong>
                      {row.latestRunStatus
                        ? runStatusLabel(row.latestRunStatus)
                        : "Henüz çalışmadı"}
                    </strong>
                    <small>{formatDateTime(row.latestRunAt)}</small>
                    {row.latestRunErrorCode ? (
                      <small>{row.latestRunErrorCode}</small>
                    ) : null}
                  </td>
                  <td>{formatDateTime(row.lastSuccessfulRunAt)}</td>
                  <td>{formatDateTime(row.nextDueAt)}</td>
                  <td>
                    <strong>{row.due ? "Kontrol zamanı" : "Bekliyor"}</strong>
                    <small>
                      {row.persisted
                        ? `${row.latestRunItems ?? 0} son kayıt`
                        : "İlk bootstrap bekleniyor"}
                    </small>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel admin-directory-panel">
        <header className="admin-page-heading">
          <div>
            <span className="admin-eyebrow">Public / SEO readiness</span>
            <h2>Veri kalitesi ölçümleri</h2>
            <p>
              Bu metrikler public açılım kararını otomatik vermez. Yeterli
              gerçek veri biriktikten sonra kalite eşikleri ayrıca
              kilitlenecektir.
            </p>
          </div>
          <span
            className="admin-table-badge"
            data-status={seoGate.canPublish ? "active" : "pending"}
          >
            {seoGate.canPublish ? "Publish uygun" : "Public kapalı"}
          </span>
        </header>

        <section className="admin-settings-grid">
          <article className="admin-panel admin-settings-card">
            <span className="admin-eyebrow">Composite kaynak</span>
            <h2>
              {readiness.observedCompositeSources} /{" "}
              {readiness.compositeSourceTarget}
            </h2>
            <p>
              En az bir başarılı snapshot üretmiş genel Türkiye kaynakları.
            </p>
            <small>
              {readiness.observedCompositeSourceCodes.length
                ? readiness.observedCompositeSourceCodes.join(" · ")
                : "Henüz başarılı composite snapshot yok"}
            </small>
          </article>

          <article className="admin-panel admin-settings-card">
            <span className="admin-eyebrow">Bağımsız işletmeci</span>
            <h2>
              {readiness.observedCompositeIndependenceGroups} /{" "}
              {readiness.compositeIndependenceGroupTarget}
            </h2>
            <p>Composite kaynakların gerçek bağımsız oy grupları.</p>
            <small>
              {readiness.observedCompositeIndependenceGroupCodes.join(" · ")}
            </small>
          </article>

          <article className="admin-panel admin-settings-card">
            <span className="admin-eyebrow">3+ bağımsız kaynak</span>
            <h2>{readiness.booksOnAtLeast3IndependentCompositeSources}</h2>
            <p>En az üç bağımsız işletmeci grubunda bulunan güncel kitap sayısı.</p>
          </article>

          <article className="admin-panel admin-settings-card">
            <span className="admin-eyebrow">Master eşleşme</span>
            <h2>%{readiness.matchCoveragePercent.toLocaleString("tr-TR")}</h2>
            <p>
              {readiness.matchedExternalBookCount.toLocaleString("tr-TR")} eşleşmiş ·{" "}
              {readiness.unmatchedExternalBookCount.toLocaleString("tr-TR")} eşleşmemiş
            </p>
          </article>

          <article className="admin-panel admin-settings-card">
            <span className="admin-eyebrow">Tarihsel kapsam</span>
            <h2>{readiness.historySpanDays.toLocaleString("tr-TR")} gün</h2>
            <p>
              İlk snapshot: {formatDateTime(readiness.firstObservationAt)}
              <br />
              Son snapshot: {formatDateTime(readiness.lastObservationAt)}
            </p>
          </article>

          <article className="admin-panel admin-settings-card">
            <span className="admin-eyebrow">SEO kalite kapısı</span>
            <h2>{seoGateStateLabel(seoGate.state)}</h2>
            <p>
              Politika: {seoGate.policy.policyVersion ?? "tanımsız"} · Yayın:{" "}
              {seoGate.canPublish ? "açılabilir" : "kapalı"}
            </p>
            <small>
              Gate {seoGate.policy.enabled ? "aktif" : "kapalı"} · Publish switch{" "}
              {seoGate.policy.publicationEnabled ? "açık" : "kapalı"}
            </small>
          </article>
        </section>

        <div className="admin-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Kaynak tarihçesi</th>
                <th>Başarılı snapshot</th>
                <th>İlk başarılı</th>
                <th>Son başarılı</th>
                <th>Biriken süre</th>
                <th>Listeler</th>
              </tr>
            </thead>
            <tbody>
              {readiness.sourceHistoryMaturity.map((source) => (
                <tr key={source.sourceCode}>
                  <td><strong>{source.sourceCode}</strong></td>
                  <td>{source.successfulRunCount.toLocaleString("tr-TR")}</td>
                  <td>{formatDateTime(source.firstSuccessfulRunAt)}</td>
                  <td>{formatDateTime(source.lastSuccessfulRunAt)}</td>
                  <td>
                    {source.historySpanHours.toLocaleString("tr-TR", {
                      maximumFractionDigits: 1,
                    })} saat
                  </td>
                  <td>{source.listCodes.join(" · ") || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="admin-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>SEO gate kanıtı</th>
                <th>Mevcut</th>
                <th>Eşik</th>
                <th>Durum</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>Composite kaynak</td>
                <td>{seoGate.evidence.observedCompositeSources}</td>
                <td>{seoGate.policy.minCompositeSources ?? "Tanımsız"}</td>
                <td>
                  {seoGate.failures.includes("composite_sources")
                    ? "Yetersiz"
                    : "—"}
                </td>
              </tr>
              <tr>
                <td>Master eşleşme</td>
                <td>%{seoGate.evidence.matchCoveragePercent.toLocaleString("tr-TR")}</td>
                <td>
                  {seoGate.policy.minMatchCoveragePercent === null
                    ? "Tanımsız"
                    : `%${seoGate.policy.minMatchCoveragePercent.toLocaleString("tr-TR")}`}
                </td>
                <td>
                  {seoGate.failures.includes("match_coverage")
                    ? "Yetersiz"
                    : "—"}
                </td>
              </tr>
              <tr>
                <td>Tarihsel kapsam</td>
                <td>{seoGate.evidence.historySpanDays} gün</td>
                <td>
                  {seoGate.policy.minHistoryDays === null
                    ? "Tanımsız"
                    : `${seoGate.policy.minHistoryDays} gün`}
                </td>
                <td>
                  {seoGate.failures.includes("history_span")
                    ? "Yetersiz"
                    : "—"}
                </td>
              </tr>
              <tr>
                <td>Türkiye Endeksi kayıt</td>
                <td>{seoGate.evidence.turkeyItemCount}</td>
                <td>{seoGate.policy.minTurkeyItems ?? "Tanımsız"}</td>
                <td>
                  {seoGate.failures.includes("turkey_items")
                    ? "Yetersiz"
                    : "—"}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {manualLists.length ? (
        <section className="admin-panel admin-directory-panel">
          <header className="admin-page-heading">
            <div>
              <span className="admin-eyebrow">Canlı kaynak doğrulaması</span>
              <h2>Kaynak listelerini manuel kontrol et</h2>
              <p>
                Her kontrol ayrı rank snapshot&apos;ı üretir; önceki veriler
                overwrite edilmez. Saatlik scheduler aktiftir; bu buton yalnız
                kontrollü manuel doğrulama için kullanılır.
              </p>
            </div>
          </header>
          <div className="admin-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Kaynak liste</th>
                  <th>Dönem</th>
                  <th>Top</th>
                  <th>Türkiye bileşik</th>
                  <th>İşlem</th>
                </tr>
              </thead>
              <tbody>
                {manualLists.map((list) => (
                  <tr key={list.code}>
                    <td>
                      <strong>{list.title}</strong>
                      <small>{list.code}</small>
                    </td>
                    <td>{list.period}</td>
                    <td>{list.maxRank ?? "—"}</td>
                    <td>{list.includeInComposite ? "Dahil" : "Kaynak görünümü"}</td>
                    <td>
                      <form action={collectBookIndexListAction}>
                        <input type="hidden" name="listCode" value={list.code} />
                        <button
                          className="admin-button admin-button--primary"
                          type="submit"
                        >
                          Şimdi kontrol et
                        </button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      <section className="admin-panel admin-directory-panel">
        <header className="admin-page-heading">
          <div>
            <span className="admin-eyebrow">Kaynak registry</span>
            <h2>Kaynak kapsamı</h2>
            <p>
              V1 ve Faz 2 kaynakları burada tek ürün altında tutulur. Ayrı bir
              admin kabuğu oluşturulmaz.
            </p>
          </div>
        </header>

        <div className="admin-table-wrap">
          <table className="admin-data-table">
            <thead>
              <tr>
                <th>Kaynak</th>
                <th>Pazar</th>
                <th>Faz</th>
                <th>Türkiye Endeksi</th>
                <th>Collector</th>
                <th>DB durumu</th>
              </tr>
            </thead>
            <tbody>
              {BOOK_INDEX_SOURCES.map((source) => {
                const persisted = dbSourceByCode.get(source.code);

                return (
                  <tr key={source.code}>
                    <td>
                      <strong>{source.name}</strong>
                      <small>{source.code}</small>
                    </td>
                    <td>{source.market === "TR" ? "Türkiye" : "ABD"}</td>
                    <td>{source.phase === "v1" ? "V1" : "Faz 2"}</td>
                    <td>
                      {source.includeInTurkeyIndex ? "Dahil" : "Ayrı pazar"}
                    </td>
                    <td>{stateLabel(source.collectionState)}</td>
                    <td>
                      {persisted ? (
                        <>
                          <strong>{persisted.status}</strong>
                          <small>
                            {new Intl.DateTimeFormat("tr-TR", {
                              dateStyle: "short",
                              timeStyle: "short",
                              timeZone: "Europe/Istanbul",
                            }).format(persisted.updatedAt)}
                          </small>
                        </>
                      ) : (
                        "Henüz bootstrap edilmedi"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="admin-panel admin-directory-panel">
        <header className="admin-page-heading">
          <div>
            <span className="admin-eyebrow">Fetch geçmişi</span>
            <h2>Son kaynak kontrolleri</h2>
          </div>
        </header>

        {recentRuns.length ? (
          <div className="admin-table-wrap">
            <table className="admin-data-table">
              <thead>
                <tr>
                  <th>Kaynak</th>
                  <th>Liste</th>
                  <th>Durum</th>
                  <th>Kayıt</th>
                  <th>Başlangıç</th>
                  <th>Hata</th>
                </tr>
              </thead>
              <tbody>
                {recentRuns.map((run) => (
                  <tr key={run.id}>
                    <td>{run.list.source.name}</td>
                    <td>
                      <strong>{run.list.title}</strong>
                      <small>{run.list.code}</small>
                    </td>
                    <td>{runStatusLabel(run.status)}</td>
                    <td>{run.itemsStored}</td>
                    <td>
                      {new Intl.DateTimeFormat("tr-TR", {
                        dateStyle: "short",
                        timeStyle: "short",
                        timeZone: "Europe/Istanbul",
                      }).format(run.startedAt)}
                    </td>
                    <td>{run.errorCode ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="admin-empty-state">
            <strong>Henüz kaynak kontrolü yapılmadı.</strong>
            <p>İlk Remzi kontrolünden sonra fetch run geçmişi burada görünür.</p>
          </div>
        )}
      </section>
    </>
  );
}
