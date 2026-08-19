import Link from "next/link";
import { isCmsLocaleEnabled } from "@/lib/cms-locale-state";
import { cmsRoleKeys, cmsRoleMeta, roleCardsFromPayload, type CmsRoleCard, type CmsRoleKey } from "@/lib/cms-role-cards";
import { getPublishedRoleCardsState, type PublishedRoleCardsState } from "@/lib/cms-role-card-store";
import type { CmsLocaleCode } from "@/lib/cms-locales";
import styles from "./SeoRoleCardsAudit.module.css";

type Tone = "ok" | "warn" | "danger";

type LocaleAudit = {
  locale: CmsLocaleCode;
  enabled: boolean;
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

function buildAudit(locale: CmsLocaleCode, enabled: boolean, state: PublishedRoleCardsState): LocaleAudit {
  const cards = state.state === "valid" ? roleCardsFromPayload(locale, state.payload) : [];
  const visibleCards = cards.filter((card) => card.visible);
  const highlights = visibleCards.flatMap((card) => [card.highlight1, card.highlight2]);
  const badTargets = cards
    .filter((card) => cmsRoleMeta[card.key].fixedHref !== `/kayit?rol=${card.key}`)
    .map((card) => card.key);

  return {
    locale,
    enabled,
    state,
    cards,
    visibleCount: visibleCards.length,
    duplicateTitles: duplicateCount(visibleCards.map((card) => card.title)),
    duplicateDescriptions: duplicateCount(visibleCards.map((card) => card.description)),
    duplicateHighlights: duplicateCount(highlights),
    badTargets,
  };
}

function localeTone(audit: LocaleAudit): Tone {
  if (!audit.enabled && audit.locale !== "tr") return "ok";
  if (audit.state.state === "missing" || audit.state.state === "corrupt" || audit.state.state === "unavailable") return "danger";
  if (audit.visibleCount === 0 || audit.badTargets.length > 0) return "danger";
  if (audit.visibleCount < cmsRoleKeys.length || audit.duplicateTitles > 0 || audit.duplicateDescriptions > 0 || audit.duplicateHighlights > 0) return "warn";
  return "ok";
}

function stateLabel(audit: LocaleAudit) {
  if (!audit.enabled && audit.locale !== "tr") return "Dil kapalı";
  if (audit.state.state === "missing") return "Yayın kaydı yok";
  if (audit.state.state === "corrupt") return "Payload bozuk";
  if (audit.state.state === "unavailable") return "Kaynak okunamadı";
  return localeTone(audit) === "ok" ? "Temiz" : localeTone(audit) === "warn" ? "Kontrol et" : "Blokaj";
}

function stateDetail(audit: LocaleAudit) {
  if (!audit.enabled && audit.locale !== "tr") return "Bu public dil kapalı; SEO kabulünde zorunlu sinyal sayılmaz.";
  if (audit.state.state === "missing") return "Rol kartlarının yayınlanmış SiteContent kaydı bulunamadı.";
  if (audit.state.state === "corrupt") return "Yayın payload'ı strict rol kartı şemasını geçemedi; normal SEO değerlendirmesi güvenli biçimde durduruldu.";
  if (audit.state.state === "unavailable") return "Rol kartı kaynağı okunamadı; yanlış temiz sonucu üretmiyoruz.";
  return "Yayınlanmış rol kartı payload'ı strict şemayı geçti.";
}

function visibilityTone(audit: LocaleAudit): Tone {
  if (!audit.enabled && audit.locale !== "tr") return "ok";
  if (audit.state.state !== "valid") return "danger";
  if (audit.visibleCount === 0) return "danger";
  return audit.visibleCount === cmsRoleKeys.length ? "ok" : "warn";
}

function uniquenessTone(audit: LocaleAudit): Tone {
  if (!audit.enabled && audit.locale !== "tr") return "ok";
  if (audit.state.state !== "valid") return "danger";
  return audit.duplicateTitles + audit.duplicateDescriptions + audit.duplicateHighlights === 0 ? "ok" : "warn";
}

function targetTone(audit: LocaleAudit): Tone {
  if (!audit.enabled && audit.locale !== "tr") return "ok";
  if (audit.state.state !== "valid") return "danger";
  return audit.badTargets.length === 0 ? "ok" : "danger";
}

function paritySummary(tr: LocaleAudit, en: LocaleAudit) {
  if (!en.enabled) return { tone: "ok" as Tone, label: "EN kapalı", detail: "İngilizce public dil kapalı olduğu için TR/EN rol kartı paralelliği zorunlu değil." };
  if (tr.state.state !== "valid" || en.state.state !== "valid") {
    return { tone: "danger" as Tone, label: "Doğrulanamadı", detail: "TR/EN karşılaştırması için iki dilin yayın payload'ı da geçerli olmalı." };
  }

  const trByKey = new Map(tr.cards.map((card) => [card.key, card]));
  const enByKey = new Map(en.cards.map((card) => [card.key, card]));
  const mismatches = cmsRoleKeys.filter((key) => {
    const trCard = trByKey.get(key);
    const enCard = enByKey.get(key);
    return !trCard || !enCard || trCard.visible !== enCard.visible || trCard.position !== enCard.position;
  });

  return mismatches.length === 0
    ? { tone: "ok" as Tone, label: "Tutarlı", detail: "TR ve EN görünürlük/sıra yapısı aynı." }
    : { tone: "warn" as Tone, label: `${mismatches.length} rol farklı`, detail: `Görünürlük veya sıra farkı: ${mismatches.join(", ")}. Metinlerin birebir aynı olması beklenmez.` };
}

function Check({ state, title, detail, label }: { state: Tone; title: string; detail: string; label: string }) {
  return <div className={styles.check} data-state={state}><div><strong>{title}</strong><small>{detail}</small></div><em>{label}</em></div>;
}

function LocaleCard({ audit }: { audit: LocaleAudit }) {
  const disabled = !audit.enabled && audit.locale !== "tr";
  const cards = audit.state.state === "valid" ? audit.cards : [];
  return (
    <article className={styles.localeCard}>
      <div className={styles.localeHeader}>
        <div><span>{audit.locale.toUpperCase()} Rol Kartları</span><strong>Ana Sayfa on-page içerik sinyali</strong></div>
        <span className={styles.stateBadge} data-state={localeTone(audit)}>{stateLabel(audit)}</span>
      </div>

      <div className={styles.checks}>
        <Check state={disabled ? "ok" : audit.state.state === "valid" ? "ok" : "danger"} title="Yayın payload bütünlüğü" detail={stateDetail(audit)} label={disabled ? "Beklemiyor" : audit.state.state === "valid" ? "Geçerli" : "Müdahale"} />
        <Check state={visibilityTone(audit)} title="Public görünürlük" detail={disabled ? "Dil kapalı." : audit.state.state === "valid" ? `${audit.visibleCount}/4 kart ana sayfada görünür.` : "Payload doğrulanmadan görünürlük değerlendirilemez."} label={disabled ? "Kapalı" : audit.visibleCount === 4 ? "Tam" : audit.visibleCount === 0 ? "Blokaj" : "Kontrol"} />
        <Check state={uniquenessTone(audit)} title="İçerik benzersizliği" detail={disabled ? "Dil kapalı." : audit.state.state === "valid" ? `${audit.duplicateTitles} tekrar başlık · ${audit.duplicateDescriptions} tekrar açıklama · ${audit.duplicateHighlights} tekrar öne çıkan ifade.` : "Payload doğrulanmadan tekrar analizi yapılmaz."} label={audit.state.state === "valid" && audit.duplicateTitles + audit.duplicateDescriptions + audit.duplicateHighlights === 0 ? "Benzersiz" : disabled ? "Kapalı" : "Kontrol"} />
        <Check state={targetTone(audit)} title="Kayıt CTA sözleşmesi" detail={disabled ? "Dil kapalı." : audit.state.state === "valid" ? audit.badTargets.length === 0 ? "Yazar, Okuyucu, Editör ve Yayınevi kartları kilitli /kayit?rol=… hedeflerine bağlı." : `Hedef sözleşmesi bozulan roller: ${audit.badTargets.join(", ")}.` : "Payload doğrulanmadan kart sözleşmesi tam değerlendirilemez."} label={audit.badTargets.length === 0 ? "Kilitli" : "Blokaj"} />
      </div>

      {cards.length > 0 ? <div className={styles.roleList}>{cards.map((card) => (
        <div className={styles.roleRow} key={`${audit.locale}-${card.key}`}>
          <span>{card.visible ? `0${card.position} · Açık` : `0${card.position} · Gizli`}</span>
          <div><strong>{card.title}</strong><small>{card.description.length} karakter açıklama · {card.highlight1} / {card.highlight2}</small></div>
          <code>{cmsRoleMeta[card.key].fixedHref}</code>
        </div>
      ))}</div> : null}

      <div className={styles.headerActions}><Link href={`/icerik/rol-kartlari?dil=${audit.locale}`}>{audit.locale.toUpperCase()} Rol Kartlarını Düzenle →</Link></div>
    </article>
  );
}

export async function SeoRoleCardsAudit() {
  const [trState, enState, enEnabled] = await Promise.all([
    getPublishedRoleCardsState("tr"),
    getPublishedRoleCardsState("en"),
    isCmsLocaleEnabled("en"),
  ]);
  const tr = buildAudit("tr", true, trState);
  const en = buildAudit("en", enEnabled, enState);
  const parity = paritySummary(tr, en);

  return (
    <section className={styles.audit} aria-labelledby="seo-role-cards-title">
      <div className={styles.header}>
        <div className={styles.headerCopy}>
          <span>Ana Sayfa SEO</span>
          <h2 id="seo-role-cards-title">Rol Kartları</h2>
          <p>Yazar, Okuyucu, Editör ve Yayınevi kartları ayrı URL değildir; bu nedenle kart başına meta/canonical üretmiyoruz. Burada kartların ana sayfaya sağladığı gerçek on-page içerik sinyallerini ve yayın bütünlüğünü denetliyoruz.</p>
        </div>
        <div className={styles.headerActions}><Link href="/icerik/rol-kartlari?dil=tr">Rol Kartları çalışma masası →</Link></div>
      </div>

      <div className={styles.checks}>
        <Check state={parity.tone} title="TR / EN yapı tutarlılığı" detail={parity.detail} label={parity.label} />
      </div>

      <div className={styles.localeGrid}>
        <LocaleCard audit={tr} />
        <LocaleCard audit={en} />
      </div>

      <div className={styles.note}><strong>SEO sınırı:</strong> Rol Kartları ana sayfanın semantik/on-page içeriğidir. Kartlara ayrı canonical, sitemap URL'si veya bağımsız SERP metadata eklemek duplicate/yanlış URL sinyali yaratacağı için bilinçli olarak yapılmaz.</div>
    </section>
  );
}
