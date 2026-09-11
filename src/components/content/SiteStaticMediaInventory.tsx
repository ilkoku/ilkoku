"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import type { CmsStaticMediaSection } from "@/lib/cms-static-media";
import styles from "./SiteStaticMediaInventory.module.css";

type Props = {
  sections: CmsStaticMediaSection[];
};

type PixelSize = { width: number; height: number };

function formatBytes(input: number) {
  if (!Number.isFinite(input) || input <= 0) return "—";
  if (input < 1024) return `${input} B`;
  if (input < 1024 * 1024) return `${(input / 1024).toFixed(1)} KB`;
  return `${(input / (1024 * 1024)).toFixed(2)} MB`;
}

function canPreview(extension: string) {
  return [".png", ".jpg", ".jpeg", ".webp", ".gif", ".avif", ".svg"].includes(extension);
}

function gcd(a: number, b: number): number {
  return b === 0 ? a : gcd(b, a % b);
}

function ratioLabel(size?: PixelSize) {
  if (!size || size.width <= 0 || size.height <= 0) return "—";
  const divisor = gcd(size.width, size.height);
  const left = Math.round(size.width / divisor);
  const right = Math.round(size.height / divisor);
  if (left <= 40 && right <= 40) return `${left}:${right}`;
  return (size.width / size.height).toFixed(2);
}

export function SiteStaticMediaInventory({ sections }: Props) {
  const [dimensions, setDimensions] = useState<Record<string, PixelSize>>({});
  const total = sections.reduce((sum, section) => sum + section.assets.length, 0);
  const assigned = sections
    .filter((section) => section.key !== "atanmamis" && section.key !== "ortak-sistem")
    .reduce((sum, section) => sum + section.assets.length, 0);
  const unassigned = sections.find((section) => section.key === "atanmamis")?.assets.length ?? 0;

  function registerDimensions(key: string, width: number, height: number) {
    if (!width || !height) return;
    setDimensions((current) => {
      const existing = current[key];
      if (existing?.width === width && existing?.height === height) return current;
      return { ...current, [key]: { width, height } };
    });
  }

  return (
    <section id="site-medya" className={styles.inventory}>
      <header className={styles.header}>
        <div>
          <span>Gerçek site envanteri</span>
          <h2>Sayfalara Göre Site Medyası</h2>
          <p>`public/` altındaki gerçek dosyalar; kaynak ölçüsü, kullanım alanı ve hedef yerleşim bilgisiyle birlikte gösterilir.</p>
        </div>
        <div className={styles.headerStats} aria-label="Statik medya özeti">
          <article><strong>{total}</strong><span>statik medya</span></article>
          <article><strong>{sections.length}</strong><span>sayfa / bölüm</span></article>
          <article><strong>{assigned}</strong><span>sayfaya bağlı</span></article>
          <article className={unassigned > 0 ? styles.warning : undefined}><strong>{unassigned}</strong><span>atanmamış</span></article>
        </div>
      </header>

      <div className="cms-media-static-policy">
        <strong>Statik dosya politikası</strong>
        <span>Bu varlıklar kod deposundan yayınlanır. CMS içinden fiziksel olarak silinmez; önce kullanım kodundan çıkarılıp yeni deploy ile kaldırılır.</span>
      </div>

      {sections.length === 0 ? (
        <div className={styles.empty}>
          <strong>Statik medya envanteri okunamadı.</strong>
          <p>`public/` klasörü çalışma zamanında okunamadığı için yanlış bir sıfır envanteri gösterilmiyor.</p>
        </div>
      ) : (
        <div className={styles.sections}>
          {sections.map((section, index) => (
            <details className={styles.section} key={section.key} open={index < 2 || section.key === "atanmamis"}>
              <summary>
                <div>
                  <strong>{section.label}</strong>
                  <span>{section.assets.length} medya</span>
                </div>
                <small>{section.assets[0]?.relativePath.split("/")[0] ?? "public"}</small>
              </summary>

              <div className={styles.sectionToolbar}>
                <div>
                  <span>Sayfa bağlantısı</span>
                  <strong>{section.publicHref ?? "Ortak / sayfaya bağlı değil"}</strong>
                </div>
                <div className={styles.actions}>
                  {section.cmsHref ? <Link href={section.cmsHref}>İçeriği yönet</Link> : null}
                  {section.publicHref ? <Link href={section.publicHref} target="_blank">Canlı sayfa ↗</Link> : null}
                </div>
              </div>

              <div className={styles.grid}>
                {section.assets.map((asset) => {
                  const sourceSize = dimensions[asset.key];
                  return (
                    <article className={`${styles.asset} cms-media-static-asset`} key={asset.key}>
                      <div className={styles.preview}>
                        {asset.kind === "image" && canPreview(asset.extension) ? (
                          <Image
                            src={asset.url}
                            alt={asset.filename}
                            fill
                            sizes="(max-width: 760px) 90vw, (max-width: 1200px) 40vw, 240px"
                            unoptimized
                            onLoad={(event) => registerDimensions(asset.key, event.currentTarget.naturalWidth, event.currentTarget.naturalHeight)}
                          />
                        ) : (
                          <div className={styles.filePlaceholder}><strong>{asset.extension.replace(".", "").toUpperCase()}</strong></div>
                        )}
                      </div>

                      <div className={styles.assetBody}>
                        <strong title={asset.filename}>{asset.filename}</strong>
                        <small title={asset.relativePath}>/{asset.relativePath}</small>
                        <div className="cms-media-static-metrics">
                          <div><span>Kaynak ölçü</span><strong>{sourceSize ? `${sourceSize.width}×${sourceSize.height} px` : asset.kind === "document" ? "—" : "Yükleniyor…"}</strong></div>
                          <div><span>Kaynak oran</span><strong>{ratioLabel(sourceSize)}</strong></div>
                          <div><span>Dosya</span><strong>{formatBytes(asset.sizeBytes)}</strong></div>
                          <div><span>Format</span><strong>{asset.extension.replace(".", "").toUpperCase()}</strong></div>
                        </div>
                        <div className="cms-media-placement-card">
                          <span>Kullanıldığı alan</span>
                          <strong>{asset.placementLabel}</strong>
                          <small>Hedef: {asset.targetSpec}</small>
                          <small>Yerleşim: {asset.fit}</small>
                        </div>
                      </div>

                      <div className="cms-media-static-actions">
                        <Link className={styles.openAsset} href={asset.url} target="_blank">Dosyayı aç ↗</Link>
                        <button type="button" disabled title="Statik dosyalar deploy kaynağıdır; CMS içinden fiziksel olarak silinmez.">Silme kilitli</button>
                      </div>
                    </article>
                  );
                })}
              </div>
            </details>
          ))}
        </div>
      )}
    </section>
  );
}
