"use client";

import { useState } from "react";
import styles from "./PowerSeoDashboard.module.css";

type Provider = "gsc" | "gsc-index" | "ahrefs" | "semrush" | "ai";
type Report = { provider?: string; state: string; message?: string; [key: string]: unknown };
const services: Array<{ id: Provider; label: string; description: string }> = [
  { id: "gsc", label: "GSC verisini sorgula", description: "Google Search Console: gerçek, son 28 günlük sayfa örneklemi" },
  { id: "gsc-index", label: "GSC indeks durumunu sorgula", description: "Seçilen adresin Google indeks durumu ve son tarama tarihi; dizine ekleme isteği göndermez." },
  { id: "ahrefs", label: "Ahrefs API test et", description: "Alan adının gerçek Ahrefs profil özeti (abonelik maliyetli olabilir)" },
  { id: "semrush", label: "Semrush API test et", description: "Gerçek Semrush Türkiye alan adı özeti (API kotası tüketebilir)" },
  { id: "ai", label: "AI SEO önerisi üret", description: "Gerçek model çağrısı; 220 token üst sınırı, yalnız taslak (ücretli olabilir)" },
];

export function PowerSeoProviderChecks() {
  const [pending, setPending] = useState<Provider | null>(null);
  const [reports, setReports] = useState<Partial<Record<Provider, Report>>>({});
  const [path, setPath] = useState("/nasil-calisir");

  async function check(provider: Provider) {
    if (pending) return;
    setPending(provider);
    try {
      const response = await fetch("/api/admin/power-seo/providers", {
        method: "POST",
        credentials: "same-origin",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, path: provider === "ai" || provider === "gsc-index" ? path : undefined }),
      });
      const data: Report = await response.json();
      setReports((previous) => ({
        ...previous,
        [provider]: response.ok ? data : { state: "error", message: data.message || "Sunucu yanıtı başarısız." },
      }));
    } catch {
      setReports((previous) => ({
        ...previous,
        [provider]: { state: "error", message: "İstek başarısız veya zaman aşımına uğradı." },
      }));
    } finally {
      setPending(null);
    }
  }

  return (
    <section className={styles.panel} aria-label="Power-SEO gerçek API doğrulama">
      <h2>Canlı servis sorguları — yönetici başlatır</h2>
      <p>Kimlik bilgisi varlığına değil, gerçek API yanıtına bakar. Hiçbir sorgu sayfa açılışında başlamaz; otomatik SEO yayını ve veri yazımı yoktur. Harici sağlayıcılar kota veya ücret kullanabilir.</p>
      <div className={styles.modules}>
        {services.map((service) => {
          const report = reports[service.id];
          return (
            <article key={service.id} className={styles.module}>
              <b>{service.label}</b>
              <p>{service.description}</p>
              {service.id === "ai" || service.id === "gsc-index" ? (
                <label>
                  {service.id === "gsc-index" ? "İndeks durumu incelenecek URL yolu" : "Public yol"}
                  <input aria-label={service.id === "gsc-index" ? "GSC indeks incelemesi public yol" : "AI analizi public yol"} value={path} maxLength={140}
                    onChange={(event) => setPath(event.target.value)}
                    style={{ width: "100%", padding: "8px", border: "1px solid #a89ac9", borderRadius: 8 }} />
                </label>
              ) : null}
              <div className={styles.quick}>
                <button type="button" disabled={pending !== null}
                  onClick={() => void check(service.id)}>
                  {pending === service.id ? "Sorgulanıyor…" : service.label}
                </button>
              </div>
              <div aria-live="polite">
                {report ? (
                  <>
                    <strong>{report.state === "verified" ? "Gerçek API yanıtı alındı" :
                      report.state === "missing" ? "Kimlik bilgisi eksik" : "Doğrulanmadı"}</strong>
                    {report.message ? <p>{report.message}</p> : null}
                    {report.state === "verified" ? (
                      <pre className={styles.facts}>{JSON.stringify(report, null, 2)}</pre>
                    ) : null}
                  </>
                ) : <small>Henüz test yapılmadı.</small>}
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
