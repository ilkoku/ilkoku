"use client";

import { useMemo, useState } from "react";
import { saveFooterNavigationAction } from "@/features/cms/navigation-actions";
import type { FooterNavigationPayload } from "@/lib/cms-footer-navigation";
import type { FooterLinkDiagnostic } from "@/lib/cms-footer-validation";
import styles from "./FooterNavigationWorkbench.module.css";

type SectionKey = "platform" | "support" | "legal";
type Props = {
  initial: FooterNavigationPayload;
  diagnostics: FooterLinkDiagnostic[];
  hasAnalysis: boolean;
};

const sections: Array<{ key: SectionKey; title: string; note: string }> = [
  { key: "platform", title: "Platform", note: "3 ana gezinme bağlantısı" },
  { key: "support", title: "Destek", note: "yardım ve iletişim girişi" },
  { key: "legal", title: "Yasal", note: "5 zorunlu politika bağlantısı" },
];

const sectionLinks: Record<SectionKey, string[]> = {
  platform: ["platform1", "platform2", "platform3"],
  support: ["support"],
  legal: ["terms", "privacy", "kvkk", "cookie", "copyright"],
};

function snapshot(value: FooterNavigationPayload) {
  return JSON.stringify(value);
}

function sectionState(section: SectionKey, diagnostics: FooterLinkDiagnostic[]) {
  const relevant = diagnostics.filter((item) => sectionLinks[section].includes(item.key));
  if (relevant.some((item) => item.status === "broken" || item.status === "duplicate")) return "bad";
  if (relevant.some((item) => item.status === "fallback")) return "warn";
  return "ok";
}

function stateText(state: string) {
  if (state === "bad") return "Blokaj";
  if (state === "warn") return "Fallback";
  return "Sağlıklı";
}

function diagnosticText(status: FooterLinkDiagnostic["status"]) {
  if (status === "ok") return "Doğrulandı";
  if (status === "fallback") return "Fallback";
  if (status === "duplicate") return "Tekrarlı";
  return "Kırık";
}

export function FooterNavigationWorkbench({ initial, diagnostics, hasAnalysis }: Props) {
  const [value, setValue] = useState(initial);
  const [selected, setSelected] = useState<SectionKey>("platform");
  const dirty = useMemo(() => snapshot(value) !== snapshot(initial), [value, initial]);

  function setField<K extends keyof FooterNavigationPayload>(key: K, next: FooterNavigationPayload[K]) {
    setValue((current) => ({ ...current, [key]: next }));
  }

  const selectedDiagnostics = diagnostics.filter((item) => sectionLinks[selected].includes(item.key));

  function renderLink(prefix: string, labelKey: keyof FooterNavigationPayload, hrefKey: keyof FooterNavigationPayload, title: string) {
    const diagnostic = diagnostics.find((item) => item.key === prefix);
    return (
      <div className={styles.linkRow} key={prefix}>
        <label className={styles.field}><span><strong>{title}</strong><small>metin</small></span><input value={value[labelKey]} onChange={(event) => setField(labelKey, event.target.value)} maxLength={100} /></label>
        <label className={styles.field}><span><strong>Hedef</strong><small>site içi URL / anchor</small></span><input value={value[hrefKey]} onChange={(event) => setField(hrefKey, event.target.value)} maxLength={300} placeholder="Boşsa güvenli fallback kullanılır" /></label>
        <div className={styles.linkHealth}><span>Kaydedilmiş taslak denetimi</span><span className={styles.healthDot} data-state={!hasAnalysis ? "warn" : diagnostic?.status === "broken" || diagnostic?.status === "duplicate" ? "bad" : diagnostic?.status === "fallback" ? "warn" : "ok"}>{!hasAnalysis ? "Bekleniyor" : diagnosticText(diagnostic?.status ?? "broken")}</span></div>
      </div>
    );
  }

  return (
    <div className={styles.workbench}>
      <div className={styles.layout}>
        <aside className={styles.rail}>
          <div className={styles.railHeader}><span className={styles.eyebrow}>Footer bölümleri</span><strong>3 alan</strong></div>
          <div className={styles.sectionList}>
            {sections.map((section, index) => {
              const state = sectionState(section.key, diagnostics);
              return <button key={section.key} type="button" className={styles.sectionButton} data-active={selected === section.key} onClick={() => setSelected(section.key)}><span className={styles.sectionNumber}>{index + 1}</span><span className={styles.sectionText}><strong>{section.title}</strong><small>{section.note}</small></span><span className={styles.healthDot} data-state={hasAnalysis ? state : "warn"}>{hasAnalysis ? stateText(state) : "Bekliyor"}</span></button>;
            })}
          </div>
        </aside>

        <form action={saveFooterNavigationAction} className={styles.editor}>
          {Object.entries(value).map(([key, fieldValue]) => <input key={`hidden-${key}`} type="hidden" name={key} value={fieldValue} />)}
          <div className={styles.editorHeader}><span className={styles.eyebrow}>Seçili bölüm</span><h2>{sections.find((section) => section.key === selected)?.title}</h2><p>Yalnız bu bölümün kullanıcıya görünen metin ve hedeflerini düzenleyin. Diğer bölümlerdeki değişiklikler korunur.</p></div>
          <div className={styles.editorBody}>
            {selected === "platform" ? <>
              <label className={styles.field}><span><strong>Sütun başlığı</strong><small>{value.platformTitle.length}/80</small></span><input value={value.platformTitle} onChange={(event) => setField("platformTitle", event.target.value.slice(0,80))} /></label>
              {renderLink("platform1", "platform1Label", "platform1Href", "1. bağlantı")}
              {renderLink("platform2", "platform2Label", "platform2Href", "2. bağlantı")}
              {renderLink("platform3", "platform3Label", "platform3Href", "3. bağlantı")}
            </> : null}
            {selected === "support" ? <>
              <label className={styles.field}><span><strong>Sütun başlığı</strong><small>{value.supportTitle.length}/80</small></span><input value={value.supportTitle} onChange={(event) => setField("supportTitle", event.target.value.slice(0,80))} /></label>
              {renderLink("support", "supportLabel", "supportHref", "Destek bağlantısı")}
              <div className={styles.lockedNote}>Hedef boş bırakılırsa uygulamanın güvenli destek fallback’i kullanılır. Özel bir dış URL bu alandan tanımlanamaz.</div>
            </> : null}
            {selected === "legal" ? <>
              <label className={styles.field}><span><strong>Sütun başlığı</strong><small>{value.legalTitle.length}/80</small></span><input value={value.legalTitle} onChange={(event) => setField("legalTitle", event.target.value.slice(0,80))} /></label>
              {renderLink("terms", "termsLabel", "termsHref", "Kullanım Şartları")}
              {renderLink("privacy", "privacyLabel", "privacyHref", "Gizlilik")}
              {renderLink("kvkk", "kvkkLabel", "kvkkHref", "KVKK")}
              {renderLink("cookie", "cookieLabel", "cookieHref", "Çerez")}
              {renderLink("copyright", "copyrightLabel", "copyrightHref", "Telif")}
            </> : null}
          </div>
          <div className={styles.saveBar}><div><strong>{dirty ? "Kaydedilmemiş footer değişiklikleri var" : "Çalışma kopyası güncel"}</strong><small>Kaydetme canlı footer’ı değiştirmez; server-side hedef denetimini yeniden çalıştırır.</small></div><div className="content-form-actions"><button type="button" disabled={!dirty} onClick={() => setValue(initial)}>Değişiklikleri geri al</button><button type="submit" disabled={!dirty}>Taslağı Kaydet ve Doğrula</button></div></div>
        </form>

        <aside className={styles.preview}>
          <div className={styles.previewHeader}><span className={styles.eyebrow}>Anlık önizleme</span><strong>Footer</strong></div>
          <div className={styles.previewBody}>
            <div className={styles.footerPreview}>
              <div className={styles.previewColumn}><h3>{value.platformTitle || "Platform"}</h3><span>{value.platform1Label || "—"}</span><span>{value.platform2Label || "—"}</span><span>{value.platform3Label || "—"}</span></div>
              <div className={styles.previewColumn}><h3>{value.supportTitle || "Destek"}</h3><span>{value.supportLabel || "—"}</span></div>
              <div className={styles.previewColumn}><h3>{value.legalTitle || "Yasal"}</h3><span>{value.termsLabel || "—"}</span><span>{value.privacyLabel || "—"}</span><span>{value.kvkkLabel || "—"}</span><span>{value.cookieLabel || "—"}</span><span>{value.copyrightLabel || "—"}</span></div>
            </div>
            <div className={styles.diagnosticList}><span className={styles.label}>Seçili bölüm · son server doğrulaması</span>{selectedDiagnostics.map((item) => <div className={styles.diagnosticItem} key={item.key}><div className={styles.diagnosticTop}><strong>{item.label}</strong><span className={styles.healthDot} data-state={item.status === "broken" || item.status === "duplicate" ? "bad" : item.status === "fallback" ? "warn" : "ok"}>{diagnosticText(item.status)}</span></div><code>{item.href || item.effectiveHref}</code><small>{item.detail}</small></div>)}</div>
          </div>
        </aside>
      </div>
    </div>
  );
}
