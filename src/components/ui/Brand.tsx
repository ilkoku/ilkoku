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
    <>
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
          sizes="(max-width: 767px) 84px, (max-width: 1024px) 112px, 144px"
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
      <style>{`
        @media (max-width: 47.99rem) {
          .brand {
            min-height: 6.75rem !important;
            padding: 0.5rem !important;
          }

          .brand__logo--desktop {
            width: 5.25rem !important;
            max-width: 5.25rem !important;
            height: 5.25rem !important;
          }

          .brand__logo--mobile {
            width: 4.5rem !important;
            max-width: 4.5rem !important;
            height: 4.5rem !important;
          }
        }
      `}</style>
    </>
  );
}
