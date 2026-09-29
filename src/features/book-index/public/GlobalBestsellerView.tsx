import Link from "next/link";

import type { GlobalBestsellerReadModel } from "@/lib/book-index/global-public-read-model";
import type { BookIndexSourceListSnapshot } from "@/lib/book-index/public-read-model";

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

export function GlobalBestsellerView({
  model,
}: {
  model: GlobalBestsellerReadModel;
}) {
  const observedAtLabel = formattedObservedAt(model.latestObservedAt);
  const currentYear = new Date().getFullYear();

  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>İlkOku Kitap Endeksi · Dünya</span>
        <h1>Dünyada Çok Satan Kitaplar {currentYear}</h1>
        <p>
          Farklı ülkelerdeki doğrulanmış çok satan kitap listelerini kaynak
          bazında gösteriyoruz. Her kaynağın kendi sıra numarası ve kendi
          yayın dönemi korunur; İlkOku ülkeler arasında ortak bir dünya sırası
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
        <Link className={styles.backLink} href="/en-cok-satanlar">
          ← En Çok Satanlar ana sayfası
        </Link>
      </header>

      <section className={styles.cards} aria-label="Dünya çok satan kaynakları">
        {model.lists.map((list) => (
          <a className={styles.card} href={`#${list.listCode}`} key={list.listCode}>
            <span>{list.sourceName}</span>
            <strong>{listPeriod(list)} çok satanlar</strong>
            <small>
              {list.availability === "available"
                ? `${list.items.length} kitap · native sıralama`
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
                Bu bölüm yalnız {list.sourceName} kaynağının kendi sıralamasını
                gösterir. Sıra numaraları İlkOku tarafından yeniden
                hesaplanmaz.
              </p>
            </div>
            <a
              href={list.sourceUrl}
              rel="noopener noreferrer"
              target="_blank"
            >
              Kaynak listeyi aç ↗
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
                      {item.authorName ?? "Yazar bilgisi kaynakta doğrulanmadı"}
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
              <h2>Bu kaynak için yayınlanabilir snapshot bekleniyor</h2>
              <p>
                Kaynak collector tarafından izleniyor; başarılı native snapshot
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
          Güney Kore ve Readings Avustralya ayrı kaynaklardır. Günlük,
          haftalık, aylık veya güncel dönem bilgileri kaynakların kendi
          tanımından gelir.
        </p>
        <p>
          Bu sayfa ülkeler arası satış adetlerini karşılaştırmaz ve tek bir
          dünya sıralaması oluşturmaz. Her kaynak yalnız kendi native sıra
          numaralarıyla gösterilir.
        </p>
      </section>
    </main>
  );
}
