import Link from "next/link";
import { SystemMapWorkbench } from "@/features/system-map/SystemMapWorkbench";
import { SystemOperationsPanel } from "@/features/system-map/SystemOperationsPanel";
import { getSystemMapSnapshot } from "@/features/system-map/collector";
import { getSystemOperationsReport } from "@/features/system-map/operations";

function scanLabel(mode: "source" | "build" | "hybrid" | "fallback") {
  if (mode === "hybrid") return "Kaynak + build manifesti";
  if (mode === "source") return "Kaynak kod taraması";
  if (mode === "build") return "Production build manifesti";
  return "Sınırlı fallback";
}

export default async function SystemMapPage() {
  const snapshot = await getSystemMapSnapshot();
  const operations = await getSystemOperationsReport(snapshot);

  return (
    <main className="system-map-page">
      <header className="system-map-hero">
        <div>
          <p className="system-map-eyebrow">İLKOKU MİMARİ KONTROL MERKEZİ</p>
          <h1>Sistem / Site Haritası</h1>
          <p className="system-map-lead">
            İlkOku&apos;nun route, rol, menü, kullanıcı akışı, server action, API ve veri bağımlılıklarını tek çalışma masasından izleyin; eksik puzzle parçalarını BLOCKER / WARN / PASS olarak çapraz kontrol edin.
          </p>
        </div>

        <div className="system-map-hero__actions">
          <Link href="/sistem-yonetimi">Sistem Yönetimi</Link>
          <Link href="/sozlesme">Sözleşme Yönetimi</Link>
          <Link href="/">İlkOku&apos;yu aç</Link>
        </div>
      </header>

      <section className="system-map-integrity" aria-label="Harita üretim durumu">
        <div>
          <span className="system-map-live-dot" />
          <strong>Canlı envanter</strong>
          <span>{scanLabel(snapshot.scanMode)}</span>
        </div>
        <p>
          Üretim zamanı: {new Intl.DateTimeFormat("tr-TR", {
            dateStyle: "medium",
            timeStyle: "medium",
            timeZone: "Europe/Istanbul",
          }).format(new Date(snapshot.generatedAt))}
        </p>
      </section>

      {snapshot.warnings.length > 0 ? (
        <section className="system-map-warnings" aria-labelledby="system-map-warnings-title">
          <h2 id="system-map-warnings-title">Tarama uyarıları</h2>
          <ul>{snapshot.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul>
        </section>
      ) : null}

      <SystemOperationsPanel report={operations} />
      <SystemMapWorkbench snapshot={snapshot} />
    </main>
  );
}
