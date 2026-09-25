import Link from "next/link";

import type { BookIndexPublicReadModel } from "@/lib/book-index/public-read-model";

import styles from "./BookIndexPublicView.module.css";

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

export function BookIndexOverviewView({
  model,
}: {
  model: BookIndexPublicReadModel;
}) {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>İlkOku Kitap Endeksi</span>
        <h1>En Çok Satan Kitaplar</h1>
        <p>
          Farklı kitap satış platformlarının kendi çok satan sıralamalarını
          izliyor, kaynakları birbirine karıştırmadan ayrı bir Türkiye Endeksi
          üretiyoruz.
        </p>
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

      <section className={styles.section}>
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
    </main>
  );
}

export function TurkeyBookIndexView({
  model,
}: {
  model: BookIndexPublicReadModel;
}) {
  return (
    <main className={styles.page}>
      <header className={styles.hero}>
        <span className={styles.eyebrow}>İlkOku Kitap Endeksi · Türkiye</span>
        <h1>Türkiye&apos;de En Çok Satan Kitaplar</h1>
        <p>
          Bu liste tek bir mağazanın satış listesi değildir. Aynı kitabın
          bağımsız Türkiye kaynaklarındaki görünürlüğü normalize edilerek
          oluşturulan İlkOku bileşik endeksidir.
        </p>
        <Link className={styles.backLink} href="/en-cok-satanlar">
          ← En Çok Satanlar ana sayfası
        </Link>
      </header>

      <section className={styles.section}>
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
    </main>
  );
}
