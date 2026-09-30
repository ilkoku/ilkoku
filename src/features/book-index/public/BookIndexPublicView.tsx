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

import { BookIndexRankTable } from "./BookIndexRankTable";
import { BookIndexSectionNav } from "./BookIndexSectionNav";
import { BookIndexSourceComparison } from "./BookIndexSourceComparison";
import { BookIndexViewModeNav } from "./BookIndexViewModeNav";
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

export function BookIndexOverviewView({
  model,
  insights,
  showInsightPages,
  showGlobalPreview = false,
}: {
  model: BookIndexPublicReadModel;
  insights: BookIndexInsights;
  showInsightPages: boolean;
  showGlobalPreview?: boolean;
}) {
  const observedAt = latestObservedAt(model);
  const observedAtLabel = formattedObservedAt(observedAt);
  const currentYear = new Date().getFullYear();
  const publishedInsightPages = getPublishedBookIndexInsightPages(insights);
  const turkeySourceCount = new Set(
    model.turkey.items.flatMap((row) =>
      row.sources.map((source) => source.sourceCode),
    ),
  ).size;

  return (
    <main className={styles.page}>
      <BookIndexSectionNav current="overview" />
      <header className={styles.hero}>
        <span className={styles.eyebrow}>İlkOku Kitap Endeksi</span>
        <h1>En Çok Satan Kitaplar {currentYear}</h1>
        <p>
          Türkiye&apos;deki kitap satış sitelerinin çok satan listelerini
          aynı tabloda gösteriyoruz. Her sitenin kendi sıra numarası korunur;
          aynı kitap aynı sırada birden fazla sitede yer alıyorsa site adları
          aynı satırda birlikte gösterilir.
        </p>
        {observedAt && observedAtLabel ? (
          <p className={styles.freshness}>
            Son veri güncellemesi:{" "}
            <time dateTime={observedAt.toISOString()}>{observedAtLabel}</time>
          </p>
        ) : null}
      </header>

      <section className={styles.cards} aria-label="Endeks kapsamı">
        <Link
          className={styles.card}
          href="/en-cok-satanlar/turkiye/karsilastirma"
        >
          <span>Türkiye Çok Satan Listeleri</span>
          <strong>En Çok Satanlar Karşılaştırma</strong>
          <small>{turkeySourceCount} satış sitesinden 2–4 tanesini yan yana karşılaştır.</small>
        </Link>
        <Link className={styles.card} href="/yeni-cikanlar">
          <span>Yeni Çıkanlar</span>
          <strong>Yeni çıkan kitapları keşfet</strong>
          <small>
            Türkiye kaynaklarının doğrulanmış yeni çıkan ve yeni gelen listeleri.
          </small>
        </Link>
        {showGlobalPreview ? (
          <Link className={styles.card} href="/en-cok-satanlar/dunya">
            <span>Dünya Genelinde</span>
            <strong>Dünyada çok satan kitaplar</strong>
            <small>
              Uluslararası çok satan listelerini ilgili sitelerin kendi
              sıralamalarıyla incele.
            </small>
          </Link>
        ) : (
          <article className={styles.card}>
            <span>Dünya Genelinde</span>
            <strong>Dünyada çok satan kitaplar</strong>
            <small>
              Uluslararası çok satan listelerini ilgili sitelerin kendi
              sıralamalarıyla incele.
            </small>
          </article>
        )}
      </section>

      {showInsightPages && publishedInsightPages.length ? (
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
            <h2>Güncel ilk 3 sıra</h2>
            <p>
              Satış sitelerinin 1., 2. ve 3. sıralarındaki kitapları incele.
              Aynı kitap aynı sırada birden fazla sitede yer alıyorsa
              site adları tek satırda birlikte gösterilir.
            </p>
          </div>
          <Link href="/en-cok-satanlar/turkiye">Tüm sıralamayı gör →</Link>
        </div>
        <BookIndexRankTable rows={model.turkey.items} maxRank={3} />
      </section>

      <section className={styles.explainer} aria-labelledby="book-index-methodology">
        <span className={styles.eyebrow}>Nasıl gösteriliyor?</span>
        <h2 id="book-index-methodology">Satış sitesi sıralamaları nasıl gösteriliyor?</h2>
        <p>
          İlkOku yeni bir sıra veya bileşik puan üretmez. Her satış sitesinin
          kendi çok satan sırası aynen korunur.
        </p>
        <p>
          Aynı kitap aynı sıra numarasında birden fazla sitede yer alıyorsa
          yalnızca site adları aynı satırda birleştirilir. Aynı kitap farklı
          sıra numaralarındaysa tabloda ayrı satırlarda görünür.
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
      <BookIndexSectionNav current="turkey" />
      <header className={`${styles.hero} ${styles.turkeyHero}`}>
        <span className={styles.eyebrow}>İlkOku Kitap Endeksi · Türkiye</span>
        <h1>Türkiye&apos;de En Çok Satan Kitaplar {currentYear}</h1>
        <p>
          Türkiye&apos;deki farklı kitap satış sitelerinin çok satan
          listelerini tek tabloda gösterir. Her sitenin verdiği sıra
          numarası değiştirilmeden korunur.
        </p>
        {observedAt && observedAtLabel ? (
          <p className={styles.freshness}>
            Son veri güncellemesi:{" "}
            <time dateTime={observedAt.toISOString()}>{observedAtLabel}</time>
          </p>
        ) : null}
        <div className={styles.topActions}>
          <BookIndexViewModeNav current="list" />
        </div>
      </header>

      <section className={styles.section} id="ranking">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>Satış sitesi listeleri</span>
            <h2>Çok Satan Kitaplar Sıralaması</h2>
            <p>
              Hangi satış sitesinin hangi kitabı hangi sıraya koyduğunu görebilirsin.
            </p>
          </div>
        </div>
        <BookIndexRankTable rows={model.turkey.items} />
      </section>

      <section className={styles.explainer} aria-labelledby="turkey-index-methodology">
        <span className={styles.eyebrow}>Metodoloji</span>
        <h2 id="turkey-index-methodology">Bu tablo neyi gösterir?</h2>
        <p>
          Tablo, kitap satış sitelerinin kendi çok satan sıralamalarını
          gösterir. İlkOku sitelerin sıra numarasını değiştirmez.
        </p>
        <p>
          Aynı eser aynı sırada birden fazla sitede görünüyorsa site adları aynı
          satırda birlikte yazılır; eser farklı bir sitede farklı sıradaysa
          ayrı bir satır olarak yeniden görünür.
        </p>
      </section>
    </main>
  );
}


export function TurkeyBookIndexComparisonView({
  model,
}: {
  model: BookIndexPublicReadModel;
}) {
  const observedAt = latestObservedAt(model);
  const observedAtLabel = formattedObservedAt(observedAt);

  return (
    <main className={styles.page}>
      <BookIndexSectionNav current="comparison" />
      <header className={`${styles.hero} ${styles.turkeyHero}`}>
        <span className={styles.eyebrow}>İlkOku Kitap Endeksi · Türkiye</span>
        <h1>En Çok Satanlar Karşılaştırma</h1>
        <p>
          Türkiye&apos;deki kitap satış sitelerinin en çok satanlar listelerini
          yan yana karşılaştır. İki, üç veya dört site seçerek aynı sıra
          numarasında hangi kitapların yer aldığını görebilirsin.
        </p>
        {observedAt && observedAtLabel ? (
          <p className={styles.freshness}>
            Son veri güncellemesi:{" "}
            <time dateTime={observedAt.toISOString()}>{observedAtLabel}</time>
          </p>
        ) : null}
        <div className={styles.topActions}>
          <BookIndexViewModeNav current="comparison" />
        </div>
      </header>

      <section className={styles.section} id="karsilastirma">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>En Çok Satanlar Karşılaştırma</span>
            <h2>Satış sitelerini yan yana karşılaştır</h2>
            <p>
              İki, üç veya dört satış sitesi seç. Her sitenin kendi sıra
              numarası korunur; İlkOku yeni bir ortak sıra veya puan üretmez.
            </p>
          </div>
        </div>
        <BookIndexSourceComparison rows={model.turkey.items} />
      </section>

      <section className={styles.explainer} aria-labelledby="comparison-methodology">
        <span className={styles.eyebrow}>Nasıl karşılaştırılıyor?</span>
        <h2 id="comparison-methodology">En çok satanlar karşılaştırması neyi gösterir?</h2>
        <p>
          Her sütun seçtiğin satış sitesinin kendi çok satan listesini gösterir.
          Aynı sıra numarasında farklı sitelerde farklı kitaplar bulunabilir.
        </p>
        <p>
          Bu görünüm satış adedi açıklamaz ve İlkOku tarafından oluşturulmuş
          birleşik bir sıralama değildir.
        </p>
      </section>
    </main>
  );
}


function formattedTrendDate(value: Date) {
  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "medium",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

function insightEvidence(
  item:
    | BookIndexNewEntry
    | BookIndexRiser
    | BookIndexEverywhereSeller
    | BookIndexLongSeller,
) {
  if ("newSourceCount" in item) {
    return item.sources.map((source) => (
      <span className={styles.insightEvidenceChip} key={source.sourceCode}>
        {source.sourceName} · #{source.currentRank} · yeni giriş
      </span>
    ));
  }

  if ("totalRankGain" in item) {
    return item.sources.map((source) => (
      <span className={styles.insightEvidenceChip} key={source.sourceCode}>
        {source.sourceName} · #{source.previousRank} → #{source.currentRank} · +{source.rankGain}
      </span>
    ));
  }

  if ("historyDays" in item) {
    return (
      <>
        <span className={styles.insightEvidenceChip}>
          İlk: {formattedTrendDate(item.firstObservedAt)}
        </span>
        <span className={styles.insightEvidenceChip}>
          Son: {formattedTrendDate(item.lastObservedAt)}
        </span>
        {item.sources.map((source) => (
          <span className={styles.insightEvidenceChip} key={source.sourceCode}>
            {source.sourceName}
          </span>
        ))}
      </>
    );
  }

  return item.sources.map((source) => (
    <span className={styles.insightEvidenceChip} key={source.sourceCode}>
      {source.sourceName} · #{source.currentRank}
    </span>
  ));
}

function insightSummary(
  items: Array<
    | BookIndexNewEntry
    | BookIndexRiser
    | BookIndexEverywhereSeller
    | BookIndexLongSeller
  >,
) {
  if (!items.length) {
    return [
      { label: "Kayıt", value: "0" },
      { label: "Kanıt", value: "Veri bekleniyor" },
      { label: "Durum", value: "Yayınlanmaz" },
    ];
  }

  const first = items[0];

  if ("newSourceCount" in first) {
    const typed = items as BookIndexNewEntry[];
    return [
      { label: "Yeni giren kitap", value: String(typed.length) },
      {
        label: "Yeni kaynak görünümü",
        value: String(typed.reduce((sum, item) => sum + item.newSourceCount, 0)),
      },
      {
        label: "En iyi yeni giriş",
        value: `#${Math.min(...typed.map((item) => item.bestNewEntryRank))}`,
      },
    ];
  }

  if ("totalRankGain" in first) {
    const typed = items as BookIndexRiser[];
    return [
      { label: "Yükselen kitap", value: String(typed.length) },
      {
        label: "Toplam sıra kazanımı",
        value: `+${typed.reduce((sum, item) => sum + item.totalRankGain, 0)}`,
      },
      {
        label: "Yükselen kaynak",
        value: String(typed.reduce((sum, item) => sum + item.improvingSourceCount, 0)),
      },
    ];
  }

  if ("historyDays" in first) {
    const typed = items as BookIndexLongSeller[];
    return [
      { label: "Uzun süre görünen", value: String(typed.length) },
      {
        label: "En uzun süre",
        value: `${Math.max(...typed.map((item) => item.historyDays))} gün`,
      },
      {
        label: "Toplam gözlem",
        value: String(typed.reduce((sum, item) => sum + item.observationCount, 0)),
      },
    ];
  }

  const typed = items as BookIndexEverywhereSeller[];
  return [
    { label: "Çoklu kaynakta kitap", value: String(typed.length) },
    {
      label: "En geniş görünürlük",
      value: `${Math.max(...typed.map((item) => item.sourceCount))} kaynak`,
    },
    {
      label: "En iyi sıra",
      value: `#${Math.min(...typed.map((item) => item.bestRank))}`,
    },
  ];
}

const insightNavSection = {
  newEntries: "new-entries",
  risers: "risers",
  everywhereSellers: "everywhere",
  longSellers: "long-sellers",
} as const;

function insightMetric(
  item:
    | BookIndexNewEntry
    | BookIndexRiser
    | BookIndexEverywhereSeller
    | BookIndexLongSeller,
) {
  if ("newSourceCount" in item) {
    return {
      primary: `${item.newSourceCount} yeni liste girişi`,
      secondary: `${item.currentSourceCount} güncel listede · en iyi yeni giriş #${item.bestNewEntryRank}`,
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
  query = "",
  sourceCode = "",
}: {
  definition: BookIndexInsightPageDefinition;
  insights: BookIndexInsights;
  lastObservedAt: Date | null;
  query?: string;
  sourceCode?: string;
}) {
  const allItems = getBookIndexInsightItems(insights, definition.key);
  const normalizedQuery = query.trim().toLocaleLowerCase("tr-TR");
  const sourceOptions = [...new Map(
    allItems.flatMap((item) =>
      item.sources.map((source) => [source.sourceCode, source.sourceName] as const),
    ),
  )]
    .map(([code, name]) => ({ code, name }))
    .sort((a, b) => a.name.localeCompare(b.name, "tr"));
  const items = allItems.filter((item) => {
    if (
      normalizedQuery
      && !`${item.title} ${item.authorName ?? ""}`
        .toLocaleLowerCase("tr-TR")
        .includes(normalizedQuery)
    ) {
      return false;
    }
    if (sourceCode && !item.sources.some((source) => source.sourceCode === sourceCode)) {
      return false;
    }
    return true;
  });
  const currentYear = new Date().getFullYear();
  const summary = insightSummary(items);

  return (
    <main className={styles.page}>
      <BookIndexSectionNav
        current={insightNavSection[definition.key]}
        showAnalysis={false}
      />
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
      </header>

      <section className={styles.insightSummaryGrid} aria-label="Trend özeti">
        {summary.map((item) => (
          <div className={styles.insightSummaryCard} key={item.label}>
            <span>{item.label}</span>
            <strong>{item.value}</strong>
          </div>
        ))}
      </section>

      <BookIndexSectionNav
        current={insightNavSection[definition.key]}
        showPrimary={false}
      />

      <form className={styles.insightFilters} method="get">
        <label className={styles.filterField}>
          <span>Kitap / yazar ara</span>
          <input
            defaultValue={query}
            name="q"
            placeholder="Kitap veya yazar"
            type="search"
          />
        </label>
        <label className={styles.filterField}>
          <span>Satış sitesi</span>
          <select defaultValue={sourceCode} name="source">
            <option value="">Tüm siteler</option>
            {sourceOptions.map((source) => (
              <option key={source.code} value={source.code}>
                {source.name}
              </option>
            ))}
          </select>
        </label>
        <button className={styles.clearFilters} type="submit">
          Filtrele
        </button>
        {query || sourceCode ? (
          <Link
            className={styles.insightReset}
            href={`/en-cok-satanlar/${definition.slug}`}
          >
            Temizle
          </Link>
        ) : null}
      </form>

      <section className={styles.section} id="liste">
        <div className={styles.sectionHeading}>
          <div>
            <span className={styles.eyebrow}>{definition.eyebrow}</span>
            <h2>{definition.heading}</h2>
            <p>
              {definition.key === "newEntries"
                ? "Soldaki sıra satış sırası değildir. Önce kaç satış sitesinin çok satan listesine yeni girildiğine, eşitlikte yeni girişler içindeki en iyi konuma, ardından kitabın toplam güncel liste görünürlüğüne göre bu analiz sırası oluşturulur."
                : "Liste yalnız doğrulanmış başarılı veri geçmişinden üretilir."}
            </p>
          </div>
        </div>

        {items.length ? (
          <ol className={styles.rankingList}>
          {items.map((item, index) => {
            const metric = insightMetric(item);
            return (
              <li className={styles.rankingItem} key={item.masterBookId}>
                <span className={styles.rank}>{index + 1}</span>
                <div className={styles.book}>
                  <strong>{item.title}</strong>
                  <span>{item.authorName ?? "Yazar bilgisi bekleniyor"}</span>
                  <div className={styles.insightEvidence}>
                    {insightEvidence(item)}
                  </div>
                </div>
                <div className={styles.score}>
                  <strong>{metric.primary}</strong>
                  <span>{metric.secondary}</span>
                </div>
              </li>
            );
          })}
          </ol>
        ) : (
          <div className={styles.emptyState}>
            Bu filtrelerle eşleşen doğrulanmış trend kaydı yok.
          </div>
        )}
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
