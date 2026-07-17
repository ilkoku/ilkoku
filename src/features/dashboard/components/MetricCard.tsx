import { Card } from "@/components/ui/Card";
import type { Metric } from "../types";

export function MetricCard({ detail, label, value }: Metric) {
  return (
    <Card className="metric-card">
      <p className="metric-card__label">{label}</p>
      <strong className="metric-card__value">{value}</strong>
      <p className="metric-card__detail">{detail}</p>
    </Card>
  );
}
