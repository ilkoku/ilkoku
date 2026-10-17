"use client";

import { validateTitle } from "@power-seo/core";
import { analyzeReadability } from "@power-seo/readability";
import { renderMetaTags } from "@power-seo/react";
import { createConsentManager, buildGA4Script } from "@power-seo/tracking";
import styles from "./PowerSeoDashboard.module.css";

export function PowerSeoLocalDiagnostics() {
  // Never mount these preview tags or tracking scripts into the actual document.
  // These are self-contained library contract checks, not production GA4 events.
  const core = validateTitle("İlkOku | Dijital Yazar Platformu");
  const englishSample = analyzeReadability({
    content: "<p>The writer prepares an outline. The editor reviews the story. The reader sees the finished article.</p>",
  });
  const tagPreview = renderMetaTags([{ name: "robots", content: "noindex, nofollow" }]);
  const consent = createConsentManager();
  const consentState = consent.getState();
  const scripts = buildGA4Script({ measurementId: "G-TESTONLY", consentModeV2: true });
  const blockedAnalyticsScripts = scripts.filter((item) => !item.shouldLoad(consentState) && item.consentCategory === "analytics").length;

  return (
    <section className={styles.panel} aria-label="Power-SEO yardımcı modül tanıları">
      <h2>SEO yardımcı modülleri — izole işlev testi</h2>
      <p>Core, React, Readability ve Tracking modüllerinin çalışması test edilir. Sonuçlar yalnız yönetici ekranındadır; public head, GA4/GTM, çerez tercihleri ve Google indeksleme kuralları değiştirilmez.</p>
      <div className={styles.modules}>
        <article className={styles.module}>
          <b>Core — başlık doğrulama</b>
          <strong>{core.valid ? "Çalışıyor" : "Uyarı"}</strong>
          <p>Örnek başlık: {core.charCount} karakter. Bu, Google sıralama puanı değildir.</p>
        </article>
        <article className={styles.module}>
          <b>React — metadata bileşeni</b>
          <strong>{tagPreview ? "Önizleme üretildi" : "Önizleme oluşturulamadı"}</strong>
          <p>React meta elemanı yalnız bellekte oluşturuldu, belgeye eklenmedi.</p>
        </article>
        <article className={styles.module}>
          <b>Readability — dil güvenliği</b>
          <strong>{Number.isFinite(englishSample.score) ? "İngilizce örnek test edildi" : "Sonuç yok"}</strong>
          <p>Power-SEO formülleri İngilizceye dayalıdır. Türkçe sayfalara Flesch puanı uygulanmaz.</p>
        </article>
        <article className={styles.module}>
          <b>Tracking — izin sınırı</b>
          <strong>{consentState.necessary && !consentState.analytics && blockedAnalyticsScripts > 0 ? "İzin sınırı doğrulandı" : "Kontrol gerekli"}</strong>
          <p>Test verisinde analitik izni yokken {blockedAnalyticsScripts} analitik script engellendi. Gerçek GA4/GTM kurulumu değişmedi.</p>
        </article>
      </div>
    </section>
  );
}
