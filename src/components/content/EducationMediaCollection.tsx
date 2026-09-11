import Image from "next/image";
import Link from "next/link";
import styles from "./EducationMediaCollection.module.css";

export type EducationMediaCollectionAsset = {
  contentKey: string;
  title: string;
  url: string;
  filename: string;
  sizeBytes: number;
  category: string;
  genreSlug: string;
  slot: string;
  slotNumber: string;
  folder: string;
  updatedAt: string;
};

type GenreOption = { slug: string; label: string; category: string };
type SlotOption = { key: string; number: string; label: string };
type Filters = { category: string; genreSlug: string; slot: string };

type Props = {
  assets: EducationMediaCollectionAsset[];
  genres: GenreOption[];
  slots: SlotOption[];
  filters: Filters;
};

function formatBytes(input: number) {
  if (!Number.isFinite(input) || input <= 0) return "—";
  if (input < 1024) return `${input} B`;
  if (input < 1024 * 1024) return `${(input / 1024).toFixed(1)} KB`;
  return `${(input / (1024 * 1024)).toFixed(2)} MB`;
}

function formatDate(input: string) {
  return new Intl.DateTimeFormat("tr-TR", { dateStyle: "short", timeStyle: "short" }).format(new Date(input));
}

export function EducationMediaCollection({ assets, genres, slots, filters }: Props) {
  const categories = Array.from(new Set(genres.map((genre) => genre.category)));
  const genreLabel = new Map(genres.map((genre) => [genre.slug, genre.label]));
  const slotLabel = new Map(slots.map((slot) => [slot.key, `${slot.number} ${slot.label}`]));
  const filtered = assets.filter((asset) => {
    if (filters.category && asset.category !== filters.category) return false;
    if (filters.genreSlug && asset.genreSlug !== filters.genreSlug) return false;
    if (filters.slot && asset.slot !== filters.slot) return false;
    return true;
  });
  const usedGenres = new Set(assets.map((asset) => asset.genreSlug).filter(Boolean)).size;
  const usedSlots = new Set(assets.map((asset) => asset.slot).filter(Boolean)).size;
  const hasFilters = Boolean(filters.category || filters.genreSlug || filters.slot);

  return (
    <section id="egitim-medya" className={styles.collection}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <div className={styles.mark}>EDU</div>
          <div>
            <span className={styles.eyebrow}>Eğitim koleksiyonu</span>
            <h2>Eğitim Görsel Merkezi</h2>
            <p>Kategori → eser türü → görsel slotu düzeninde tek merkezden yönet.</p>
          </div>
        </div>
        <div className={styles.stats} aria-label="Eğitim medya özeti">
          <article><strong>{assets.length}</strong><span>Toplam</span></article>
          <article><strong>{usedGenres}</strong><span>Tür</span></article>
          <article><strong>{usedSlots}/7</strong><span>Slot</span></article>
          <article><strong>{filtered.length}</strong><span>Görünen</span></article>
        </div>
      </header>

      <div className={styles.toolbar}>
        <form method="get" action="/icerik/medya" className={styles.filterForm}>
          <label>
            <span>Kategori</span>
            <select name="egitimKategori" defaultValue={filters.category}>
              <option value="">Tüm kategoriler</option>
              {categories.map((category) => <option key={category} value={category}>{category}</option>)}
            </select>
          </label>
          <label>
            <span>Eser türü</span>
            <select name="egitimTur" defaultValue={filters.genreSlug}>
              <option value="">Tüm türler</option>
              {categories.map((category) => (
                <optgroup key={category} label={category}>
                  {genres.filter((genre) => genre.category === category).map((genre) => (
                    <option key={genre.slug} value={genre.slug}>{genre.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </label>
          <label>
            <span>Görsel slotu</span>
            <select name="egitimSlot" defaultValue={filters.slot}>
              <option value="">Tüm slotlar</option>
              {slots.map((slot) => <option key={slot.key} value={slot.key}>{slot.number} · {slot.label}</option>)}
            </select>
          </label>
          <div className={styles.filterActions}>
            <button type="submit">Filtrele</button>
            {hasFilters ? <Link href="/icerik/medya#egitim-medya">Temizle</Link> : null}
          </div>
        </form>

        <details className={styles.uploadPanel} open={assets.length === 0}>
          <summary>
            <span className={styles.plus}>+</span>
            <span><strong>Eğitim görseli yükle</strong><small>PC’den merkezi koleksiyona ekle</small></span>
          </summary>
          <form action="/api/cms-media-upload" method="post" encType="multipart/form-data" className={styles.uploadForm}>
            <input type="hidden" name="collection" value="education" />
            <label className={styles.fileField}>
              <span>Dosya</span>
              <input name="file" type="file" required accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/x-icon,image/vnd.microsoft.icon" />
              <small>PNG, JPEG, WebP, GIF, AVIF veya ICO · en fazla 3 MB</small>
            </label>
            <div className={styles.twoCol}>
              <label>
                <span>Eser türü</span>
                <select name="genreSlug" required defaultValue="">
                  <option value="" disabled>Tür seç</option>
                  {categories.map((category) => (
                    <optgroup key={category} label={category}>
                      {genres.filter((genre) => genre.category === category).map((genre) => (
                        <option key={genre.slug} value={genre.slug}>{genre.label}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label>
                <span>Slot</span>
                <select name="slot" required defaultValue="">
                  <option value="" disabled>Slot seç</option>
                  {slots.map((slot) => <option key={slot.key} value={slot.key}>{slot.number} · {slot.label}</option>)}
                </select>
              </label>
            </div>
            <div className={styles.twoCol}>
              <label><span>Medya başlığı</span><input name="title" maxLength={180} placeholder="Otomatik oluşturulabilir" /></label>
              <label><span>Alt metin</span><input name="altText" maxLength={300} placeholder="Otomatik oluşturulabilir" /></label>
            </div>
            <label><span>Not</span><textarea name="notes" maxLength={800} placeholder="Kaynak veya üretim notu" /></label>
            <div className={styles.uploadActions}><button type="submit">Görseli yükle</button></div>
          </form>
        </details>
      </div>

      <div className={styles.resultBar}>
        <div>
          <strong>{hasFilters ? "Filtrelenmiş eğitim medyası" : "Son eğitim görselleri"}</strong>
          <span>{filtered.length} kayıt</span>
        </div>
        <small>Görselin türü ve slotu yükleme sırasında kaydedilir.</small>
      </div>

      {filtered.length === 0 ? (
        <div className={styles.empty}>
          <div>0</div>
          <strong>Bu görünümde eğitim görseli yok.</strong>
          <p>Filtreleri temizleyebilir veya yukarıdaki yükleme alanından yeni görsel ekleyebilirsin.</p>
        </div>
      ) : (
        <div className={styles.grid}>
          {filtered.map((asset) => {
            const genre = genreLabel.get(asset.genreSlug) || asset.genreSlug || "Tür belirtilmedi";
            const slot = slotLabel.get(asset.slot) || asset.slot || "Slot belirtilmedi";
            return (
              <article key={asset.contentKey} className={styles.card}>
                <Link href={asset.url} target="_blank" className={styles.preview} aria-label={`${asset.title || asset.filename} görselini aç`}>
                  <Image
                    src={asset.url}
                    alt={asset.title || asset.filename || "Eğitim görseli"}
                    width={360}
                    height={240}
                    unoptimized
                  />
                  <span className={styles.slotBadge}>{slot}</span>
                </Link>
                <div className={styles.cardBody}>
                  <div className={styles.path}>
                    <span>{asset.category || "Kategori yok"}</span>
                    <span>{genre}</span>
                  </div>
                  <strong className={styles.title}>{asset.title || asset.filename || "İsimsiz medya"}</strong>
                  <div className={styles.meta}>
                    <span>{formatBytes(asset.sizeBytes)}</span>
                    <span>{formatDate(asset.updatedAt)}</span>
                  </div>
                  <small className={styles.filename}>{asset.filename || asset.url}</small>
                  <div className={styles.cardActions}>
                    {asset.genreSlug ? <Link href={`/icerik/egitim/${asset.genreSlug}`}>Türü yönet</Link> : null}
                    <Link href={asset.url} target="_blank">Dosyayı aç ↗</Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </section>
  );
}
