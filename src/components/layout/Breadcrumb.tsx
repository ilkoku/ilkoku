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
  yorumlarim: "Yorumlarım",
  okuyucu: "Okuyucu",
  editor: "Editör",
  kesfet: "Keşfet",
  "yazar-kesfet": "Yazar Keşfet",
  favoriler: "Favorilerim",
  seckiler: "Editör Seçkilerim",
  "satis-erisim": "Satış & Erişim",
  incelemeler: "İncelemelerim",
  onerilenler: "Bana Önerilenler",
};

function formatSegment(segment: string, segmentOverrides: Record<string, string>) {
  if (segmentOverrides[segment]) return segmentOverrides[segment];
  if (segmentLabels[segment]) return segmentLabels[segment];

  return decodeURIComponent(segment)
    .replace(/[-_]+/g, " ")
    .replace(/\b\p{L}/gu, (letter) => letter.toLocaleUpperCase("tr"));
}

type BreadcrumbProps = {
  segmentOverrides?: Record<string, string>;
};

export function Breadcrumb({ segmentOverrides = {} }: BreadcrumbProps) {
  const pathname = usePathname();
  const segments = pathname.split("/").filter(Boolean);

  if (segments.length === 0) return null;

  return (
    <nav className="breadcrumb" aria-label="Sayfa yolu">
      <ol className="breadcrumb__list">
        <li>
          <Link className="breadcrumb__link" href={`/${segments[0]}`}>
            {formatSegment(segments[0], segmentOverrides)}
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
                  {formatSegment(segment, segmentOverrides)}
                </span>
              ) : (
                <Link className="breadcrumb__link" href={href}>
                  {formatSegment(segment, segmentOverrides)}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
