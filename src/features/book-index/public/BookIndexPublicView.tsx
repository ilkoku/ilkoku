import Link from "next/link";

import type {
  BookIndexPublicReadModel,
  BookIndexSourceListSnapshot,
} from "@/lib/book-index/public-read-model";
import {
  getBookIndexPublishedSourcePages,
  type BookIndexPublishedSourcePage,
} from "@/lib/book-index/source-pages";
import {
  getBookIndexInsightItems,
  type BookIndexInsightPageDefinition,
} from "@/lib/book-index/insight-pages";
import type { BookIndexInsights } from "@/lib/book-index/insights";

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

function periodLabel(value: BookIndexSourceListSnapshot["period"]) {
  switch (value) {
    case "live":
      return "Güncel";
    case "weekly":
      return "Haftalık";
    case "monthly":
      return "Aylık";
    case "yearly":
      return "Yıllık";
    default:
      return value;
  }
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

function TurkeyRows({
  model,
  limit,
}: {
  model: BookIndexPublicReadModel;
  limit?: number;
}) {
  const rows = limit ? model.turkey.items.slice(0, limit) : model.turkey.items;

  return (
    <ol className={styles.rankingList}>
      {rows.map((row, index) => (
        <li className={styles.rankingItem} key={row.masterBookId}>
          <span className={styles.rank}>{index + 1}</span>
          <div className={styles.book}>
            <strong>{row.title}</strong>
            <span>{row.authorName ?? "Yazar bilgisi bekleniyor"}</span>
          </div>
          <div className={styles.score}>
            <strong>{row.score.toLocaleString("tr-TR")}</strong>
            <span>{row.sourceCount} bağımsız kaynak</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function SourceRows({
  list,
}: {
  list: BookIndexSourceListSnapshot;
}) {
  return (
    <ol className={styles.rankingList}>
      {list.items.map((row) => (
        <li className={styles.rankingItem} key={`${list.listCode}-${row.rank}-${row.productUrl}`}>
          <span className={styles.rank}>{row.rank}</span>
          <div className={styles.book}>
            <strong>{row.title}</strong>
            <span>{row.authorName ?? "Yazar bilgisi bekleniyor"}</span>
          </div>
          <div className={styles.score}>
            <strong>{periodLabel(list.period)}</strong>
            <span>{row.publisherName ?? list.sourceName}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

export function BookIndexSourceView({
  sourcePage,
}: {
  sourcePage: BookIndexPublishedSourcePage;
}) {
  const currentYear = new Date().getFullYear();
  const observedAtLabel = formattedObservedAt(sourcePage.lastObservedAt);

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>İlkOku Kitap Endeksi · Kaynak Listesi</span>
        <h1>{sourcePage.searchTitle} {currentYear}</h1>
        <p>
          {sourcePage.sourceName} tarafından yayınlanan çok satan sıralamalarını
          kaynak sırasını değiştirmeden gösteriyoruz. Bu sayfa İlkOku Türkiye
          Endeksi&apos;nden ayrıdır; burada görülen sıra ilgili kaynağın kendi
          sıralamasıdır.
        </p>
        {sourcePage.lastObservedAt && observedAtLabel ? (
          <p className={styles.freshness}>
            Son veri güncellemesi:{" "}
            <time dateTime={sourcePage.lastObservedAt.toISOString()}>
              {observedAtLabel}
            </time>
          </p>
        ) : null}
        <Link className={styles.backLink} href="/en-cok-satanlar">
          ← En Çok Satanlar ana sayfası
        </Link>
      </header>

      {sourcePage.lists.map((list, index) => (
        <section className={styles.section} id={`liste-${list.listCode}`} key={list.listCode}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>{periodLabel(list.period)}</span>
              <h2>{list.title}</h2>
              <p>
                Kaynak sıralaması aynen korunur; sponsor veya İlkOku bileşik
                puanı bu sırayı değiştirmez.
              </p>
            </div>
            <a href={list.sourceUrl} target="_blank" rel="noopener noreferrer">
              Orijinal kaynak ↗
            </a>
          </div>
          <SourceRows list={list} />
          {index === 0 ? (
            <p className={styles.freshness}>
              Bu liste satış adedi açıklamaz; kaynağın yayınladığı sıralamayı
              gösterir.
            </p>
          ) : null}
        </section>
      ))}

      <section className={styles.explainer} aria-labelledby="source-index-methodology">
        <span className={styles.eyebrow}>Kaynak şeffaflığı</span>
        <h2 id="source-index-methodology">
          {sourcePage.sourceName} çok satan listesi nasıl kullanılıyor?
        </h2>
        <p>
          Bu sayfadaki sıralama {sourcePage.sourceName} kaynağının kendi
          sıralamasıdır. İlkOku bu sırayı yeniden puanlamaz veya sponsor
          içerikle değiştirmez.
        </p>
        <p>
          Türkiye Endeksi oluşturulurken aynı satış kaynağı bir kitaba yalnız
          bir oy verebilir. Böylece aynı platformdaki haftalık, aylık veya
          kategori listeleri bileşik sonuçta birden fazla oy üretmez.
        </p>
      </section>
    </main>
  );
}

export function BookIndexOverviewView({
  model,
}: {
  model: BookIndexPublicReadModel;
}) {
  const observedAt = latestObservedAt(model);
  const observedAtLabel = formattedObservedAt(observedAt);
  const currentYear = new Date().getFullYear();
  const publishedSourcePages = getBookIndexPublishedSourcePages(model);

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

      {publishedSourcePages.length ? (
        <section className={styles.section} aria-labelledby="source-lists-heading">
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>Kaynak listeleri</span>
              <h2 id="source-lists-heading">Mağazalara göre çok satan kitaplar</h2>
              <p>
                Her kaynak kendi sıralamasıyla gösterilir; İlkOku Türkiye
                Endeksi ile karıştırılmaz.
              </p>
            </div>
          </div>
          <div className={styles.cards}>
            {publishedSourcePages.map((sourcePage) => (
              <Link
                className={styles.card}
                href={`/en-cok-satanlar/kaynak/${sourcePage.slug}`}
                key={sourcePage.sourceCode}
              >
                <span>{sourcePage.sourceName}</span>
                <strong>{sourcePage.searchTitle}</strong>
                <small>
                  {sourcePage.lists.length} güncel liste · kaynak sırası korunur
                </small>
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
              Kaynaklar eşit ağırlıkla değerlendirilir; aynı platform bir
              kitaba birden fazla oy veremez.
            </p>
          </div>
          <Link href="/en-cok-satanlar/turkiye">Tüm sıralamayı gör →</Link>
        </div>
        <TurkeyRows model={model} limit={10} />
      </section>

      <section className={styles.explainer} aria-labelledby="book-index-methodology">
        <span className={styles.eyebrow}>Nasıl hesaplanıyor?</span>
        <h2 id="book-index-methodology">Türkiye&apos;de en çok satan kitaplar nasıl belirleniyor?</h2>
        <p>
          İlkOku Kitap Endeksi, farklı satış kaynaklarındaki sıralamaları
          normalize eder. Aynı kaynak bir kitaba yalnız bir oy verir ve Türkiye
          Endeksi&apos;ne girebilmek için kitap en az üç bağımsız Türkiye
          kaynağında görünmelidir.
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
}: {
  model: BookIndexPublicReadModel;
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
        <TurkeyRows model={model} />
      </section>

      <section className={styles.explainer} aria-labelledby="turkey-index-methodology">
        <span className={styles.eyebrow}>Metodoloji</span>
        <h2 id="turkey-index-methodology">İlkOku Türkiye Kitap Endeksi neyi gösterir?</h2>
        <p>
          Endeks, kitapların birden fazla bağımsız Türkiye kaynağındaki
          görünürlüğünü karşılaştırır. Her kaynak eşit oy hakkına sahiptir;
          aynı platformdaki birden fazla liste aynı kitaba ek oy kazandırmaz.
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
  key: BookIndexInsightPageDefinition["key"],
  item: ReturnType<typeof getBookIndexInsightItems>[number],
) {
  switch (key) {
    case "newEntries":
      return {
        primary: `${item.newSourceCount} yeni kaynak`,
        secondary: `${item.currentSourceCount} güncel kaynak · en iyi sıra #${item.bestRank}`,
      };
    case "risers":
      return {
        primary: `+${item.totalRankGain} sıra`,
        secondary: `${item.improvingSourceCount} yükselen kaynak · en iyi sıra #${item.bestCurrentRank}`,
      };
    case "everywhereSellers":
      return {
        primary: `${item.sourceCount} bağımsız kaynak`,
        secondary: `en iyi sıra #${item.bestRank}`,
      };
    case "longSellers":
      return {
        primary: `${item.historyDays} gün`,
        secondary: `${item.sourceCount} kaynak · ${item.observationCount} gözlem`,
      };
  }
}

export function BookIndexInsightView({
  definition,
  insights,
}: {
  definition: BookIndexInsightPageDefinition;
  insights: BookIndexInsights;
}) {
  const items = getBookIndexInsightItems(insights, definition.key);
  const currentYear = new Date().getFullYear();

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>İlkOku Kitap Endeksi · {definition.eyebrow}</span>
        <h1>{definition.heading} {currentYear}</h1>
        <p>{definition.description}</p>
        <p className={styles.freshness}>
          Son hesaplama:{" "}
          <time dateTime={insights.generatedAt.toISOString()}>
            {formattedObservedAt(insights.generatedAt)}
          </time>
        </p>
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
            const metric = insightMetric(definition.key, item);
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
          Aynı satış platformu bir kitaba birden fazla bağımsız kaynak kanıtı
          kazandıramaz; kaynak bazında tekilleştirme korunur.
        </p>
      </section>
    </main>
  );
}
