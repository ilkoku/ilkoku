import type { GlobalBestsellerReadModel } from "@/lib/book-index/global-public-read-model";
import type { BookIndexSourceListSnapshot } from "@/lib/book-index/public-read-model";

import { BookIndexSectionNav } from "./BookIndexSectionNav";
import styles from "./BookIndexPublicView.module.css";

const periodLabel: Record<string, string> = {
  live: "Güncel",
  daily: "Günlük",
  weekly: "Haftalık",
  monthly: "Aylık",
  yearly: "Yıllık",
};

function formattedObservedAt(value: Date | null) {
  if (!value) return null;

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
    timeZone: "Europe/Istanbul",
  }).format(value);
}

function listPeriod(list: BookIndexSourceListSnapshot) {
  return periodLabel[list.period] ?? list.period;
}

function GlobalListFreshness({ observedAt }: { observedAt: Date | null }) {
  const label = formattedObservedAt(observedAt);
  if (!observedAt || !label) return null;

  return (
    <p className={styles.freshness}>
      Liste güncellemesi:{" "}
      <time dateTime={observedAt.toISOString()}>{label}</time>
    </p>
  );
}

export function GlobalBestsellerView({
  model,
}: {
  model: GlobalBestsellerReadModel;
}) {
  const observedAtLabel = formattedObservedAt(model.latestObservedAt);
  const currentYear = new Date().getFullYear();

  return (
    <main className={styles.page}>
      <BookIndexSectionNav current="global" />
      <header className={styles.hero}>
        <span className={styles.eyebrow}>İlkOku Kitap Endeksi · Dünya</span>
        <h1>Dünyada Çok Satan Kitaplar {currentYear}</h1>
        <p>
          Farklı ülkelerdeki doğrulanmış çok satan kitap listelerini site site
          gösteriyoruz. Her sitenin kendi sıra numarası ve kendi yayın dönemi
          korunur; İlkOku ülkeler arasında ortak bir dünya sırası
          veya bileşik puan üretmez.
        </p>
        {model.latestObservedAt && observedAtLabel ? (
          <p className={styles.freshness}>
            Son veri güncellemesi:{" "}
            <time dateTime={model.latestObservedAt.toISOString()}>
              {observedAtLabel}
            </time>
          </p>
        ) : null}
      </header>

      <section className={styles.cards} aria-label="Dünya çok satan listeleri">
        {model.lists.map((list) => (
          <a className={styles.card} href={`#${list.listCode}`} key={list.listCode}>
            <span>{list.sourceName}</span>
            <strong>{listPeriod(list)} çok satanlar</strong>
            <small>
              {list.availability === "available"
                ? `${list.items.length} kitap · kendi sıralaması`
                : "Veri bekleniyor"}
            </small>
          </a>
        ))}
      </section>

      {model.lists.map((list) => (
        <section className={styles.section} id={list.listCode} key={list.listCode}>
          <div className={styles.sectionHeading}>
            <div>
              <span className={styles.eyebrow}>
                {list.sourceName} · {listPeriod(list)}
              </span>
              <h2>{list.title}</h2>
              <p>
                Bu bölüm yalnız {list.sourceName} tarafından yayımlanan çok satanlar
                sıralamasını gösterir. Sıra numaraları İlkOku tarafından yeniden
                hesaplanmaz.
              </p>
              <GlobalListFreshness observedAt={list.observedAt} />
            </div>
            <a
              href={list.sourceUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              Orijinal listeyi aç ↗
            </a>
          </div>

          {list.availability === "available" && list.items.length ? (
            <ol className={styles.rankingList}>
              {list.items.map((item) => (
                <li
                  className={styles.rankingItem}
                  key={`${list.listCode}-${item.rank}-${item.isbn13 ?? item.isbn10 ?? item.productUrl}`}
                >
                  <span className={styles.rank}>#{item.rank}</span>
                  <div className={styles.book}>
                    <a
                      href={item.productUrl}
                      rel="noopener noreferrer"
                      target="_blank"
                    >
                      <strong>{item.title}</strong>
                    </a>
                    <span>
                      {item.authorName ?? "Yazar bilgisi doğrulanmadı"}
                    </span>
                  </div>
                  <div className={styles.score}>
                    <strong>{listPeriod(list)}</strong>
                    <span>{item.publisherName ?? list.sourceName}</span>
                  </div>
                </li>
              ))}
            </ol>
          ) : (
            <div className={styles.explainer}>
              <span className={styles.eyebrow}>Veri durumu</span>
              <h2>Bu liste için doğrulanmış güncel veri bekleniyor</h2>
              <p>
                Liste düzenli olarak kontrol ediliyor; doğrulanmış güncel veri
                oluşmadan sıralama tahmin edilmiyor.
              </p>
            </div>
          )}
        </section>
      ))}

      <section className={styles.explainer} aria-labelledby="global-bestseller-methodology">
        <span className={styles.eyebrow}>Metodoloji</span>
        <h2 id="global-bestseller-methodology">
          Dünya çok satan listeleri nasıl gösteriliyor?
        </h2>
        <p>
          Amazon ABD, Amazon UK, IBS İtalya, Rakuten Books Japonya, Kyobo
          Güney Kore ve Readings Avustralya ayrı listeler olarak gösterilir.
          Günlük, haftalık, aylık veya güncel dönem bilgileri ilgili sitenin
          yayımladığı biçimde korunur.
        </p>
        <p>
          Bu sayfa ülkeler arası satış adetlerini karşılaştırmaz ve tek bir
          dünya sıralaması oluşturmaz. Her site yalnız kendi yayımladığı sıra
          numaralarıyla gösterilir.
        </p>
      </section>
    </main>
  );
}
