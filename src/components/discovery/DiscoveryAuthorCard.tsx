import Link from "next/link";
import type { ReactNode } from "react";

import "./discovery-author-card.css";

export type DiscoveryAuthorMetric = {
  label: string;
  value: number;
};

export type DiscoveryAuthorLatestWork = {
  href: string;
  meta?: string | null;
  title: string;
};

function formatNumber(value: number) {
  return value.toLocaleString("tr-TR");
}

function initials(value: string) {
  const parts = value.trim().split(/\s+/u).filter(Boolean);
  return (
    parts
      .slice(0, 2)
      .map((part) => part.charAt(0).toLocaleUpperCase("tr-TR"))
      .join("") || "Y"
  );
}

export function DiscoveryAuthorGrid({ children }: { children: ReactNode }) {
  return (
    <section aria-label="Keşfedilen yazarlar" className="discovery-author-grid">
      {children}
    </section>
  );
}

export function DiscoveryAuthorCard({
  actions,
  alias,
  bio,
  latestWork,
  matchedWorkCount,
  metrics,
  name,
  profileHref,
  signals = [],
}: {
  actions?: ReactNode;
  alias: string;
  bio: string | null;
  latestWork?: DiscoveryAuthorLatestWork | null;
  matchedWorkCount: number;
  metrics: DiscoveryAuthorMetric[];
  name: string;
  profileHref: string;
  signals?: string[];
}) {
  return (
    <article className="discovery-author-card">
      <header className="discovery-author-card__header">
        <span aria-hidden="true" className="discovery-author-card__avatar">
          {initials(name)}
        </span>
        <div className="discovery-author-card__identity">
          <h2>
            <Link href={profileHref}>{name}</Link>
          </h2>
          <p>{alias}</p>
        </div>
        <span className="discovery-author-card__match">
          {formatNumber(matchedWorkCount)} eşleşen
        </span>
      </header>

      <p className={`discovery-author-card__bio${bio?.trim() ? "" : " is-muted"}`}>
        {bio?.trim() || "Yazar henüz kısa bir tanıtım eklemedi."}
      </p>

      {metrics.length > 0 ? (
        <div aria-label={`${name} yazar özeti`} className="discovery-author-card__metrics">
          {metrics.map((metric) => (
            <span key={metric.label}>
              <strong>{formatNumber(metric.value)}</strong>
              <small>{metric.label}</small>
            </span>
          ))}
        </div>
      ) : null}

      {signals.length > 0 ? (
        <div className="discovery-author-card__signals" aria-label="Yazar keşif işaretleri">
          {signals.map((signal) => (
            <span key={signal}>{signal}</span>
          ))}
        </div>
      ) : null}

      {latestWork ? (
        <Link className="discovery-author-card__latest" href={latestWork.href}>
          <span className="discovery-author-card__latest-copy">
            <small>Son eşleşen eser</small>
            <strong>{latestWork.title}</strong>
            {latestWork.meta ? <em>{latestWork.meta}</em> : null}
          </span>
          <span className="discovery-author-card__latest-arrow" aria-hidden="true">
            →
          </span>
        </Link>
      ) : null}

      <div className="discovery-author-card__actions">
        <Link className="button button--outline" href={profileHref}>
          Yazar vitrini
        </Link>
        {actions ? <div className="discovery-author-card__role-actions">{actions}</div> : null}
      </div>
    </article>
  );
}
