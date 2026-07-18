"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const segmentLabels: Record<string, string> = {
  yazar: "Yazar Paneli",
  eserler: "Eserler",
  yeni: "Yeni",
  profil: "Profil",
  ayarlar: "Ayarlar",
  bildirimler: "Bildirimler",
};

function formatSegment(segment: string) {
  if (segmentLabels[segment]) return segmentLabels[segment];

  return decodeURIComponent(segment)
    .replace(/[-_]+/g, " ")
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("tr"));
}

export function Breadcrumb() {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav className="breadcrumb" aria-label="Sayfa yolu">
      <ol className="breadcrumb__list">
        <li>
          <Link className="breadcrumb__link" href={`/${segments[0]}`}>
            {formatSegment(segments[0])}
          </Link>
        </li>
        {segments.slice(1).map((segment, index) => {
          const href = `/${segments.slice(0, index + 2).join("/")}`;
          const isCurrent = index === segments.length - 2;

          return (
            <li className="breadcrumb__item" key={href}>
              <span className="breadcrumb__separator" aria-hidden="true">/</span>
              {isCurrent ? (
                <span className="breadcrumb__current" aria-current="page">
                  {formatSegment(segment)}
                </span>
              ) : (
                <Link className="breadcrumb__link" href={href}>
                  {formatSegment(segment)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
