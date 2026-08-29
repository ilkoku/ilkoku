import Link from "next/link";

import { workContentRatingDetails } from "@/lib/work-content-classification";

import type { OwnershipPassportData } from "../types";
import styles from "./OwnershipPassport.module.css";

type OwnershipPassportProps = {
  backHref: string;
  backLabel: string;
  data: OwnershipPassportData;
};

const statusLabels: Record<string, string> = {
  active: "Aktif",
  archived: "Arşivlendi",
  assigned: "Atandı",
  completed: "Tamamlandı",
  draft: "Taslak",
  in_progress: "Devam ediyor",
  in_review: "İncelemede",
  pending: "Bekliyor",
  published: "Yayında",
  rejected: "Reddedildi",
  requested: "Talep edildi",
};

const auditLabels: Record<string, string> = {
  ownership_stamp_created:
    "Sahiplik kanıtı oluşturuldu",
  work_created: "Eser kaydı oluşturuldu",
  work_published: "Eser yayımlandı",
  work_status_changed: "Eser durumu değiştirildi",
};

function label(value: string) {
  return statusLabels[value] ?? value;
}

function formatDate(value: Date | null) {
  if (!value) return "—";

  return new Intl.DateTimeFormat("tr-TR", {
    dateStyle: "long",
    timeStyle: "short",
  }).format(value);
}

function HashValue({
  children,
}: {
  children: string | null;
}) {
  return (
    <code className={styles.hash}>
      {children ?? "Kayıt bulunmuyor"}
    </code>
  );
}

export function OwnershipPassport({
  backHref,
  backLabel,
  data,
}: OwnershipPassportProps) {
  const integrityLabel =
    data.integrity.initialHashMatches === true
      ? "Başlangıç kaydı doğrulandı"
      : data.integrity.initialHashMatches === false
        ? "Başlangıç kaydı uyuşmuyor"
        : "Karşılaştırma yapılamadı";

  return (
    <div className={styles.page}>
      <header className={styles.hero}>
        <div>
          <span>İlkOku eser güvenliği</span>
          <h1>Eser Pasaportu</h1>
          <p>
            {data.work.title} eserinin platform
            kayıtlarını, sürümlerini ve içerik
            bütünlüğü göstergelerini sunar.
          </p>
        </div>

        <Link className={styles.back} href={backHref}>
          {backLabel}
        </Link>
      </header>

      <section className={styles.identity}>
        <div>
          <span>Eser kimliği</span>
          <strong>{data.work.publicId}</strong>
        </div>

        <div>
          <span>Yazar kimliği</span>
          <strong>{data.work.authorPublicId}</strong>
          <small>{data.work.authorName}</small>
        </div>

        <div>
          <span>Sahiplik damgası</span>
          <strong>
            {data.proof?.stampCode ??
              "Kanıt kaydı bulunmuyor"}
          </strong>
        </div>

        <div>
          <span>Bütünlük durumu</span>
          <strong>{integrityLabel}</strong>
        </div>
      </section>

      {data.proof?.isLegacy ? (
        <aside className={styles.legacy}>
          <strong>Legacy eser kaydı</strong>
          <p>
            Bu eser sahiplik kanıt altyapısından önce
            oluşturulmuştur. Eserin platform kayıt tarihi
            ile dijital kanıtın oluşturulma tarihi ayrı
            gösterilir; geçmişe dönük damga tarihi
            üretilmemiştir.
          </p>
        </aside>
      ) : null}

      <section className={styles.metrics}>
        <article>
          <span>Toplam kelime</span>
          <strong>
            {data.metrics.totalWords.toLocaleString(
              "tr-TR",
            )}
          </strong>
        </article>
        <article>
          <span>Bölüm</span>
          <strong>{data.metrics.chapterCount}</strong>
        </article>
        <article>
          <span>Sürüm</span>
          <strong>{data.metrics.versionCount}</strong>
        </article>
        <article>
          <span>Okuyucu</span>
          <strong>{data.metrics.readerCount}</strong>
        </article>
        <article>
          <span>Favori</span>
          <strong>{data.metrics.favoriteCount}</strong>
        </article>
        <article>
          <span>Yorum</span>
          <strong>{data.metrics.commentCount}</strong>
        </article>
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <header>
            <span>Kayıt bilgileri</span>
            <h2>Eser ve kanıt tarihleri</h2>
          </header>

          <dl className={styles.details}>
            <div>
              <dt>Platform eser kaydı</dt>
              <dd>{formatDate(data.work.createdAt)}</dd>
            </div>
            <div>
              <dt>Son eser güncellemesi</dt>
              <dd>{formatDate(data.work.updatedAt)}</dd>
            </div>
            <div>
              <dt>Kanıt oluşturma zamanı</dt>
              <dd>
                {formatDate(
                  data.proof?.recordedAt ?? null,
                )}
              </dd>
            </div>
            <div>
              <dt>Yayın tarihi</dt>
              <dd>
                {formatDate(data.work.publishedAt)}
              </dd>
            </div>
            <div>
              <dt>Durum</dt>
              <dd>{label(data.work.status)}</dd>
            </div>
            <div>
              <dt>Görünürlük</dt>
              <dd>{label(data.work.visibility)}</dd>
            </div>
            <div>
              <dt>Tür</dt>
              <dd>
                {data.work.genre ?? "Belirtilmedi"}
              </dd>
            </div>
            <div>
              <dt>Hitap yaşı</dt>
              <dd>
                {workContentRatingDetails[data.work.contentRating].label}
              </dd>
            </div>
            <div>
              <dt>Dil</dt>
              <dd>{data.work.language}</dd>
            </div>
          </dl>
        </article>

        <article className={styles.panel}>
          <header>
            <span>İçerik bütünlüğü</span>
            <h2>SHA-256 göstergeleri</h2>
          </header>

          <div className={styles.hashList}>
            <div>
              <span>İlk kanıt hash’i</span>
              <HashValue>
                {data.integrity.firstHash}
              </HashValue>
            </div>
            <div>
              <span>Son saklanan sürüm hash’i</span>
              <HashValue>
                {data.integrity.lastStoredHash}
              </HashValue>
            </div>
            <div>
              <span>Güncel eser durumu hash’i</span>
              <HashValue>
                {data.integrity.currentHash}
              </HashValue>
            </div>
          </div>
        </article>
      </section>

      <section className={styles.panel}>
        <header>
          <span>Sürüm geçmişi</span>
          <h2>Değiştirilmeyen kayıt zinciri</h2>
        </header>

        {data.versions.length ? (
          <div className={styles.tableWrap}>
            <table>
              <thead>
                <tr>
                  <th>Sürüm</th>
                  <th>Kapsam</th>
                  <th>Başlık</th>
                  <th>Hash</th>
                  <th>Tarih</th>
                </tr>
              </thead>
              <tbody>
                {data.versions.map((version) => (
                  <tr key={version.id}>
                    <td>{version.versionNumber}</td>
                    <td>
                      {version.scope === "work"
                        ? "Eser bilgileri"
                        : "Bölüm"}
                    </td>
                    <td>{version.title ?? "—"}</td>
                    <td>
                      <HashValue>
                        {version.contentHash}
                      </HashValue>
                    </td>
                    <td>
                      {formatDate(version.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className={styles.empty}>
            Henüz sürüm kaydı bulunmuyor.
          </p>
        )}
      </section>

      <section className={styles.grid}>
        <article className={styles.panel}>
          <header>
            <span>Profesyonel inceleme</span>
            <h2>Editör geçmişi</h2>
          </header>

          {data.editors.length ? (
            <ul className={styles.timeline}>
              {data.editors.map((editor) => (
                <li key={editor.id}>
                  <strong>{editor.editorName}</strong>
                  <span>
                    {editor.editorPublicId} ·{" "}
                    {editor.stage === "first"
                      ? "1. Editör"
                      : "2. Editör"}
                  </span>
                  <small>
                    {label(editor.status)} ·{" "}
                    {formatDate(editor.assignedAt)}
                    {editor.completedAt
                      ? ` → ${formatDate(
                          editor.completedAt,
                        )}`
                      : ""}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>
              Henüz editör görevi bulunmuyor.
            </p>
          )}
        </article>

        <article className={styles.panel}>
          <header>
            <span>Yayın süreci</span>
            <h2>Yayınevi hareketleri</h2>
          </header>

          {data.publishers.length ? (
            <ul className={styles.timeline}>
              {data.publishers.map((publisher) => (
                <li key={publisher.id}>
                  <strong>
                    {publisher.publisherName}
                  </strong>
                  <span>{label(publisher.status)}</span>
                  <small>
                    {formatDate(publisher.submittedAt)}
                  </small>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.empty}>
              Henüz yayınevi başvurusu bulunmuyor.
            </p>
          )}
        </article>
      </section>

      <section className={styles.panel}>
        <header>
          <span>Audit zinciri</span>
          <h2>Platform kayıt hareketleri</h2>
        </header>

        {data.auditTrail.length ? (
          <ol className={styles.audit}>
            {data.auditTrail.map((event) => (
              <li key={event.id}>
                <span />
                <div>
                  <strong>
                    {auditLabels[event.action] ??
                      event.action}
                  </strong>
                  <small>
                    {formatDate(event.createdAt)}
                  </small>
                </div>
              </li>
            ))}
          </ol>
        ) : (
          <p className={styles.empty}>
            Audit hareketi bulunmuyor.
          </p>
        )}
      </section>

      <footer className={styles.disclaimer}>
        <strong>Hukuki bilgilendirme</strong>
        <p>
          Bu pasaport bir telif tescil belgesi değildir.
          İlkOku platformundaki kayıt zamanını, sürüm
          geçmişini ve içerik bütünlüğü göstergelerini
          sunar. Eser sahipliği yazarda kalır.
        </p>
      </footer>
    </div>
  );
}
