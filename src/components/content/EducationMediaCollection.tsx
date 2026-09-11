import Link from "next/link";

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

  return (
    <div className="content-panel" style={{ marginBottom: "1rem" }}>
      <div className="content-section-heading">
        <div>
          <span>Eğitim koleksiyonu</span>
          <h2>Eğitim Görsel Merkezi</h2>
        </div>
        <p>{filtered.length} / {assets.length} eğitim medyası</p>
      </div>

      <p style={{ marginTop: 0 }}>
        Eğitim görsellerini <strong>Kategori → Eser Türü → Slot</strong> düzeninde yönet. Bu ekrandan yüklenen dosyalar merkezi Medya Kütüphanesi&apos;ne kaydolur.
      </p>

      <form method="get" action="/icerik/medya" className="content-form" style={{ marginBottom: "1rem" }}>
        <div className="content-form-grid">
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
        </div>
        <div className="content-form-actions" style={{ flexWrap: "wrap" }}>
          <button type="submit">Filtrele</button>
          <Link href="/icerik/medya">Filtreleri temizle</Link>
        </div>
      </form>

      <details open={assets.length === 0} style={{ marginBottom: "1rem" }}>
        <summary style={{ cursor: "pointer", fontWeight: 700 }}>+ Eğitim görseli yükle</summary>
        <form action="/api/cms-media-upload" method="post" encType="multipart/form-data" className="content-form" style={{ marginTop: ".8rem" }}>
          <input type="hidden" name="collection" value="education" />
          <label>
            <span>Dosya</span>
            <input name="file" type="file" required accept="image/jpeg,image/png,image/webp,image/gif,image/avif,image/x-icon,image/vnd.microsoft.icon" />
            <small>En fazla 3 MB · Eğitim koleksiyonunda yalnız görsel dosyaları kabul edilir.</small>
          </label>
          <div className="content-form-grid">
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
          <div className="content-form-grid">
            <label><span>Medya başlığı</span><input name="title" maxLength={180} placeholder="Boş bırakılırsa tür + slot kullanılır" /></label>
            <label><span>Alt metin</span><input name="altText" maxLength={300} placeholder="Boş bırakılırsa tür + slot kullanılır" /></label>
          </div>
          <label><span>Not</span><textarea name="notes" maxLength={800} placeholder="Kaynak veya üretim notu" /></label>
          <div className="content-form-actions"><button type="submit">Eğitim Görselini Yükle</button></div>
        </form>
      </details>

      {filtered.length === 0 ? (
        <div className="content-panel" style={{ margin: 0 }}><strong>Bu filtrede eğitim medyası yok.</strong><p>Yeni görsel yükleyebilir veya filtreleri temizleyebilirsin.</p></div>
      ) : (
        <div style={{ display: "grid", gap: ".55rem" }}>
          {filtered.map((asset) => {
            const genre = genreLabel.get(asset.genreSlug) || asset.genreSlug || "Tür belirtilmedi";
            const slot = slotLabel.get(asset.slot) || asset.slot || "Slot belirtilmedi";
            const path = ["Eğitim", asset.category, genre, slot].filter(Boolean).join(" / ");
            return (
              <article key={asset.contentKey} style={{ display: "grid", gridTemplateColumns: "minmax(0, 1fr) auto", gap: ".8rem", alignItems: "center", padding: ".75rem", border: "1px solid var(--content-border, #dfe3ea)", borderRadius: ".75rem" }}>
                <div style={{ minWidth: 0 }}>
                  <strong style={{ display: "block" }}>{asset.title || asset.filename || "İsimsiz medya"}</strong>
                  <small style={{ display: "block", marginTop: ".2rem" }}>{path}</small>
                  <small style={{ display: "block", marginTop: ".2rem" }}>{asset.filename || asset.url} · {formatBytes(asset.sizeBytes)} · {formatDate(asset.updatedAt)}</small>
                </div>
                <div style={{ display: "flex", gap: ".55rem", flexWrap: "wrap", justifyContent: "flex-end" }}>
                  {asset.genreSlug ? <Link href={`/icerik/egitim/${asset.genreSlug}`}>Türü yönet</Link> : null}
                  <Link href={asset.url} target="_blank">Dosyayı aç ↗</Link>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
