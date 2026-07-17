import Image from "next/image";
import Link from "next/link";
import desktopLogo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import mobileLogo from "@/assets/brand/ilkoku-logo-mobile.png";
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
        src={desktopLogo}
        alt={tr.brand.logoAlt}
        priority
        sizes="(max-width: 767px) 0px, (max-width: 1024px) 152px, 200px"
      />
      <Image
        className="brand__logo brand__logo--mobile"
        src={mobileLogo}
        alt=""
        aria-hidden="true"
        priority
        sizes="(max-width: 480px) 48px, (max-width: 767px) 52px, 0px"
      />
    </Link>
  );
}
