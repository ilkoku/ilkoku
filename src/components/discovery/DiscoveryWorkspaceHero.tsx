import Link from "next/link";
import type { ReactNode } from "react";

import "./discovery-workspace.css";

export type DiscoveryWorkspaceLink = {
  current?: boolean;
  href: string;
  label: string;
};

export type DiscoveryWorkspaceStat = {
  label: string;
  value: ReactNode;
};

export function DiscoveryWorkspaceHero({
  description,
  eyebrow,
  links = [],
  stats = [],
  title,
}: {
  description: string;
  eyebrow: string;
  links?: DiscoveryWorkspaceLink[];
  stats?: DiscoveryWorkspaceStat[];
  title: string;
}) {
  return (
    <section className="discovery-workspace-hero">
      <div className="discovery-workspace-hero__intro">
        <p className="discovery-workspace-hero__eyebrow">{eyebrow}</p>
        <h1>{title}</h1>
        <p className="discovery-workspace-hero__lead">{description}</p>

        {links.length > 0 ? (
          <nav aria-label="Keşif çalışma alanı" className="discovery-workspace-hero__links">
            {links.map((item) =>
              item.current ? (
                <span aria-current="page" key={`${item.href}-${item.label}`}>
                  {item.label}
                </span>
              ) : (
                <Link href={item.href} key={`${item.href}-${item.label}`}>
                  {item.label}
                </Link>
              ),
            )}
          </nav>
        ) : null}
      </div>

      {stats.length > 0 ? (
        <div className="discovery-workspace-hero__stats" aria-label="Keşif özeti">
          {stats.map((item) => (
            <div key={item.label}>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
