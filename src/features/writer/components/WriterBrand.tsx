import Image from "next/image";
import Link from "next/link";
import retinaLogo from "@/assets/brand/ilkoku-logo-desktop-retina.png";
import { writerContent } from "@/content";

interface WriterBrandProps {
  compact?: boolean;
}

export function WriterBrand({ compact = false }: WriterBrandProps) {
  return (
    <>
      <Link
        className={compact ? "writer-brand writer-brand--compact" : "writer-brand"}
        href="/"
        aria-label={writerContent.homeLabel}
      >
        <Image
          className="writer-brand__desktop"
          src={retinaLogo}
          alt={writerContent.logoAlt}
          priority
          sizes="(max-width: 767px) 72px, 120px"
        />
        <Image
          className="writer-brand__mobile"
          src={retinaLogo}
          alt=""
          aria-hidden="true"
          priority
          sizes="72px"
        />
      </Link>
      <style>{`
        @media (max-width: 47.99rem) {
          .writer-brand__mobile {
            width: 4.5rem !important;
            max-width: 4.5rem !important;
            height: 4.5rem !important;
          }
        }
      `}</style>
    </>
  );
}
