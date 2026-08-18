"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { publishRoleCardsAction, saveRoleCardsAction } from "@/features/cms/role-card-actions";
import type { CmsLocaleCode } from "@/lib/cms-locales";
import {
  cmsRoleKeys,
  cmsRoleMeta,
  type CmsRoleCard,
  type CmsRoleKey,
} from "@/lib/cms-role-cards";
import styles from "./RoleCardsWorkbench.module.css";

type Props = {
  locale: CmsLocaleCode;
  initialCards: CmsRoleCard[];
  hasDraft: boolean;
  canPublish: boolean;
  localeEnabled: boolean;
  liveAvailable: boolean;
};

const roleShortLabels: Record<CmsRoleKey, { tr: string; en: string }> = {
  writer: { tr: "Yazar", en: "Writer" },
  reader: { tr: "Okuyucu", en: "Reader" },
  editor: { tr: "Editör", en: "Editor" },
  publisher: { tr: "Yayınevi", en: "Publisher" },
};

function normalized(cards: CmsRoleCard[]) {
  return [...cards]
    .sort((a, b) => a.position - b.position)
    .map((card, index) => ({ ...card, position: index + 1 }));
}

function snapshot(cards: CmsRoleCard[]) {
  return JSON.stringify(
    [...cards]
      .sort((a, b) => a.key.localeCompare(b.key))
      .map((card) => ({
        key: card.key,
        title: card.title,
        description: card.description,
        ctaLabel: card.ctaLabel,
        highlight1: card.highlight1,
        highlight2: card.highlight2,
        visible: card.visible,
        position: card.position,
      })),
  );
}

function cardTone(role: CmsRoleKey) {
  if (role === "writer") return styles.writer;
  if (role === "reader") return styles.reader;
  if (role === "editor") return styles.editor;
  return styles.publisher;
}

export function RoleCardsWorkbench({
  locale,
  initialCards,
  hasDraft,
  canPublish,
  localeEnabled,
  liveAvailable,
}: Props) {
  const cleanInitial = useMemo(() => normalized(initialCards), [initialCards]);
  const [cards, setCards] = useState<CmsRoleCard[]>(cleanInitial);
  const [selectedKey, setSelectedKey] = useState<CmsRoleKey>(cleanInitial[0]?.key ?? "writer");

  const orderedCards = useMemo(() => normalized(cards), [cards]);
  const selected = orderedCards.find((card) => card.key === selectedKey) ?? orderedCards[0];
  const dirty = snapshot(orderedCards) !== snapshot(cleanInitial);
  const visibleCount = orderedCards.filter((card) => card.visible).length;

  function updateSelected(patch: Partial<CmsRoleCard>) {
    setCards((current) => current.map((card) => card.key === selectedKey ? { ...card, ...patch } : card));
  }

  function moveSelected(direction: -1 | 1) {
    setCards((current) => {
      const ordered = normalized(current);
      const currentIndex = ordered.findIndex((card) => card.key === selectedKey);
      const nextIndex = currentIndex + direction;
      if (currentIndex < 0 || nextIndex < 0 || nextIndex >= ordered.length) return current;
      const copy = [...ordered];
      [copy[currentIndex], copy[nextIndex]] = [copy[nextIndex], copy[currentIndex]];
      return copy.map((card, index) => ({ ...card, position: index + 1 }));
    });
  }

  function resetSelected() {
    const source = cleanInitial.find((card) => card.key === selectedKey);
    if (!source) return;
    setCards((current) => current.map((card) => card.key === selectedKey
      ? { ...source, position: card.position }
      : card));
  }

  function resetAll() {
    setCards(cleanInitial);
    setSelectedKey(cleanInitial[0]?.key ?? "writer");
  }

  if (!selected) return null;

  const selectedIndex = orderedCards.findIndex((card) => card.key === selected.key);
  const fixedHref = cmsRoleMeta[selected.key].fixedHref;

  return (
    <div className={styles.workbench}>
      <div className={styles.summaryBar}>
        <div className={styles.summaryItem}>
          <span>Çalışma durumu</span>
          <strong>{dirty ? "Kaydedilmemiş değişiklik" : hasDraft ? "Taslak hazır" : liveAvailable ? "Yayındaki içerik" : "İlk kurulum"}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>Görünür kart</span>
          <strong>{visibleCount} / 4</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>Dil</span>
          <strong>{locale.toUpperCase()}</strong>
        </div>
        <div className={styles.summaryItem}>
          <span>Yayın</span>
          <strong>{localeEnabled ? "Açık" : "Dil kapalı"}</strong>
        </div>
      </div>

      <form action={saveRoleCardsAction} className={styles.form}>
        <input type="hidden" name="locale" value={locale} />
        {orderedCards.map((card) => (
          <div key={`hidden-${card.key}`}>
            <input type="hidden" name={`${card.key}Title`} value={card.title} />
            <input type="hidden" name={`${card.key}Description`} value={card.description} />
            <input type="hidden" name={`${card.key}CtaLabel`} value={card.ctaLabel} />
            <input type="hidden" name={`${card.key}Highlight1`} value={card.highlight1} />
            <input type="hidden" name={`${card.key}Highlight2`} value={card.highlight2} />
            <input type="hidden" name={`${card.key}Visible`} value={card.visible ? "on" : ""} />
            <input type="hidden" name={`${card.key}Position`} value={String(card.position)} />
          </div>
        ))}

        <aside className={styles.roleRail} aria-label="Rol kartları">
          <div className={styles.railHeading}>
            <span>Kartlar</span>
            <strong>4 sabit rol</strong>
          </div>
          <div className={styles.roleList}>
            {orderedCards.map((card) => {
              const active = card.key === selected.key;
              return (
                <button
                  className={`${styles.roleItem} ${active ? styles.roleItemActive : ""}`}
                  key={card.key}
                  type="button"
                  onClick={() => setSelectedKey(card.key)}
                  aria-pressed={active}
                >
                  <span className={`${styles.roleGlyph} ${cardTone(card.key)}`}>{card.position}</span>
                  <span className={styles.roleItemText}>
                    <strong>{card.title || roleShortLabels[card.key][locale]}</strong>
                    <small>{roleShortLabels[card.key][locale]} · sıra {card.position}</small>
                  </span>
                  <span className={`${styles.visibilityDot} ${card.visible ? styles.visible : styles.hidden}`}>
                    {card.visible ? "Açık" : "Gizli"}
                  </span>
                </button>
              );
            })}
          </div>

          <div className={styles.orderBox}>
            <span>Sıralama</span>
            <p>Numara seçmek yerine kartı doğrudan taşı.</p>
            <div className={styles.orderActions}>
              <button type="button" onClick={() => moveSelected(-1)} disabled={selectedIndex <= 0}>↑ Yukarı</button>
              <button type="button" onClick={() => moveSelected(1)} disabled={selectedIndex >= orderedCards.length - 1}>↓ Aşağı</button>
            </div>
          </div>
        </aside>

        <section className={styles.editorPane}>
          <div className={styles.editorTopline}>
            <div>
              <span className={styles.eyebrow}>Seçili kart · {selected.position}. sıra</span>
              <h2>{roleShortLabels[selected.key][locale]}</h2>
              <p>Yalnızca kullanıcının gördüğü içerikleri düzenliyorsun. Rol ve kayıt hedefi sistemde kilitli.</p>
            </div>
            <button
              type="button"
              className={`${styles.visibilitySwitch} ${selected.visible ? styles.visibilitySwitchOn : ""}`}
              onClick={() => updateSelected({ visible: !selected.visible })}
              aria-pressed={selected.visible}
            >
              <span aria-hidden="true" />
              {selected.visible ? "Publicte gösteriliyor" : "Publicte gizli"}
            </button>
          </div>

          <div className={styles.lockedMeta}>
            <span>Rol kimliği <strong>{selected.key}</strong></span>
            <span>Kayıt hedefi <code>{fixedHref}</code></span>
          </div>

          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span><strong>Kart başlığı</strong><small>{selected.title.length}/80</small></span>
              <input
                value={selected.title}
                onChange={(event) => updateSelected({ title: event.target.value.slice(0, 80) })}
                placeholder="Kart başlığı"
              />
            </label>
            <label className={styles.field}>
              <span><strong>Buton metni</strong><small>{selected.ctaLabel.length}/80</small></span>
              <input
                value={selected.ctaLabel}
                onChange={(event) => updateSelected({ ctaLabel: event.target.value.slice(0, 80) })}
                placeholder="CTA metni"
              />
            </label>
          </div>

          <label className={`${styles.field} ${styles.fieldWide}`}>
            <span><strong>Kısa açıklama</strong><small>{selected.description.length}/700</small></span>
            <textarea
              rows={5}
              value={selected.description}
              onChange={(event) => updateSelected({ description: event.target.value.slice(0, 700) })}
              placeholder="Bu rol için kullanıcıya ne sunduğumuzu anlat."
            />
            <em>Ana sayfa kartında doğrudan görünür. Kısa ve fayda odaklı tutmak en iyi sonucu verir.</em>
          </label>

          <div className={styles.fieldGrid}>
            <label className={styles.field}>
              <span><strong>Öne çıkan özellik 1</strong><small>{selected.highlight1.length}/120</small></span>
              <input
                value={selected.highlight1}
                onChange={(event) => updateSelected({ highlight1: event.target.value.slice(0, 120) })}
                placeholder="Birinci özellik"
              />
            </label>
            <label className={styles.field}>
              <span><strong>Öne çıkan özellik 2</strong><small>{selected.highlight2.length}/120</small></span>
              <input
                value={selected.highlight2}
                onChange={(event) => updateSelected({ highlight2: event.target.value.slice(0, 120) })}
                placeholder="İkinci özellik"
              />
            </label>
          </div>

          <div className={styles.editorFooter}>
            <button type="button" className={styles.subtleButton} onClick={resetSelected}>Bu karttaki değişiklikleri geri al</button>
            <button type="button" className={styles.subtleButton} onClick={resetAll} disabled={!dirty}>Tüm değişiklikleri geri al</button>
          </div>
        </section>

        <aside className={styles.previewPane}>
          <div className={styles.previewHeading}>
            <div><span>Anlık önizleme</span><strong>Kaydetmeden önce gör</strong></div>
            <span className={styles.previewPosition}>0{selected.position}</span>
          </div>

          <div className={`${styles.previewCard} ${cardTone(selected.key)} ${!selected.visible ? styles.previewHidden : ""}`}>
            {!selected.visible ? <div className={styles.hiddenOverlay}>Bu kart publicte gizli</div> : null}
            <span className={styles.previewRoleLabel}>{roleShortLabels[selected.key][locale]} rolü</span>
            <div className={styles.previewIcon}>{selected.title.trim().charAt(0) || "•"}</div>
            <h3>{selected.title || "Başlık girin"}</h3>
            <p>{selected.description || "Açıklama girildiğinde burada görünür."}</p>
            <div className={styles.previewHighlights}>
              <small>{selected.highlight1 || "Özellik 1"}</small>
              <small>{selected.highlight2 || "Özellik 2"}</small>
            </div>
            <strong className={styles.previewCta}>{selected.ctaLabel || "Buton metni"} <span>→</span></strong>
          </div>

          <div className={styles.sequencePreview}>
            <span>Ana sayfa sırası</span>
            <div>
              {orderedCards.map((card) => (
                <button
                  key={`sequence-${card.key}`}
                  type="button"
                  onClick={() => setSelectedKey(card.key)}
                  className={card.key === selected.key ? styles.sequenceActive : ""}
                  title={`${card.position}. ${card.title}`}
                >
                  <strong>{card.position}</strong>
                  <small>{card.title}</small>
                  {!card.visible ? <i>gizli</i> : null}
                </button>
              ))}
            </div>
          </div>
        </aside>

        <div className={styles.saveBar}>
          <div>
            <span className={`${styles.saveState} ${dirty ? styles.saveStateDirty : ""}`}>
              {dirty ? "Kaydedilmemiş değişiklik var" : hasDraft ? "Taslak güncel" : "Henüz çalışma taslağı yok"}
            </span>
            <small>Canlı site yalnız ayrıca yayınladığında değişir.</small>
          </div>
          <div className={styles.saveActions}>
            <Link href={`/icerik/onizleme/rol-kartlari?dil=${locale}`}>Kaydedilmiş taslağı tam sayfada gör ↗</Link>
            <button type="submit">Taslağı Kaydet</button>
          </div>
        </div>
      </form>

      <div className={styles.publishBar}>
        <div>
          <span>Canlı yayın</span>
          <strong>{dirty ? "Önce taslağı kaydet" : hasDraft ? "Taslak yayınlanmaya hazır" : "Yayınlanacak taslak yok"}</strong>
          <p>Dört kart yine tek set halinde yayınlanır; bu güvenlik kuralı değişmedi.</p>
        </div>
        {canPublish && localeEnabled && hasDraft && !dirty ? (
          <form action={publishRoleCardsAction}>
            <input type="hidden" name="locale" value={locale} />
            <button type="submit">Rol Kartlarını Yayınla</button>
          </form>
        ) : (
          <div className={styles.publishReason}>
            {!canPublish ? "Yayın yetkisi gerekli" : !localeEnabled ? `${locale.toUpperCase()} public dili kapalı` : dirty ? "Kaydedilmemiş değişiklik var" : "Önce taslak oluştur"}
          </div>
        )}
      </div>
    </div>
  );
}
