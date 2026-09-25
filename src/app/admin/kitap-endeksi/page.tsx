import {
  collectBookIndexListAction,
  matchPendingBookIndexBooksAction,
} from "@/features/book-index/admin-actions";
import { BOOK_INDEX_LISTS } from "@/lib/book-index/lists";
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
          <h2>1 kaynak = 1 oy</h2>
          <p>
            Türkiye Endeksi için en az {TURKEY_INDEX_MIN_SOURCES} bağımsız
            Türkiye kaynağı gerekir. Kaynak rankları 1–100 bandına normalize
            edilir ve V1&apos;de eşit ağırlıkla hesaplanır.
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
          <span className="admin-eyebrow">Sponsor</span>
          <h2>Kapalı / hazır</h2>
          <p>
            Sponsor slotları daha sonra eğitim ve endeks yüzeylerine
            bağlanabilir. Sponsorlu içerik organik rankı değiştiremez ve sıra
            numarası alamaz.
          </p>
        </article>
      </section>

      {manualLists.length ? (
        <section className="admin-panel admin-directory-panel">
          <header className="admin-page-heading">
            <div>
              <span className="admin-eyebrow">Canlı kaynak doğrulaması</span>
              <h2>Kaynak listelerini manuel kontrol et</h2>
              <p>
                Her kontrol ayrı rank snapshot&apos;ı üretir; önceki veriler
                overwrite edilmez. Otomatik scheduler bu aşamada kapalıdır.
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
