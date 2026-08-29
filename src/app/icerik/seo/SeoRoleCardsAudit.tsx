import Link from "next/link";
import type { ReactNode } from "react";
import { cmsRoleKeys, cmsRoleMeta, roleCardsFromPayload, type CmsRoleCard, type CmsRoleKey } from "@/lib/cms-role-cards";
import { getPublishedRoleCardsState, type PublishedRoleCardsState } from "@/lib/cms-role-card-store";
import { SeoHomepageAudit } from "./SeoHomepageAudit";
import { SeoMetadataQualityAudit } from "./SeoMetadataQualityAudit";
import { SeoTechnicalAudit } from "./SeoTechnicalAudit";
import styles from "./SeoRoleCardsAudit.module.css";

type Tone = "ok" | "warn" | "danger";

type RoleCardsAudit = {
  state: PublishedRoleCardsState;
  cards: CmsRoleCard[];
  visibleCount: number;
  duplicateTitles: number;
  duplicateDescriptions: number;
  duplicateHighlights: number;
  badTargets: CmsRoleKey[];
};

function normalized(value: string) {
  return value.replace(/\s+/g, " ").trim().toLocaleLowerCase("tr-TR");
}

function duplicateCount(values: string[]) {
  const counts = new Map<string, number>();
  for (const raw of values) {
    const value = normalized(raw);
    if (!value) continue;
    counts.set(value, (counts.get(value) ?? 0) + 1);
  }
  return [...counts.values()].filter((count) => count > 1).reduce((sum, count) => sum + (count - 1), 0);
}

function buildAudit(state: PublishedRoleCardsState): RoleCardsAudit {
  const cards = state.state === "valid" ? roleCardsFromPayload("tr", state.payload) : [];
  const visibleCards = cards.filter((card) => card.visible);
  const highlights = visibleCards.flatMap((card) => [card.highlight1, card.highlight2]);
  const badTargets = cards
    .filter((card) => cmsRoleMeta[card.key].fixedHref !== `/kayit?rol=${card.key}`)
    .map((card) => card.key);

  return {
    state,
    cards,
    visibleCount: visibleCards.length,
    duplicateTitles: duplicateCount(visibleCards.map((card) => card.title)),
    duplicateDescriptions: duplicateCount(visibleCards.map((card) => card.description)),
    duplicateHighlights: duplicateCount(highlights),
    badTargets,
  };
}

function auditTone(audit: RoleCardsAudit): Tone {
  if (audit.state.state === "missing") return "ok";
  if (audit.state.state === "corrupt" || audit.state.state === "unavailable") return "danger";
  if (audit.visibleCount === 0 || audit.badTargets.length > 0) return "danger";
  if (audit.visibleCount < cmsRoleKeys.length || audit.duplicateTitles > 0 || audit.duplicateDescriptions > 0 || audit.duplicateHighlights > 0) return "warn";
  return "ok";
}

function stateLabel(audit: RoleCardsAudit) {
  if (audit.state.state === "missing") return "Kod fallback";
  if (audit.state.state === "corrupt") return "Payload bozuk";
  if (audit.state.state === "unavailable") return "Kaynak okunamadı";
  return auditTone(audit) === "ok" ? "Temiz" : auditTone(audit) === "warn" ? "Kontrol et" : "Blokaj";
}

function stateDetail(audit: RoleCardsAudit) {
  if (audit.state.state === "missing") return "Rol kartları için ayrı CMS yayın kaydı yok; ana sayfa doğrulanmış kod içeriğini kullanıyor. Bu durum SEO blokajı değildir.";
  if (audit.state.state === "corrupt") return "Yayın payload'ı strict rol kartı şemasını geçemedi; normal SEO değerlendirmesi güvenli biçimde durduruldu.";
  if (audit.state.state === "unavailable") return "Rol kartı kaynağı okunamadı; yanlış temiz sonucu üretmiyoruz.";
  return "Yayınlanmış rol kartı payload'ı strict şemayı geçti.";
}

function visibilityTone(audit: RoleCardsAudit): Tone {
  if (audit.state.state !== "valid") return "danger";
  if (audit.visibleCount === 0) return "danger";
  return audit.visibleCount === cmsRoleKeys.length ? "ok" : "warn";
}

function uniquenessTone(audit: RoleCardsAudit): Tone {
  if (audit.state.state !== "valid") return "danger";
  return audit.duplicateTitles + audit.duplicateDescriptions + audit.duplicateHighlights === 0 ? "ok" : "warn";
}

function targetTone(audit: RoleCardsAudit): Tone {
  if (audit.state.state !== "valid") return "danger";
  return audit.badTargets.length === 0 ? "ok" : "danger";
}

function Check({ state, title, detail, label }: { state: Tone; title: string; detail: string; label: string }) {
  return <div className={styles.check} data-state={state}><div><strong>{title}</strong><small>{detail}</small></div><em>{label}</em></div>;
}

function AuditGroup({ title, description, children, open = false }: { title: string; description: string; children: ReactNode; open?: boolean }) {
  return (
    <details className={styles.auditGroup} open={open}>
      <summary>
        <div><strong>{title}</strong><small>{description}</small></div>
        <span>Detay</span>
      </summary>
      <div className={styles.auditGroupBody}>{children}</div>
    </details>
  );
}

export async function SeoRoleCardsAudit() {
  const audit = buildAudit(await getPublishedRoleCardsState("tr"));
  const cards = audit.state.state === "valid" ? audit.cards : [];
  const usesCodeFallback = audit.state.state === "missing";

  return (
    <div className={styles.auditGroups}>
      <AuditGroup title="İndeksleme sağlığı" description="Canonical, sitemap, robots, sosyal önizleme ve internal-link sözleşmeleri" open>
        <div id="teknik-seo"><SeoTechnicalAudit /></div>
      </AuditGroup>

      <AuditGroup title="Ana sayfa bütünlüğü" description="Published CMS içeriği ve canlı CTA hedefleri">
        <div id="ana-sayfa-seo"><SeoHomepageAudit /></div>
      </AuditGroup>

      <AuditGroup title="Metadata ve yapısal veri" description="SERP kalite önerileri ile uygulanabilir schema.org kontrolleri">
        <div id="metadata-kalitesi"><span id="structured-data" /><SeoMetadataQualityAudit /></div>
      </AuditGroup>

      <AuditGroup title="Rol kartları" description="Ana sayfadaki dört rol kartının içerik ve CTA bütünlüğü">
        <section className={styles.audit} id="rol-kartlari-seo" aria-labelledby="seo-role-cards-title">
          <div className={styles.header}>
            <div className={styles.headerCopy}>
              <span>Ana Sayfa SEO · TR</span>
              <h2 id="seo-role-cards-title">Rol Kartları</h2>
              <p>Yazar, Okuyucu, Editör ve Yayınevi kartları ayrı URL değildir; kart başına meta/canonical üretmiyoruz. Türkçe ana sayfadaki gerçek on-page içerik sinyallerini ve yayın bütünlüğünü denetliyoruz.</p>
            </div>
            <div className={styles.headerActions}><Link href="/icerik/rol-kartlari?dil=tr">Rol Kartları çalışma masası →</Link></div>
          </div>

          <article className={styles.localeCard}>
            <div className={styles.localeHeader}>
              <div><span>TR Rol Kartları</span><strong>Ana Sayfa on-page içerik sinyali</strong></div>
              <span className={styles.stateBadge} data-state={auditTone(audit)}>{stateLabel(audit)}</span>
            </div>

            {usesCodeFallback ? (
              <div className={styles.note}><strong>SEO blokajı yok.</strong> {stateDetail(audit)} CMS üzerinden rol kartlarını yönetmek isterseniz yayın kaydı oluşturabilirsiniz; mevcut public ana sayfa için bu zorunlu değildir.</div>
            ) : (
              <div className={styles.checks}>
                <Check state={audit.state.state === "valid" ? "ok" : "danger"} title="Yayın payload bütünlüğü" detail={stateDetail(audit)} label={audit.state.state === "valid" ? "Geçerli" : "Müdahale"} />
                <Check state={visibilityTone(audit)} title="Public görünürlük" detail={audit.state.state === "valid" ? `${audit.visibleCount}/4 kart ana sayfada görünür.` : "Payload doğrulanmadan görünürlük değerlendirilemez."} label={audit.visibleCount === 4 ? "Tam" : audit.visibleCount === 0 ? "Blokaj" : "Kontrol"} />
                <Check state={uniquenessTone(audit)} title="İçerik benzersizliği" detail={audit.state.state === "valid" ? `${audit.duplicateTitles} tekrar başlık · ${audit.duplicateDescriptions} tekrar açıklama · ${audit.duplicateHighlights} tekrar öne çıkan ifade.` : "Payload doğrulanmadan tekrar analizi yapılmaz."} label={audit.state.state === "valid" && audit.duplicateTitles + audit.duplicateDescriptions + audit.duplicateHighlights === 0 ? "Benzersiz" : "Kontrol"} />
                <Check state={targetTone(audit)} title="Kayıt CTA sözleşmesi" detail={audit.state.state === "valid" ? audit.badTargets.length === 0 ? "Yazar, Okuyucu, Editör ve Yayınevi kartları kilitli /kayit?rol=… hedeflerine bağlı." : `Hedef sözleşmesi bozulan roller: ${audit.badTargets.join(", ")}.` : "Payload doğrulanmadan kart sözleşmesi tam değerlendirilemez."} label={audit.badTargets.length === 0 ? "Kilitli" : "Blokaj"} />
              </div>
            )}

            {cards.length > 0 ? <div className={styles.roleList}>{cards.map((card) => (
              <div className={styles.roleRow} key={card.key}>
                <span>{card.visible ? `0${card.position} · Açık` : `0${card.position} · Gizli`}</span>
                <div><strong>{card.title}</strong><small>{card.description.length} karakter açıklama · {card.highlight1} / {card.highlight2}</small></div>
                <code>{cmsRoleMeta[card.key].fixedHref}</code>
              </div>
            ))}</div> : null}

            <div className={styles.headerActions}><Link href="/icerik/rol-kartlari?dil=tr">TR Rol Kartlarını Düzenle →</Link></div>
          </article>

          <div className={styles.note}><strong>SEO sınırı:</strong> Rol Kartları ana sayfanın semantik/on-page içeriğidir. Kartlara ayrı canonical, sitemap URL’si veya bağımsız SERP metadata eklemek duplicate/yanlış URL sinyali yaratacağı için bilinçli olarak yapılmaz.</div>
        </section>
      </AuditGroup>
    </div>
  );
}
