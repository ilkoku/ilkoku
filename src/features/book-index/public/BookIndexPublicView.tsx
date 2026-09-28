import Link from "next/link";

import type { BookIndexPublicReadModel } from "@/lib/book-index/public-read-model";
import {
  getBookIndexInsightItems,
  getPublishedBookIndexInsightPages,
  type BookIndexInsightPageDefinition,
} from "@/lib/book-index/insight-pages";
import type {
  BookIndexEverywhereSeller,
  BookIndexInsights,
  BookIndexLongSeller,
  BookIndexNewEntry,
  BookIndexRiser,
} from "@/lib/book-index/insights";

import styles from "./BookIndexPublicView.module.css";

function latestObservedAt(model: BookIndexPublicReadModel) {
  let latest: Date | null = null;

  for (const list of model.sourceLists) {
    if (!list.observedAt) continue;
    if (!latest || list.observedAt.getTime() > latest.getTime()) {
      latest = list.observedAt;
    }
  }

  return latest;
}

function formattedObservedAt(value: Date | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

function availabilityLabel(value: string) {
  switch (value) {
    case "available":
      return "Veri hazır";
    case "researching":
      return "Kaynak araştırılıyor";
    case "blocked":
      return "Erişim engelli";
    case "paused":
      return "Geçici olarak duraklatıldı";
    case "no_snapshot":
      return "İlk snapshot bekleniyor";
    default:
      return "Veri bekleniyor";
  }
}

function movementLabel(
  masterBookId: string,
  insights: BookIndexInsights,
) {
  const newEntry = insights.newEntries.find(
    (item) => item.masterBookId === masterBookId,
  );
  if (newEntry) return "Yeni";

  const riser = insights.risers.find(
    (item) => item.masterBookId === masterBookId,
  );
  if (riser) return `↑ +${riser.totalRankGain}`;

  return "—";
}

function TurkeyRows({
  model,
  insights,
  limit,
}: {
  model: BookIndexPublicReadModel;
  insights: BookIndexInsights;
  limit?: number;
}) {
  const rows = limit ? model.turkey.items.slice(0, limit) : model.turkey.items;

  return (
    <div className={styles.tableScroll}>
      <table className={styles.rankingTable}>
        <thead>
          <tr>
            <th scope="col">İlkOku Sırası</th>
            <th scope="col">Kitap</th>
            <th scope="col">Yazar</th>
            <th scope="col">Kaynak Sayısı</th>
            <th scope="col">Hareket</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={row.masterBookId}>
              <td className={styles.rankCell}>{index + 1}</td>
              <td className={styles.titleCell}>
                <strong>{row.title}</strong>
              </td>
              <td>{row.authorName ?? "Yazar bilgisi bekleniyor"}</td>
              <td>{row.sourceCount}</td>
              <td className={styles.movementCell}>
                {movementLabel(row.masterBookId, insights)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BookIndexOverviewView({
  model,
  insights,
}: {
  model: BookIndexPublicReadModel;
  insights: BookIndexInsights;
}) {
  const observedAt = latestObservedAt(model);
  const observedAtLabel = formattedObservedAt(observedAt);
  const currentYear = new Date().getFullYear();
  const publishedInsightPages = getPublishedBookIndexInsightPages(insights);

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>İlkOku Kitap Endeksi</span>
        <h1>En Çok Satan Kitaplar {currentYear}</h1>
        <p>
          Farklı kitap satış platformlarının kendi çok satan sıralamalarını
          izliyor, kaynakları birbirine karıştırmadan ayrı bir Türkiye Endeksi
          üretiyoruz. Böylece tek bir mağazanın listesi yerine birden fazla
          bağımsız kaynağın ortak satış sinyalini görebilirsiniz.
        </p>
        {observedAt && observedAtLabel ? (
          <p className={styles.freshness}>
            Son veri güncellemesi:{" "}
            <time dateTime={observedAt.toISOString()}>{observedAtLabel}</time>
          </p>
        ) : null}
      </header>

      <section className={styles.cards} aria-label="Endeks kapsamı">
        <Link className={styles.card} href="/en-cok-satanlar/turkiye">
          <span>İlkOku Türkiye Kitap Endeksi</span>
          <strong>{model.turkey.items.length} kitap</strong>
          <small>En az üç bağımsız Türkiye kaynağının ortak sinyali</small>
        </Link>
        <article className={styles.card}>
          <span>Amazon Türkiye</span>
          <strong>{availabilityLabel(model.amazonTr.availability)}</strong>
          <small>Doğrulanmış ve sürdürülebilir veri yolu şarttır.</small>
        </article>
        <article className={styles.card}>
          <span>Amazon ABD</span>
          <strong>{availabilityLabel(model.amazonUs.availability)}</strong>
          <small>Türkiye Endeksi&apos;nden ayrı pazar olarak tutulur.</small>
        </article>
      </section>

      {publishedInsightPages.length ? (
        <section className={styles.section} aria-labelledby="insight-pages-heading">
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>Trendler</span>
              <h2 id="insight-pages-heading">Çok satan kitap trendleri</h2>
              <p>
                Snapshot geçmişinden türetilen yeni giriş, yükseliş, çoklu
                kaynak görünürlüğü ve uzun dönem sinyallerini ayrı ayrı inceleyin.
              </p>
            </div>
          </div>
          <div className={styles.cards}>
            {publishedInsightPages.map((page) => (
              <Link
                className={styles.card}
                href={`/en-cok-satanlar/${page.slug}`}
                key={page.slug}
              >
                <span>{page.eyebrow}</span>
                <strong>{page.searchTitle}</strong>
                <small>{page.description}</small>
              </Link>
            ))}
          </div>
        </section>
      ) : null}


      <section className={styles.section} id="turkey-preview">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>Türkiye</span>
            <h2>Güncel bileşik sıralama</h2>
            <p>
              Bağımsız işletmeci grupları eşit ağırlıkla değerlendirilir; aynı
              işletmeciye ait birden fazla mağaza kitaba ek oy veremez.
            </p>
          </div>
          <Link href="/en-cok-satanlar/turkiye">Tüm sıralamayı gör →</Link>
        </div>
        <TurkeyRows model={model} insights={insights} limit={10} />
      </section>

      <section className={styles.explainer} aria-labelledby="book-index-methodology">
        <span className={styles.eyebrow}>Nasıl hesaplanıyor?</span>
        <h2 id="book-index-methodology">Türkiye&apos;de en çok satan kitaplar nasıl belirleniyor?</h2>
        <p>
          İlkOku Kitap Endeksi, farklı satış kaynaklarındaki sıralamaları
          normalize eder; aynı bağımsız işletmeci grubu bir kitaba yalnız bir
          oy verir ve Türkiye Endeksi&apos;ne girebilmek için kitap en az üç
          bağımsız işletmeci grubunda görünmelidir.
        </p>
        <p>
          Kaynakların kendi sıralaması değiştirilmez; İlkOku bileşik puanı ayrı
          hesaplanır. Sponsorlu alanlar organik sıralamaya dahil edilmez.
        </p>
      </section>
    </main>
  );
}

export function TurkeyBookIndexView({
  model,
  insights,
}: {
  model: BookIndexPublicReadModel;
  insights: BookIndexInsights;
}) {
  const observedAt = latestObservedAt(model);
  const observedAtLabel = formattedObservedAt(observedAt);
  const currentYear = new Date().getFullYear();

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>İlkOku Kitap Endeksi · Türkiye</span>
        <h1>Türkiye&apos;de En Çok Satan Kitaplar {currentYear}</h1>
        <p>
          Bu liste tek bir mağazanın satış listesi değildir. Aynı kitabın
          bağımsız Türkiye kaynaklarındaki görünürlüğü normalize edilerek
          oluşturulan İlkOku bileşik endeksidir.
        </p>
        {observedAt && observedAtLabel ? (
          <p className={styles.freshness}>
            Son veri güncellemesi:{" "}
            <time dateTime={observedAt.toISOString()}>{observedAtLabel}</time>
          </p>
        ) : null}
        <Link className={styles.backLink} href="/en-cok-satanlar">
          ← En Çok Satanlar ana sayfası
        </Link>
      </header>

      <section className={styles.section} id="ranking">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>Şeffaf sıralama</span>
            <h2>Türkiye Endeksi</h2>
            <p>
              Her satırda kullanılan bağımsız kaynak sayısını görebilirsin.
            </p>
          </div>
        </div>
        <TurkeyRows model={model} insights={insights} />
      </section>

      <section className={styles.explainer} aria-labelledby="turkey-index-methodology">
        <span className={styles.eyebrow}>Metodoloji</span>
        <h2 id="turkey-index-methodology">İlkOku Türkiye Kitap Endeksi neyi gösterir?</h2>
        <p>
          Endeks, kitapların birden fazla bağımsız Türkiye satış işletmecisindeki
          görünürlüğünü karşılaştırır. Her bağımsız işletmeci grubu eşit oy
          hakkına sahiptir; aynı işletmeciye ait mağazalar veya listeler aynı
          kitaba ek oy kazandırmaz.
        </p>
        <p>
          Gösterilen puan satış adedi değildir. Kaynak sıralamalarından
          türetilen bileşik bir görünürlük puanıdır ve her kitap için kullanılan
          bağımsız kaynak sayısı ayrıca gösterilir.
        </p>
      </section>
    </main>
  );
}


function insightMetric(
  item:
    | BookIndexNewEntry
    | BookIndexRiser
    | BookIndexEverywhereSeller
    | BookIndexLongSeller,
) {
  if ("newSourceCount" in item) {
    return {
      primary: `${item.newSourceCount} yeni kaynak`,
      secondary: `${item.currentSourceCount} güncel kaynak · en iyi sıra #${item.bestRank}`,
    };
  }

  if ("totalRankGain" in item) {
    return {
      primary: `+${item.totalRankGain} sıra`,
      secondary: `${item.improvingSourceCount} yükselen kaynak · en iyi sıra #${item.bestCurrentRank}`,
    };
  }

  if ("historyDays" in item) {
    return {
      primary: `${item.historyDays} gün`,
      secondary: `${item.sourceCount} bağımsız işletmeci · ${item.observationCount} gözlem`,
    };
  }

  return {
    primary: `${item.sourceCount} bağımsız işletmeci`,
    secondary: `en iyi sıra #${item.bestRank}`,
  };
}

export function BookIndexInsightView({
  definition,
  insights,
  lastObservedAt,
}: {
  definition: BookIndexInsightPageDefinition;
  insights: BookIndexInsights;
  lastObservedAt: Date | null;
}) {
  const items = getBookIndexInsightItems(insights, definition.key);
  const currentYear = new Date().getFullYear();

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>İlkOku Kitap Endeksi · {definition.eyebrow}</span>
        <h1>{definition.heading} {currentYear}</h1>
        <p>{definition.description}</p>
        {lastObservedAt ? (
          <p className={styles.freshness}>
            Son veri güncellemesi:{" "}
            <time dateTime={lastObservedAt.toISOString()}>
              {formattedObservedAt(lastObservedAt)}
            </time>
          </p>
        ) : null}
        <Link className={styles.backLink} href="/en-cok-satanlar">
          ← En Çok Satanlar ana sayfası
        </Link>
      </header>

      <section className={styles.section} id="liste">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>{definition.eyebrow}</span>
            <h2>{definition.heading}</h2>
            <p>
              Liste yalnız eşleşmiş master kitaplardan ve doğrulanmış başarılı
              snapshot geçmişinden üretilir.
            </p>
          </div>
        </div>

        <ol className={styles.rankingList}>
          {items.map((item, index) => {
            const metric = insightMetric(item);
            return (
              <li className={styles.rankingItem} key={item.masterBookId}>
                <span className={styles.rank}>{index + 1}</span>
                <div className={styles.book}>
                  <strong>{item.title}</strong>
                  <span>{item.authorName ?? "Yazar bilgisi bekleniyor"}</span>
                </div>
                <div className={styles.score}>
                  <strong>{metric.primary}</strong>
                  <span>{metric.secondary}</span>
                </div>
              </li>
            );
          })}
        </ol>
      </section>

      <section className={styles.explainer} aria-labelledby="insight-methodology">
        <span className={styles.eyebrow}>Nasıl hesaplanıyor?</span>
        <h2 id="insight-methodology">{definition.eyebrow} neyi gösterir?</h2>
        <p>
          Bu görünüm satış adedi açıklamaz. Kaynakların başarılı snapshot
          geçmişindeki sıralama ve görünürlük değişimlerinden türetilir.
        </p>
        <p>
          Aynı satış işletmecisi bir kitaba birden fazla bağımsız kaynak kanıtı
          kazandıramaz; işletmeci grubu bazında tekilleştirme korunur.
        </p>
      </section>
    </main>
  );
}
