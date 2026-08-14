import Link from "next/link";

type HealthLevel = "pass" | "warn" | "blocker" | "info";

type Metric = {
  level: HealthLevel;
  label: string;
  value: number;
  note: string;
};

export function HealthMetricCards({
  metrics,
  activeLevel,
}: {
  metrics: Metric[];
  activeLevel?: HealthLevel;
}) {
  return (
    <div className="content-metric-grid">
      {metrics.map((metric) => {
        const active = activeLevel === metric.level;
        return (
          <Link
            key={metric.level}
            href={`/icerik/saglik?durum=${metric.level}#kontroller`}
            className="content-metric-card"
            aria-current={active ? "page" : undefined}
            style={{
              textDecoration: "none",
              color: "inherit",
              outline: active ? "2px solid currentColor" : undefined,
              outlineOffset: active ? "2px" : undefined,
            }}
          >
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.note} · Tıkla ve müdahale et</small>
          </Link>
        );
      })}
    </div>
  );
}
