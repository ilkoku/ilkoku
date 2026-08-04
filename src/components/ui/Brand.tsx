import Image from "next/image";
import Link from "next/link";
import retinaLogo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { tr } from "@/content";

type BrandAppearance = "dark" | "light";

interface BrandProps {
  appearance?: BrandAppearance;
}

export function Brand({ appearance = "dark" }: BrandProps) {
  return (
    <Link
      className={`brand brand--${appearance}`}
      href="/"
      aria-label={tr.brand.homeLabel}
    >
      <Image
        className="brand__logo brand__logo--desktop"
        src={retinaLogo}
        alt={tr.brand.logoAlt}
        priority
        sizes="(max-width: 767px) 72px, (max-width: 1024px) 112px, 144px"
      />
      <Image
        className="brand__logo brand__logo--mobile"
        src={retinaLogo}
        alt=""
        aria-hidden="true"
        priority
        sizes="72px"
      />
    </Link>
  );
}
